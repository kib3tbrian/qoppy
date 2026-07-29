import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import nativeBilling, { NativeBillingState, NativeSubscriptionProduct } from '../services/nativeBilling';
import auth from '@react-native-firebase/auth';
import {
  getUserFacingBillingMessage,
  PURCHASE_VERIFICATION_FALLBACK,
  BillingResponseCode,
} from '../utils/billingErrors';

// Set this to your real backend verification endpoint before releasing to production.
// Configure via app.json under expo.extra.backendVerifyUrl — no code change needed.
// Leave empty to skip server-side verification (acceptable for development only).
let _backendVerifyUrl: string | undefined;
try {
  // Read from app.json extra config at build time.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _backendVerifyUrl = require('../../app.json')?.expo?.extra?.backendVerifyUrl;
} catch { /* ignore */ }
const BACKEND_VERIFY_URL: string = (_backendVerifyUrl && typeof _backendVerifyUrl === 'string')
  ? _backendVerifyUrl
  : '';

import { db } from '../services/database';

export interface UseSubscriptionResult {
  isAvailable: boolean;
  isPurchasing: boolean;
  billingState: NativeBillingState;
  products: NativeSubscriptionProduct[];
  purchase: (productId: string, offerToken: string) => Promise<void>;
  // Returns the billing state observed after the restore attempt so callers
  // can read the correct (non-stale) status without relying on React state.
  restorePurchases: () => Promise<NativeBillingState>;
  verifyPurchase: (purchaseToken?: string, productId?: string) => Promise<{ active: boolean; error?: string }>;
}

/**
 * Sanitise a NativeBillingState error so that the `message` field
 * contains only a user-safe string. The raw native message is logged
 * to console.error for debugging.
 */
function sanitiseBillingError(state: NativeBillingState): NativeBillingState {
  if (state.status !== 'error') return state;

  console.error('[Billing] Native error:', { message: state.message, code: state.code });

  // USER_CANCELED → silently reset to ready (no error shown to the user)
  if (state.code === BillingResponseCode.USER_CANCELED) {
    return { status: 'ready' };
  }

  const userMessage = getUserFacingBillingMessage(state.code);
  return {
    ...state,
    message: userMessage ?? undefined,
  };
}

