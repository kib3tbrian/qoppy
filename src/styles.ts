// src/styles.ts
//
// Shared styles for auth screens and components.

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDE9F6',
  },

  // Lock Screen
  lockContainer: {
    flex: 1,
    backgroundColor: '#EDE9F6',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  lockContent: {
    alignItems: 'center',
  },
  lockTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E1B2E',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  lockMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  pinInput: {
    width: '100%',
    height: 64,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 32,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#1E1B2E',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  cooldownText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  unlockButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  biometricButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
  },
  disabledButton: {
    opacity: 0.5,
  },

  // Setup Screen
  setupContainer: {
    flex: 1,
    backgroundColor: '#EDE9F6',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  setupContent: {
    alignItems: 'center',
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E1B2E',
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  setupButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skip: {
    marginTop: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  biometricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  biometricToggleText: {
    fontSize: 16,
    color: '#1E1B2E',
  },
});
