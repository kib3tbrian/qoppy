import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { authService } from '../services/authService';
import { AuthMethod, validateAuthSetup, validateCredential } from '../services/authValidation';

const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000;
const COOLDOWN_DURATION = 30 * 1000;
const LOCKOUT_DURATION = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isProtectionEnabled: boolean;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  authMethod: AuthMethod | null;
  failedAttempts: number;
  isLocked: boolean;
  lockoutTimeRemaining: number;
  cooldownTimeRemaining: number;
  needsSetup: boolean;
}

interface AuthContextValue extends AuthState {
  unlockWithSecret: (secret: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  setupProtection: (
    method: AuthMethod,
    secret: string,
    confirmSecret: string,
    enableBiometric?: boolean
  ) => Promise<boolean>;
  skipPinSetup: () => Promise<void>;
  disableProtection: () => Promise<void>;
  lock: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    isProtectionEnabled: false,
    isBiometricAvailable: false,
    isBiometricEnabled: false,
    authMethod: null,
    failedAttempts: 0,
    isLocked: false,
    lockoutTimeRemaining: 0,
    cooldownTimeRemaining: 0,
    needsSetup: true,
  });
  const [lastBackgroundTime, setLastBackgroundTime] = useState<number | null>(null);

  const initializeAuth = useCallback(async () => {
    try {
      const [config, hasBiometricHardware, isBiometricEnrolled, hasProtectionConfigured] = await Promise.all([
        authService.getAuthConfig(),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        authService.hasProtectionConfigured(),
      ]);
      const biometricAvailable = hasBiometricHardware && isBiometricEnrolled;
      const authMethod = config?.authMethod ?? null;
      const isProtectionEnabled = hasProtectionConfigured;
      const isLocked = config ? authService.isLocked(config.lockedUntil) : false;
      const lockoutTimeRemaining = config ? authService.getLockoutTimeRemaining(config.lockedUntil) : 0;

      setState(prev => ({
        ...prev,
        isAuthenticated: isProtectionEnabled ? authService.isAuthenticated() : true,
        isProtectionEnabled,
        isBiometricAvailable: biometricAvailable,
        isBiometricEnabled: biometricAvailable && Boolean(config?.biometricEnabled || authMethod === 'biometric'),
        authMethod,
        failedAttempts: config?.failedAttempts ?? 0,
        isLocked,
        lockoutTimeRemaining,
        needsSetup: config === null,
        isLoading: false,
      }));
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const lock = useCallback(() => {
    authService.clearSessionToken();
    setState(prev => ({
      ...prev,
      isAuthenticated: prev.isProtectionEnabled ? false : true,
    }));
  }, []);

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      setLastBackgroundTime(Date.now());
      return;
    }

    if (
      nextAppState === 'active' &&
      lastBackgroundTime &&
      Date.now() - lastBackgroundTime > AUTO_LOCK_TIMEOUT &&
      authService.isAuthenticated()
    ) {
      lock();
    }

    if (nextAppState === 'active') {
      setLastBackgroundTime(null);
    }
  }, [lastBackgroundTime, lock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  useEffect(() => {
    if (state.cooldownTimeRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        cooldownTimeRemaining: Math.max(0, prev.cooldownTimeRemaining - 1000),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.cooldownTimeRemaining]);

  useEffect(() => {
    if (state.lockoutTimeRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setState(prev => {
        const remaining = Math.max(0, prev.lockoutTimeRemaining - 1000);
        return {
          ...prev,
          lockoutTimeRemaining: remaining,
          isLocked: remaining > 0,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.lockoutTimeRemaining]);

  const handleFailedAttempt = useCallback(async () => {
    const newAttempts = state.failedAttempts + 1;
    await authService.incrementFailedAttempts();

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      await authService.lockAccount(LOCKOUT_DURATION);
      setState(prev => ({
        ...prev,
        failedAttempts: 0,
        isLocked: true,
        lockoutTimeRemaining: LOCKOUT_DURATION,
        cooldownTimeRemaining: 0,
        isAuthenticated: false,
      }));
      return;
    }

    if (newAttempts >= 5) {
      setState(prev => ({
        ...prev,
        failedAttempts: newAttempts,
        cooldownTimeRemaining: COOLDOWN_DURATION,
      }));
      return;
    }

    setState(prev => ({ ...prev, failedAttempts: newAttempts }));
  }, [state.failedAttempts]);

  const unlockWithSecret = useCallback(async (secret: string): Promise<boolean> => {
    if (state.isLocked || state.cooldownTimeRemaining > 0 || !state.authMethod || state.authMethod === 'biometric') {
      return false;
    }

    const validation = validateCredential(state.authMethod, secret);
    if (!validation.valid) {
      return false;
    }

    try {
      const config = await authService.getAuthConfig();
      if (!config) {
        return false;
      }

      const isValid = await authService.verifyStoredCredential(secret.trim());
      if (!isValid) {
        await handleFailedAttempt();
        return false;
      }

      await authService.resetFailedAttempts();
      authService.setSessionToken(authService.generateSessionToken());
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        failedAttempts: 0,
        cooldownTimeRemaining: 0,
        lockoutTimeRemaining: 0,
        isLocked: false,
      }));
      return true;
    } catch {
      await handleFailedAttempt();
      return false;
    }
  }, [handleFailedAttempt, state.authMethod, state.cooldownTimeRemaining, state.isLocked]);

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    if (!state.isBiometricAvailable || !state.isBiometricEnabled || state.isLocked) {
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Qoppy',
        fallbackLabel: state.authMethod === 'password' ? 'Use password' : 'Use PIN',
      });

      if (!result.success) {
        return false;
      }

      authService.setSessionToken(authService.generateSessionToken());
      setState(prev => ({ ...prev, isAuthenticated: true }));
      return true;
    } catch {
      return false;
    }
  }, [state.authMethod, state.isBiometricAvailable, state.isBiometricEnabled, state.isLocked]);

  const setupProtection = useCallback(async (
    method: AuthMethod,
    secret: string,
    confirmSecret: string,
    enableBiometric: boolean = false
  ): Promise<boolean> => {
    const validation = validateAuthSetup(method, secret, confirmSecret, state.isBiometricAvailable);
    if (!validation.valid) {
      return false;
    }

    try {
      await authService.setupAuth(method, secret.trim(), enableBiometric);
      await authService.resetFailedAttempts();
      authService.setSessionToken(authService.generateSessionToken());
      await initializeAuth();
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        cooldownTimeRemaining: 0,
        lockoutTimeRemaining: 0,
        isLocked: false,
      }));
      return true;
    } catch {
      return false;
    }
  }, [initializeAuth, state.isBiometricAvailable]);

  const skipPinSetup = useCallback(async (): Promise<void> => {
    await authService.skipAuthSetup();
    authService.clearSessionToken();
    await initializeAuth();
    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      isProtectionEnabled: false,
      isBiometricEnabled: false,
      authMethod: null,
      needsSetup: false,
      failedAttempts: 0,
      isLocked: false,
      lockoutTimeRemaining: 0,
      cooldownTimeRemaining: 0,
    }));
  }, [initializeAuth]);

  const disableProtection = useCallback(async (): Promise<void> => {
    await authService.deleteAuthConfig();
    authService.clearSessionToken();
    await initializeAuth();
    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      isProtectionEnabled: false,
      isBiometricEnabled: false,
      authMethod: null,
      needsSetup: false,
      failedAttempts: 0,
      isLocked: false,
      lockoutTimeRemaining: 0,
      cooldownTimeRemaining: 0,
    }));
  }, [initializeAuth]);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    unlockWithSecret,
    unlockWithBiometric,
    setupProtection,
    skipPinSetup,
    disableProtection,
    lock,
  }), [disableProtection, lock, setupProtection, skipPinSetup, state, unlockWithBiometric, unlockWithSecret]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
