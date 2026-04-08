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
import { Crown, Check, X, Shield, CreditCard, Bitcoin } from 'lucide-react-native';
import { COLORS } from '../constants';
import { textFont } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';
import { db } from '../services/database';

const BENEFITS = [
  'Unlimited snippets instead of the free-tier cap of 10',
  'Cloud backup and sync boilerplate',
  'Priority support and future premium perks',
];

const PAYMENT_METHODS = [
  {
    key: 'stripe',
    label: 'Credit Card',
    subtitle: 'Stripe checkout boilerplate',
    icon: CreditCard,
  },
  {
    key: 'usdt',
    label: 'USDT',
    subtitle: 'Crypto payment placeholder',
    icon: Shield,
  },
  {
    key: 'btc',
    label: 'BTC',
    subtitle: 'Bitcoin payment placeholder',
    icon: Bitcoin,
  },
] as const;

type PlanKey = 'monthly' | 'yearly';
type PaymentMethodKey = typeof PAYMENT_METHODS[number]['key'];

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
  const { theme } = useTheme();
  const [plan, setPlan] = useState<PlanKey>('yearly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('stripe');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const purchase = async () => {
    setIsPurchasing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await db.setPreference('premium_enabled', 'true');
      Alert.alert(
        'Premium boilerplate ready',
        `Selected ${paymentMethod.toUpperCase()} for the ${plan} plan. Premium has been enabled locally on this device for now.`
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Purchase failed', error?.message ?? 'Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const restorePurchases = async () => {
    Alert.alert('Restore', 'Hook your purchase restore flow here when your secure payment setup is ready.');
  };

  const active = PLANS[plan];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Crown size={44} color={theme.primary} fill={`${theme.primary}20`} />
        <Text style={[styles.heroTitle, { color: theme.text }]}>Qoppy Premium</Text>
        <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>Free includes up to 10 snippets. Premium unlocks unlimited snippets and future upgrade-ready features.</Text>
      </View>

      <View style={styles.benefitsList}>
        {BENEFITS.map(text => (
          <View key={text} style={styles.benefitRow}>
            <View style={styles.checkCircle}>
              <Check size={14} color={COLORS.success} strokeWidth={2.5} />
            </View>
            <Text style={styles.benefitText}>{text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.toggle}>
        {(['monthly', 'yearly'] as const).map(key => {
          const selectedPlan = PLANS[key];
          const isActive = plan === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.planCard, isActive && styles.planCardActive]}
              onPress={() => setPlan(key)}
              activeOpacity={0.8}
            >
              {selectedPlan.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{selectedPlan.badge}</Text>
                </View>
              )}
              <Text style={[styles.planLabel, isActive && styles.planLabelActive]}>{selectedPlan.label}</Text>
              <Text style={[styles.planPrice, isActive && styles.planPriceActive]}>{selectedPlan.price}</Text>
              <Text style={[styles.planPeriod, isActive && styles.planPeriodActive]}>{selectedPlan.period}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.paymentSection}>
        <Text style={styles.paymentTitle}>Payment methods</Text>
        <Text style={styles.paymentSubtitle}>Choose the boilerplate flow you want to connect later.</Text>

        {PAYMENT_METHODS.map(method => {
          const Icon = method.icon;
          const isActive = paymentMethod === method.key;
          return (
            <TouchableOpacity
              key={method.key}
              style={[styles.paymentMethod, isActive && styles.paymentMethodActive]}
              onPress={() => setPaymentMethod(method.key)}
              activeOpacity={0.85}
            >
              <View style={[styles.paymentBadge, isActive && styles.paymentBadgeActive]}>
                <Icon size={16} color={isActive ? '#7C3AED' : '#6B7280'} />
              </View>
              <View style={styles.paymentTextWrap}>
                <Text style={[styles.paymentMethodLabel, isActive && styles.paymentMethodLabelActive]}>{method.label}</Text>
                <Text style={styles.paymentMethodSubtitle}>{method.subtitle}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.cta, isPurchasing && styles.ctaDisabled]}
        onPress={purchase}
        disabled={isPurchasing}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>
          {isPurchasing ? 'Preparing checkout...' : `Continue with ${active.label} - ${active.price}`}
        </Text>
      </TouchableOpacity>

      <Text style={styles.finePrint}>
        Stripe, USDT, and BTC are boilerplate entry points only right now. Secure payment handling can be connected later.
      </Text>

      <TouchableOpacity onPress={restorePurchases} style={styles.restoreBtn}>
        <Text style={styles.restoreText}>Restore purchases</Text>
      </TouchableOpacity>

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
  heroTitle: { ...textFont(), fontSize: 30, fontWeight: '900', color: '#1E1B2E' },
  heroSubtitle: { ...textFont(), fontSize: 17, fontWeight: '700', color: '#6B7280', textAlign: 'center', lineHeight: 27 },
  benefitsList: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#DDD6FE', padding: 20, gap: 16, marginBottom: 28 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  checkCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.success + '20', alignItems: 'center', justifyContent: 'center' },
  benefitText: { ...textFont(), fontSize: 16, color: '#1E1B2E', fontWeight: '600', flex: 1, lineHeight: 23 },
  toggle: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  planCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1.5, borderColor: '#DDD6FE', padding: 18, alignItems: 'center', gap: 4, position: 'relative', overflow: 'hidden' },
  planCardActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  badge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { ...textFont(), fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  planLabel: { ...textFont(), fontSize: 14, fontWeight: '600', color: '#6B7280' },
  planLabelActive: { color: '#7C3AED' },
  planPrice: { ...textFont(), fontSize: 28, fontWeight: '800', color: '#1E1B2E' },
  planPriceActive: { color: '#1E1B2E' },
  planPeriod: { ...textFont(), fontSize: 13, color: '#6B7280' },
  planPeriodActive: { color: '#7C3AED' },
  paymentSection: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#DDD6FE', padding: 18, gap: 12, marginBottom: 24 },
  paymentTitle: { ...textFont(), fontSize: 17, fontWeight: '800', color: '#1E1B2E' },
  paymentSubtitle: { ...textFont(), fontSize: 14, color: '#6B7280', lineHeight: 21 },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E9D5FF', padding: 12, backgroundColor: '#FAF5FF' },
  paymentMethodActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  paymentBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  paymentBadgeActive: { backgroundColor: '#EEE7FF' },
  paymentTextWrap: { flex: 1 },
  paymentMethodLabel: { ...textFont(), fontSize: 15, fontWeight: '700', color: '#1E1B2E' },
  paymentMethodLabelActive: { color: '#7C3AED' },
  paymentMethodSubtitle: { ...textFont(), fontSize: 13, color: '#6B7280', marginTop: 2, lineHeight: 19 },
  cta: { backgroundColor: '#7C3AED', borderRadius: 18, padding: 18, alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6, marginBottom: 16 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { ...textFont(), color: '#fff', fontSize: 17, fontWeight: '800' },
  finePrint: { ...textFont(), fontSize: 13, fontWeight: '700', color: '#6B7280', textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  restoreBtn: { alignItems: 'center', padding: 8 },
  restoreText: { ...textFont(), color: '#6B7280', fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },
  dismiss: { position: 'absolute', top: 16, right: 16, padding: 8 },
});

export default PaywallScreen;
