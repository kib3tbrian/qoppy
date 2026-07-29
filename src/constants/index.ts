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
  { id: 'sales', name: 'Sales', color: '#3B82F6', icon: 'tag', createdAt: 1 },
  { id: 'follow-ups', name: 'Follow-ups', color: '#10B981', icon: 'tag', createdAt: 2 },
  { id: 'prospecting', name: 'Prospecting', color: '#F59E0B', icon: 'tag', createdAt: 3 },
  { id: 'objections', name: 'Objections', color: '#EF4444', icon: 'tag', createdAt: 4 },
  { id: 'closing', name: 'Closing', color: '#EC4899', icon: 'tag', createdAt: 5 },
];

export const MESSAGE_TEMPLATES = [
  // ── Welcome ───────────────────────────────────────────────────────────────
  {
    id: 'example-introduction',
    title: 'Introduction',
    content: "Hi! I'm reaching out from Sagent. I wanted to introduce myself and see how we can work together.",
    categoryId: 'welcome',
  },
  // ── Sales ─────────────────────────────────────────────────────────────────
  {
    id: 'example-price-list',
    title: 'Price List',
    content: "Hi! Here's our current price list. Let me know which option works best for you and I'll get you sorted right away.",
    categoryId: 'sales',
  },
  // ── Follow-ups ────────────────────────────────────────────────────────────
  {
    id: 'example-gentle-nudge',
    title: 'Gentle Nudge',
    content: "Hey! Just circling back on my last message. No pressure at all — just wanted to make sure it didn't get buried. Let me know if you'd like to chat!",
    categoryId: 'follow-ups',
  },
  // ── Prospecting ───────────────────────────────────────────────────────────
  {
    id: 'example-cold-outreach',
    title: 'Cold Outreach',
    content: "Hi! I came across your profile and I think there's a great opportunity for us to connect. I help professionals like you streamline their client communication — would you be open to a quick chat?",
    categoryId: 'prospecting',
  },
  // ── Objections ────────────────────────────────────────────────────────────
  {
    id: 'example-too-expensive',
    title: 'Too Expensive',
    content: "I totally understand budget is a concern. Most of our clients felt the same way initially, but found the time savings paid for itself within the first week. Want me to break down the ROI?",
    categoryId: 'objections',
  },
  // ── Closing ───────────────────────────────────────────────────────────────
  {
    id: 'example-final-push',
    title: 'Final Push',
    content: "I know you've been thinking it over — just wanted to let you know our current offer ends soon. I'd hate for you to miss out. Ready to get started?",
    categoryId: 'closing',
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
