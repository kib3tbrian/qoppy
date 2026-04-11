// src/navigation/AuthGate.tsx
//
// Auth Gate — Wraps the root navigator with authentication checks.
// Shows setup, lock, or main app based on auth state.

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { LockScreen } from '../screens/LockScreen';
import { SetupPINScreen } from '../screens/SetupPINScreen';
import { createAppStyles } from '../styles';
import { useTheme } from '../hooks/useTheme';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { theme } = useTheme();
  const styles = createAppStyles(theme);
  const { isAuthenticated, isLoading, isProtectionEnabled, needsSetup } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
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