export function useSubscription(skus: string[]): UseSubscriptionResult {
  const [billingState, setBillingState] = useState<NativeBillingState>({ status: 'initializing' });
  const [products, setProducts] = useState<NativeSubscriptionProduct[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // ── Initialise billing and fetch product catalogue ──────────────────────
  useEffect(() => {
    if (!nativeBilling.isAvailable() || Platform.OS !== 'android') {
      setBillingState({ status: 'error', message: 'Billing is not available on this device.' });
      return;
    }

    let isMounted = true;

    const setup = async () => {
      try {
        await nativeBilling.initialize();
        const currentState = await nativeBilling.getCurrentState();
        if (isMounted) setBillingState(sanitiseBillingError(currentState));

        const fetchedProducts = await nativeBilling.fetchSubscriptions(skus);
        if (isMounted) setProducts(fetchedProducts);
      } catch (error: any) {
        console.error('[Billing] Setup failed:', error);
        if (isMounted) {
          const userMessage = getUserFacingBillingMessage(error?.code);
          setBillingState({
            status: 'error',
            message: userMessage ?? 'Something went wrong. Please try again, or contact support.',
          });
        }
      }
    };

    void setup();

    return () => { isMounted = false; };
  }, [skus]);

  // ── Listen for billing state changes and handle acknowledgement ──────────
  useEffect(() => {
    if (!nativeBilling.isAvailable() || Platform.OS !== 'android') return;

    let isMounted = true;

    const unsubscribe = nativeBilling.subscribe(async (state) => {
      if (!isMounted) return;

      const safeState = sanitiseBillingError(state);
      setBillingState(safeState);

      if (safeState.status === 'error' || safeState.status === 'ready') {
        setIsPurchasing(false);
      }

      // ── Acknowledge unacknowledged purchases ─────────────────────────────
      if (state.status === 'subscribed' && state.purchases) {
        const unacknowledged = state.purchases.filter(p => !p.isAcknowledged);

        for (const purchase of unacknowledged) {
          try {
            if (BACKEND_VERIFY_URL) {
              // ── Server-side verification (production) ──────────────────
              try {
                const currentUser = auth().currentUser;
                if (currentUser) {
                  const idToken = await currentUser.getIdToken();
                  const response = await fetch(BACKEND_VERIFY_URL, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                      uid: currentUser.uid,
                      purchaseToken: purchase.purchaseToken,
                      productId: purchase.productId,
                    }),
                  });

                  if (!response.ok) {
                    console.warn('[Billing] Backend verification response non-OK:', response.status);
                  }
                }
              } catch (verifyErr) {
                console.error('[Billing] Backend verification error (proceeding to acknowledge):', verifyErr);
              }
            }

            // Always acknowledge purchase with Google Play so it is not auto-refunded
            await nativeBilling.acknowledgePurchase(purchase.purchaseToken);
          } catch (error) {
            console.error('[Billing] Purchase verification/acknowledgement error:', error);
            if (isMounted) {
              setBillingState({
                status: 'error',
                message: PURCHASE_VERIFICATION_FALLBACK,
              });
            }
          }
        }

        setIsPurchasing(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [skus]);

  // ── purchase ─────────────────────────────────────────────────────────────
  const purchase = useCallback(async (productId: string, offerToken: string) => {
    if (!nativeBilling.isAvailable()) {
      throw new Error('Billing is not available on this device.');
    }
    setIsPurchasing(true);
    try {
      await nativeBilling.launchPurchase(productId, offerToken);
      // The subscriber above handles the rest of the flow.
    } catch (error: any) {
      console.error('[Billing] launchPurchase error:', error);
      setIsPurchasing(false);

      const code = error?.code ?? error?.userInfo?.code;
      const userMessage = getUserFacingBillingMessage(code);

      if (userMessage === null) return; // USER_CANCELED — silent
      throw new Error(userMessage);
    }
  }, []);

  // ── restorePurchases ─────────────────────────────────────────────────────
  // Returns the freshly-fetched NativeBillingState so callers can check
  // the result synchronously without reading stale React state.
  const restorePurchases = useCallback(async (): Promise<NativeBillingState> => {
    if (!nativeBilling.isAvailable()) {
      throw new Error('Billing is not available on this device.');
    }
    setIsPurchasing(true);
    try {
      await nativeBilling.initialize();
      const state = await nativeBilling.getCurrentState();
      const safeState = sanitiseBillingError(state);
      setBillingState(safeState);
      return safeState; // ← return so callers don't read stale closure state
    } catch (error: any) {
      console.error('[Billing] restorePurchases error:', error);

      const code = error?.code ?? error?.userInfo?.code;
      const userMessage = getUserFacingBillingMessage(code);

      if (userMessage === null) return { status: 'ready' }; // USER_CANCELED — silent
      throw new Error(userMessage);
    } finally {
      setIsPurchasing(false);
    }
  }, []);

  // ── verifyPurchase ────────────────────────────────────────────────────────
  const verifyPurchase = useCallback(async (token?: string, prodId?: string): Promise<{ active: boolean; error?: string }> => {
    try {
      const currentState = await nativeBilling.getCurrentState();
      const purchases = currentState.purchases ?? [];

      const targetPurchase = purchases.find(p => (!token || p.purchaseToken === token) && (!prodId || p.productId === prodId))
        ?? purchases[0];

      if (!targetPurchase) {
        if (currentState.status === 'subscribed') {
          await db.setPreference('premium_enabled', 'true');
          return { active: true };
        }
        return { active: false, error: 'No purchase found to verify.' };
      }

      if (BACKEND_VERIFY_URL) {
        const currentUser = auth().currentUser;
        if (currentUser) {
          try {
            const idToken = await currentUser.getIdToken(true);
            const response = await fetch(BACKEND_VERIFY_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                uid: currentUser.uid,
                purchaseToken: targetPurchase.purchaseToken,
                productId: targetPurchase.productId,
              }),
            });

            if (response.ok) {
              const data = await response.json().catch(() => ({}));
              if (data?.active) {
                await db.setPreference('premium_enabled', 'true');
                if (!targetPurchase.isAcknowledged) {
                  await nativeBilling.acknowledgePurchase(targetPurchase.purchaseToken).catch(() => {});
                }
                return { active: true };
              }
            }
          } catch (fetchErr) {
            console.warn('[Billing] verifyPurchase network error:', fetchErr);
          }
        }
      }

      // Fallback: If billingState says subscribed and purchase is valid
      if (currentState.status === 'subscribed') {
        await db.setPreference('premium_enabled', 'true');
        if (!targetPurchase.isAcknowledged) {
          await nativeBilling.acknowledgePurchase(targetPurchase.purchaseToken).catch(() => {});
        }
        return { active: true };
      }

      return { active: false, error: 'Subscription status could not be verified.' };
    } catch (err: any) {
      console.error('[Billing] verifyPurchase error:', err);
      return { active: false, error: err?.message ?? 'Verification failed' };
    }
  }, []);

  return {
    isAvailable: nativeBilling.isAvailable() && Platform.OS === 'android',
    isPurchasing,
    billingState,
    products,
    purchase,
    restorePurchases,
    verifyPurchase,
  };
}
