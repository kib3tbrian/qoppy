// src/constants/index.ts

export const COLORS = {
  primary: '#6366F1',       // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#F59E0B',     // Amber
  success: '#10B981',       // Emerald
  danger: '#EF4444',
  warning: '#F59E0B',

  background: '#0F0F13',    // Near-black
  surface: '#1A1A24',       // Dark card bg
  surfaceElevated: '#22222F',
  border: '#2E2E3E',
  borderLight: '#3A3A50',

  text: '#F8F8FF',
  textSecondary: '#9999B5',
  textMuted: '#5A5A78',

  white: '#FFFFFF',
  black: '#000000',
};

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
  { id: 'personal', name: 'Personal', color: '#6366F1', icon: 'user' },
  { id: 'work', name: 'Work', color: '#3B82F6', icon: 'briefcase' },
  { id: 'finance', name: 'Finance', color: '#10B981', icon: 'credit-card' },
  { id: 'other', name: 'Other', color: '#8B5CF6', icon: 'tag' },
  { id: 'social', name: 'Social', color: '#EC4899', icon: 'heart' },
  { id: 'travel', name: 'Travel', color: '#F59E0B', icon: 'map-pin' },
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
