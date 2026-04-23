// src/components/cards/SnippetCardSkeleton.tsx
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';

const CARD_GAP = 8;

export const SnippetCardSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.4);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
        ]}
      >
        <Animated.View style={[styles.contentWrap, animatedStyle]}>
          <View style={[styles.badgeSkeleton, { backgroundColor: theme.surfaceAlt }]} />
          <View style={[styles.titleSkeleton, { backgroundColor: theme.surfaceAlt }]} />
          <View style={[styles.contentSkeleton, { backgroundColor: theme.surfaceAlt }]} />
          <View style={styles.footer}>
            <View style={[styles.dateSkeleton, { backgroundColor: theme.surfaceAlt }]} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    marginBottom: CARD_GAP,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderWidth: 1,
    height: 138,
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
  contentWrap: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  badgeSkeleton: {
    width: 60,
    height: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  titleSkeleton: {
    width: '80%',
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
  },
  contentSkeleton: {
    width: '100%',
    height: 32,
    borderRadius: 4,
  },
  footer: {
    marginTop: 'auto',
  },
  dateSkeleton: {
    width: 40,
    height: 12,
    borderRadius: 4,
  },
});
