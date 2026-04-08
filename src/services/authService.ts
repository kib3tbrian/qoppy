import * as bcrypt from 'bcryptjs';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { db } from './database';
import { AuthMethod, validateCredential } from './authValidation';

const AUTH_HASH_KEY = 'auth_hash';
const AUTH_METHOD_KEY = 'auth_method';
const BIOMETRIC_KEY = 'biometric_enabled';
const LEGACY_PIN_HASH_KEY = 'pin_hash';
const BCRYPT_SALT_ROUNDS = 12;

export interface AuthConfig {
  authMethod: AuthMethod | null;
  biometricEnabled: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
  createdAt: number;
}

export class AuthService {
  private sessionToken: string | null = null;

  generateSessionToken(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  getSessionToken(): string | null {
    return this.sessionToken;
  }

  clearSessionToken(): void {
    this.sessionToken = null;
  }

  isAuthenticated(): boolean {
    return this.sessionToken !== null;
  }

  async hashSecret(method: AuthMethod, secret: string): Promise<string> {
    const validation = validateCredential(method, secret);
    if (!validation.valid) {
      throw new Error(validation.error ?? 'Invalid app lock value.');
    }

    return bcrypt.hash(secret.trim(), BCRYPT_SALT_ROUNDS);
  }

  async verifySecret(method: AuthMethod, secret: string, hash: string): Promise<boolean> {
    const validation = validateCredential(method, secret);
    if (!validation.valid || !hash) {
      return false;
    }

    const normalizedSecret = secret.trim();
    if (this.isBcryptHash(hash)) {
      return bcrypt.compare(normalizedSecret, hash);
    }

    return normalizedSecret === hash;
  }

  async getAuthConfig(): Promise<AuthConfig | null> {
    const [config, authMethod, biometricEnabled] = await Promise.all([
      db.getAuthConfig(),
      this.getAuthMethod(),
      this.getBiometricEnabled(),
    ]);

    if (!config) {
      return null;
    }

    return {
      authMethod,
      biometricEnabled: config.biometricEnabled || biometricEnabled,
      failedAttempts: config.failedAttempts,
      lockedUntil: config.lockedUntil,
      createdAt: config.createdAt,
    };
  }

  async hasProtectionConfigured(): Promise<boolean> {
    const [authMethod, secretHash] = await Promise.all([
      this.getAuthMethod(),
      this.getStoredSecretHash(),
    ]);

    return authMethod === 'biometric' || Boolean(secretHash);
  }

  async getAuthMethod(): Promise<AuthMethod | null> {
    const value = await this.getPersistedValue(AUTH_METHOD_KEY);
    if (value === 'pin' || value === 'password' || value === 'biometric') {
      return value;
    }

    return null;
  }

  async storeAuthMethod(method: AuthMethod): Promise<void> {
    await this.setPersistedValue(AUTH_METHOD_KEY, method);
  }

  async deleteAuthMethod(): Promise<void> {
    await this.deletePersistedValue(AUTH_METHOD_KEY);
  }

  async getBiometricEnabled(): Promise<boolean> {
    const value = await this.getPersistedValue(BIOMETRIC_KEY);
    return value === 'true';
  }

  async storeBiometricEnabled(enabled: boolean): Promise<void> {
    await this.setPersistedValue(BIOMETRIC_KEY, enabled ? 'true' : 'false');
  }

  async deleteBiometricEnabled(): Promise<void> {
    await this.deletePersistedValue(BIOMETRIC_KEY);
  }

  async updateAuthConfig(config: Partial<AuthConfig>): Promise<void> {
    await db.setAuthConfig({
      biometricEnabled: config.biometricEnabled,
      failedAttempts: config.failedAttempts,
      lockedUntil: config.lockedUntil,
    });
  }

  async deleteAuthConfig(): Promise<void> {
    await db.deleteAuthConfig();
    await Promise.all([
      this.deleteStoredSecretHash(),
      this.deleteBiometricEnabled(),
      this.deleteAuthMethod(),
    ]);
  }

  async skipAuthSetup(): Promise<void> {
    await Promise.all([
      this.deleteStoredSecretHash(),
      this.deleteAuthMethod(),
      this.storeBiometricEnabled(false),
    ]);
    await this.updateAuthConfig({
      biometricEnabled: false,
      failedAttempts: 0,
      lockedUntil: null,
    });
  }

  async setupAuth(
    method: AuthMethod,
    secret: string,
    enableBiometric: boolean = false
  ): Promise<void> {
    if (method === 'biometric') {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric unlock for Qoppy',
        fallbackLabel: 'Use device credentials',
        cancelLabel: 'Cancel',
      });

      if (!result.success) {
        throw new Error('Biometric setup was not completed.');
      }

      await Promise.all([
        this.deleteStoredSecretHash(),
        this.storeAuthMethod('biometric'),
        this.storeBiometricEnabled(true),
      ]);
      await this.updateAuthConfig({
        biometricEnabled: true,
        failedAttempts: 0,
        lockedUntil: null,
      });
      return;
    }

