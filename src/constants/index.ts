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
  { id: 'welcome', name: 'Welcome', color: '#8B5CF6', icon: 'tag', createdAt: 0 },
];

export const MESSAGE_TEMPLATES = [
  {
    id: 'example-introduction',
    title: 'Introduction',
    content: "Hi! I'm reaching out from Sagent. I wanted to introduce myself and see how we can work together.",
    categoryId: 'welcome',
  },
  {
    id: 'example-follow-up',
    title: 'Follow-up',
    content: "Hi there! Just following up on our previous conversation. Let me know if you have any questions or if you're ready to proceed.",
    categoryId: 'welcome',
  },
  {
    id: 'example-thank-you',
    title: 'Thank You',
    content: "Thank you for your time today! It was great connecting with you. Please let me know if there's anything else I can help with.",
    categoryId: 'welcome',
  },
  {
    id: 'example-price-list',
    title: 'Price List',
    content: "Hi! Here's our current price list. Let me know which option works best for you and I'll get you sorted right away.",
    categoryId: 'welcome',
  },
];

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 250,
  slow: 400,
};

export const TAB_TRANSITION_CONFIG = {
  duration: ANIMATION_DURATION.normal,
};
