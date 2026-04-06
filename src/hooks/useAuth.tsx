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
  failedAttempts: number;
  isLocked: boolean;
  lockoutTimeRemaining: number;
  cooldownTimeRemaining: number;
  needsSetup: boolean;
}

interface AuthContextValue extends AuthState {
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  setupPin: (pin: string, confirmPin: string, enableBiometric?: boolean) => Promise<boolean>;
  skipPinSetup: () => Promise<void>;
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
    failedAttempts: 0,
    isLocked: false,
    lockoutTimeRemaining: 0,
    cooldownTimeRemaining: 0,
    needsSetup: true,
  });
  const [lastBackgroundTime, setLastBackgroundTime] = useState<number | null>(null);

  const initializeAuth = useCallback(async () => {
    try {
      const [config, biometricAvailable, biometricEnabled] = await Promise.all([
        authService.getAuthConfig(),
        LocalAuthentication.hasHardwareAsync(),
        authService.getBiometricEnabled(),
      ]);

      const isProtectionEnabled = Boolean(config?.pinHash);
      const isLocked = config ? authService.isLocked(config.lockedUntil) : false;
      const lockoutTimeRemaining = config ? authService.getLockoutTimeRemaining(config.lockedUntil) : 0;

      setState(prev => ({
        ...prev,
        isAuthenticated: isProtectionEnabled ? authService.isAuthenticated() : true,
        isProtectionEnabled,
        isBiometricAvailable: biometricAvailable,
        isBiometricEnabled: isProtectionEnabled && biometricAvailable && biometricEnabled,
        failedAttempts: config?.failedAttempts ?? 0,
        isLocked,
        lockoutTimeRemaining,
        needsSetup: config === null,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Auth initialization failed:', error);
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

    if (nextAppState === 'active') {
      if (
        lastBackgroundTime &&
        Date.now() - lastBackgroundTime > AUTO_LOCK_TIMEOUT &&
        authService.isAuthenticated()
      ) {
        lock();
      }
      setLastBackgroundTime(null);
    }
  }, [lastBackgroundTime, lock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  useEffect(() => {
    if (state.cooldownTimeRemaining <= 0) return;

    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        cooldownTimeRemaining: Math.max(0, prev.cooldownTimeRemaining - 1000),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.cooldownTimeRemaining]);

  useEffect(() => {
    if (state.lockoutTimeRemaining <= 0) return;

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

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    if (state.isLocked || state.cooldownTimeRemaining > 0) return false;

    try {
      const config = await authService.getAuthConfig();
      if (!config?.pinHash) return false;

      const isValid = await authService.verifyPin(pin, config.pinHash);
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
    } catch (error) {
      console.error('PIN unlock failed:', error);
      await handleFailedAttempt();
      return false;
    }
  }, [handleFailedAttempt, state.cooldownTimeRemaining, state.isLocked]);

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    if (!state.isBiometricAvailable || !state.isBiometricEnabled || state.isLocked) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock with biometrics',
        fallbackLabel: 'Use PIN',
      });

      if (!result.success) return false;

      authService.setSessionToken(authService.generateSessionToken());
      setState(prev => ({ ...prev, isAuthenticated: true }));
      return true;
    } catch (error) {
      console.error('Biometric unlock failed:', error);
      return false;
    }
  }, [state.isBiometricAvailable, state.isBiometricEnabled, state.isLocked]);

  const setupPin = useCallback(async (
    pin: string,
    confirmPin: string,
    enableBiometric: boolean = false
  ): Promise<boolean> => {
    if (pin !== confirmPin || pin.length < 4 || pin.length > 6) return false;

    try {
      await authService.setupAuth(pin, enableBiometric);
      authService.setSessionToken(authService.generateSessionToken());
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        isProtectionEnabled: true,
        needsSetup: false,
        failedAttempts: 0,
        isLocked: false,
        lockoutTimeRemaining: 0,
        cooldownTimeRemaining: 0,
        isBiometricEnabled: enableBiometric && prev.isBiometricAvailable,
      }));
      return true;
    } catch (error) {
      console.error('PIN setup failed:', error);
      return false;
    }
  }, []);

  const skipPinSetup = useCallback(async (): Promise<void> => {
    await authService.skipAuthSetup();
    authService.clearSessionToken();
    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      isProtectionEnabled: false,
      isBiometricEnabled: false,
      needsSetup: false,
      failedAttempts: 0,
      isLocked: false,
      lockoutTimeRemaining: 0,
      cooldownTimeRemaining: 0,
    }));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    unlockWithPin,
    unlockWithBiometric,
    setupPin,
    skipPinSetup,
    lock,
  }), [lock, setupPin, skipPinSetup, state, unlockWithBiometric, unlockWithPin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
