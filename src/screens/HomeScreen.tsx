import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SnippetCard } from '../components/cards/SnippetCard';
import { SnippetCardSkeleton } from '../components/cards/SnippetCardSkeleton';
import { CategoryChipBar } from '../components/common/CategoryChipBar';
import { SearchBar } from '../components/common/SearchBar';
import { useSnippets } from '../hooks/useSnippets';
import { useCategories } from '../hooks/useCategories';
import { useRatingPrompt } from '../hooks/useRatingPrompt';
import { ANIMATION_DURATION } from '../constants';
import { textFont } from '../constants/typography';
import { RootStackParamList, Snippet } from '../types';
import { useTheme } from '../hooks/useTheme';
import { isGridPlaceholderItem, padGridItems, GridListItem } from '../utils/padGridItems';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const NUM_COLUMNS = 2;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
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
  const { triggerPrompt } = useRatingPrompt();
  const gridSnippets = useMemo(() => padGridItems(snippets, NUM_COLUMNS), [snippets]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Qoppy',
    });
  }, [navigation]);

  React.useEffect(() => {
    triggerPrompt();
  }, [triggerPrompt]);

  const handleEdit = useCallback((snippet: Snippet) => {
    navigation.navigate('AddSnippet', { snippetId: snippet.id });
  }, [navigation]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteSnippet(id);
  }, [deleteSnippet]);

  const renderItem = useCallback(
    ({ item, index }: { item: GridListItem<Snippet>; index: number }) =>
      isGridPlaceholderItem(item) ? (
        <View style={styles.cardPlaceholder} />
      ) : (
        <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 500)).springify()} style={{ flex: 1 }}>
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

      <FlatList
        data={gridSnippets}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={NUM_COLUMNS > 1 ? styles.row : undefined}
        style={styles.listView}
        contentContainerStyle={styles.list}
        onRefresh={refresh}
        refreshing={isLoading && snippets.length > 0}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search snippets..." />
            <CategoryChipBar
              categories={categories}
              activeId={activeCategory}
              onSelect={filterByCategory}
            />
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={styles.skeletonItem}>
                  <SnippetCardSkeleton />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState />
          )
        }
      />

      <TouchableOpacity
        style={[
          styles.fabWrap,
          {
            bottom: insets.bottom + 100,
            shadowColor: theme.primary,
          },
        ]}
        onPress={() => navigation.navigate('AddSnippet', {})}
        activeOpacity={0.85}
      >
        <BlurView
          intensity={80}
          tint={mode === 'dark' ? 'dark' : 'light'}
          style={[
            styles.fab,
            {
              backgroundColor: mode === 'dark' ? `${theme.primary}80` : `${theme.primary}A0`,
              borderColor: `${theme.primary}80`,
              borderWidth: 1,
            },
          ]}
        >
          <Plus size={26} color={theme.onPrimary} strokeWidth={2.5} />
        </BlurView>
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
              Free Qoppy now pauses at 10 saved snippets. Upgrade for unlimited snippets, backup, and device sync, or close this message and keep using your current library.
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
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  listView: {
    flex: 1,
    alignSelf: 'stretch',
  },
  list: {
    paddingTop: 2,
    paddingBottom: 152,
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  listHeader: {
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
  },
  row: {
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 8,
  },
  cardPlaceholder: {
    flex: 1,
    marginBottom: 8,
  },
  count: {
    ...textFont(),
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 2,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
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
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 16,
  },
  skeletonItem: {
    width: '48%',
    height: 138,
  },
  fabWrap: {
    position: 'absolute',
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
});

export default HomeScreen;
