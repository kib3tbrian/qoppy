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
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Crown } from 'lucide-react-native';

import { SnippetCard } from '../components/cards/SnippetCard';
import { db } from '../services/database';
import { useSnippets } from '../hooks/useSnippets';
import { Snippet, RootStackParamList } from '../types';
import { COLORS } from '../constants';
import { textFont } from '../constants/typography';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = SCREEN_WIDTH > 420 ? 3 : 2;

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [favorites, setFavorites] = useState<Snippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { copiedId, copySnippet, toggleFavorite: toggleFav, deleteSnippet } = useSnippets();

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
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={Layout.springify()}>
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
      </Animated.View>
    ),
    [copiedId, copySnippet, deleteSnippet, handleToggleFav, navigation]
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={NUM_COLUMNS > 1 ? styles.row : undefined}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.count}>
            {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{"<3"}</Text>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart on any snippet to save it here.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  headerBtn: {
    padding: 8,
  },
  list: { paddingBottom: 112 },
  row: { justifyContent: 'flex-start', paddingHorizontal: 8 },
  count: {
    ...textFont(),
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyIcon: { ...textFont(true), fontSize: 44, color: '#EF4444' },
  emptyTitle: { ...textFont(), fontSize: 22, fontWeight: '800', color: COLORS.text },
  emptySubtitle: { ...textFont(), fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 23 },
});

export default FavoritesScreen;
