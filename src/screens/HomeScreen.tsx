import React, { useCallback, useLayoutEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Modal,
  Pressable,
} from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';

import { SnippetCard } from '../components/cards/SnippetCard';
import { CategoryChipBar } from '../components/common/CategoryChipBar';
import { SearchBar } from '../components/common/SearchBar';
import { useSnippets } from '../hooks/useSnippets';
import { useCategories } from '../hooks/useCategories';
import { ANIMATION_DURATION } from '../constants';
import { textFont } from '../constants/typography';
import { RootStackParamList, Snippet } from '../types';
import { useTheme } from '../hooks/useTheme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = SCREEN_WIDTH > 420 ? 3 : 2;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { theme, mode } = useTheme();
  const {
    snippets,
    isLoading,
    copiedId,
    copySnippet,
    toggleFavorite,
    deleteSnippet,
    filterByCategory,
    activeCategory,
    searchQuery,
    setSearchQuery,
    premiumPromptVisible,
    dismissPremiumPrompt,
    refresh,
  } = useSnippets();
  const { categories } = useCategories();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Qoppy',
    });
  }, [navigation]);

  const handleEdit = useCallback((snippet: Snippet) => {
    navigation.navigate('AddSnippet', { snippetId: snippet.id });
  }, [navigation]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteSnippet(id);
  }, [deleteSnippet]);

  const renderItem = useCallback(
    ({ item }: { item: Snippet }) => (
      <Animated.View
        entering={FadeIn.duration(ANIMATION_DURATION.normal)}
        exiting={FadeOut.duration(ANIMATION_DURATION.fast)}
        layout={Layout.springify()}
      >
        <SnippetCard
          snippet={item}
          isCopied={copiedId === item.id}
          onCopy={copySnippet}
          onFavorite={toggleFavorite}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Animated.View>
    ),
    [copiedId, copySnippet, toggleFavorite, handleEdit, handleDelete]
  );

  const EmptyState = () => (
    <View style={styles.empty}>
      <Text style={[styles.emptyIcon, { color: theme.primary }]}>[]</Text>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{searchQuery ? 'No results found' : 'No snippets yet'}</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        {searchQuery ? 'Try a different search term.' : 'Tap + to save your first snippet.'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search snippets..." />

      <CategoryChipBar
        categories={categories}
        activeId={activeCategory}
        onSelect={filterByCategory}
      />

      {!isLoading && (
        <Text style={[styles.count, { color: theme.textSecondary }]}>
          {snippets.length} snippet{snippets.length !== 1 ? 's' : ''}
        </Text>
      )}

      <FlatList
        data={snippets}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={NUM_COLUMNS > 1 ? styles.row : undefined}
        contentContainerStyle={styles.list}
        onRefresh={refresh}
        refreshing={isLoading && snippets.length > 0}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loader} color={theme.primary} size="large" />
          ) : (
            <EmptyState />
          )
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
        onPress={() => navigation.navigate('AddSnippet', {})}
        activeOpacity={0.85}
      >
        <Plus size={26} color={theme.onPrimary} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal
        visible={premiumPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} />
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>You reached 10 snippets</Text>
            <Text style={[styles.modalBody, { color: theme.textSecondary }]}>
              Free Qoppy now pauses at 10 saved snippets. Upgrade for unlimited snippets and payment features, or close this message and keep using your current library.
            </Text>
            <TouchableOpacity
              style={[styles.modalPrimaryButton, { backgroundColor: theme.primary }]}
              onPress={async () => {
                await dismissPremiumPrompt();
                navigation.navigate('Paywall', { source: 'limit-modal' });
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.modalPrimaryText, { color: theme.onPrimary }]}>Go Premium</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSecondaryButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
              onPress={() => void dismissPremiumPrompt()}
              activeOpacity={0.85}
            >
              <Text style={[styles.modalSecondaryText, { color: theme.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingBottom: 118,
  },
  row: {
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
  },
  count: {
    ...textFont(),
    fontSize: 13,
    paddingHorizontal: 20,
    paddingBottom: 4,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    ...textFont(true),
    fontSize: 40,
    marginBottom: 16,
  },
  emptyTitle: {
    ...textFont(),
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...textFont(),
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
  },
  loader: {
    marginTop: 80,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  modalTitle: {
    ...textFont(),
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },
  modalBody: {
    ...textFont(),
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  modalPrimaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalPrimaryText: {
    ...textFont(),
    fontSize: 16,
    fontWeight: '800',
  },
  modalSecondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSecondaryText: {
    ...textFont(),
    fontSize: 15,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 92,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default HomeScreen;
