import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { AuthMethod, validateAuthSetup } from '../services/authValidation';
import { styles } from '../styles';
import { RootStackParamList } from '../types';

type SetupPinRoute = RouteProp<RootStackParamList, 'SetupPIN'>;
type SetupPinNav = NativeStackNavigationProp<RootStackParamList>;

const METHOD_COPY: Record<AuthMethod, { title: string; hint: string }> = {
  pin: { title: '4-Digit PIN', hint: 'Quick numeric unlock' },
  password: { title: 'Password', hint: '6 letters or numbers' },
  biometric: { title: 'Biometric', hint: 'Use fingerprint or face unlock' },
};

export const SetupPINScreen: React.FC = () => {
  const navigation = useNavigation<SetupPinNav>();
  const route = useRoute<SetupPinRoute>();
  const fromSettings = Boolean(route.params?.fromSettings);
  const {
    setupProtection,
    skipPinSetup,
    isBiometricAvailable,
    isProtectionEnabled,
  } = useAuth();

  const [method, setMethod] = useState<AuthMethod>('pin');
  const [secret, setSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const labels = useMemo(() => {
    if (method === 'password') {
      return {
        title: 'Password',
        placeholder: 'Enter password',
        confirmPlaceholder: 'Confirm password',
        keyboardType: 'default' as const,
        helper: 'Use exactly 6 characters with at least 1 letter and 1 number.',
      };
    }

    return {
      title: 'PIN',
      placeholder: 'Enter 4-digit PIN',
      confirmPlaceholder: 'Confirm 4-digit PIN',
      keyboardType: 'number-pad' as const,
      helper: 'Use exactly 4 digits for a quick local unlock.',
    };
  }, [method]);

  const handleSecretChange = (value: string) => {
    if (method === 'pin') {
      setSecret(value.replace(/\D/g, '').slice(0, 4));
      return;
    }

    setSecret(value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6));
  };

  const handleConfirmChange = (value: string) => {
    if (method === 'pin') {
      setConfirmSecret(value.replace(/\D/g, '').slice(0, 4));
      return;
    }

    setConfirmSecret(value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6));
  };

  const handleMethodSelect = (nextMethod: AuthMethod) => {
    setMethod(nextMethod);
    setSecret('');
    setConfirmSecret('');
    if (nextMethod === 'biometric') {
      setEnableBiometric(true);
    }
  };

  const handleSetup = async () => {
    const validation = validateAuthSetup(method, secret, confirmSecret, isBiometricAvailable);
    if (!validation.valid) {
      Alert.alert('Invalid App Lock', validation.error ?? 'Please review your app lock details and try again.');
      return;
    }

    setIsLoading(true);
    const success = await setupProtection(method, secret.trim(), confirmSecret.trim(), method === 'biometric' ? true : enableBiometric);
    setIsLoading(false);

    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (fromSettings) {
        navigation.goBack();
      }
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Setup Failed', 'Unable to save your app lock settings right now. Please try again.');
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    await skipPinSetup();
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.setupContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.setupContent}
      >
        <Text style={styles.setupTitle}>
          {fromSettings && isProtectionEnabled ? 'Update App Lock' : 'Set Up App Lock'}
        </Text>
        <Text style={styles.setupSubtitle}>
          Choose how Qoppy unlocks on this phone. Everything is saved locally on your device.
        </Text>

        <View style={styles.authOptionRow}>
          {(['pin', 'password', 'biometric'] as AuthMethod[]).map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.authOptionCard, method === option && styles.authOptionCardActive]}
              onPress={() => handleMethodSelect(option)}
              activeOpacity={0.85}
              disabled={isLoading || (option === 'biometric' && !isBiometricAvailable)}
            >
              <Text style={[styles.authOptionTitle, method === option && styles.authOptionTitleActive]}>
                {METHOD_COPY[option].title}
              </Text>
              <Text style={styles.authOptionText}>
                {option === 'biometric' && !isBiometricAvailable
                  ? 'Not available'
                  : METHOD_COPY[option].hint}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {method === 'biometric' ? (
          <View style={styles.helperCard}>
            <Text style={styles.helperTitle}>Biometric unlock</Text>
            <Text style={styles.helperText}>
              Qoppy will use the fingerprint or face unlock already configured on this phone.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.helperCard}>
              <Text style={styles.helperTitle}>{labels.title} requirements</Text>
              <Text style={styles.helperText}>{labels.helper}</Text>
            </View>

            <TextInput
              style={styles.pinInput}
              value={secret}
              onChangeText={handleSecretChange}
              placeholder={labels.placeholder}
              keyboardType={labels.keyboardType}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              maxLength={method === 'pin' ? 4 : 6}
              editable={!isLoading}
            />

            <TextInput
              style={styles.pinInput}
              value={confirmSecret}
              onChangeText={handleConfirmChange}
              placeholder={labels.confirmPlaceholder}
              keyboardType={labels.keyboardType}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              maxLength={method === 'pin' ? 4 : 6}
              editable={!isLoading}
              onSubmitEditing={handleSetup}
            />
          </>
        )}

        {isBiometricAvailable && method !== 'biometric' && (
          <View style={styles.biometricToggle}>
            <Text style={styles.biometricToggleText}>Also allow biometric unlock</Text>
            <Switch
              value={enableBiometric}
              onValueChange={setEnableBiometric}
              disabled={isLoading}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.setupButton, isLoading && styles.disabledButton]}
          onPress={handleSetup}
          disabled={isLoading}
        >
          <Text style={styles.setupButtonText}>
            {isLoading ? 'Saving...' : fromSettings ? 'Save App Lock' : 'Continue'}
          </Text>
        </TouchableOpacity>

        {!fromSettings && (
          <TouchableOpacity
            style={styles.skip}
            onPress={handleSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
