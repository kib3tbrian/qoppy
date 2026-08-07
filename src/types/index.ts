// src/types/index.ts

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: number;
}

export interface Snippet {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  categoryName?: string;
  categoryColor?: string;
  isFavorite: boolean;
  useCount: number;
  lastUsedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SnippetInsert {
  title: string;
  content: string;
  categoryId?: string | null;
  isFavorite?: boolean;
}

export interface SnippetUpdate extends Partial<SnippetInsert> {
  id: string;
}

export interface SearchFilters {
  showFavoritesOnly: boolean;
  dateRange: 'all' | 'today' | 'week' | 'month';
  categoryFilter: string | null;
}

export interface UsageStats {
  totalMessages: number;
  totalCopies: number;
  totalShares: number;
  monthlyShares: number;
  topMessages: Snippet[];
  categoryBreakdown: Record<string, number>;
  timeSavedMinutes: number;
}

export interface Template {
  id: string;
  title: string;
  content: string;
  category: string;
  industry: string;
  tags: string[];
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: Template[];
}

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  AddSnippet: { snippetId?: string };
  ManageCategories: undefined;
  Paywall: { source?: 'settings' | 'limit-modal' | 'home-usage' | 'nudge-banner' } | undefined;
  Statistics: undefined;
  TemplatesLibrary: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Favorites: undefined;
  Settings: undefined;
};
