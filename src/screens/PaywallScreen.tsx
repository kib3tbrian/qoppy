import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AlertCircle, Check, Crown, LoaderCircle, RefreshCw, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { textFont } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';
import { BrandIcon } from '../components/common/BrandIcon';
import { useAuth } from '../providers/AuthProvider';
import { useEntitlement } from '../hooks/useEntitlement';
import { NativeSubscriptionOffer } from '../services/nativeBilling';
import { useSubscription } from '../hooks/useSubscription';

const BENEFITS = [
  'Reclaim 4+ Hours a Month — stop retyping the same messages. Send any message in under 10 seconds.',
  'Infinite Messages — never run out of space for your winning talk tracks.',
  'No Watermark — send scripts without the "Sent via Sagent" tag. Professionalism only.',
];

// Google Play Console structure:
// Product ID: sagent_pro (single subscription product)
// Base Plans: pro-monthly (monthly), pro-yearly (yearly)
const SUBSCRIPTION_PRODUCT_ID = 'sagent_pro';

const BASE_PLAN_IDS = {
  monthly: 'pro-monthly',
  yearly: 'pro-yearly',
} as const;

// Hoisted so the array reference is stable across renders — prevents the
// useSubscription skus effect from firing on every re-render.
const SUBSCRIPTION_SKUS_LIST = [SUBSCRIPTION_PRODUCT_ID];

type PlanKey = keyof typeof BASE_PLAN_IDS;

interface PlanConfig {
  label: string;
  price: string;
  period: string;
  badge?: string;
}

// Hardcoded placeholder prices shown immediately (before any network fetch).
const PLACEHOLDER_PLANS: Record<PlanKey, PlanConfig> = {
  monthly: { label: 'Monthly', price: '$9.99', period: '/month' },
  yearly: { label: 'Yearly', price: '$89.99', period: '/year', badge: 'Save 25%' },
};

const getPeriodLabel = (billingPeriod?: string | null): string | null => {
  switch (billingPeriod) {
    case 'P1M': return '/month';
    case 'P1Y': return '/year';
    default: return null;
  }
};

/** Format an ISO date string into a human-readable date */
const formatExpiryDate = (expiresAt: Date | null): string | null => {
  if (!expiresAt) return null;
  try {
    return expiresAt.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return null;
  }
};

