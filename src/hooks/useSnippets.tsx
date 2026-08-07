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
import { Share } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import nativeBilling from '../services/nativeBilling';
import { db } from '../services/database';
import { Snippet, SnippetInsert, SnippetUpdate, SearchFilters } from '../types';
import { useRatingPrompt } from './useRatingPrompt';
import { useEntitlement } from './useEntitlement';

const FREE_SHARE_LIMIT = 50;
const SHARE_COUNT_KEY = 'monthly_share_count';

type PremiumPromptReason = 'share-limit';

interface MonthlyShareCount {
  count: number;
  month: number;
  year: number;
}

interface UseSnippetsReturn {
  allSnippets: Snippet[];
  snippets: Snippet[];
  isLoading: boolean;
  error: string | null;
  copiedId: string | null;
  copySnippet: (snippet: Snippet) => Promise<void>;
  shareSnippet: (snippet: Snippet) => Promise<void>;
  createSnippet: (data: SnippetInsert) => Promise<Snippet>;
  updateSnippet: (data: SnippetUpdate) => Promise<void>;
  deleteSnippet: (id: string) => Promise<void>;
  deleteAllSnippets: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  premiumPromptVisible: boolean;
  premiumPromptReason: PremiumPromptReason;
  isPremium: boolean;
  monthlyShareCount: number;
  freeShareLimit: number;
  refreshShareUsage: () => Promise<void>;
  dismissPremiumPrompt: () => Promise<void>;
  refresh: () => Promise<void>;
  filterByCategory: (categoryId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeCategory: string | null;
  searchFilters: SearchFilters;
  setSearchFilters: (filters: SearchFilters) => void;
}

const SnippetsContext = createContext<UseSnippetsReturn | null>(null);

export const SnippetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isPro } = useEntitlement();
  const [allSnippets, setAllSnippets] = useState<Snippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    showFavoritesOnly: false,
    dateRange: 'all',
    categoryFilter: null,
  });
  const [premiumPromptVisible, setPremiumPromptVisible] = useState(false);
  const [premiumPromptReason, setPremiumPromptReason] = useState<PremiumPromptReason>('share-limit');
  const isPremium = isPro;
  const [monthlyShareCount, setMonthlyShareCount] = useState(0);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { incrementUsage } = useRatingPrompt();

  const snippets = useMemo(() => {
    let filtered = allSnippets;

    // Apply search filters
    if (searchFilters.showFavoritesOnly) {
      filtered = filtered.filter(s => s && s.isFavorite);
    }

    if (searchFilters.categoryFilter) {
      filtered = filtered.filter(s => s && s.categoryId === searchFilters.categoryFilter);
    }

    if (searchFilters.dateRange !== 'all') {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      let cutoff = now;
      
      if (searchFilters.dateRange === 'today') {
        cutoff = now - dayMs;
      } else if (searchFilters.dateRange === 'week') {
        cutoff = now - (7 * dayMs);
      } else if (searchFilters.dateRange === 'month') {
        cutoff = now - (30 * dayMs);
      }
      
      filtered = filtered.filter(s => 
        s && (s.lastUsedAt && s.lastUsedAt >= cutoff || s.createdAt >= cutoff)
      );
    }

    // Apply category filter (from chip bar)
    if (activeCategory) {
      filtered = filtered.filter(s => s && s.categoryId === activeCategory);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        s =>
          s && (
            s.title.toLowerCase().includes(q) ||
            s.content.toLowerCase().includes(q) ||
            s.categoryName?.toLowerCase().includes(q)
          )
      );
    }

    return filtered;
  }, [activeCategory, allSnippets, searchQuery, searchFilters]);

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

  const isPremiumEnabled = useCallback(async () => {
    return isPro || (await db.getPreference('premium_enabled', 'false')) === 'true';
  }, [isPro]);

  const getDeviceFingerprint = useCallback(async (): Promise<string> => {
    let fp = await db.getPreference('device_fingerprint');
    if (!fp) {
      fp = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      await db.setPreference('device_fingerprint', fp).catch(() => {});
    }
    return fp;
  }, []);

  const getMonthlyShareCount = useCallback(async (): Promise<MonthlyShareCount> => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentResetDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    let localCount = 0;
    const raw = await db.getPreference(SHARE_COUNT_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as MonthlyShareCount;
        if (parsed.month === currentMonth && parsed.year === currentYear) {
          localCount = Number(parsed.count) || 0;
        }
      } catch { /* ignore */ }
    }

    // Device Fingerprint Anti-Abuse Tracking
    try {
      const deviceId = await getDeviceFingerprint();
      const deviceDocRef = firestore().collection('devices').doc(deviceId).collection('usage').doc('sends');
      const deviceSnapshot = await deviceDocRef.get();
      const exists = typeof deviceSnapshot.exists === 'function' ? deviceSnapshot.exists() : Boolean(deviceSnapshot.exists);

      if (exists) {
        const data = deviceSnapshot.data();
        const firestoreResetDate = data?.resetDate;
        const firestoreCount = Number(data?.sendCount) || 0;

        if (firestoreResetDate !== currentResetDate) {
          void deviceDocRef.set({
            sendCount: 0,
            resetDate: currentResetDate,
            lastUpdated: firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          return { count: 0, month: currentMonth, year: currentYear };
        }

        const maxCount = Math.max(localCount, firestoreCount);
        if (maxCount !== localCount) {
          void db.setPreference(SHARE_COUNT_KEY, JSON.stringify({ count: maxCount, month: currentMonth, year: currentYear }));
        }
        return { count: maxCount, month: currentMonth, year: currentYear };
      } else {
        void deviceDocRef.set({
          sendCount: localCount,
          resetDate: currentResetDate,
          lastUpdated: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      console.warn('[useSnippets] Device fingerprint sync error:', err);
    }

    return { count: localCount, month: currentMonth, year: currentYear };
  }, [getDeviceFingerprint]);

  const saveMonthlyShareCount = useCallback(async (value: MonthlyShareCount) => {
    await db.setPreference(SHARE_COUNT_KEY, JSON.stringify(value));

    // Persist to Device Fingerprint doc in Firestore asynchronously
    try {
      const deviceId = await getDeviceFingerprint();
      const resetDate = `${value.year}-${String(value.month).padStart(2, '0')}`;
      void firestore()
        .collection('devices')
        .doc(deviceId)
        .collection('usage')
        .doc('sends')
        .set({
          sendCount: value.count,
          resetDate,
          lastUpdated: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    } catch (err) {
      console.warn('[useSnippets] Failed to persist device usage count:', err);
    }
  }, [getDeviceFingerprint]);

  const refreshShareUsage = useCallback(async () => {
    const usage = await getMonthlyShareCount();
    setMonthlyShareCount(Math.min(usage.count, FREE_SHARE_LIMIT));
  }, [getMonthlyShareCount]);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [data] = await Promise.all([
        db.getAllSnippets(),
        refreshShareUsage(),
      ]);
      setAllSnippets(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [refreshShareUsage]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const copySnippet = useCallback(async (snippet: Snippet) => {
    try {
      const premium = await isPremiumEnabled();
      
      // Check limit for non-premium users (copy counts as a send)
      if (!premium && monthlyShareCount >= FREE_SHARE_LIMIT) {
        setPremiumPromptReason('share-limit');
        setPremiumPromptVisible(true);
        return;
      }
      
      await Clipboard.setStringAsync(snippet.content);
      await runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      await db.incrementUseCount(snippet.id);

      setCopiedId(snippet.id);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 1500);

      const now = Date.now();
      setAllSnippets(prev =>
        prev.map(s =>
          s.id === snippet.id ? { ...s, useCount: s.useCount + 1, lastUsedAt: now, updatedAt: now } : s
        )
      );

      // Increment send count for free users (copy counts as a send)
      if (!premium) {
        const nextCount = monthlyShareCount + 1;
        const nextUsage = { count: nextCount, month: now.getMonth() + 1, year: now.getFullYear() };
        setMonthlyShareCount(Math.min(nextCount, FREE_SHARE_LIMIT));
        void saveMonthlyShareCount(nextUsage);
      }

      // Increment global usage for rating prompt
      await incrementUsage();
    } catch (e: any) {
      setError(e.message ?? 'Failed to copy to clipboard');
    }
  }, [incrementUsage, isPremiumEnabled, monthlyShareCount, runHaptic, saveMonthlyShareCount]);

  const shareSnippet = useCallback(async (snippet: Snippet) => {
    try {
      const premium = await isPremiumEnabled();
      const fullContent = snippet.content;
      let shareText = fullContent;

      if (!premium) {
        if (monthlyShareCount >= FREE_SHARE_LIMIT) {
          setPremiumPromptReason('share-limit');
          setPremiumPromptVisible(true);
          return;
        }

        shareText = `${fullContent}\n\nSent via Sagent`;
        const now = new Date();
        const nextCount = monthlyShareCount + 1;
        const nextUsage = { count: nextCount, month: now.getMonth() + 1, year: now.getFullYear() };
        setMonthlyShareCount(Math.min(nextCount, FREE_SHARE_LIMIT));
        void saveMonthlyShareCount(nextUsage);
      }

      // Execute Native Share immediately!
      await Share.share({
        message: shareText,
        title: snippet.title,
      });

      void runHaptic(() => Haptics.selectionAsync());
      void db.incrementUseCount(snippet.id);
      const now = Date.now();
      setAllSnippets(prev =>
        prev.map(s =>
          s.id === snippet.id ? { ...s, useCount: s.useCount + 1, lastUsedAt: now, updatedAt: now } : s
        )
      );
      void incrementUsage();
    } catch (e: any) {
      console.error('[useSnippets] Share error:', e);
      setError(e.message ?? 'Failed to share message');
    }
  }, [incrementUsage, isPremiumEnabled, monthlyShareCount, runHaptic, saveMonthlyShareCount]);

  const createSnippet = useCallback(async (data: SnippetInsert): Promise<Snippet> => {
    const created = await db.createSnippet(data);
    setAllSnippets(prev => [created, ...prev]);
    setError(null);
    return created;
  }, []);

  const updateSnippet = useCallback(async (data: SnippetUpdate) => {
    const updated = await db.updateSnippet(data);
    setAllSnippets(prev => prev.map(s => (s.id === updated.id ? updated : s)));
  }, []);

  const deleteSnippet = useCallback(async (id: string) => {
    await db.deleteSnippet(id);
    setAllSnippets(prev => prev.filter(s => s.id !== id));
  }, []);

  const deleteAllSnippets = useCallback(async () => {
    await db.deleteAllSnippets();
    setAllSnippets([]);
    setCopiedId(null);
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    console.log('[useSnippets] toggleFavorite called for snippet ID:', id);
    
    // Optimistic UI update so heart fills/unfills immediately on tap
    setAllSnippets(prev => {
      const snippet = prev.find(s => s && s.id === id);
      if (snippet) {
        console.log('[useSnippets] Optimistic update - current favorite state:', snippet.isFavorite);
      }
      return prev.map(s => {
        if (s && s.id === id) {
          const newState = !s.isFavorite;
          console.log('[useSnippets] Optimistically setting isFavorite to:', newState);
          return { ...s, isFavorite: newState };
        }
        return s;
      });
    });
    
    try {
      console.log('[useSnippets] Calling db.toggleFavorite for:', id);
      const newVal = await db.toggleFavorite(id);
      console.log('[useSnippets] Database returned isFavorite value:', newVal);
      
      setAllSnippets(prev =>
        prev.map(s => {
          if (s && s.id === id) {
            console.log('[useSnippets] Confirming state with DB value:', newVal);
            return { ...s, isFavorite: newVal };
          }
          return s;
        })
      );
    } catch (err) {
      console.error('[useSnippets] toggleFavorite error:', err);
      // Revert on error
      setAllSnippets(prev =>
        prev.map(s => {
          if (s && s.id === id) {
            console.log('[useSnippets] Error occurred, reverting favorite state');
            return { ...s, isFavorite: !s.isFavorite };
          }
          return s;
        })
      );
    }
  }, []);

  const filterByCategory = useCallback((categoryId: string | null) => {
    setActiveCategory(categoryId);
  }, []);

  const dismissPremiumPrompt = useCallback(async () => {
    setPremiumPromptVisible(false);
  }, []);

  const value = useMemo<UseSnippetsReturn>(() => ({
    allSnippets,
    snippets,
    isLoading,
    error,
    copiedId,
    copySnippet,
    shareSnippet,
    createSnippet,
    updateSnippet,
    deleteSnippet,
    deleteAllSnippets,
    toggleFavorite,
    premiumPromptVisible,
    premiumPromptReason,
    isPremium,
    monthlyShareCount,
    freeShareLimit: FREE_SHARE_LIMIT,
    refreshShareUsage,
    dismissPremiumPrompt,
    refresh,
    filterByCategory,
    searchQuery,
    setSearchQuery,
    activeCategory,
    searchFilters,
    setSearchFilters,
  }), [
    activeCategory,
    copiedId,
    copySnippet,
    createSnippet,
    deleteSnippet,
    deleteAllSnippets,
    dismissPremiumPrompt,
    filterByCategory,
    searchQuery,
    setSearchQuery,
    searchFilters,
    error,
    isPremium,
    isLoading,
    monthlyShareCount,
    premiumPromptVisible,
    premiumPromptReason,
    refresh,
    refreshShareUsage,
    snippets,
    allSnippets,
    shareSnippet,
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
