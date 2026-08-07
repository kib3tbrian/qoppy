// src/components/common/EnhancedSearchBar.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Search, X, SlidersHorizontal, Calendar, Heart, Tag } from 'lucide-react-native';
import { textFont } from '../../constants/typography';
import { useTheme } from '../../hooks/useTheme';
import { SearchFilters } from '../../types';
import { db } from '../../services/database';

interface EnhancedSearchBarProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  categories: Array<{ id: string; name: string; color: string }>;
}

export const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search messages...',
  filters,
  onFiltersChange,
  categories,
}) => {
  const { theme } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load recent searches from preferences
  useEffect(() => {
    const loadRecent = async () => {
      const recent = await db.getPreference('recent_searches');
      if (recent) {
        try {
          setRecentSearches(JSON.parse(recent));
        } catch {}
      }
    };
    loadRecent();
  }, []);

  // Save search to recent when user submits
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    await db.setPreference('recent_searches', JSON.stringify(updated));
    setShowSuggestions(false);
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await db.setPreference('recent_searches', JSON.stringify([]));
  };

  const hasActiveFilters = filters.showFavoritesOnly || 
                          filters.dateRange !== 'all' || 
                          filters.categoryFilter !== null;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Search size={17} color={theme.textMuted} strokeWidth={2} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={() => handleSearch(value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          returnKeyType="search"
          autoCapitalize="none"
          clearButtonMode="never"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={() => setShowFilters(true)}
          style={[
            styles.filterButton,
            hasActiveFilters && { backgroundColor: theme.primarySoft }
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <SlidersHorizontal 
            size={16} 
            color={hasActiveFilters ? theme.primary : theme.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      {/* Recent Searches Suggestions */}
      {showSuggestions && recentSearches.length > 0 && (
        <View style={[styles.suggestions, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.suggestionsHeader}>
            <Text style={[styles.suggestionsTitle, { color: theme.textSecondary }]}>Recent</Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={[styles.clearButton, { color: theme.primary }]}>Clear</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((search, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => {
                onChange(search);
                setShowSuggestions(false);
              }}
            >
              <Search size={14} color={theme.textMuted} />
              <Text style={[styles.suggestionText, { color: theme.text }]}>{search}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable 
            style={styles.modalBackdrop} 
            onPress={() => setShowFilters(false)} 
          />
          <View style={[styles.filtersSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            
            <View style={styles.filtersHeader}>
              <Text style={[styles.filtersTitle, { color: theme.text }]}>Search Filters</Text>
              <TouchableOpacity 
                onPress={() => {
                  onFiltersChange({
                    showFavoritesOnly: false,
                    dateRange: 'all',
                    categoryFilter: null,
                  });
                }}
              >
                <Text style={[styles.resetButton, { color: theme.primary }]}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filtersContent}>
              {/* Favorites Only */}
              <View style={styles.filterSection}>
                <View style={styles.filterHeader}>
                  <Heart size={18} color={theme.textSecondary} />
                  <Text style={[styles.filterLabel, { color: theme.text }]}>Show Favorites Only</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    { borderColor: theme.border },
                    filters.showFavoritesOnly && { backgroundColor: theme.primarySoft, borderColor: theme.primary }
                  ]}
                  onPress={() => onFiltersChange({ ...filters, showFavoritesOnly: !filters.showFavoritesOnly })}
                >
                  <Text style={[
                    styles.toggleText,
                    { color: theme.textSecondary },
                    filters.showFavoritesOnly && { color: theme.primary }
                  ]}>
                    {filters.showFavoritesOnly ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Date Range */}
              <View style={styles.filterSection}>
                <View style={styles.filterHeader}>
                  <Calendar size={18} color={theme.textSecondary} />
                  <Text style={[styles.filterLabel, { color: theme.text }]}>Date Range</Text>
                </View>
                <View style={styles.optionsRow}>
                  {(['all', 'today', 'week', 'month'] as const).map((range) => (
                    <TouchableOpacity
                      key={range}
                      style={[
                        styles.optionButton,
                        { borderColor: theme.border },
                        filters.dateRange === range && { 
                          backgroundColor: theme.primarySoft, 
                          borderColor: theme.primary 
                        }
                      ]}
                      onPress={() => onFiltersChange({ ...filters, dateRange: range })}
                    >
                      <Text style={[
                        styles.optionText,
                        { color: theme.textSecondary },
                        filters.dateRange === range && { color: theme.primary }
                      ]}>
                        {range === 'all' ? 'All' : range === 'today' ? 'Today' : range === 'week' ? 'Week' : 'Month'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterHeader}>
                  <Tag size={18} color={theme.textSecondary} />
                  <Text style={[styles.filterLabel, { color: theme.text }]}>Category</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      { borderColor: theme.border },
                      filters.categoryFilter === null && { 
                        backgroundColor: theme.primarySoft, 
                        borderColor: theme.primary 
                      }
                    ]}
                    onPress={() => onFiltersChange({ ...filters, categoryFilter: null })}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      { color: theme.textSecondary },
                      filters.categoryFilter === null && { color: theme.primary }
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        { borderColor: theme.border },
                        filters.categoryFilter === cat.id && { 
                          backgroundColor: `${cat.color}20`, 
                          borderColor: cat.color 
                        }
                      ]}
                      onPress={() => onFiltersChange({ 
                        ...filters, 
                        categoryFilter: filters.categoryFilter === cat.id ? null : cat.id 
                      })}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        { color: theme.textSecondary },
                        filters.categoryFilter === cat.id && { color: cat.color }
                      ]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowFilters(false)}
            >
              <Text style={[styles.applyButtonText, { color: theme.onPrimary }]}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 8,
  },
  icon: {
    flexShrink: 0,
  },
  input: {
    ...textFont(),
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterButton: {
    padding: 4,
    borderRadius: 6,
  },
  suggestions: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    marginBottom: 4,
  },
  suggestionsTitle: {
    ...textFont('semibold'),
    fontSize: 12,
    textTransform: 'uppercase',
  },
  clearButton: {
    ...textFont('semibold'),
    fontSize: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  suggestionText: {
    ...textFont(),
    fontSize: 14,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  filtersSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  filtersTitle: {
    ...textFont('bold'),
    fontSize: 20,
  },
  resetButton: {
    ...textFont('semibold'),
    fontSize: 15,
  },
  filtersContent: {
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterLabel: {
    ...textFont('semibold'),
    fontSize: 16,
  },
  toggleButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  toggleText: {
    ...textFont('semibold'),
    fontSize: 14,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionButton: {
    flex: 1,
    minWidth: '22%',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  optionText: {
    ...textFont('semibold'),
    fontSize: 13,
  },
  categoriesScroll: {
    marginTop: 4,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  categoryChipText: {
    ...textFont('semibold'),
    fontSize: 13,
  },
  applyButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    ...textFont('semibold'),
    fontSize: 16,
  },
});

export default EnhancedSearchBar;
