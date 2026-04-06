// src/screens/PaywallScreen.tsx
//
// Premium paywall. RevenueCat integration is stubbed — replace
// the `purchase()` function with your actual RC calls.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Crown, Check, X, Zap, Cloud, Shield } from 'lucide-react-native';
import { COLORS } from '../constants';

const BENEFITS = [
  { icon: Zap, text: 'Unlimited snippets (free = 10)' },
  { icon: Cloud, text: 'Cloud backup & sync across devices' },
  { icon: Shield, text: 'No ads, ever' },
  { icon: Crown, text: 'Priority support' },
];

type PlanKey = 'monthly' | 'yearly';

interface PlanConfig {
  label: string;
  price: string;
  period: string;
  annualCost: string | null;
  badge?: string;
}

const PLANS: Record<PlanKey, PlanConfig> = {
  monthly: { label: 'Monthly', price: '$1.99', period: '/month', annualCost: '$23.88/yr' },
  yearly: { label: 'Yearly', price: '$19.99', period: '/year', badge: 'Save 16%', annualCost: null },
};

export const PaywallScreen: React.FC = () => {
  const navigation = useNavigation();
  const [plan, setPlan] = useState<PlanKey>('yearly');
  const [isPurchasing, setIsPurchasing] = useState(false);

  // ── RevenueCat stub ─────────────────────────────────────────────────
  const purchase = async () => {
    setIsPurchasing(true);
    try {
      // TODO: Replace with real RevenueCat purchase
      // const { customerInfo } = await Purchases.purchaseProduct(
      //   plan === 'yearly' ? 'cm_premium_yearly' : 'cm_premium_monthly'
      // );
      await new Promise(r => setTimeout(r, 1200));   // simulate network
      Alert.alert('🎉 Welcome to Premium!', 'Your subscription is active.');
      navigation.goBack();
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', e.message ?? 'Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const restorePurchases = async () => {
    // TODO: Purchases.restorePurchases()
    Alert.alert('Restore', 'No previous purchases found on this account.');
  };

  const active = PLANS[plan];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <Crown size={44} color="#7C3AED" fill="#7C3AED20" />
        <Text style={styles.heroTitle}>Clipsafe Premium</Text>
        <Text style={styles.heroSubtitle}>Unlock everything. Copy faster.</Text>
      </View>

      {/* Benefits */}
      <View style={styles.benefitsList}>
        {BENEFITS.map(({ icon: Icon, text }) => (
          <View key={text} style={styles.benefitRow}>
            <View style={styles.checkCircle}>
              <Check size={14} color={COLORS.success} strokeWidth={2.5} />
            </View>
            <Text style={styles.benefitText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* Plan toggle */}
      <View style={styles.toggle}>
        {(['monthly', 'yearly'] as const).map(key => {
          const p = PLANS[key];
          const isActive = plan === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.planCard, isActive && styles.planCardActive]}
              onPress={() => setPlan(key)}
              activeOpacity={0.8}
            >
              {p.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{p.badge}</Text>
                </View>
              )}
              <Text style={[styles.planLabel, isActive && styles.planLabelActive]}>{p.label}</Text>
              <Text style={[styles.planPrice, isActive && styles.planPriceActive]}>{p.price}</Text>
              <Text style={[styles.planPeriod, isActive && { color: '#7C3AED' }]}>{p.period}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.cta, isPurchasing && styles.ctaDisabled]}
        onPress={purchase}
        disabled={isPurchasing}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>
          {isPurchasing ? 'Processing…' : `Start ${active.label} – ${active.price}`}
        </Text>
      </TouchableOpacity>

      {/* Fine print */}
      <Text style={styles.finePrint}>
        Subscription auto-renews. Cancel any time in App Store settings.
      </Text>

      <TouchableOpacity onPress={restorePurchases} style={styles.restoreBtn}>
        <Text style={styles.restoreText}>Restore purchases</Text>
      </TouchableOpacity>

      {/* Dismiss */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.dismiss}>
        <X size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE9F6' },
  content: { padding: 24, paddingBottom: 60 },
  hero: { alignItems: 'center', marginVertical: 32, gap: 12 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#1E1B2E' },
  heroSubtitle: { fontSize: 16, color: '#6B7280' },
  benefitsList: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#DDD6FE', padding: 20, gap: 16, marginBottom: 28 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  checkCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.success + '20', alignItems: 'center', justifyContent: 'center' },
  benefitText: { fontSize: 15, color: '#1E1B2E', fontWeight: '500', flex: 1 },
  toggle: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  planCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1.5, borderColor: '#DDD6FE', padding: 18, alignItems: 'center', gap: 4, position: 'relative', overflow: 'hidden' },
  planCardActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  badge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  planLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  planLabelActive: { color: '#7C3AED' },
  planPrice: { fontSize: 26, fontWeight: '800', color: '#1E1B2E' },
  planPriceActive: { color: '#1E1B2E' },
  planPeriod: { fontSize: 12, color: '#6B7280' },
  cta: { backgroundColor: '#7C3AED', borderRadius: 18, padding: 18, alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6, marginBottom: 16 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  finePrint: { fontSize: 11, color: '#6B7280', textAlign: 'center', lineHeight: 16, marginBottom: 16 },
  restoreBtn: { alignItems: 'center', padding: 8 },
  restoreText: { color: '#6B7280', fontSize: 13, textDecorationLine: 'underline' },
  dismiss: { position: 'absolute', top: 16, right: 16, padding: 8 },
});

export default PaywallScreen;
