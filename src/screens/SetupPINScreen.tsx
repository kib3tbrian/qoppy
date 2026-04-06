// src/screens/SetupPINScreen.tsx
//
// Setup PIN Screen — First-launch PIN creation with confirmation.
// Allows enabling biometric unlock.

import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { styles } from '../styles';

export const SetupPINScreen: React.FC = () => {
  const { setupPin, skipPinSetup, isBiometricAvailable } = useAuth();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSetup = async () => {
    if (pin.length < 4 || pin.length > 6) {
      Alert.alert('Invalid PIN', 'PIN must be 4-6 digits');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'PINs do not match');
      return;
    }

    setIsLoading(true);
    const success = await setupPin(pin, confirmPin, enableBiometric);
    setIsLoading(false);

    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Setup Failed', 'Unable to set up authentication');
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
        <Text style={styles.setupTitle}>Set Up PIN</Text>
        <Text style={styles.setupSubtitle}>
          Add a 4-6 digit PIN to protect your snippets, or skip for now
        </Text>

        <TextInput
          style={styles.pinInput}
          value={pin}
          onChangeText={setPin}
          placeholder="Enter PIN"
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
          editable={!isLoading}
        />

        <TextInput
          style={styles.pinInput}
          value={confirmPin}
          onChangeText={setConfirmPin}
          placeholder="Confirm PIN"
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
          editable={!isLoading}
          onSubmitEditing={handleSetup}
        />

        {isBiometricAvailable && (
          <View style={styles.biometricToggle}>
            <Text style={styles.biometricToggleText}>Enable biometric unlock</Text>
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
            {isLoading ? 'Setting up...' : 'Set Up PIN'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skip}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
