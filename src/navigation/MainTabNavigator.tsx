import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Heart, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MainTabParamList } from '../types';
import { textFont } from '../constants/typography';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, React.ComponentType<any>> = {
  Home,
  Favorites: Heart,
  Settings,
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.tabBarWrap, { bottom: bottomOffset }]}>
      <View style={styles.tabBar}>
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
            activeOpacity={0.8}
          >
            <View style={[styles.tabIconWrap, isFocused && styles.tabIconWrapActive]}>
              <Icon
                size={22}
                color={isFocused ? '#FFFFFF' : '#7A7A85'}
                strokeWidth={isFocused ? 2.5 : 2}
                fill={isFocused && route.name === 'Favorites' ? '#FFFFFF' : 'transparent'}
              />
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{String(label)}</Text>
          </TouchableOpacity>
        );
      })}
      </View>
    </View>
  );
}

export const MainTabNavigator: React.FC = () => (
  <Tab.Navigator
    tabBar={props => <CustomTabBar {...props} />}
    screenOptions={{
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTintColor: '#1E1B2E',
      headerShadowVisible: false,
      headerTitleStyle: {
        ...textFont(),
        fontWeight: '900',
        color: '#1E1B2E',
        fontSize: 20,
      },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{ title: 'Qoppy', tabBarLabel: 'Snippets' }}
    />
    <Tab.Screen
      name="Favorites"
      component={FavoritesScreen}
      options={{ title: 'Qoppy', tabBarLabel: 'Favorites' }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{ title: 'Settings', tabBarLabel: 'Settings' }}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBarWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 26,
    shadowColor: '#140C24',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    gap: 4,
    borderRadius: 22,
    paddingVertical: 4,
  },
  tabIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: '#7C3AED',
  },
  tabLabel: {
    ...textFont(),
    fontSize: 10,
    fontWeight: '800',
    color: '#7A7A85',
  },
  tabLabelActive: {
    color: '#7C3AED',
    fontWeight: '900',
  },
});

export default MainTabNavigator;
