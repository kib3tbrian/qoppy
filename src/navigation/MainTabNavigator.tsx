import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Heart, Moon, Settings, Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MainTabParamList } from '../types';
import { textFont } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, React.ComponentType<any>> = {
  Home,
  Favorites: Heart,
  Settings,
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
      <View
        pointerEvents="none"
        style={[
          styles.tabBarBackdrop,
          {
            backgroundColor: mode === 'dark' ? 'rgba(20, 19, 28, 0.22)' : 'rgba(237, 233, 246, 0.42)',
          },
        ]}
      />
      <View style={[styles.tabBar, { backgroundColor: theme.tabGlass, borderColor: theme.tabBorder, shadowColor: theme.shadow }]}>
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
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
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
                  color={isFocused ? '#FFFFFF' : theme.tabInactive}
                  strokeWidth={isFocused ? 2.5 : 2}
                  fill={isFocused && route.name === 'Favorites' ? '#FFFFFF' : 'transparent'}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? theme.text : theme.tabInactive },
                ]}
              >
                {String(label)}
              </Text>
            </TouchableOpacity>
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
      sceneContainerStyle={{ backgroundColor: '#EDE9F6', marginBottom: 0, paddingBottom: 0 }}
      screenOptions={{
        headerStyle: { backgroundColor: theme.header },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: { display: 'none', position: 'absolute' },
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
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 28,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  tabBarBackdrop: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
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
