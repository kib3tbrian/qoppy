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
import { SetupPINScreen } from '../screens/SetupPINScreen';
import MainTabNavigator from './MainTabNavigator';
import { AuthGate } from './AuthGate';
import { AuthProvider } from '../hooks/useAuth';
import { SnippetsProvider } from '../hooks/useSnippets';
import { useTheme } from '../hooks/useTheme';

// Ignore specific warnings if necessary
LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { theme, mode } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Main'>('Onboarding');

  const navTheme = {
    ...DarkTheme,
    dark: mode === 'dark',
    colors: {
      ...DarkTheme.colors,
      background: theme.background,
      card: theme.header,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
      notification: theme.primary,
    },
  };

  useEffect(() => {
    (async () => {
      try {
        await db.init();
        const onboarded = await db.getPreference('onboarded');
        setInitialRoute(onboarded === 'true' ? 'Main' : 'Onboarding');
      } catch {
        console.error('Database initialization failed.');
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.primary} size="large" />
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
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{
              headerStyle: { backgroundColor: theme.header },
              headerTintColor: theme.text,
              headerShadowVisible: false,
              headerTitleStyle: { fontWeight: '700', fontSize: 17, color: theme.text },
              contentStyle: { backgroundColor: theme.background },
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
              name="SetupPIN"
              component={SetupPINScreen}
              options={{ title: 'App Lock', presentation: 'modal' }}
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
