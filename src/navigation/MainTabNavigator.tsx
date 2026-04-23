import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Heart, Moon, Settings, Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import HomeScreen from '../screens/HomeScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MainTabParamList } from '../types';
import { textFont } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';
import { TAB_TRANSITION_CONFIG } from '../constants';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, React.ComponentType<any>> = {
  Home,
  Favorites: Heart,
  Settings,
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface TabItemProps {
  label: string;
  isFocused: boolean;
  onPress: () => void;
  icon: React.ComponentType<any>;
  routeName: string;
}

const TabItem: React.FC<TabItemProps> = ({ label, isFocused, onPress, icon: Icon, routeName }) => {
  const { theme } = useTheme();
  const activeProgress = useSharedValue(isFocused ? 1 : 0);

  React.useEffect(() => {
    activeProgress.value = withTiming(isFocused ? 1 : 0, {
      duration: TAB_TRANSITION_CONFIG.duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeProgress, isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.96 + activeProgress.value * 0.04 }],
  }));

  return (
    <AnimatedTouchableOpacity
      style={[styles.tabItem, animatedStyle]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.tabIconWrap,
          isFocused && { backgroundColor: theme.primary },
        ]}
      >
        <Icon
          size={21}
          color={isFocused ? theme.onPrimary : theme.tabInactive}
          strokeWidth={isFocused ? 2.5 : 2}
          fill={isFocused && routeName === 'Favorites' ? theme.onPrimary : 'transparent'}
        />
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: isFocused ? theme.text : theme.tabInactive },
        ]}
      >
        {label}
      </Text>
    </AnimatedTouchableOpacity>
  );
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const bottomOffset = Math.max(insets.bottom, 10);

  return (
    <View
      style={[
        styles.tabBarWrap,
        {
          bottom: bottomOffset,
        },
      ]}
    >
      <View pointerEvents="none" style={styles.tabBarBackdrop}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={mode === 'dark' ? 48 : 56}
            tint={mode === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        <View style={[styles.tabBarShade, { backgroundColor: theme.tabBackdrop }]} />
      </View>
      <View style={[styles.tabBar, { backgroundColor: theme.tabGlass, shadowColor: theme.shadow }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? route.name;
          const isFocused = state.index === index;
          const Icon = TAB_ICONS[route.name] ?? Home;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              onPress={onPress}
              label={String(label)}
              isFocused={isFocused}
              icon={Icon}
              routeName={route.name}
            />
          );
        })}
      </View>
    </View>
  );
}

export const MainTabNavigator: React.FC = () => {
  const { theme, mode, toggleTheme } = useTheme();
  const ThemeIcon = mode === 'light' ? Moon : Sun;

  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      sceneContainerStyle={{ backgroundColor: theme.background, marginBottom: 0, paddingBottom: 0 }}
      screenOptions={{
        headerStyle: { backgroundColor: theme.header },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          display: 'none',
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => null,
        headerTitleStyle: {
          ...textFont(),
          fontWeight: '900',
          color: theme.text,
          fontSize: 20,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Qoppy',
          tabBarLabel: 'Snippets',
          headerRight: () => (
            <TouchableOpacity onPress={() => void toggleTheme()} style={styles.headerBtn} activeOpacity={0.75}>
              <ThemeIcon size={20} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Qoppy',
          tabBarLabel: 'Favorites',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  headerBtn: {
    padding: 8,
  },
  tabBarWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingTop: 0,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 28,
    borderWidth: 0,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0,
    shadowRadius: 20,
    elevation: 0,
  },
  tabBarBackdrop: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: 'hidden',
  },
  tabBarShade: {
    ...StyleSheet.absoluteFillObject,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    gap: 4,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabLabel: {
    ...textFont(),
    fontSize: 11,
    fontWeight: '900',
  },
});

export default MainTabNavigator;
