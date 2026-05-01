// src/constants/index.ts

export const CATEGORY_COLORS = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#06B6D4', // Cyan
];

export const DEFAULT_CATEGORIES = [
  { id: 'personal', name: 'Personal', color: '#6366F1', icon: 'tag' },
  { id: 'work', name: 'Work', color: '#3B82F6', icon: 'briefcase' },
  { id: 'finance', name: 'Finance', color: '#10B981', icon: 'credit-card' },
  { id: 'links', name: 'Links', color: '#EC4899', icon: 'globe' },
  { id: 'address', name: 'Address', color: '#F59E0B', icon: 'map-pin' },
  { id: 'other', name: 'Other', color: '#8B5CF6', icon: 'tag' },
];

export const FREE_TIER_LIMIT = 10;

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 250,
  slow: 400,
};

export const TAB_TRANSITION_CONFIG = {
  duration: ANIMATION_DURATION.normal,
};
