import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { WifiOff, AlertCircle, Sparkles } from 'lucide-react-native';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle, icon, actionLabel, onAction }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      {icon || <Sparkles size={42} color={theme.primary} style={styles.icon} />}
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={onAction}>
          <Text style={[styles.buttonText, { color: theme.onPrimary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message = 'Something went wrong', onRetry }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <AlertCircle size={42} color={theme.danger} style={styles.icon} />
      <Text style={[styles.title, { color: theme.text }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.danger }]} onPress={onRetry}>
          <Text style={[styles.buttonText, { color: theme.onPrimary }]}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.subtitle, { color: theme.textSecondary, marginTop: 16 }]}>{message}</Text>
    </View>
  );
};

export const OfflineBadge: React.FC<{ isOffline: boolean, isSlow?: boolean }> = ({ isOffline, isSlow }) => {
  const { theme } = useTheme();
  
  if (!isOffline && !isSlow) return null;

  return (
    <View style={[styles.offlineBadge, { backgroundColor: isOffline ? theme.danger : theme.warning }]}>
      <WifiOff size={14} color={theme.onPrimary} style={{ marginRight: 6 }} />
      <Text style={[styles.offlineText, { color: theme.onPrimary }]}>
        {isOffline ? 'Offline Mode' : 'Slow Connection'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
  }
});
