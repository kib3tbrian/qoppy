import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Heart } from 'lucide-react-native';

import { SnippetCard } from '../components/cards/SnippetCard';
import { EmptyState, OfflineBadge, LoadingState } from '../components/common/UIStates';
import { AuthModal } from '../components/common/AuthModal';
import { useAuth } from '../providers/AuthProvider';
import { useNetwork } from '../providers/NetworkProvider';
import { useSnippets } from '../hooks/useSnippets';
import { Snippet, RootStackParamList } from '../types';
import { textFont } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';
import { GridListItem, isGridPlaceholderItem, padGridItems } from '../utils/padGridItems';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const NUM_COLUMNS = 2;

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isOffline, isSlow } = useNetwork();
  const [authModalVisible, setAuthModalVisible] = React.useState(false);
  const { allSnippets, isLoading, copiedId, copySnippet, shareSnippet, toggleFavorite, deleteSnippet } = useSnippets();
  const favorites = useMemo(() => allSnippets.filter(s => s && s.isFavorite), [allSnippets]);
  const gridFavorites = useMemo(() => padGridItems(favorites, NUM_COLUMNS), [favorites]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Sagent',
    });
  }, [navigation]);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (user?.isAnonymous) {
        setAuthModalVisible(true);
      } else {
        action();
      }
    },
    [user?.isAnonymous]
  );

  const renderItem = useCallback(
    ({ item }: { item: GridListItem<Snippet> }) =>
      isGridPlaceholderItem(item) ? (
        <View style={styles.cardPlaceholder} />
      ) : (
        <SnippetCard
          snippet={item}
          isCopied={copiedId === item.id}
          onCopy={snippet => requireAuth(() => copySnippet(snippet))}
          onShare={snippet => requireAuth(() => shareSnippet(snippet))}
          onFavorite={id => requireAuth(() => toggleFavorite(id))}
          onEdit={snippet => requireAuth(() => navigation.navigate('AddSnippet', { snippetId: snippet.id }))}
          onDelete={id => requireAuth(() => deleteSnippet(id))}
        />
      ),
    [copiedId, copySnippet, deleteSnippet, navigation, shareSnippet, toggleFavorite, requireAuth]
  );

  if (isLoading && allSnippets.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingState message="Loading favorites..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <OfflineBadge isOffline={isOffline} isSlow={isSlow} />
      <FlatList
        data={gridFavorites}
        keyExtractor={item => isGridPlaceholderItem(item) ? `placeholder-${item.id}` : item.id}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={NUM_COLUMNS > 1 ? styles.row : undefined}
        contentContainerStyle={styles.list}
        ListHeaderComponent={favorites.length > 0 ? (
          <Text style={[styles.count, { color: theme.textSecondary }]}>
            {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
          </Text>
        ) : null}
        ListEmptyComponent={
          <EmptyState
            icon={<Heart size={44} color={theme.primary} strokeWidth={2} />}
            title="No favorites yet"
            subtitle="Pin your most-sent messages here for one-tap sharing."
          />
        }
      />

      <AuthModal 
        visible={authModalVisible} 
        onClose={() => setAuthModalVisible(false)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 2, paddingBottom: 112 },
  row: { alignItems: 'stretch', justifyContent: 'space-between', paddingHorizontal: 12, gap: 8 },
  cardPlaceholder: { flex: 1, marginBottom: 8, height: 138 },
  count: {
    ...textFont('regular'),
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { ...textFont('bold'), fontSize: 22 },
  emptySubtitle: { ...textFont('regular'), fontSize: 15, textAlign: 'center', lineHeight: 23 },
});

export default FavoritesScreen;
