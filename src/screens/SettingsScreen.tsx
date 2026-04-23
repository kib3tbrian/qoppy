import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CircleUserRound,
  Crown,
  Tag,
  ExternalLink,
  Star,
  ChevronRight,
  Info,
  Zap,
  FileText,
  Mail,
  Share2,
  Bug,
  Moon,
  Sun,
  Smartphone,
  Cloud,
  ShieldAlert,
} from 'lucide-react-native';
import { db } from '../services/database';
import { COLORS } from '../constants';
import { textFont } from '../constants/typography';
import { RootStackParamList } from '../types';
import { useTheme, AppThemePreference } from '../hooks/useTheme';
import { useSnippets } from '../hooks/useSnippets';
import * as AuthSession from 'expo-auth-session';
import {
  buildGoogleAuthRequestConfig,
  clearGoogleAccount,
  GOOGLE_DISCOVERY,
  GoogleAccount,
  isGoogleAuthConfigured,
  loadGoogleAccount,
  normalizeGoogleUser,
  saveGoogleAccount,
} from '../services/googleAuth';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface RowProps {
  icon: React.ComponentType<any>;
  iconColor?: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}

const Row: React.FC<RowProps> = ({ icon: Icon, iconColor = COLORS.primary, label, sublabel, onPress, right, danger }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: theme.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor}18` }]}>
        <Icon size={18} color={danger ? theme.danger : iconColor} strokeWidth={2} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: danger ? theme.danger : theme.text }]}>{label}</Text>
        {sublabel && <Text style={[styles.rowSublabel, { color: theme.textSecondary }]}>{sublabel}</Text>}
      </View>
      {right ?? (onPress && <ChevronRight size={16} color={theme.textMuted} />)}
    </TouchableOpacity>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>{children}</View>
    </View>
  );
};

const themeOptions: Array<{
  key: AppThemePreference;
  label: string;
  icon: React.ComponentType<any>;
}> = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Smartphone },
];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { theme, preference, setThemeMode } = useTheme();
  const { deleteAllSnippets } = useSnippets();
  const [snippetCount, setSnippetCount] = useState(0);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null);
  const [isGoogleBusy, setIsGoogleBusy] = useState(false);

  const googleAuthConfig = useMemo(() => buildGoogleAuthRequestConfig(), []);
  const authRequestConfig = useMemo<AuthSession.AuthRequestConfig>(() => {
    return (
      googleAuthConfig ?? {
        clientId: 'google-client-id-required',
        redirectUri: AuthSession.makeRedirectUri({ scheme: 'qoppy', path: 'oauth' }),
        responseType: AuthSession.ResponseType.Code,
        scopes: ['openid', 'profile', 'email'],
        usePKCE: true,
      }
    );
  }, [googleAuthConfig]);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(authRequestConfig, GOOGLE_DISCOVERY);

  const loadUsage = useCallback(() => {
    db.getSnippetCount().then(setSnippetCount);
    db.getPreference('haptic', 'true').then(v => setHapticEnabled(v === 'true'));
    loadGoogleAccount().then(setGoogleAccount);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsage();
    }, [loadUsage])
  );

  const handleShareApp = async () => {
    await Share.share({
      message: 'Try Qoppy for saving and copying the snippets you reuse every day.',
    });
  };

  const handleToggleHaptic = async (value: boolean) => {
    setHapticEnabled(value);
    await db.setPreference('haptic', value ? 'true' : 'false');
  };

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.type === 'dismiss' || response.type === 'cancel') {
      setIsGoogleBusy(false);
      return;
    }

    if (response.type === 'error') {
      setIsGoogleBusy(false);
      Alert.alert('Google sign-in failed', response.error?.message ?? 'Unable to complete the Google sign-in flow.');
      return;
    }

    if (response.type !== 'success') {
      return;
    }

    const code = response.params.code;
    if (!googleAuthConfig || !code || !request?.codeVerifier) {
      setIsGoogleBusy(false);
      Alert.alert('Google sign-in failed', 'Google sign-in could not finish because the authorization response was incomplete.');
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: googleAuthConfig.clientId,
            code,
            redirectUri: authRequestConfig.redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier ?? '',
            },
          },
          GOOGLE_DISCOVERY
        );

        const userInfo = await AuthSession.fetchUserInfoAsync(
          {
            accessToken: tokenResponse.accessToken,
          },
          GOOGLE_DISCOVERY
        );

        const account = normalizeGoogleUser(userInfo);
        if (!account.email) {
          throw new Error('Google did not return an email address for this account.');
        }

        await saveGoogleAccount(account, tokenResponse);

        if (isMounted) {
          setGoogleAccount(account);
          Alert.alert('Google connected', account.email);
        }
      } catch (error: any) {
        if (isMounted) {
          Alert.alert('Google sign-in failed', error?.message ?? 'Unable to connect your Google account right now.');
        }
      } finally {
        if (isMounted) {
          setIsGoogleBusy(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [authRequestConfig.redirectUri, googleAuthConfig, request, response]);

  const handleGoogleSignIn = useCallback(async () => {
    if (!isGoogleAuthConfigured() || !googleAuthConfig) {
      Alert.alert(
        'Google OAuth not configured',
        'Add your Google OAuth client ID to `expo.extra.googleAuth.androidClientId` in app.json, rebuild the app, and then try again.'
      );
      return;
    }

    if (!request) {
      Alert.alert('Google sign-in not ready', 'The Google sign-in request is still loading. Please try again in a moment.');
      return;
    }

    setIsGoogleBusy(true);
    const result = await promptAsync();

    if (result.type !== 'opened' && result.type !== 'locked') {
      setIsGoogleBusy(false);
    }
  }, [googleAuthConfig, promptAsync, request]);

  const handleClearAll = () => {
    Alert.alert(
      'Clear all snippets?',
      'This will permanently delete all your snippets. Categories are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            await deleteAllSnippets();
            setSnippetCount(0);
            Alert.alert('Done', 'All snippets deleted.');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account data?',
      'This will remove all local snippets and clear any saved account-related preferences on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            await deleteAllSnippets();
            await clearGoogleAccount();
            setSnippetCount(0);
            setGoogleAccount(null);
            Alert.alert('Deleted', 'Local account data has been removed from this device.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={[styles.premiumHero, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
        onPress={() => navigation.navigate('Paywall', { source: 'settings' })}
        activeOpacity={0.88}
      >
        <View style={styles.premiumHeader}>
          <Crown size={26} color={theme.onPrimary} />
          <Text style={[styles.premiumTitle, { color: theme.onPrimary }]}>Go Premium</Text>
        </View>
        <Text style={[styles.premiumSub, { color: `${theme.onPrimary}DD` }]}>
          Unlock unlimited snippets, backup, and device sync.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.shareCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => void handleShareApp()}
        activeOpacity={0.88}
      >
        <View style={[styles.shareIconWrap, { backgroundColor: theme.primarySoft }]}>
          <Share2 size={20} color={theme.primary} />
        </View>
        <View style={styles.shareTextWrap}>
          <Text style={[styles.shareTitle, { color: theme.text }]}>Share the app</Text>
          <Text style={[styles.shareSub, { color: theme.textSecondary }]}>Invite someone with the native share sheet.</Text>
        </View>
        <ChevronRight size={18} color={theme.textMuted} />
      </TouchableOpacity>

      <Section title="Usage">
        <Row icon={Info} iconColor={COLORS.primary} label="Snippets stored" sublabel={`${snippetCount} snippets saved`} />
        <Row icon={Tag} iconColor={COLORS.secondary} label="Manage categories" onPress={() => navigation.navigate('ManageCategories')} />
      </Section>

      <Section title="Account">
        <Row
          icon={CircleUserRound}
          iconColor={COLORS.primary}
          label="Sign in with Google"
          sublabel={
            googleAccount
              ? `${googleAccount.email}${googleAccount.name ? ` • ${googleAccount.name}` : ''}`
              : isGoogleBusy
                ? 'Connecting your Google account...'
                : 'Optional for backup and device sync'
          }
          onPress={handleGoogleSignIn}
        />
        <Row
          icon={Cloud}
          iconColor={COLORS.secondary}
          label="Backup and sync"
          sublabel={googleAccount ? 'Google account connected for backup and sync' : 'Sign in with Google to enable backup and sync'}
          onPress={!googleAccount ? handleGoogleSignIn : undefined}
        />
        <Row
          icon={ShieldAlert}
          label="Delete account"
          sublabel="Remove local account data from this device"
          danger
          onPress={handleDeleteAccount}
        />
      </Section>

      <Section title="Appearance">
        <View style={styles.themeRow}>
          {themeOptions.map(option => {
            const Icon = option.icon;
            const active = preference === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: active ? theme.primary : theme.surfaceAlt,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => void setThemeMode(option.key)}
                activeOpacity={0.85}
              >
                <Icon size={16} color={active ? theme.onPrimary : theme.textSecondary} />
                <Text style={[styles.themeOptionText, { color: active ? theme.onPrimary : theme.text }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      <Section title="Preferences">
        <Row
          icon={Zap}
          iconColor={COLORS.success}
          label="Haptic feedback"
          sublabel="Vibrate on copy"
          right={
            <Switch
              value={hapticEnabled}
              onValueChange={handleToggleHaptic}
              trackColor={{ true: theme.primary, false: theme.border }}
              thumbColor={theme.onPrimary}
            />
          }
        />
      </Section>

      <Section title="Support">
        <Row
          icon={Bug}
          iconColor={COLORS.secondary}
          label="Report a Bug or Idea"
          sublabel="Send feedback by email"
          onPress={() => Linking.openURL('mailto:support@qoppy.app?subject=Qoppy%20Bug%20or%20Idea')}
        />
      </Section>

      <Section title="Legal">
        <Row
          icon={FileText}
          iconColor={COLORS.textSecondary}
          label="Terms & Conditions"
          onPress={() => Linking.openURL('https://nogeybix.com/legal/terms')}
        />
        <Row
          icon={ExternalLink}
          iconColor={COLORS.textSecondary}
          label="Privacy Policy"
          onPress={() => Linking.openURL('https://nogeybix.com/legal/privacy')}
        />
      </Section>

      <Section title="About">
        <Row
          icon={Mail}
          iconColor={COLORS.primary}
          label="Contact Us"
          sublabel="support@qoppy.app"
          onPress={() => Linking.openURL('mailto:support@qoppy.app')}
        />
        <Row
          icon={Star}
          iconColor={COLORS.secondary}
          label="Rate the App"
          sublabel="Enjoying Qoppy?"
          onPress={() => Linking.openURL('https://apps.apple.com')}
        />
      </Section>

      <Text style={[styles.version, { color: theme.textSecondary }]}>Qoppy v1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  premiumHero: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  premiumTitle: {
    ...textFont(),
    fontSize: 24,
    fontWeight: '900',
  },
  premiumSub: {
    ...textFont(),
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  shareIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareTextWrap: {
    flex: 1,
  },
  shareTitle: {
    ...textFont(),
    fontSize: 16,
    fontWeight: '800',
  },
  shareSub: {
    ...textFont(),
    fontSize: 13,
    marginTop: 2,
    lineHeight: 19,
  },
  section: { marginBottom: 24 },
  sectionTitle: { ...textFont(), fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14, borderBottomWidth: 1 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { ...textFont(), fontSize: 16, fontWeight: '700' },
  rowSublabel: { ...textFont(), fontSize: 13, marginTop: 2, lineHeight: 19 },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  themeOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  themeOptionText: {
    ...textFont(),
    fontSize: 13,
    fontWeight: '700',
  },
  version: { ...textFont(), textAlign: 'center', fontSize: 13, marginTop: 8 },
});

export default SettingsScreen;
