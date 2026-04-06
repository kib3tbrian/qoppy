// src/navigation/MainTabNavigator.tsx
//
// Bottom tab bar: Home | Favorites | Settings
// Uses custom tab bar for the dark theme.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Heart, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { COLORS } from '../constants';
import { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// ── Custom tab bar ─────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, React.ComponentType<any>> = {
  Home, Favorites: Heart, Settings,
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 12 }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? route.name;
        const isFocused = state.index === index;
        const Icon = TAB_ICONS[route.name] ?? Home;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconWrap, isFocused && styles.tabIconWrapActive]}>
              <Icon
                size={20}
                color={isFocused ? '#7C3AED' : '#9CA3AF'}
                strokeWidth={isFocused ? 2.5 : 2}
                fill={isFocused && route.name === 'Favorites' ? '#7C3AED' : 'transparent'}
              />
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {String(label)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Navigator ──────────────────────────────────────────────────────────────

export const MainTabNavigator: React.FC = () => (
  <Tab.Navigator
    tabBar={props => <CustomTabBar {...props} />}
    screenOptions={{
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTintColor: '#1E1B2E',
      headerShadowVisible: false,
      headerTitleStyle: { fontWeight: '700', color: '#1E1B2E' },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{ title: 'Clipsafe', tabBarLabel: 'Home' }}
    />
    <Tab.Screen
      name="Favorites"
      component={FavoritesScreen}
      options={{ title: 'Favourites', tabBarLabel: 'Favourites' }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{ title: 'Settings', tabBarLabel: 'Settings' }}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#DDD6FE',
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tabIconWrap: {
    width: 40,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: '#F5F3FF',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
});

export default MainTabNavigator;
