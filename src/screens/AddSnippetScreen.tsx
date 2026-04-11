// src/screens/AddSnippetScreen.tsx

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Save, Trash2 } from 'lucide-react-native';

import { useSnippets } from '../hooks/useSnippets';
import { useCategories } from '../hooks/useCategories';
import { RootStackParamList } from '../types';
import { db } from '../services/database';
import { useTheme } from '../hooks/useTheme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'AddSnippet'>;

export const AddSnippetScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { theme } = useTheme();
  const { snippetId } = route.params ?? {};
  const isEditing = Boolean(snippetId);

  const { createSnippet, updateSnippet, deleteSnippet } = useSnippets();
  const { categories } = useCategories();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('other');
  const [isSaving, setIsSaving] = useState(false);

  const normalizedContent = content.replace(/[\s-]/g, '');
  const hasCardNumber = /\b\d{13,19}\b/.test(normalizedContent);
  const hasSensitiveCredentialHint = /(password|passcode|otp|2fa|secret|api key|token)/i.test(content);

  // Load existing snippet for editing
  useEffect(() => {
    if (snippetId) {
      db.getSnippetById(snippetId).then(s => {
        if (s) {
          setTitle(s.title);
          setContent(s.content);
          setSelectedCategory(s.categoryId ?? 'other');
        }
      });
    }
  }, [snippetId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Snippet' : 'New Snippet',
      headerRight: isEditing
        ? () => (
            <TouchableOpacity onPress={handleDelete} style={{ padding: 8 }}>
              <Trash2 size={20} color={theme.danger} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [isEditing, navigation, theme.danger]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Missing fields', 'Please fill in both title and content.');
      return;
    }
    if (hasCardNumber) {
      Alert.alert('Sensitive data blocked', 'Do not store full credit card numbers in Qoppy.');
      return;
    }
    setIsSaving(true);
    try {
      if (isEditing && snippetId) {
        await updateSnippet({ id: snippetId, title: title.trim(), content: content.trim(), categoryId: selectedCategory });
      } else {
        await createSnippet({ title: title.trim(), content: content.trim(), categoryId: selectedCategory });
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        'Unable to save snippet',
        error?.message ?? 'You need to subscribe to Premium to add more snippets.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Snippet', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (snippetId) {
            await deleteSnippet(snippetId);
            navigation.goBack();
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: theme.textSecondary }]}>Title</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Home Address"
          placeholderTextColor={theme.textMuted}
          maxLength={60}
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>Content</Text>
        <TextInput
          style={[styles.input, styles.textarea, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
          value={content}
          onChangeText={setContent}
          placeholder="Paste or type the text you want to copy…"
          placeholderTextColor={theme.textMuted}
          multiline
          textAlignVertical="top"
        />
        {(hasCardNumber || hasSensitiveCredentialHint) && (
          <View style={[styles.noticeCard, { backgroundColor: theme.surface, borderColor: hasCardNumber ? theme.danger : theme.border }]}>
            <Text style={[styles.noticeTitle, { color: hasCardNumber ? theme.danger : theme.text }]}>
              {hasCardNumber ? 'Sensitive card data detected' : 'Sensitive credential reminder'}
            </Text>
            <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
              {hasCardNumber
                ? 'Qoppy should not be used to store full card numbers.'
                : 'Avoid storing passwords, authentication codes, or similar secrets in this app.'}
            </Text>
          </View>
        )}

        <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catChip,
                { borderColor: cat.color, backgroundColor: theme.surfaceAlt },
                selectedCategory === cat.id && { backgroundColor: cat.color },
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.catChipText, { color: selectedCategory === cat.id ? theme.onPrimary : cat.color }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave} disabled={isSaving}>
          <Save size={18} color={theme.onPrimary} />
          <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>{isSaving ? 'Saving…' : isEditing ? 'Update Snippet' : 'Save Snippet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 8 },
  label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  input: { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 15 },
  textarea: { minHeight: 120, paddingTop: 14 },
  noticeCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 4, marginBottom: 8 },
  noticeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  noticeText: { fontSize: 13, lineHeight: 19 },
  categoryRow: { flexDirection: 'row', marginBottom: 8 },
  catChip: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  catChipText: { fontSize: 13, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: 16, marginTop: 24, gap: 10 },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
});

export default AddSnippetScreen;
