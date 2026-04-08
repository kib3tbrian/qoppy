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
} from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, Crown } from 'lucide-react-native';

import { SnippetCard } from '../components/cards/SnippetCard';
import { CategoryChipBar } from '../components/common/CategoryChipBar';
import { SearchBar } from '../components/common/SearchBar';
import { useSnippets } from '../hooks/useSnippets';
import { useCategories } from '../hooks/useCategories';
import { COLORS } from '../constants';
import { textFont } from '../constants/typography';
import { RootStackParamList, Snippet } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = SCREEN_WIDTH > 420 ? 3 : 2;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
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
    refresh,
  } = useSnippets();
  const { categories } = useCategories();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Qoppy',
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Paywall')} style={styles.headerBtn} activeOpacity={0.75}>
          <Crown size={20} color="#7C3AED" />
        </TouchableOpacity>
      ),
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
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={Layout.springify()}>
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
      <Text style={styles.emptyIcon}>[]</Text>
      <Text style={styles.emptyTitle}>{searchQuery ? 'No results found' : 'No snippets yet'}</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try a different search term.' : 'Tap + to save your first snippet.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#EDE9F6" />

      <FlatList
        data={snippets}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={NUM_COLUMNS > 1 ? styles.row : undefined}
        contentContainerStyle={styles.list}
        onRefresh={refresh}
        refreshing={isLoading && snippets.length > 0}
        ListHeaderComponent={
          <>
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search snippets..." />

            <CategoryChipBar
              categories={categories}
              activeId={activeCategory}
              onSelect={filterByCategory}
            />

            {!isLoading && (
              <Text style={styles.count}>
                {snippets.length} snippet{snippets.length !== 1 ? 's' : ''}
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loader} color={COLORS.primary} size="large" />
          ) : (
            <EmptyState />
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddSnippet', {})}
        activeOpacity={0.85}
      >
        <Plus size={26} color={COLORS.white} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE9F6',
  },
  headerBtn: {
    padding: 8,
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
    color: '#6B7280',
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
    color: '#7C3AED',
  },
  emptyTitle: {
    ...textFont(),
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1B2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...textFont(),
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 23,
  },
  loader: {
    marginTop: 80,
  },
  fab: {
    position: 'absolute',
    bottom: 92,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default HomeScreen;
