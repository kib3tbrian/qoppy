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

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  AddSnippet: { snippetId?: string };
  ManageCategories: undefined;
  Paywall: { source?: 'settings' | 'limit-modal' } | undefined;
  SetupPIN: { fromSettings?: boolean } | undefined;
  SnippetDetail: { snippetId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Favorites: undefined;
  Settings: undefined;
};
