// src/styles.ts
//
// Shared theme-aware styles for auth screens and loaders.

import { StyleSheet } from 'react-native';
import { AppThemePalette } from './hooks/useTheme';

export const createAppStyles = (theme: AppThemePalette) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    lockContainer: {
      flex: 1,
      backgroundColor: theme.background,
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    lockContent: {
      alignItems: 'center',
    },
    lockTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    lockSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
    },
    lockMessage: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    pinInput: {
      width: '100%',
      height: 64,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 32,
      paddingHorizontal: 16,
      fontSize: 18,
      color: theme.text,
      backgroundColor: theme.surface,
      textAlign: 'center',
      marginBottom: 16,
    },
    authOptionRow: {
      width: '100%',
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    authOptionCard: {
      flex: 1,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      paddingVertical: 14,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    authOptionCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primarySoft,
    },
    authOptionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    authOptionTitleActive: {
      color: theme.primary,
    },
    authOptionText: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    cooldownText: {
      fontSize: 14,
      color: theme.danger,
      marginBottom: 16,
      textAlign: 'center',
    },
    unlockButton: {
      width: '100%',
      height: 50,
      backgroundColor: theme.primary,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    unlockButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.onPrimary,
    },
    biometricButton: {
      width: '100%',
      height: 50,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    biometricButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
    },
    disabledButton: {
      opacity: 0.5,
    },
    setupContainer: {
      flex: 1,
      backgroundColor: theme.background,
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    setupContent: {
      alignItems: 'center',
    },
    setupTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    setupSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
    },
    setupButton: {
      width: '100%',
      height: 50,
      backgroundColor: theme.primary,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    setupButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.onPrimary,
    },
    skip: {
      marginTop: 16,
      paddingVertical: 8,
    },
    skipText: {
      fontSize: 15,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    biometricToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    biometricToggleText: {
      fontSize: 16,
      color: theme.text,
    },
    helperCard: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 16,
    },
    helperTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 6,
    },
    helperText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 21,
    },
  });
