import { useState, useEffect, useRef } from 'react';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../providers/AuthProvider';
import { db } from '../services/database';

export interface EntitlementData {
  isPro: boolean;
  basePlanId?: string;
  expiryDate?: string;
}

export interface UseEntitlementReturn {
  loading: boolean;
  isPro: boolean;
  expiresAt: Date | null;
  plan: string | null;
  daysRemaining: number | null;
  basePlanId?: string;
  expiryDate?: string;
}

export function useEntitlement(): UseEntitlementReturn {
  const { user } = useAuth();
  const [data, setData] = useState<EntitlementData>({ isPro: false });
  const [loading, setLoading] = useState(true);
  const lastSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setData({ isPro: false });
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('entitlement')
        .doc('pro')
        .onSnapshot(
          (docSnapshot) => {
            let isPro = false;
            let basePlanId: string | undefined;
            let expiryDate: string | undefined;

            if (docSnapshot.exists) {
              const raw = docSnapshot.data();
              if (raw) {
                isPro = raw.isPro ?? false;
                basePlanId = raw.basePlanId;
                expiryDate = raw.expiryDate;
              }
            }

            setData({ isPro, basePlanId, expiryDate });

            // Write to SQLite when the value actually changes
            const value = isPro ? 'true' : 'false';
            if (lastSyncedRef.current !== value) {
              lastSyncedRef.current = value;
              db.setPreference('premium_enabled', value).catch((err) =>
                console.error('[Entitlement] Failed to persist premium flag:', err)
              );
            }

            setLoading(false);
          },
          (error) => {
            console.error('[Entitlement] Firestore snapshot error:', error);
            // Fall back to locally cached SQLite value so app stays usable
            db.getPreference('premium_enabled', 'false')
              .then((val) => {
                setData({ isPro: val === 'true' });
              })
              .catch(() => {})
              .finally(() => setLoading(false));
          }
        );
    } catch (err) {
      console.error('[Entitlement] Failed to attach Firestore listener:', err);
      db.getPreference('premium_enabled', 'false')
        .then((val) => {
          setData({ isPro: val === 'true' });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  let expiresAt: Date | null = null;
  if (data.expiryDate) {
    const parsed = new Date(data.expiryDate);
    if (!isNaN(parsed.getTime())) {
      expiresAt = parsed;
    }
  }

  let daysRemaining: number | null = null;
  if (expiresAt) {
    const diff = expiresAt.getTime() - Date.now();
    daysRemaining = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
  }

  let plan: string | null = null;
  if (data.basePlanId === 'pro-yearly') {
    plan = 'Yearly';
  } else if (data.basePlanId === 'pro-monthly') {
    plan = 'Monthly';
  } else if (data.basePlanId) {
    plan = data.basePlanId;
  }

  return {
    loading,
    isPro: data.isPro,
    expiresAt,
    plan,
    daysRemaining,
    basePlanId: data.basePlanId,
    expiryDate: data.expiryDate,
  };
}
