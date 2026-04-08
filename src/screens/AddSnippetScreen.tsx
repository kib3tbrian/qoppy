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
import { COLORS } from '../constants';
import { RootStackParamList } from '../types';
import { db } from '../services/database';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'AddSnippet'>;

export const AddSnippetScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { snippetId } = route.params ?? {};
  const isEditing = Boolean(snippetId);

  const { createSnippet, updateSnippet, deleteSnippet } = useSnippets();
  const { categories } = useCategories();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing snippet for editing
  useEffect(() => {
    if (snippetId) {
      db.getSnippetById(snippetId).then(s => {
        if (s) {
          setTitle(s.title);
          setContent(s.content);
          setSelectedCategory(s.categoryId);
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
              <Trash2 size={20} color={COLORS.danger} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [isEditing]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Missing fields', 'Please fill in both title and content.');
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Home Address"
          placeholderTextColor={COLORS.textMuted}
          maxLength={60}
        />

        <Text style={styles.label}>Content</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={content}
          onChangeText={setContent}
          placeholder="Paste or type the text you want to copy…"
          placeholderTextColor={COLORS.textMuted}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          <TouchableOpacity
            style={[styles.catChip, selectedCategory === null && styles.catChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.catChipText, selectedCategory === null && styles.catChipTextActive]}>None</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catChip,
                { borderColor: cat.color },
                selectedCategory === cat.id && { backgroundColor: cat.color },
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.catChipText, { color: selectedCategory === cat.id ? '#fff' : cat.color }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
          <Save size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving…' : isEditing ? 'Update Snippet' : 'Save Snippet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE9F6' },
  content: { padding: 20, gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#F5F3FF', borderRadius: 14, borderWidth: 1, borderColor: '#DDD6FE', padding: 14, color: '#1E1B2E', fontSize: 15 },
  textarea: { minHeight: 120, paddingTop: 14 },
  categoryRow: { flexDirection: 'row', marginBottom: 8 },
  catChip: { borderRadius: 20, borderWidth: 1.5, borderColor: '#DDD6FE', backgroundColor: '#F5F3FF', paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  catChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  catChipTextActive: { color: '#fff' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C3AED', borderRadius: 16, padding: 16, marginTop: 24, gap: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default AddSnippetScreen;
