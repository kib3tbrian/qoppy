import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { db } from '../services/database';
import { Snippet, SnippetInsert, SnippetUpdate } from '../types';

const FREE_SNIPPET_LIMIT = 10;

interface UseSnippetsReturn {
  snippets: Snippet[];
  isLoading: boolean;
  error: string | null;
  copiedId: string | null;
  copySnippet: (snippet: Snippet) => Promise<void>;
  createSnippet: (data: SnippetInsert) => Promise<Snippet>;
  updateSnippet: (data: SnippetUpdate) => Promise<void>;
  deleteSnippet: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  filterByCategory: (categoryId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeCategory: string | null;
}

const SnippetsContext = createContext<UseSnippetsReturn | null>(null);

export const SnippetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allSnippets, setAllSnippets] = useState<Snippet[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let filtered = allSnippets;

    if (activeCategory) {
      filtered = filtered.filter(s => s.categoryId === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.content.toLowerCase().includes(q) ||
          s.categoryName?.toLowerCase().includes(q)
      );
    }

    setSnippets(filtered);
  }, [activeCategory, allSnippets, searchQuery]);

  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  }, []);

  const runHaptic = useCallback(async (
    action: () => Promise<void>
  ) => {
    const enabled = await db.getPreference('haptic', 'true');
    if (enabled === 'false') return;
    await action();
  }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await db.getAllSnippets();
      setAllSnippets(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load snippets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const copySnippet = useCallback(async (snippet: Snippet) => {
    try {
      await Clipboard.setStringAsync(snippet.content);
      await runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      await db.incrementUseCount(snippet.id);

      setCopiedId(snippet.id);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 1500);

      setAllSnippets(prev =>
        prev.map(s =>
          s.id === snippet.id ? { ...s, useCount: s.useCount + 1 } : s
        )
      );
    } catch (e: any) {
      setError(e.message ?? 'Failed to copy to clipboard');
    }
  }, [runHaptic]);

  const createSnippet = useCallback(async (data: SnippetInsert): Promise<Snippet> => {
    const isPremiumEnabled = await db.getPreference('premium_enabled', 'false');
    if (isPremiumEnabled !== 'true' && allSnippets.length >= FREE_SNIPPET_LIMIT) {
      const limitError = new Error('You need to subscribe to Premium to add more snippets.');
      setError(limitError.message);
      throw limitError;
    }

    const created = await db.createSnippet(data);
    setAllSnippets(prev => [created, ...prev]);
    setError(null);
    return created;
  }, [allSnippets.length]);

  const updateSnippet = useCallback(async (data: SnippetUpdate) => {
    const updated = await db.updateSnippet(data);
    setAllSnippets(prev => prev.map(s => (s.id === updated.id ? updated : s)));
  }, []);

  const deleteSnippet = useCallback(async (id: string) => {
    await db.deleteSnippet(id);
    setAllSnippets(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    const newVal = await db.toggleFavorite(id);
    await runHaptic(() => Haptics.selectionAsync());
    setAllSnippets(prev =>
      prev.map(s => (s.id === id ? { ...s, isFavorite: newVal } : s))
    );
  }, [runHaptic]);

  const filterByCategory = useCallback((categoryId: string | null) => {
    setActiveCategory(categoryId);
  }, []);

  const value = useMemo<UseSnippetsReturn>(() => ({
    snippets,
    isLoading,
    error,
    copiedId,
    copySnippet,
    createSnippet,
    updateSnippet,
    deleteSnippet,
    toggleFavorite,
    refresh,
    filterByCategory,
    searchQuery,
    setSearchQuery,
    activeCategory,
  }), [
    activeCategory,
    copiedId,
    copySnippet,
    createSnippet,
    deleteSnippet,
    error,
    filterByCategory,
    isLoading,
    refresh,
    searchQuery,
    snippets,
    toggleFavorite,
    updateSnippet,
  ]);

  return <SnippetsContext.Provider value={value}>{children}</SnippetsContext.Provider>;
};

export function useSnippets(): UseSnippetsReturn {
  const context = useContext(SnippetsContext);
  if (!context) {
    throw new Error('useSnippets must be used within a SnippetsProvider');
  }
  return context;
}
