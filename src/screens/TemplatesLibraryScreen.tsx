// src/screens/TemplatesLibraryScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  Download,
  Eye,
  Plus,
  Sparkles,
  X,
  Check,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../hooks/useTheme';
import { useSnippets } from '../hooks/useSnippets';
import { useCategories } from '../hooks/useCategories';
import { textFont } from '../constants/typography';
import { RootStackParamList, Template } from '../types';
import { TEMPLATE_LIBRARY } from '../constants/templates';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface TemplateCardProps {
  template: Template;
  onView: () => void;
  onImport: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onView, onImport }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.templateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.templateHeader}>
        <Text style={[styles.templateTitle, { color: theme.text }]} numberOfLines={1}>
          {template.title}
        </Text>
        <View style={styles.templateActions}>
          <TouchableOpacity
            onPress={onView}
            style={[styles.actionButton, { backgroundColor: theme.surfaceAlt }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Eye size={16} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onImport}
            style={[styles.actionButton, { backgroundColor: theme.primarySoft }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <Text 
        style={[styles.templatePreview, { color: theme.textSecondary }]} 
        numberOfLines={2}
      >
        {template.content}
      </Text>
      <View style={styles.templateTags}>
        {template.tags.slice(0, 2).map((tag, index) => (
          <View 
            key={index} 
            style={[styles.tag, { backgroundColor: theme.surfaceAlt }]}
          >
            <Text style={[styles.tagText, { color: theme.textSecondary }]}>
              {tag}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

interface PreviewModalProps {
  visible: boolean;
  template: Template | null;
  onClose: () => void;
  onImport: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ visible, template, onClose, onImport }) => {
  const { theme } = useTheme();
  
  if (!template) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.previewCard, { backgroundColor: theme.surface }]}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewTitle, { color: theme.text }]}>
              {template.title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.previewContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.previewText, { color: theme.text }]}>
              {template.content}
            </Text>
            
            <View style={styles.previewTags}>
              {template.tags.map((tag, index) => (
                <View 
                  key={index} 
                  style={[styles.previewTag, { backgroundColor: theme.surfaceAlt }]}
                >
                  <Text style={[styles.previewTagText, { color: theme.textSecondary }]}>
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
          
          <TouchableOpacity
            style={[styles.importButton, { backgroundColor: theme.primary }]}
            onPress={onImport}
          >
            <Download size={18} color={theme.onPrimary} />
            <Text style={[styles.importButtonText, { color: theme.onPrimary }]}>
              Import Template
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const TemplatesLibraryScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { createSnippet } = useSnippets();
  const { categories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const filteredLibrary = selectedCategory
    ? TEMPLATE_LIBRARY.filter(cat => cat.id === selectedCategory)
    : TEMPLATE_LIBRARY;

  const handleImportTemplate = async (template: Template) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Find matching category or use first available
      const matchingCategory = categories.find(c => c.id === template.category);
      const categoryId = matchingCategory?.id || categories[0]?.id || null;
      
      await createSnippet({
        title: template.title,
        content: template.content,
        categoryId,
        isFavorite: false,
      });
      
      setImportedIds(prev => new Set([...prev, template.id]));
      setShowPreview(false);
      
      Alert.alert(
        'Template Imported!',
        `"${template.title}" has been added to your messages.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to import template. Please try again.');
    }
  };

  const handleBulkImport = async (categoryId: string) => {
    const category = TEMPLATE_LIBRARY.find(cat => cat.id === categoryId);
    if (!category) return;
    
    Alert.alert(
      'Import All Templates',
      `Import all ${category.templates.length} templates from ${category.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              for (const template of category.templates) {
                const matchingCategory = categories.find(c => c.id === template.category);
                const categoryId = matchingCategory?.id || categories[0]?.id || null;
                
                await createSnippet({
                  title: template.title,
                  content: template.content,
                  categoryId,
                  isFavorite: false,
                });
                
                setImportedIds(prev => new Set([...prev, template.id]));
              }
              
              Alert.alert(
                'Success!',
                `Imported ${category.templates.length} templates from ${category.name}.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to import some templates. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Sparkles size={20} color={theme.primary} />
          <Text style={[styles.headerText, { color: theme.text }]}>Templates</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            { borderColor: theme.border },
            selectedCategory === null && { backgroundColor: theme.primarySoft, borderColor: theme.primary }
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[
            styles.filterChipText,
            { color: theme.textSecondary },
            selectedCategory === null && { color: theme.primary }
          ]}>
            All
          </Text>
        </TouchableOpacity>
        
        {TEMPLATE_LIBRARY.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.filterChip,
              { borderColor: theme.border },
              selectedCategory === cat.id && { backgroundColor: theme.primarySoft, borderColor: theme.primary }
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[
              styles.filterChipText,
              { color: theme.textSecondary },
              selectedCategory === cat.id && { color: theme.primary }
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filteredLibrary.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: theme.text }]}>
                  {category.name}
                </Text>
                <Text style={[styles.categoryDescription, { color: theme.textSecondary }]}>
                  {category.description}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.importAllButton, { backgroundColor: theme.primarySoft }]}
                onPress={() => handleBulkImport(category.id)}
              >
                <Download size={14} color={theme.primary} />
                <Text style={[styles.importAllText, { color: theme.primary }]}>
                  Import All
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.templatesGrid}>
              {category.templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onView={() => {
                    setPreviewTemplate(template);
                    setShowPreview(true);
                  }}
                  onImport={() => handleImportTemplate(template)}
                />
              ))}
            </View>
          </View>
        ))}
        
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {/* Preview Modal */}
      <PreviewModal
        visible={showPreview}
        template={previewTemplate}
        onClose={() => {
          setShowPreview(false);
          setPreviewTemplate(null);
        }}
        onImport={() => previewTemplate && handleImportTemplate(previewTemplate)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    ...textFont('bold'),
    fontSize: 18,
  },
  filterScroll: {
    maxHeight: 50,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    ...textFont('semibold'),
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    ...textFont('bold'),
    fontSize: 20,
    marginBottom: 4,
  },
  categoryDescription: {
    ...textFont('regular'),
    fontSize: 13,
    lineHeight: 18,
  },
  importAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  importAllText: {
    ...textFont('semibold'),
    fontSize: 12,
  },
  templatesGrid: {
    gap: 12,
  },
  templateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateTitle: {
    ...textFont('semibold'),
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    padding: 6,
    borderRadius: 8,
  },
  templatePreview: {
    ...textFont('regular'),
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  templateTags: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    ...textFont('medium'),
    fontSize: 11,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  previewCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  previewTitle: {
    ...textFont('bold'),
    fontSize: 20,
    flex: 1,
    marginRight: 16,
  },
  previewContent: {
    flex: 1,
    marginBottom: 20,
  },
  previewText: {
    ...textFont('regular'),
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  previewTagText: {
    ...textFont('medium'),
    fontSize: 12,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  importButtonText: {
    ...textFont('semibold'),
    fontSize: 16,
  },
});

export default TemplatesLibraryScreen;