export const PaywallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [plan, setPlan] = useState<PlanKey>('yearly');
  const [showPlanChangeOptions, setShowPlanChangeOptions] = useState(false);
  const { user, signInWithGoogleAndLink } = useAuth();
  const {
    isPro,
    basePlanId,
    expiresAt,
    daysRemaining,
    plan: planName,
    loading: isCheckingPremium,
  } = useEntitlement();
  const [isLinkingAuth, setIsLinkingAuth] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const {
    isAvailable,
    isPurchasing,
    billingState,
    products,
    purchase: launchPurchase,
    restorePurchases,
    verifyPurchase,
  } = useSubscription(SUBSCRIPTION_SKUS_LIST);

  // Trigger verification state when billing indicates subscribed and not yet Pro
  React.useEffect(() => {
    if (billingState.status === 'subscribed' && !isPro && verificationStatus === 'idle') {
      setVerificationStatus('verifying');
    }
  }, [billingState.status, isPro, verificationStatus]);

  // Automatically transition back to idle if Firestore confirms isPro while verifying
  // This lets the normal isPro management screen render instead of a blocking interstitial.
  React.useEffect(() => {
    if (isPro && (verificationStatus === 'verifying' || verificationStatus === 'success')) {
      setVerificationStatus('idle');
      Toast.show({ type: 'success', text1: 'You\'re now a Pro Closer! 🎉', text2: 'All Pro features are unlocked.' });
    }
  }, [isPro, verificationStatus]);

  // Handle async backend verification with 15-second timeout safeguard
  React.useEffect(() => {
    if (verificationStatus !== 'verifying') return;

    let isMounted = true;
    setVerificationError(null);

    // 15-second timeout safeguard
    const timeoutId = setTimeout(() => {
      if (isMounted && verificationStatus === 'verifying') {
        if (isPro) {
          setVerificationStatus('idle');
        } else {
          Toast.show({ type: 'error', text1: 'Verification timed out', text2: 'Please try again or restore your purchase.' });
          setVerificationStatus('idle');
        }
      }
    }, 15000);

    (async () => {
      try {
        const result = await verifyPurchase();
        if (!isMounted) return;

        if (result.active || isPro) {
          clearTimeout(timeoutId);
          setVerificationStatus('idle');
        } else {
          setTimeout(() => {
            if (!isMounted) return;
            if (isPro) {
              clearTimeout(timeoutId);
              setVerificationStatus('idle');
            } else {
              clearTimeout(timeoutId);
              Toast.show({ type: 'error', text1: 'No active subscription found', text2: 'Please try again or restore your purchase.' });
              setVerificationStatus('idle');
            }
          }, 2500);
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (isPro) {
          clearTimeout(timeoutId);
          setVerificationStatus('idle');
        } else {
          clearTimeout(timeoutId);
          Toast.show({ type: 'error', text1: 'Verification error', text2: 'Please try again or restore your purchase.' });
          setVerificationStatus('idle');
        }
      }
    })();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [verificationStatus, verifyPurchase, isPro]);

  // ── Find the sagent_pro product and build offer lookup by basePlanId ─────
  const sagentProProduct = useMemo(
    () => products.find(p => p.productId === SUBSCRIPTION_PRODUCT_ID),
    [products]
  );

  const offersByBasePlan = useMemo(
    () => {
      if (!sagentProProduct) return {};
      return sagentProProduct.offers.reduce<Record<string, NativeSubscriptionOffer>>((acc, offer) => {
        if (offer.basePlanId) {
          acc[offer.basePlanId] = offer;
        }
        return acc;
      }, {});
    },
    [sagentProProduct]
  );

  // Merge fetched prices over the placeholders (if available).
  const plans = useMemo<Record<PlanKey, PlanConfig>>(
    () => {
      const monthlyOffer = offersByBasePlan[BASE_PLAN_IDS.monthly];
      const yearlyOffer = offersByBasePlan[BASE_PLAN_IDS.yearly];

      const monthly: PlanConfig = {
        ...PLACEHOLDER_PLANS.monthly,
        ...(monthlyOffer?.formattedPrice ? { price: monthlyOffer.formattedPrice } : {}),
        ...(monthlyOffer?.billingPeriod ? { period: getPeriodLabel(monthlyOffer.billingPeriod) ?? PLACEHOLDER_PLANS.monthly.period } : {}),
      };

      const yearly: PlanConfig = {
        ...PLACEHOLDER_PLANS.yearly,
        ...(yearlyOffer?.formattedPrice ? { price: yearlyOffer.formattedPrice } : {}),
        ...(yearlyOffer?.billingPeriod ? { period: getPeriodLabel(yearlyOffer.billingPeriod) ?? PLACEHOLDER_PLANS.yearly.period } : {}),
      };

      if (monthlyOffer?.formattedPrice && yearlyOffer?.formattedPrice) {
        const monthlyNum = parseFloat(monthly.price.replace(/[^0-9.]/g, ''));
        const yearlyNum = parseFloat(yearly.price.replace(/[^0-9.]/g, ''));
        if (monthlyNum > 0 && yearlyNum > 0) {
          const yearlyPerMonth = yearlyNum / 12;
          const savings = Math.round((1 - yearlyPerMonth / monthlyNum) * 100);
          if (savings > 0) {
            yearly.badge = `Save ${savings}%`;
          }
        }
      }

      return { monthly, yearly };
    },
    [offersByBasePlan]
  );

  const active = plans[plan];

  // ── Purchase ──────────────────────────────────────────────────────────────
  const handlePurchase = useCallback(async () => {
    if (user?.isAnonymous) {
      setIsLinkingAuth(true);
      try {
        const success = await signInWithGoogleAndLink();
        if (!success) {
          setIsLinkingAuth(false);
          return;
        }
      } catch {
        Toast.show({ type: 'error', text1: 'Sign in failed. Please try again.' });
        setIsLinkingAuth(false);
        return;
      }
      setIsLinkingAuth(false);
    }

    if (!isAvailable) {
      Toast.show({ type: 'error', text1: 'Billing is not available on this device.' });
      return;
    }

    const selectedOffer = offersByBasePlan[BASE_PLAN_IDS[plan]];
    if (!sagentProProduct || !selectedOffer) {
      Toast.show({ type: 'error', text1: 'Product not available. Please try again in a moment.' });
      return;
    }

    try {
      await launchPurchase(sagentProProduct.productId, selectedOffer.offerToken);
      setVerificationStatus('verifying');
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Purchase failed', text2: 'Please try again.' });
    }
  }, [isAvailable, launchPurchase, offersByBasePlan, plan, sagentProProduct, signInWithGoogleAndLink, user?.isAnonymous]);

  // ── Restore / Refresh ──────────────────────────────────────────────────────
  const handleRestore = useCallback(async () => {
    if (!isAvailable) {
      Toast.show({ type: 'error', text1: 'Billing is not available on this device.' });
      return;
    }
    setIsRefreshing(true);
    try {
      const freshState = await restorePurchases();
      if (freshState.status === 'subscribed') {
        setVerificationStatus('verifying');
        Toast.show({ type: 'success', text1: 'Subscription found! Verifying...' });
      } else {
        Toast.show({ type: 'info', text1: 'No active subscription was found.' });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Restore failed', text2: 'Please try again.' });
    } finally {
      setIsRefreshing(false);
    }
  }, [isAvailable, restorePurchases]);

  // ── Change Plan ────────────────────────────────────────────────────────────
  const handleChangePlan = useCallback(async () => {
    if (!isAvailable) {
      Toast.show({ type: 'error', text1: 'Billing is not available on this device.' });
      return;
    }

    const targetBasePlanId = BASE_PLAN_IDS[plan];
    if (targetBasePlanId === basePlanId) {
      Toast.show({ type: 'info', text1: 'You are already on this plan.' });
      return;
    }

    const selectedOffer = offersByBasePlan[targetBasePlanId];
    if (!sagentProProduct || !selectedOffer) {
      Toast.show({ type: 'error', text1: 'Product not available. Please try again in a moment.' });
      return;
    }

    try {
      await launchPurchase(sagentProProduct.productId, selectedOffer.offerToken);
      setVerificationStatus('verifying');
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Plan change failed', text2: 'Please try again.' });
    }
  }, [basePlanId, isAvailable, launchPurchase, offersByBasePlan, plan, sagentProProduct]);

  // 1. Loading State
  if (isCheckingPremium) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <LoaderCircle size={36} color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Checking subscription status...</Text>
      </View>
    );
  }

  // 2. Background verification banner handled within main view (does not block opening paywall)

  // 3. Success — no interstitial screen; isPro check below handles the Pro management view.
  //    A Toast is shown automatically when verification succeeds (see effect above).

  // 4. Error / Timeout Screen
  if (verificationStatus === 'error') {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.danger}20` }]}>
          <AlertCircle size={44} color={theme.danger} />
        </View>
        <Text style={[styles.heroTitle, { color: theme.text, marginTop: 24 }]}>Verification Failed</Text>
        <Text style={[styles.heroSubtitle, { color: theme.textSecondary, marginHorizontal: 24, marginTop: 8 }]}>
          {verificationError ?? "We couldn't confirm your subscription status. Please try again or restore your purchase."}
        </Text>

        <View style={{ width: '100%', paddingHorizontal: 24, marginTop: 28, gap: 12 }}>
          <TouchableOpacity
            onPress={() => {
              setVerificationStatus('verifying');
            }}
            style={[styles.cta, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, { color: theme.onPrimary }]}>Try again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await handleRestore();
            }}
            style={[styles.restoreButton, { borderColor: theme.border }]}
            activeOpacity={0.85}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <LoaderCircle size={18} color={theme.text} />
            ) : (
              <Text style={[styles.restoreButtonText, { color: theme.text }]}>Restore purchase</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 3. PRO STATUS SCREEN (when user is Pro)
  if (isPro) {
    const formattedExpiry = formatExpiryDate(expiresAt);
    const daysLeftText = daysRemaining !== null && daysRemaining > 0
      ? `${daysRemaining} days of Pro left`
      : 'Pro Active';

    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
      >
        {/* ── Dismiss button ── */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.dismiss, { backgroundColor: theme.surface, borderColor: theme.border }]}
          activeOpacity={0.75}
        >
          <X size={24} color={theme.text} strokeWidth={3} />
        </TouchableOpacity>

        {/* ── App Logo Branding & Heading ── */}
        <View style={styles.hero}>
          <BrandIcon size={88} />
          <Text style={[styles.heroTitle, { color: theme.text }]}>You are on premium</Text>
          <View style={[styles.daysChip, { backgroundColor: `${theme.primary}18` }]}>
            <Crown size={16} color={theme.primary} />
            <Text style={[styles.daysChipText, { color: theme.primary }]}>{daysLeftText}</Text>
          </View>
        </View>

        {/* ── 3 Perk Rows ── */}
        <View style={[styles.benefitsList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {BENEFITS.map(text => (
            <View key={text} style={styles.benefitRow}>
              <View style={[styles.checkCircle, { backgroundColor: `${theme.success}20` }]}>
                <Check size={14} color={theme.success} strokeWidth={2.5} />
              </View>
              <Text style={[styles.benefitText, { color: theme.text }]}>{text}</Text>
            </View>
          ))}
        </View>

        {/* ── Active Plan Info & Change Plan ── */}
        <View style={[styles.premiumCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.premiumCardRow}>
            <Text style={[styles.premiumCardLabel, { color: theme.textSecondary }]}>Active Plan</Text>
            <View style={[styles.activePlanChip, { backgroundColor: `${theme.success}18` }]}>
              <Text style={[styles.activePlanChipText, { color: theme.success }]}>Active</Text>
            </View>
          </View>
          <Text style={[styles.premiumCardValue, { color: theme.text }]}>
            Sagent Pro — {planName ?? 'Pro'}
          </Text>

          {formattedExpiry && (
            <View style={styles.premiumCardRow}>
              <Text style={[styles.premiumCardLabel, { color: theme.textSecondary }]}>Renews / Expires</Text>
              <Text style={[styles.premiumCardDate, { color: theme.text }]}>{formattedExpiry}</Text>
            </View>
          )}

          {!showPlanChangeOptions ? (
            <TouchableOpacity
              style={[styles.changePlanBtn, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
              onPress={() => setShowPlanChangeOptions(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.changePlanBtnText, { color: theme.primary }]}>Change Plan</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.changePlanBox}>
              <Text style={[styles.switchTitle, { color: theme.text, marginTop: 8 }]}>Select New Plan</Text>

              <View style={styles.toggle}>
                {(['monthly', 'yearly'] as const).map(key => {
                  const p = plans[key];
                  const isActive = plan === key;
                  const isCurrent = BASE_PLAN_IDS[key] === basePlanId;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.planCard,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                        isActive && { borderColor: theme.primary, backgroundColor: theme.surfaceAlt },
                      ]}
                      onPress={() => setPlan(key)}
                      activeOpacity={0.82}
                    >
                      {isCurrent && (
                        <View style={[styles.currentBadge, { backgroundColor: `${theme.success}18` }]}>
                          <Text style={[styles.currentBadgeText, { color: theme.success }]}>Current</Text>
                        </View>
                      )}
                      {key === 'yearly' && p.badge && !isCurrent && (
                        <View style={[styles.inlineBadge, { backgroundColor: theme.primary }]}>
                          <Text style={[styles.badgeText, { color: theme.onPrimary }]}>{p.badge}</Text>
                        </View>
                      )}
                      <Text style={[styles.planLabel, { color: isActive ? theme.primary : theme.textSecondary }]}>
                        {p.label}
                      </Text>
                      <Text style={[styles.planPrice, { color: theme.text }]}>{p.price}</Text>
                      <Text style={[styles.planPeriod, { color: isActive ? theme.primary : theme.textSecondary }]}>
                        {p.period}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[
                  styles.cta,
                  {
                    backgroundColor: BASE_PLAN_IDS[plan] === basePlanId ? theme.surfaceAlt : theme.primary,
                    shadowColor: theme.primary,
                  },
                  isPurchasing && styles.ctaDisabled,
                ]}
                onPress={() => void handleChangePlan()}
                disabled={isPurchasing || BASE_PLAN_IDS[plan] === basePlanId}
                activeOpacity={0.85}
              >
                {isPurchasing ? (
                  <View style={styles.loadingRow}>
                    <LoaderCircle size={18} color={theme.onPrimary} />
                    <Text style={[styles.ctaText, { color: theme.onPrimary }]}>Processing...</Text>
                  </View>
                ) : BASE_PLAN_IDS[plan] === basePlanId ? (
                  <Text style={[styles.ctaText, { color: theme.textSecondary }]}>Current Plan</Text>
                ) : (
                  <Text style={[styles.ctaText, { color: theme.onPrimary }]}>
                    Confirm Switch to {plans[plan].label}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={[styles.finePrint, { color: theme.textSecondary }]}>
          Manage your subscription in Google Play Store settings.
        </Text>
      </ScrollView>
    );
  }

  // 4. NON-PRO PURCHASE PAYWALL VIEW
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* ── Dismiss button ── */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.dismiss, { backgroundColor: theme.surface, borderColor: theme.border }]}
        activeOpacity={0.75}
      >
        <X size={24} color={theme.text} strokeWidth={3} />
      </TouchableOpacity>

      {/* ── Hero ── */}
      <View style={styles.hero}>
        <BrandIcon size={88} />
        <Text style={[styles.heroTitle, { color: theme.text }]}>Sagent Pro</Text>
        <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
          Save 4+ Hours a Month.
        </Text>
      </View>

      {/* ── Benefits list ── */}
      <View style={[styles.benefitsList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {BENEFITS.map(text => (
          <View key={text} style={styles.benefitRow}>
            <View style={[styles.checkCircle, { backgroundColor: `${theme.success}20` }]}>
              <Check size={14} color={theme.success} strokeWidth={2.5} />
            </View>
            <Text style={[styles.benefitText, { color: theme.text }]}>{text}</Text>
          </View>
        ))}
      </View>

      {/* ── Plan toggle ── */}
      <View style={styles.toggle}>
        {(['monthly', 'yearly'] as const).map(key => {
          const p = plans[key];
          const isActive = plan === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.planCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                isActive && { borderColor: theme.primary, backgroundColor: theme.surfaceAlt },
              ]}
              onPress={() => setPlan(key)}
              activeOpacity={0.82}
            >
              {key === 'yearly' ? (
                <>
                  {p.badge && (
                    <View style={[styles.inlineBadge, { backgroundColor: theme.primary }]}>
                      <Text style={[styles.badgeText, { color: theme.onPrimary }]}>{p.badge}</Text>
                    </View>
                  )}
                  <Text style={[styles.planLabel, { color: isActive ? theme.primary : theme.textSecondary }]}>
                    {p.label}
                  </Text>
                </>
              ) : (
                <Text style={[styles.planLabel, { color: isActive ? theme.primary : theme.textSecondary }]}>
                  {p.label}
                </Text>
              )}
              <Text style={[styles.planPrice, { color: theme.text }]}>{p.price}</Text>
              <Text style={[styles.planPeriod, { color: isActive ? theme.primary : theme.textSecondary }]}>
                {p.period}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.cta,
          { backgroundColor: theme.primary, shadowColor: theme.primary },
          (isPurchasing || isLinkingAuth) && styles.ctaDisabled,
        ]}
        onPress={() => void handlePurchase()}
        disabled={isPurchasing || isLinkingAuth}
        activeOpacity={0.85}
      >
        {isLinkingAuth ? (
          <View style={styles.loadingRow}>
            <LoaderCircle size={18} color={theme.onPrimary} />
            <Text style={[styles.ctaText, { color: theme.onPrimary }]}>Signing In...</Text>
          </View>
        ) : isPurchasing ? (
          <View style={styles.loadingRow}>
            <LoaderCircle size={18} color={theme.onPrimary} />
            <Text style={[styles.ctaText, { color: theme.onPrimary }]}>Processing...</Text>
          </View>
        ) : (
          <Text style={[styles.ctaText, { color: theme.onPrimary }]}>
            {user?.isAnonymous
              ? `Sign in to Start with ${active.label.toLowerCase()}`
              : `Start with ${active.label.toLowerCase()}`}
          </Text>
        )}
      </TouchableOpacity>

      {/* ── Restore ── */}
      <TouchableOpacity
        onPress={() => void handleRestore()}
        style={[styles.restoreButton, { borderColor: theme.border }]}
        activeOpacity={0.85}
        disabled={isPurchasing}
      >
        <Text style={[styles.restoreButtonText, { color: theme.text }]}>Restore purchase</Text>
      </TouchableOpacity>

      <Text style={[styles.finePrint, { color: theme.textSecondary }]}>
        Sagent Pro. Cancel anytime.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 64, paddingBottom: 60 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { ...textFont('medium'), fontSize: 16, marginTop: 16 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryButtonText: { ...textFont('bold'), fontSize: 15 },
  dismiss: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  hero: { alignItems: 'center', marginBottom: 24, gap: 12 },
  heroTitle: { ...textFont('bold'), fontSize: 28, textAlign: 'center' },
  heroSubtitle: { ...textFont('regular'), fontSize: 16, textAlign: 'center', lineHeight: 24 },
  daysChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  daysChipText: { ...textFont('bold'), fontSize: 14 },
  benefitsList: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 16, marginBottom: 20 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  checkCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  benefitText: { ...textFont('regular'), fontSize: 15, flex: 1, lineHeight: 22 },
  premiumCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    marginBottom: 20,
  },
  premiumCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumCardLabel: { ...textFont('regular'), fontSize: 14 },
  premiumCardValue: { ...textFont('bold'), fontSize: 19 },
  premiumCardDate: { ...textFont('semibold'), fontSize: 14 },
  activePlanChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activePlanChipText: { ...textFont('semibold'), fontSize: 12 },
  changePlanBtn: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  changePlanBtnText: { ...textFont('bold'), fontSize: 15 },
  changePlanBox: { marginTop: 8, gap: 12 },
  switchTitle: { ...textFont('semibold'), fontSize: 16 },
  toggle: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  planCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    gap: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  inlineBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 2,
  },
  currentBadgeText: { ...textFont('semibold'), fontSize: 11 },
  badgeText: { ...textFont('semibold'), fontSize: 11 },
  planLabel: { ...textFont('semibold'), fontSize: 13, marginBottom: 4 },
  planPrice: { ...textFont('bold'), fontSize: 20 },
  planPeriod: { ...textFont('regular'), fontSize: 11 },
  cta: {
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 8,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { ...textFont('bold'), fontSize: 16 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  restoreButton: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButtonText: { ...textFont('semibold'), fontSize: 15 },
  finePrint: { ...textFont('regular'), fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
});

export default PaywallScreen;