    const normalizedSecret = secret.trim();
    const hash = await this.hashSecret(method, normalizedSecret);

    await Promise.all([
      this.storeStoredSecretHash(hash),
      this.storeAuthMethod(method),
      this.storeBiometricEnabled(enableBiometric),
    ]);
    await this.updateAuthConfig({
      biometricEnabled: enableBiometric,
      failedAttempts: 0,
      lockedUntil: null,
    });
  }

  async verifyStoredCredential(secret: string): Promise<boolean> {
    const [authMethod, storedHash] = await Promise.all([
      this.getAuthMethod(),
      this.getStoredSecretHash(),
    ]);

    if (!authMethod || authMethod === 'biometric' || !storedHash) {
      return false;
    }

    const isValid = await this.verifySecret(authMethod, secret, storedHash);
    if (isValid && !this.isBcryptHash(storedHash)) {
      const upgradedHash = await this.hashSecret(authMethod, secret);
      await this.storeStoredSecretHash(upgradedHash);
    }

    return isValid;
  }

  async incrementFailedAttempts(): Promise<void> {
    const config = await this.getAuthConfig();
    if (!config) {
      return;
    }

    await this.updateAuthConfig({ failedAttempts: config.failedAttempts + 1 });
  }

  async resetFailedAttempts(): Promise<void> {
    await this.updateAuthConfig({ failedAttempts: 0, lockedUntil: null });
  }

  async lockAccount(durationMs: number): Promise<void> {
    await this.updateAuthConfig({
      failedAttempts: 0,
      lockedUntil: Date.now() + durationMs,
    });
  }

  isLocked(lockedUntil: number | null): boolean {
    return lockedUntil !== null && Date.now() < lockedUntil;
  }

  getLockoutTimeRemaining(lockedUntil: number | null): number {
    if (!lockedUntil) {
      return 0;
    }

    return Math.max(0, lockedUntil - Date.now());
  }

  private async getStoredSecretHash(): Promise<string | null> {
    const storedHash = await this.getPersistedValue(AUTH_HASH_KEY);
    if (storedHash) {
      return storedHash;
    }

    const legacyHash = await this.getPersistedValue(LEGACY_PIN_HASH_KEY);
    if (legacyHash) {
      await this.storeStoredSecretHash(legacyHash);
      await this.deletePersistedValue(LEGACY_PIN_HASH_KEY);
      const currentMethod = await this.getAuthMethod();
      if (!currentMethod) {
        await this.storeAuthMethod('pin');
      }
      return legacyHash;
    }

    return null;
  }

  private async storeStoredSecretHash(hash: string): Promise<void> {
    await this.setPersistedValue(AUTH_HASH_KEY, hash);
  }

  private async deleteStoredSecretHash(): Promise<void> {
    await Promise.all([
      this.deletePersistedValue(AUTH_HASH_KEY),
      this.deletePersistedValue(LEGACY_PIN_HASH_KEY),
    ]);
  }

  private async setPersistedValue(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      await db.setPreference(`secure_${key}`, value);
    }
  }

  private async getPersistedValue(key: string): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value !== null) {
        return value;
      }
    } catch {
      // Fall back to SQLite-backed preferences below.
    }

    return (await db.getPreference(`secure_${key}`)) ?? null;
  }

  private async deletePersistedValue(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Fall back to SQLite-backed preferences below.
    }

    await db.setPreference(`secure_${key}`, '');
  }

  private isBcryptHash(value: string): boolean {
    return /^\$2[aby]\$\d{2}\$/.test(value);
  }
}

export const authService = new AuthService();
export default authService;
