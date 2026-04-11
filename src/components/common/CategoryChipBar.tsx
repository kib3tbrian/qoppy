// src/components/common/CategoryChipBar.tsx

import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { Category } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface CategoryChipBarProps {
  categories: Category[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}

export const CategoryChipBar: React.FC<CategoryChipBarProps> = ({
  categories,
  activeId,
  onSelect,
}) => {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* "All" chip */}
      <Chip
        label="All"
        color={theme.primary}
        isActive={activeId === null}
        onPress={() => onSelect(null)}
        theme={theme}
      />
      {categories.map(cat => (
        <Chip
          key={cat.id}
          label={cat.name}
          color={cat.color}
          isActive={activeId === cat.id}
          onPress={() => onSelect(cat.id)}
          theme={theme}
        />
      ))}
    </ScrollView>
  );
};

interface ChipProps {
  label: string;
  color: string;
  isActive: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}

const Chip: React.FC<ChipProps> = ({ label, color, isActive, onPress, theme }) => (
  <TouchableOpacity
    style={[
      styles.chip,
      isActive
        ? { backgroundColor: theme.primary, borderColor: theme.primary }
        : { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {isActive && <View style={[styles.activeDot, { backgroundColor: theme.onPrimary }]} />}
    <Text
      style={[
        styles.chipText,
        { color: isActive ? theme.onPrimary : color },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default CategoryChipBar;
