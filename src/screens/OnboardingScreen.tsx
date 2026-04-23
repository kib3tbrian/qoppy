// src/screens/OnboardingScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../services/database';
import { RootStackParamList } from '../types';
import { useTheme } from '../hooks/useTheme';
import { ANIMATION_DURATION } from '../constants';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Save what you reuse',
      subtitle: 'Keep addresses, links, templates, invoice details, and other repeat text ready to copy.',
      accent: theme.primary,
      body: null,
    },
    {
      title: 'Quick category guide',
      subtitle: 'A simple way to sort your snippets from day one.',
      accent: theme.success,
      body: (
        <View style={styles.guideList}>
          <Text style={[styles.guideLine, { color: theme.text }]}>Finance: IBAN or bank account details, PayPal or payment links, tax numbers, invoice details.</Text>
          <Text style={[styles.guideLine, { color: theme.text }]}>Work: work email, company address, Zoom or Meet links, templates, signatures.</Text>
          <Text style={[styles.guideLine, { color: theme.text }]}>Other: anything that does not fit the categories above.</Text>
        </View>
      ),
    },
    {
      title: 'Security and legal notice',
      subtitle: 'Qoppy is built for convenient snippets, not sensitive credentials.',
      accent: theme.danger,
      body: (
        <View style={styles.guideList}>
          <Text style={[styles.guideLine, { color: theme.text }]}>This app uses local-first storage. Your snippets stay on your device unless you upgrade to cloud backup.</Text>
          <Text style={[styles.guideLine, { color: theme.text }]}>Do not store passwords, full credit card numbers, or government ID PINs.</Text>
          <Text style={[styles.guideLine, { color: theme.text }]}>The app is not designed for storing sensitive authentication credentials.</Text>
          <Text style={[styles.guideLine, { color: theme.text }]}>For GDPR: no clipboard content is sent to external servers on the free plan.</Text>
        </View>
      ),
    },
  ];

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const handleNext = async () => {
    if (isLast) {
      await db.setPreference('onboarded', 'true');
      navigation.replace('Main');
      return;
    }

    setStep(prev => prev + 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View
        key={step}
        entering={FadeInRight.duration(ANIMATION_DURATION.normal)}
        exiting={FadeOutLeft.duration(ANIMATION_DURATION.fast)}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: current.accent }]}
      >
        <View style={[styles.accent, { backgroundColor: current.accent }]} />
        <Text style={[styles.title, { color: theme.text }]}>{current.title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{current.subtitle}</Text>
        {current.body}
      </Animated.View>

      <View style={styles.dots}>
        {steps.map((item, index) => (
          <View
            key={item.title}
            style={[
              styles.dot,
              {
                backgroundColor: index === step ? current.accent : theme.border,
                width: index === step ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: current.accent }]}
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={[styles.btnText, { color: theme.onPrimary }]}>{isLast ? 'Get Started' : 'Next'}</Text>
      </TouchableOpacity>

      {!isLast && (
        <TouchableOpacity onPress={handleNext} style={styles.skip}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    marginBottom: 32,
  },
  accent: {
    width: 54,
    height: 6,
    borderRadius: 999,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 18,
  },
  guideList: {
    gap: 12,
  },
  guideLine: {
    fontSize: 14,
    lineHeight: 21,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  btn: {
    width: '100%',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnText: {
    fontSize: 17,
    fontWeight: '700',
  },
  skip: {
    padding: 8,
  },
  skipText: {
    fontSize: 15,
  },
});

export default OnboardingScreen;
