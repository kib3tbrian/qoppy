// src/screens/SettingsScreen.tsx

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
import {
  Crown, Tag, Trash2, ExternalLink,
  Shield, Star, ChevronRight, Info, Zap
} from 'lucide-react-native';
import { db } from '../services/database';
import { COLORS } from '../constants';
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
            for (const s of all) await db.deleteSnippet(s.id);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Premium banner */}
      <TouchableOpacity
        style={styles.premiumBanner}
        onPress={() => navigation.navigate('Paywall')}
        activeOpacity={0.85}
      >
        <Crown size={22} color="#7C3AED" fill="#7C3AED20" />
        <View style={{ flex: 1 }}>
          <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
          <Text style={styles.premiumSub}>Unlimited snippets · Cloud sync · No ads</Text>
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

      <Section title="Data">
        <Row icon={Trash2} label="Clear all snippets" danger onPress={handleClearAll} />
        <Row icon={Shield} iconColor={COLORS.textMuted} label="Reset onboarding" onPress={handleResetOnboarding} />
      </Section>

      <Section title="About">
        <Row
          icon={Star}
          iconColor={COLORS.secondary}
          label="Rate the app"
          sublabel="Enjoying Clipsafe?"
          onPress={() => Linking.openURL('https://apps.apple.com')}
        />
        <Row
          icon={ExternalLink}
          iconColor={COLORS.textSecondary}
          label="Privacy Policy"
          onPress={() => Linking.openURL('https://example.com/privacy')}
        />
      </Section>

      <Text style={styles.version}>Clipsafe v1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE9F6' },
  content: { padding: 16, paddingBottom: 60 },
  premiumBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', borderRadius: 18, borderWidth: 1.5, borderColor: '#7C3AED', padding: 16, gap: 14, marginBottom: 24 },
  premiumTitle: { fontSize: 15, fontWeight: '800', color: '#7C3AED' },
  premiumSub: { fontSize: 12, color: '#7C3AED', marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#DDD6FE', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: '#DDD6FE' },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#1E1B2E' },
  rowSublabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  version: { textAlign: 'center', fontSize: 12, color: '#6B7280', marginTop: 8 },
});

export default SettingsScreen;
