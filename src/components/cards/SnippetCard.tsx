// src/components/cards/SnippetCard.tsx
//
// The core interactive card. Tap = copy. Long-press = context menu.
// Uses Reanimated for smooth press/copy feedback animations.

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { Check, Copy, Heart } from 'lucide-react-native';
import { Snippet } from '../../types';
import { COLORS, ANIMATION_DURATION } from '../../constants';
import { textFont } from '../../constants/typography';
import { useTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// 2 columns on phones ≤ 375px wide, 3 columns on larger screens
const NUM_COLUMNS = SCREEN_WIDTH > 420 ? 3 : 2;
const CARD_MARGIN = 8;
const CARD_WIDTH =
  (SCREEN_WIDTH - CARD_MARGIN * (NUM_COLUMNS + 1) * 2) / NUM_COLUMNS;

interface SnippetCardProps {
  snippet: Snippet;
  isCopied: boolean;
  onCopy: (snippet: Snippet) => void;
  onFavorite: (id: string) => void;
  onEdit: (snippet: Snippet) => void;
  onDelete: (id: string) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const SnippetCard: React.FC<SnippetCardProps> = ({
  snippet,
  isCopied,
  onCopy,
  onFavorite,
  onEdit,
  onDelete,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const copyProgress = useSharedValue(0);

  // ── Animation styles ────────────────────────────────────────────────────

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const cardBgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      copyProgress.value,
      [0, 1],
      [theme.surface, theme.successSoft]
    ),
  }));

  // ── Handlers ────────────────────────────────────────────────────────────

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const handleCopy = useCallback(() => {
    // Trigger copy feedback animation
    copyProgress.value = withSequence(
      withTiming(1, { duration: ANIMATION_DURATION.fast }),
      withTiming(0, { duration: ANIMATION_DURATION.slow })
    );
    glowOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 600 })
    );
    runOnJS(onCopy)(snippet);
  }, [snippet, onCopy]);

  const handleFavorite = useCallback(() => {
    onFavorite(snippet.id);
  }, [snippet.id, onFavorite]);

  // ── Render ──────────────────────────────────────────────────────────────

  const contentPreview =
    snippet.content.length > 80
      ? snippet.content.slice(0, 80) + '…'
      : snippet.content;

  return (
    <Animated.View style={[styles.wrapper, cardAnimStyle]}>
      {/* Glow ring that pulses on copy */}
      <Animated.View style={[styles.glow, glowStyle]} />

      <AnimatedTouchable
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }, cardBgStyle]}
        onPress={handleCopy}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={() => onEdit(snippet)}
        activeOpacity={1}
        delayLongPress={400}
      >
        {/* Category badge */}
        {snippet.categoryName && (
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: theme.surfaceAlt },
            ]}
          >
            <View
              style={[
                styles.categoryDot,
                { backgroundColor: snippet.categoryColor ?? COLORS.primary },
              ]}
            />
            <Text
              style={[
                styles.categoryText,
                { color: theme.primary },
              ]}
              numberOfLines={1}
            >
              {snippet.categoryName}
            </Text>
          </View>
        )}

        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {snippet.title}
        </Text>

        {/* Content preview */}
        <Text style={[styles.content, { color: theme.textSecondary }]} numberOfLines={3}>
          {contentPreview}
        </Text>

        {/* Footer row */}
        <View style={styles.footer}>
          {/* Copy / Copied indicator */}
          <View
            style={[
              styles.copyBadge,
              { backgroundColor: isCopied ? theme.successSoft : theme.surfaceAlt },
            ]}
          >
            {isCopied ? (
              <>
                <Check size={11} color={COLORS.success} strokeWidth={2.5} />
                <Text style={[styles.copyLabel, { color: COLORS.success }]}>
                  Copied!
                </Text>
              </>
            ) : (
              <>
                <Copy size={11} color={theme.textMuted} strokeWidth={2} />
                <Text style={[styles.copyLabel, { color: theme.textMuted }]}>Tap to copy</Text>
              </>
            )}
          </View>

          {/* Favorite button */}
          <TouchableOpacity
            onPress={handleFavorite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Heart
              size={16}
              color={snippet.isFavorite ? theme.danger : theme.textMuted}
              fill={snippet.isFavorite ? theme.danger : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </AnimatedTouchable>
    </Animated.View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    position: 'relative',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.success,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.8,
    elevation: 0,
    pointerEvents: 'none',
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    minHeight: 140,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    gap: 4,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    ...textFont(),
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  title: {
    ...textFont(),
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 6,
  },
  content: {
    ...textFont(),
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  copyLabel: {
    ...textFont(),
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});

export default SnippetCard;
