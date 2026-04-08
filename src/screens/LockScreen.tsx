import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { validateCredential } from '../services/authValidation';
import { styles } from '../styles';

export const LockScreen: React.FC = () => {
  const {
    unlockWithSecret,
    unlockWithBiometric,
    isBiometricAvailable,
    isBiometricEnabled,
    isLocked,
    lockoutTimeRemaining,
    cooldownTimeRemaining,
    authMethod,
  } = useAuth();

  const [secret, setSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const lockCopy = useMemo(() => {
    if (authMethod === 'password') {
      return {
        title: 'Enter Password',
        placeholder: '6-character password',
        keyboardType: 'default' as const,
        errorTitle: 'Incorrect Password',
        helper: 'Use the 6-character password saved on this phone.',
      };
    }

    if (authMethod === 'biometric') {
      return {
        title: 'Unlock with Biometrics',
        placeholder: '',
        keyboardType: 'default' as const,
        errorTitle: 'Biometric Unlock Failed',
        helper: 'Use your fingerprint or face unlock to continue.',
      };
    }

    return {
      title: 'Enter PIN',
      placeholder: '4-digit PIN',
      keyboardType: 'number-pad' as const,
      errorTitle: 'Incorrect PIN',
      helper: 'Use the 4-digit PIN saved on this phone.',
    };
  }, [authMethod]);

  useEffect(() => {
    if (isBiometricEnabled && !isLocked) {
      void handleBiometricUnlock();
    }
  }, [isBiometricEnabled, isLocked]);

  const handleSecretChange = (value: string) => {
    if (authMethod === 'password') {
      setSecret(value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6));
      return;
    }

    setSecret(value.replace(/\D/g, '').slice(0, 4));
  };

  const handleSecretSubmit = async () => {
    if (!authMethod || authMethod === 'biometric') {
      return;
    }

    const validation = validateCredential(authMethod, secret);
    if (!validation.valid) {
      Alert.alert('Invalid App Lock', validation.error ?? 'Please enter a valid app lock value.');
      return;
    }

    setIsLoading(true);
    const success = await unlockWithSecret(secret.trim());
    setIsLoading(false);

    if (!success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(lockCopy.errorTitle, 'Please try again.');
      setSecret('');
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleBiometricUnlock = async () => {
    setIsLoading(true);
    const success = await unlockWithBiometric();
    setIsLoading(false);

    if (!success && authMethod === 'biometric') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  if (isLocked) {
    return (
      <SafeAreaView style={styles.lockContainer}>
        <View style={styles.lockContent}>
          <Text style={styles.lockTitle}>Account Locked</Text>
          <Text style={styles.lockSubtitle}>
            Too many failed attempts. Please wait before trying again.
          </Text>
          <Text style={styles.lockMessage}>
            You can try again in {formatTime(lockoutTimeRemaining)}.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.lockContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.lockContent}
      >
        <Text style={styles.lockTitle}>{lockCopy.title}</Text>
        <Text style={styles.lockSubtitle}>{lockCopy.helper}</Text>

        {authMethod !== 'biometric' && (
          <TextInput
            style={styles.pinInput}
            value={secret}
            onChangeText={handleSecretChange}
            placeholder={lockCopy.placeholder}
            keyboardType={lockCopy.keyboardType}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            maxLength={authMethod === 'password' ? 6 : 4}
            editable={!isLoading && cooldownTimeRemaining === 0}
            onSubmitEditing={handleSecretSubmit}
          />
        )}

        {cooldownTimeRemaining > 0 && (
          <Text style={styles.cooldownText}>
            Too many attempts. Try again in {formatTime(cooldownTimeRemaining)}
          </Text>
        )}

        {authMethod !== 'biometric' && (
          <TouchableOpacity
            style={[styles.unlockButton, (isLoading || cooldownTimeRemaining > 0) && styles.disabledButton]}
            onPress={handleSecretSubmit}
            disabled={isLoading || cooldownTimeRemaining > 0}
          >
            <Text style={styles.unlockButtonText}>
              {isLoading ? 'Unlocking...' : 'Unlock'}
            </Text>
          </TouchableOpacity>
        )}

        {isBiometricAvailable && isBiometricEnabled && (
          <TouchableOpacity
            style={[styles.biometricButton, isLoading && styles.disabledButton]}
            onPress={handleBiometricUnlock}
            disabled={isLoading}
          >
            <Text style={styles.biometricButtonText}>
              {authMethod === 'biometric' ? 'Unlock with Biometrics' : 'Use Biometrics'}
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
