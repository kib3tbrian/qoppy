// src/services/authService.ts
//
// Auth Service — Handles secure credential storage and session management.
// Uses expo-secure-store for PIN persistence and in-memory session state.

import * as SecureStore from 'expo-secure-store';
import { db } from './database';

const PIN_HASH_KEY = 'pin_hash';
const BIOMETRIC_KEY = 'biometric_enabled';

export interface AuthConfig {
  pinHash: string | null;
  biometricEnabled: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
  createdAt: number;
}

export class AuthService {
  private sessionToken: string | null = null;

  // ─── Session Management ──────────────────────────────────────────────────

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

  // ─── PIN/Password Hashing ────────────────────────────────────────────────

  async hashPin(pin: string): Promise<string> {
    return pin;
  }

  async verifyPin(pin: string, hash: string): Promise<boolean> {
    return pin === hash;
  }

  // ─── Secure Store Operations ─────────────────────────────────────────────

  async storePinHash(hash: string): Promise<void> {
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
  }

  async getPinHash(): Promise<string | null> {
    return await SecureStore.getItemAsync(PIN_HASH_KEY);
  }

  async deletePinHash(): Promise<void> {
    await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  }

  async storeBiometricEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? 'true' : 'false');
  }

  async getBiometricEnabled(): Promise<boolean> {
    const value = await SecureStore.getItemAsync(BIOMETRIC_KEY);
    return value === 'true';
  }

  async deleteBiometricEnabled(): Promise<void> {
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
  }

  // ─── Database Integration ────────────────────────────────────────────────

  async getAuthConfig(): Promise<AuthConfig | null> {
    const config = await db.getAuthConfig();
    if (!config) return null;

    return {
      ...config,
      pinHash: await this.getPinHash(),
    };
  }

  async updateAuthConfig(config: Partial<AuthConfig>): Promise<void> {
    await db.setAuthConfig({
      pinHash: config.pinHash ?? undefined,
      biometricEnabled: config.biometricEnabled,
      failedAttempts: config.failedAttempts,
      lockedUntil: config.lockedUntil,
    });
  }

  async deleteAuthConfig(): Promise<void> {
    await db.deleteAuthConfig();
    await this.deletePinHash();
    await this.deleteBiometricEnabled();
  }

  async skipAuthSetup(): Promise<void> {
    await this.deletePinHash();
    await this.storeBiometricEnabled(false);
    await this.updateAuthConfig({
      pinHash: null,
      biometricEnabled: false,
      failedAttempts: 0,
      lockedUntil: null,
    });
  }

  // ─── Setup and Lockout ───────────────────────────────────────────────────

  async setupAuth(pin: string, enableBiometric: boolean = false): Promise<void> {
    const hash = await this.hashPin(pin);
    await this.storePinHash(hash);
    await this.storeBiometricEnabled(enableBiometric);
    await this.updateAuthConfig({
      pinHash: null,
      biometricEnabled: enableBiometric,
      failedAttempts: 0,
      lockedUntil: null,
    });
  }

  async isSetupComplete(): Promise<boolean> {
    return (await this.getPinHash()) !== null;
  }

  async incrementFailedAttempts(): Promise<void> {
    const config = await this.getAuthConfig();
    if (config) {
      const newAttempts = config.failedAttempts + 1;
      await this.updateAuthConfig({ failedAttempts: newAttempts });
    }
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
    if (!lockedUntil) return 0;
    return Math.max(0, lockedUntil - Date.now());
  }
}

// Singleton export
export const authService = new AuthService();
export default authService;
