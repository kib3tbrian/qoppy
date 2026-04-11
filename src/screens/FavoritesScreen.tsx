import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SnippetCard } from '../components/cards/SnippetCard';
import { db } from '../services/database';
import { useSnippets } from '../hooks/useSnippets';
import { Snippet, RootStackParamList } from '../types';
import { textFont } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = SCREEN_WIDTH > 420 ? 3 : 2;

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
  const [favorites, setFavorites] = useState<Snippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { copiedId, copySnippet, toggleFavorite: toggleFav, deleteSnippet } = useSnippets();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Qoppy',
    });
  }, [navigation]);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await db.getFavoriteSnippets();
      setFavorites(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadFavorites();
  }, [loadFavorites]));

  const handleToggleFav = useCallback(async (id: string) => {
    await toggleFav(id);
    setFavorites(prev => prev.filter(s => s.id !== id));
  }, [toggleFav]);

  const renderItem = useCallback(
    ({ item }: { item: Snippet }) => (
      <View>
        <SnippetCard
          snippet={item}
          isCopied={copiedId === item.id}
          onCopy={copySnippet}
          onFavorite={handleToggleFav}
          onEdit={snippet => navigation.navigate('AddSnippet', { snippetId: snippet.id })}
          onDelete={async id => {
            await deleteSnippet(id);
            setFavorites(prev => prev.filter(s => s.id !== id));
          }}
        />
      </View>
    ),
    [copiedId, copySnippet, deleteSnippet, handleToggleFav, navigation]
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={favorites}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={NUM_COLUMNS > 1 ? styles.row : undefined}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={[styles.count, { color: theme.textSecondary }]}>
            {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyIcon, { color: theme.primary }]}>♡</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No favorites yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Save the snippets you reach for most and they’ll show up here for quick copying.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 112 },
  row: { justifyContent: 'flex-start', paddingHorizontal: 8 },
  count: {
    ...textFont(),
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyIcon: { ...textFont(true), fontSize: 44 },
  emptyTitle: { ...textFont(), fontSize: 22, fontWeight: '800' },
  emptySubtitle: { ...textFont(), fontSize: 15, textAlign: 'center', lineHeight: 23 },
});

export default FavoritesScreen;
