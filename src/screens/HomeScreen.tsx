import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Crown, Plus, Sparkles, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SnippetCard } from '../components/cards/SnippetCard';
import { SnippetCardSkeleton } from '../components/cards/SnippetCardSkeleton';
import { SearchBar } from '../components/common/SearchBar';
import { AuthModal } from '../components/common/AuthModal';
import { CategoryChipBar } from '../components/common/CategoryChipBar';
import { EmptyState as UIEmptyState, OfflineBadge } from '../components/common/UIStates';
import { useAuth } from '../providers/AuthProvider';
import { useNetwork } from '../providers/NetworkProvider';
import { useSnippets } from '../hooks/useSnippets';
import { useCategories } from '../hooks/useCategories';
import { useEntitlement } from '../hooks/useEntitlement';
import { useRatingPrompt } from '../hooks/useRatingPrompt';
import { DEFAULT_CATEGORIES } from '../constants';
import { textFont } from '../constants/typography';
import { RootStackParamList, Snippet } from '../types';
import { useTheme } from '../hooks/useTheme';
import { isGridPlaceholderItem, padGridItems, GridListItem } from '../utils/padGridItems';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const NUM_COLUMNS = 2;
const FREE_SEND_WARNING_THRESHOLD = 40;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const { user } = useAuth();
  const { isOffline, isSlow } = useNetwork();
  const [authModalVisible, setAuthModalVisible] = React.useState(false);
  const isFocused = useIsFocused();
  const {
    snippets,
    isLoading,
    copiedId,
    copySnippet,
    shareSnippet,
    createSnippet,
    toggleFavorite,
    deleteSnippet,
    filterByCategory,
    activeCategory,
    searchQuery,
    setSearchQuery,
    premiumPromptVisible,
    isPremium,
    monthlyShareCount,
    freeShareLimit,
    refreshShareUsage,
    dismissPremiumPrompt,
    refresh,
  } = useSnippets();
  const { categories, refresh: refreshCategories } = useCategories();
  const { triggerPrompt } = useRatingPrompt();
  const gridSnippets = useMemo(() => padGridItems(snippets, NUM_COLUMNS), [snippets]);
  const activeCategoryDetails = useMemo(
    () => categories.find(category => category.id === activeCategory),
    [activeCategory, categories]
  );
  const existingCategoryIds = useMemo(() => new Set(categories.map(category => category.id)), [categories]);
  const visibleCategories = categories.length > 0
    ? categories
    : [
      DEFAULT_CATEGORIES.find(cat => cat.id === 'welcome') ??
      { id: 'welcome', name: 'Welcome', color: '#8B5CF6', icon: 'tag', createdAt: Date.now() },
    ];
  const activeCategoryId = activeCategory && existingCategoryIds.has(activeCategory)
    ? activeCategory
    : categories.length === 0
      ? visibleCategories[0].id
      : null;

  React.useEffect(() => {
    if (activeCategory && !existingCategoryIds.has(activeCategory)) {
      filterByCategory(null);
    }
  }, [activeCategory, existingCategoryIds, filterByCategory]);

  const { isPro } = useEntitlement();
  const [nudgeDismissed, setNudgeDismissed] = React.useState(false);
  const showProBadge = isPro || isPremium;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[{ ...textFont('bold'), fontSize: 20, color: theme.text }]}>Sagent</Text>
          {showProBadge && <Crown size={18} color="#8B5CF6" fill="#8B5CF6" />}
        </View>
      ),
    });
  }, [navigation, showProBadge, theme.text]);

  React.useEffect(() => {
    triggerPrompt();
  }, [triggerPrompt]);

  React.useEffect(() => {
    if (!isFocused) return;
    let cancelled = false;
    Promise.all([refreshShareUsage(), refreshCategories()]).then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [isFocused, refreshShareUsage, refreshCategories]);

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

  const handleEdit = useCallback((snippet: Snippet) => {
    requireAuth(() => navigation.navigate('AddSnippet', { snippetId: snippet.id }));
  }, [navigation, requireAuth]);

  const handleDelete = useCallback((id: string) => {
    requireAuth(async () => {
      await deleteSnippet(id);
    });
  }, [deleteSnippet, requireAuth]);

  const handleCopy = useCallback((snippet: Snippet) => {
    requireAuth(() => copySnippet(snippet));
  }, [copySnippet, requireAuth]);

  const handleShare = useCallback((snippet: Snippet) => {
    requireAuth(() => shareSnippet(snippet));
  }, [shareSnippet, requireAuth]);

  const handleFavorite = useCallback((id: string) => {
    requireAuth(() => toggleFavorite(id));
  }, [toggleFavorite, requireAuth]);



  const renderItem = useCallback(
    ({ item, index }: { item: GridListItem<Snippet>; index: number }) =>
      isGridPlaceholderItem(item) ? (
        <View style={styles.cardPlaceholder} />
      ) : (
        <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 500)).springify()} style={{ flex: 1 }}>
          <SnippetCard
            snippet={item}
            isCopied={copiedId === item.id}
            onCopy={handleCopy}
            onShare={handleShare}
            onFavorite={handleFavorite}
            onEdit={handleEdit}
            onDelete={handleDelete}
            searchQuery={searchQuery}
          />
        </Animated.View>
      ),
    [copiedId, handleCopy, handleDelete, handleEdit, searchQuery, handleShare, handleFavorite]
  );

  const EmptyState = () => {
    const hasSearch = Boolean(searchQuery.trim());
    const categoryName = activeCategoryDetails?.name;
    const title = hasSearch
      ? 'No results found'
      : categoryName
        ? `No ${categoryName} messages yet`
        : 'No messages yet';
    const subtitle = hasSearch
      ? 'Search checks titles, message text, and category names.'
      : categoryName
        ? `Start with a ${categoryName.toLowerCase()} template or add your own.`
        : 'Start from a template or tap + to write your own.';

    return (
      <UIEmptyState
        title={title}
        subtitle={subtitle}
        actionLabel={hasSearch ? 'Clear search' : undefined}
        onAction={hasSearch ? () => setSearchQuery('') : undefined}
      />
    );
  };

  const FreeSendIndicator = () => {
    if (isPremium || isPro) {
      return null;
    }

    if (monthlyShareCount >= FREE_SEND_WARNING_THRESHOLD) {
      if (nudgeDismissed) return null;

      return (
        <TouchableOpacity
          style={[
            styles.nudgeBanner,
            { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}40` },
          ]}
          onPress={() => navigation.navigate('Paywall', { source: 'nudge-banner' })}
          activeOpacity={0.85}
        >
          <Text style={[styles.nudgeText, { color: theme.text }]}>
            <Text style={{ ...textFont('bold'), color: theme.danger }}>{monthlyShareCount}/50 free sends used</Text> · Upgrade for unlimited →
          </Text>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              setNudgeDismissed(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ padding: 2 }}
          >
            <X size={14} color={theme.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.sendUsageRow}>
        <Text style={[styles.sendUsageText, { color: theme.textMuted }]}>
          {monthlyShareCount} of {freeShareLimit} free sends used
        </Text>
        <Text style={[styles.sendUsageText, { color: theme.textMuted }]}> · </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Paywall', { source: 'home-usage' })}
          activeOpacity={0.75}
        >
          <Text style={[styles.sendUsageLink, { color: theme.primary }]}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerWrapper}>
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search messages..." />
        <CategoryChipBar
          categories={visibleCategories}
          activeId={activeCategoryId}
          onSelect={filterByCategory}
          onManage={() => navigation.navigate('ManageCategories')}
        />
        <FreeSendIndicator />
      </View>

      <OfflineBadge isOffline={isOffline} isSlow={isSlow} />

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
        onPress={() => requireAuth(() => navigation.navigate('AddSnippet', {}))}
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
        onRequestClose={() => dismissPremiumPrompt()}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} />
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              You've used all 50 free sends
            </Text>
            <Text style={[styles.modalBody, { color: theme.textSecondary }]}>
              Upgrade to Pro for unlimited sends and no watermark.
            </Text>
            <TouchableOpacity
              style={[styles.modalPrimaryButton, { backgroundColor: theme.primary }]}
              onPress={async () => {
                await dismissPremiumPrompt();
                navigation.navigate('Paywall', { source: 'limit-modal' });
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.modalPrimaryText, { color: theme.onPrimary }]}>Upgrade to Pro</Text>
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

      <AuthModal 
        visible={authModalVisible} 
        onClose={() => setAuthModalVisible(false)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  headerWrapper: {
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
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
  sendUsageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 8,
  },
  sendUsageText: {
    ...textFont('regular'),
    fontSize: 12,
  },
  sendUsageLink: {
    ...textFont('semibold'),
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    ...textFont('bold'),
    fontSize: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...textFont('regular'),
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
  },
  emptyButton: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 18,
  },
  emptyButtonText: {
    ...textFont('bold'),
    fontSize: 14,
  },
  templateList: {
    alignSelf: 'stretch',
    paddingHorizontal: 10,
    marginTop: 20,
    gap: 8,
  },
  templateButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  templateText: {
    ...textFont('semibold'),
    fontSize: 14,
    flex: 1,
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
    ...textFont('bold'),
    fontSize: 22,
    marginBottom: 10,
  },
  modalBody: {
    ...textFont('regular'),
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
    ...textFont('bold'),
    fontSize: 16,
  },
  modalSecondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSecondaryText: {
    ...textFont('semibold'),
    fontSize: 15,
  },
  nudgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  nudgeText: {
    ...textFont('medium'),
    fontSize: 13,
  },
});

export default HomeScreen;
