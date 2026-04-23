import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { db } from './database';

export interface GoogleAccount {
  id?: string;
  email: string;
  name?: string;
  picture?: string;
}

interface GoogleAuthConfig {
  androidClientId?: string;
  iosClientId?: string;
  webClientId?: string;
}

export const GOOGLE_AUTH_SCHEME = 'qoppy';
export const GOOGLE_AUTH_PATH = 'oauth';

export const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
};

const ACCESS_TOKEN_KEY = 'google_access_token';
const REFRESH_TOKEN_KEY = 'google_refresh_token';
const ID_TOKEN_KEY = 'google_id_token';

const getExpoExtra = (): Record<string, any> => {
  const constantsWithManifest = Constants as typeof Constants & {
    manifest?: { extra?: Record<string, any> };
    manifest2?: { extra?: Record<string, any> };
  };

  return (
    Constants.expoConfig?.extra ??
    constantsWithManifest.manifest2?.extra ??
    constantsWithManifest.manifest?.extra ??
    {}
  );
};

const getGoogleAuthConfig = (): GoogleAuthConfig => {
  const extra = getExpoExtra();
  return extra.googleAuth ?? {};
};

export const getGoogleClientId = (): string | null => {
  const config = getGoogleAuthConfig();

  if (Platform.OS === 'android') {
    return config.androidClientId?.trim() || null;
  }

  if (Platform.OS === 'ios') {
    return config.iosClientId?.trim() || null;
  }

  return config.webClientId?.trim() || null;
};

export const getGoogleRedirectUri = (): string =>
  AuthSession.makeRedirectUri({
    scheme: GOOGLE_AUTH_SCHEME,
    path: GOOGLE_AUTH_PATH,
  });

export const isGoogleAuthConfigured = (): boolean => Boolean(getGoogleClientId());

export const buildGoogleAuthRequestConfig = (): AuthSession.AuthRequestConfig | null => {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return null;
  }

  return {
    clientId,
    redirectUri: getGoogleRedirectUri(),
    responseType: AuthSession.ResponseType.Code,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  };
};

export const normalizeGoogleUser = (userInfo: Record<string, any>): GoogleAccount => ({
  id: typeof userInfo.sub === 'string' ? userInfo.sub : undefined,
  email: typeof userInfo.email === 'string' ? userInfo.email : '',
  name: typeof userInfo.name === 'string' ? userInfo.name : undefined,
  picture: typeof userInfo.picture === 'string' ? userInfo.picture : undefined,
});

export const loadGoogleAccount = async (): Promise<GoogleAccount | null> => {
  const [connected, email, name, picture, id] = await Promise.all([
    db.getPreference('google_account_connected', 'false'),
    db.getPreference('google_account_email', ''),
    db.getPreference('google_account_name', ''),
    db.getPreference('google_account_picture', ''),
    db.getPreference('google_account_id', ''),
  ]);

  if (connected !== 'true' || !email) {
    return null;
  }

  return {
    id: id || undefined,
    email,
    name: name || undefined,
    picture: picture || undefined,
  };
};

export const saveGoogleAccount = async (
  account: GoogleAccount,
  tokenResponse: AuthSession.TokenResponse
): Promise<void> => {
  await Promise.all([
    db.setPreference('google_account_connected', 'true'),
    db.setPreference('google_account_email', account.email),
    db.setPreference('google_account_name', account.name ?? ''),
    db.setPreference('google_account_picture', account.picture ?? ''),
    db.setPreference('google_account_id', account.id ?? ''),
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokenResponse.accessToken),
    tokenResponse.refreshToken
      ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenResponse.refreshToken)
      : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    tokenResponse.idToken
      ? SecureStore.setItemAsync(ID_TOKEN_KEY, tokenResponse.idToken)
      : SecureStore.deleteItemAsync(ID_TOKEN_KEY),
  ]);
};

export const clearGoogleAccount = async (): Promise<void> => {
  const clientId = getGoogleClientId();
  const [refreshToken, accessToken] = await Promise.all([
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
  ]);

  const tokenToRevoke = refreshToken ?? accessToken;
  if (clientId && tokenToRevoke) {
    try {
      await AuthSession.revokeAsync(
        {
          clientId,
          token: tokenToRevoke,
        },
        GOOGLE_DISCOVERY
      );
    } catch {
      // Best-effort revocation only.
    }
  }

  await Promise.all([
    db.setPreference('google_account_connected', 'false'),
    db.setPreference('google_account_email', ''),
    db.setPreference('google_account_name', ''),
    db.setPreference('google_account_picture', ''),
    db.setPreference('google_account_id', ''),
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(ID_TOKEN_KEY),
  ]);
};
