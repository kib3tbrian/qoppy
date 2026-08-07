// src/screens/StatisticsScreen.tsx

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TrendingUp,
  MessageSquare,
  Copy,
  Share2,
  Clock,
  Heart,
  BarChart3,
  ChevronLeft,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../hooks/useTheme';
import { useSnippets } from '../hooks/useSnippets';
import { useCategories } from '../hooks/useCategories';
import { textFont } from '../constants/typography';
import { RootStackParamList, Snippet } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface StatCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, subtitle, color }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}20` }]}>
        <Icon size={20} color={color} strokeWidth={2} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
        {subtitle && <Text style={[styles.statSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>}
      </View>
    </View>
  );
};

interface TopMessageProps {
  snippet: Snippet;
  rank: number;
  onPress: () => void;
}

const TopMessage: React.FC<TopMessageProps> = ({ snippet, rank, onPress }) => {
  const { theme } = useTheme();
  
  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const rankColor = rank <= 3 ? medalColors[rank - 1] : theme.primary;
  
  return (
    <TouchableOpacity
      style={[styles.topMessage, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rankBadge, { backgroundColor: `${rankColor}20` }]}>
        <Text style={[styles.rankText, { color: rankColor }]}>#{rank}</Text>
      </View>
      <View style={styles.topMessageContent}>
        <Text style={[styles.topMessageTitle, { color: theme.text }]} numberOfLines={1}>
          {snippet.title}
        </Text>
        <View style={styles.topMessageStats}>
          <View style={styles.topMessageStat}>
            <TrendingUp size={12} color={theme.textMuted} />
            <Text style={[styles.topMessageStatText, { color: theme.textSecondary }]}>
              {snippet.useCount} uses
            </Text>
          </View>
          {snippet.categoryName && (
            <View style={[styles.topMessageCategory, { backgroundColor: `${snippet.categoryColor}30` }]}>
              <Text style={[styles.topMessageCategoryText, { color: snippet.categoryColor }]}>
                {snippet.categoryName}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const StatisticsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { allSnippets, monthlyShareCount } = useSnippets();
  const { categories } = useCategories();

  // Calculate statistics
  const stats = useMemo(() => {
    const totalMessages = allSnippets.length;
    const totalCopies = allSnippets.reduce((sum, s) => sum + s.useCount, 0);
    const totalShares = monthlyShareCount;
    const favoriteCount = allSnippets.filter(s => s.isFavorite).length;
    
    // Top messages by usage
    const topMessages = [...allSnippets]
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 10);
    
    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    allSnippets.forEach(snippet => {
      const catName = snippet.categoryName || 'Uncategorized';
      categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + 1;
    });
    
    // Time saved estimate (assuming 1 minute per message)
    const timeSavedMinutes = totalCopies + totalShares;
    const timeSavedHours = (timeSavedMinutes / 60).toFixed(1);
    
    return {
      totalMessages,
      totalCopies,
      totalShares,
      favoriteCount,
      topMessages,
      categoryBreakdown,
      timeSavedMinutes,
      timeSavedHours,
    };
  }, [allSnippets, monthlyShareCount]);

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Statistics</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card - Time Saved */}
        <LinearGradient
          colors={[theme.primary, '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Clock size={32} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.heroValue}>{stats.timeSavedHours}h</Text>
          <Text style={styles.heroLabel}>Time Saved This Month</Text>
          <Text style={styles.heroSubtext}>
            ~{stats.timeSavedMinutes} actions that would've taken 1 min each
          </Text>
        </LinearGradient>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon={MessageSquare}
            label="Total Messages"
            value={stats.totalMessages}
            color={theme.primary}
          />
          <StatCard
            icon={Copy}
            label="Copies"
            value={stats.totalCopies}
            subtitle="All time"
            color="#10B981"
          />
          <StatCard
            icon={Share2}
            label="Sends"
            value={stats.totalShares}
            subtitle="This month"
            color="#F59E0B"
          />
          <StatCard
            icon={Heart}
            label="Favorites"
            value={stats.favoriteCount}
            color="#EC4899"
          />
        </View>

        {/* Top Messages Section */}
        {stats.topMessages.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color={theme.text} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Messages</Text>
            </View>
            <View style={styles.topMessagesList}>
              {stats.topMessages.map((snippet, index) => (
                <TopMessage
                  key={snippet.id}
                  snippet={snippet}
                  rank={index + 1}
                  onPress={() => navigation.navigate('AddSnippet', { snippetId: snippet.id })}
                />
              ))}
            </View>
          </View>
        )}

        {/* Category Breakdown */}
        {Object.keys(stats.categoryBreakdown).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={20} color={theme.text} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Category Breakdown</Text>
            </View>
            <View style={[styles.categoryChart, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {Object.entries(stats.categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([catName, count], index) => {
                  const category = categories.find(c => c.name === catName);
                  const percentage = ((count / stats.totalMessages) * 100).toFixed(0);
                  
                  return (
                    <View key={index} style={styles.categoryRow}>
                      <View style={styles.categoryInfo}>
                        <View style={[
                          styles.categoryDot,
                          { backgroundColor: category?.color || theme.textMuted }
                        ]} />
                        <Text style={[styles.categoryName, { color: theme.text }]}>{catName}</Text>
                      </View>
                      <View style={styles.categoryStats}>
                        <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>
                          {count} ({percentage}%)
                        </Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        )}

        {/* Empty State */}
        {stats.totalMessages === 0 && (
          <View style={styles.emptyState}>
            <BarChart3 size={48} color={theme.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No statistics yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
              Start creating and using messages to see your stats
            </Text>
          </View>
        )}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
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
    ...textFont('bold'),
    fontSize: 18,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  heroValue: {
    ...textFont('black'),
    fontSize: 48,
    color: '#FFFFFF',
    marginTop: 12,
  },
  heroLabel: {
    ...textFont('semibold'),
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  heroSubtext: {
    ...textFont('regular'),
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    ...textFont('medium'),
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    ...textFont('bold'),
    fontSize: 24,
  },
  statSubtitle: {
    ...textFont('regular'),
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    ...textFont('bold'),
    fontSize: 18,
  },
  topMessagesList: {
    gap: 8,
  },
  topMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...textFont('bold'),
    fontSize: 14,
  },
  topMessageContent: {
    flex: 1,
  },
  topMessageTitle: {
    ...textFont('semibold'),
    fontSize: 15,
    marginBottom: 6,
  },
  topMessageStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topMessageStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topMessageStatText: {
    ...textFont('regular'),
    fontSize: 12,
  },
  topMessageCategory: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  topMessageCategoryText: {
    ...textFont('semibold'),
    fontSize: 11,
  },
  categoryChart: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    ...textFont('medium'),
    fontSize: 14,
  },
  categoryStats: {
    alignItems: 'flex-end',
  },
  categoryCount: {
    ...textFont('semibold'),
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    ...textFont('semibold'),
    fontSize: 16,
  },
  emptySubtext: {
    ...textFont('regular'),
    fontSize: 14,
    textAlign: 'center',
  },
});

export default StatisticsScreen;
