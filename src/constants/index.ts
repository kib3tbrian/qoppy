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
  { id: 'sales', name: 'Sales', color: '#8B5CF6', icon: 'tag', createdAt: 0 },
  { id: 'support', name: 'Support', color: '#3B82F6', icon: 'tag', createdAt: 0 },
  { id: 'finance', name: 'Finance', color: '#10B981', icon: 'credit-card', createdAt: 0 },
  { id: 'marketing', name: 'Marketing', color: '#EC4899', icon: 'globe', createdAt: 0 },
  { id: 'operations', name: 'Operations', color: '#F59E0B', icon: 'briefcase', createdAt: 0 },
  { id: 'other', name: 'Other', color: '#8B5CF6', icon: 'tag', createdAt: 0 },
];

export const MESSAGE_TEMPLATES = [
  {
    id: 'example-price-list',
    title: 'Price List',
    content: "Hi! Here's our current price list. Let me know which option works best for you and I'll get you sorted right away.",
    categoryId: 'sales',
  },
  {
    id: 'example-support-reply',
    title: 'Support Reply',
    content: "Thanks for reaching out! I've received your request and am looking into it now. I will update you shortly.",
    categoryId: 'support',
  },
  {
    id: 'example-payment-link',
    title: 'Payment Link',
    content: 'Please use the link below to complete your payment. Reach out if you run into any issues — happy to help!',
    categoryId: 'finance',
  },
  {
    id: 'example-sagent',
    title: 'Sagent App',
    content: 'Try Sagent for saving and sending the messages you reuse every day: https://play.google.com/store/apps/details?id=com.sagent.app',
    categoryId: 'marketing',
  },
  {
    id: 'example-meeting-summary',
    title: 'Meeting Summary',
    content: 'Great speaking with you today! As discussed, here is the summary of our next steps. Let me know if anything needs adjustment.',
    categoryId: 'operations',
  },
  {
    id: 'example-contact-info',
    title: 'Contact Info',
    content: 'Here are my contact details: Phone: +1 555-0199 | Email: hello@example.com | Website: https://example.com',
    categoryId: 'other',
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
