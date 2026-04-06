// src/navigation/RootNavigator.tsx

import React, { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, LogBox } from 'react-native';

import { db } from '../services/database';
import { COLORS } from '../constants';
import { RootStackParamList } from '../types';

import OnboardingScreen from '../screens/OnboardingScreen';
import AddSnippetScreen from '../screens/AddSnippetScreen';
import PaywallScreen from '../screens/PaywallScreen';
import ManageCategoriesScreen from '../screens/ManageCategoriesScreen';
import MainTabNavigator from './MainTabNavigator';
import { AuthGate } from './AuthGate';
import { AuthProvider } from '../hooks/useAuth';
import { SnippetsProvider } from '../hooks/useSnippets';

// Ignore specific warnings if necessary
LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);

const Stack = createNativeStackNavigator<RootStackParamList>();

const NAV_THEME = {
  ...DarkTheme,
  dark: false,
  colors: {
    ...DarkTheme.colors,
    background: '#EDE9F6',
    card: '#FFFFFF',
    text: '#1E1B2E',
    border: '#DDD6FE',
    primary: '#7C3AED',
    notification: '#7C3AED',
  },
};

export const RootNavigator: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Main'>('Onboarding');

  useEffect(() => {
    (async () => {
      try {
        await db.init();
        const onboarded = await db.getPreference('onboarded');
        setInitialRoute(onboarded === 'true' ? 'Main' : 'Onboarding');
      } catch (error) {
        console.error("Database initialization failed:", error);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#EDE9F6', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#7C3AED" size="large" />
      </View>
    );
  }

  const ProtectedMainScreen = () => (
    <AuthGate>
      <MainTabNavigator />
    </AuthGate>
  );

  const ProtectedAddSnippetScreen = () => (
    <AuthGate>
      <AddSnippetScreen />
    </AuthGate>
  );

  const ProtectedPaywallScreen = () => (
    <AuthGate>
      <PaywallScreen />
    </AuthGate>
  );

  const ProtectedManageCategoriesScreen = () => (
    <AuthGate>
      <ManageCategoriesScreen />
    </AuthGate>
  );

  return (
    <AuthProvider>
      <SnippetsProvider>
        <NavigationContainer theme={NAV_THEME}>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{
              headerStyle: { backgroundColor: '#FFFFFF' },
              headerTintColor: '#1E1B2E',
              headerShadowVisible: false,
              headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#1E1B2E' },
              contentStyle: { backgroundColor: '#EDE9F6' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Main"
              component={ProtectedMainScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddSnippet"
              component={ProtectedAddSnippetScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="Paywall"
              component={ProtectedPaywallScreen}
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="ManageCategories"
              component={ProtectedManageCategoriesScreen}
              options={{ title: 'Categories' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SnippetsProvider>
    </AuthProvider>
  );
};

export default RootNavigator;
