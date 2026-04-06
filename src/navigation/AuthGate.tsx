// src/navigation/AuthGate.tsx
//
// Auth Gate — Wraps the root navigator with authentication checks.
// Shows setup, lock, or main app based on auth state.

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { LockScreen } from '../screens/LockScreen';
import { SetupPINScreen } from '../screens/SetupPINScreen';
import { styles } from '../styles';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { isAuthenticated, isLoading, isProtectionEnabled, needsSetup } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (needsSetup) {
    return <SetupPINScreen />;
  }

  if (isProtectionEnabled && !isAuthenticated) {
    return <LockScreen />;
  }

  return <>{children}</>;
};
