export type AuthMethod = 'pin' | 'password' | 'biometric';

const PIN_REGEX = /^\d{4}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6}$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const validateCredential = (
  method: AuthMethod,
  value: string
): ValidationResult => {
  if (method === 'biometric') {
    return { valid: true };
  }

  if (typeof value !== 'string') {
    return {
      valid: false,
      error: method === 'pin'
        ? 'PIN must be exactly 4 digits.'
        : 'Password must be 6 letters or numbers and include at least 1 letter and 1 number.',
    };
  }

  const normalizedValue = value.trim();
  if (method === 'pin' && !PIN_REGEX.test(normalizedValue)) {
    return { valid: false, error: 'PIN must be exactly 4 digits.' };
  }

  if (method === 'password' && !PASSWORD_REGEX.test(normalizedValue)) {
    return {
      valid: false,
      error: 'Password must be 6 letters or numbers and include at least 1 letter and 1 number.',
    };
  }

  return { valid: true };
};

export const validateAuthSetup = (
  method: AuthMethod,
  secret: string,
  confirmSecret: string,
  biometricAvailable: boolean
): ValidationResult => {
  if (method === 'biometric') {
    return biometricAvailable
      ? { valid: true }
      : { valid: false, error: 'Biometric authentication is not available on this device.' };
  }

  const secretValidation = validateCredential(method, secret);
  if (!secretValidation.valid) {
    return secretValidation;
  }

  const confirmValidation = validateCredential(method, confirmSecret);
  if (!confirmValidation.valid) {
    return confirmValidation;
  }

  if (secret.trim() !== confirmSecret.trim()) {
    return {
      valid: false,
      error: method === 'pin' ? 'PIN entries do not match.' : 'Password entries do not match.',
    };
  }

  return { valid: true };
};
