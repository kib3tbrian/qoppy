import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import {
  Crown,
  Tag,
  Trash2,
  ExternalLink,
  Shield,
  Star,
  ChevronRight,
  Info,
  Zap,
  FileText,
  Mail,
  Lock,
  Fingerprint,
  ShieldOff,
} from 'lucide-react-native';
import { db } from '../services/database';
import { COLORS } from '../constants';
import { textFont } from '../constants/typography';
import { RootStackParamList } from '../types';

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

const Row: React.FC<RowProps> = ({ icon: Icon, iconColor = COLORS.primary, label, sublabel, onPress, right, danger }) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.rowIcon, { backgroundColor: iconColor + '18' }]}>
      <Icon size={18} color={danger ? COLORS.danger : iconColor} strokeWidth={2} />
    </View>
    <View style={styles.rowText}>
      <Text style={[styles.rowLabel, danger && { color: COLORS.danger }]}>{label}</Text>
      {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
    </View>
    {right ?? (onPress && <ChevronRight size={16} color={COLORS.textMuted} />)}
  </TouchableOpacity>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const {
    isProtectionEnabled,
    isBiometricAvailable,
    isBiometricEnabled,
    authMethod,
    disableProtection,
  } = useAuth();
  const [snippetCount, setSnippetCount] = useState(0);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  useEffect(() => {
    db.getSnippetCount().then(setSnippetCount);
    db.getPreference('haptic', 'true').then(v => setHapticEnabled(v === 'true'));
  }, []);

  const handleToggleHaptic = async (val: boolean) => {
    setHapticEnabled(val);
    await db.setPreference('haptic', val ? 'true' : 'false');
  };

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
            const all = await db.getAllSnippets();
            for (const snippet of all) {
              await db.deleteSnippet(snippet.id);
            }
            setSnippetCount(0);
            Alert.alert('Done', 'All snippets deleted.');
          },
        },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    await db.setPreference('onboarded', 'false');
    Alert.alert('Reset', 'Restart the app to see the onboarding again.');
  };

  const handleDisableProtection = () => {
    Alert.alert(
      'Disable app lock?',
      'This will remove your current PIN and biometric protection from Qoppy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            await disableProtection();
            Alert.alert('App lock disabled', 'PIN and biometric protection have been removed.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.premiumBanner}
        onPress={() => navigation.navigate('Paywall')}
        activeOpacity={0.85}
      >
        <Crown size={22} color="#7C3AED" fill="#7C3AED20" />
        <View style={{ flex: 1 }}>
          <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
          <Text style={styles.premiumSub}>Free includes up to 10 snippets. Premium unlocks unlimited snippets and payment boilerplate for card and crypto upgrades.</Text>
        </View>
        <ChevronRight size={18} color="#7C3AED" />
      </TouchableOpacity>

      <Section title="Usage">
        <Row icon={Info} iconColor={COLORS.primary} label="Snippets stored" sublabel={`${snippetCount} snippets saved`} />
        <Row icon={Tag} iconColor="#F59E0B" label="Manage categories" onPress={() => navigation.navigate('ManageCategories')} />
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
              trackColor={{ true: COLORS.primary, false: COLORS.border }}
              thumbColor={COLORS.white}
            />
          }
        />
      </Section>

      <Section title="App Lock">
        <Row
          icon={Lock}
          iconColor="#7C3AED"
          label={isProtectionEnabled ? 'Update app lock' : 'Set up app lock'}
          sublabel={
            isProtectionEnabled
              ? authMethod === 'password'
                ? isBiometricEnabled
                  ? 'Password lock is enabled with biometric unlock.'
                  : 'Password lock is enabled.'
                : authMethod === 'biometric'
                  ? 'Biometric lock is enabled on this device.'
                  : isBiometricEnabled
                    ? 'PIN lock is enabled with biometric unlock.'
                    : 'PIN lock is enabled.'
              : 'Choose a 4-digit PIN, 6-character password, or biometric unlock.'
          }
          onPress={() => navigation.navigate('SetupPIN', { fromSettings: true })}
        />
        {isBiometricAvailable && (
          <Row
            icon={Fingerprint}
            iconColor={COLORS.success}
            label="Biometric availability"
            sublabel={
              isBiometricEnabled
                ? 'Biometric unlock is currently active.'
                : 'Biometric unlock is available during app lock setup.'
            }
          />
        )}
        {isProtectionEnabled && (
          <Row
            icon={ShieldOff}
            iconColor={COLORS.danger}
            label="Disable app lock"
            sublabel="Remove PIN and biometric protection from this device."
            danger
            onPress={handleDisableProtection}
          />
        )}
      </Section>

      <Section title="Data">
        <Row icon={Trash2} label="Clear all snippets" danger onPress={handleClearAll} />
        <Row icon={Shield} iconColor={COLORS.textMuted} label="Reset onboarding" onPress={handleResetOnboarding} />
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
          icon={Info}
          iconColor={COLORS.secondary}
          label="About Us"
          sublabel="Nogeybix Labs is the team behind Qoppy."
          onPress={() => Linking.openURL('https://nogeybix.com/about')}
        />
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

      <Text style={styles.version}>Qoppy v1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE9F6' },
  content: { padding: 16, paddingBottom: 60 },
  premiumBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', borderRadius: 18, borderWidth: 1.5, borderColor: '#7C3AED', padding: 16, gap: 14, marginBottom: 24 },
  premiumTitle: { ...textFont(), fontSize: 17, fontWeight: '800', color: '#7C3AED' },
  premiumSub: { ...textFont(), fontSize: 14, color: '#7C3AED', marginTop: 2, lineHeight: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { ...textFont(), fontSize: 13, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#DDD6FE', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: '#DDD6FE' },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { ...textFont(), fontSize: 16, fontWeight: '700', color: '#1E1B2E' },
  rowSublabel: { ...textFont(), fontSize: 13, color: '#6B7280', marginTop: 2, lineHeight: 19 },
  version: { ...textFont(), textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 8 },
});

export default SettingsScreen;
