// src/navigation/RootNavigator.tsx

import React, { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, LogBox, Image, Text, StyleSheet } from 'react-native';

import { db } from '../services/database';
import { RootStackParamList } from '../types';

import OnboardingScreen from '../screens/OnboardingScreen';
import AddSnippetScreen from '../screens/AddSnippetScreen';
import PaywallScreen from '../screens/PaywallScreen';
import ManageCategoriesScreen from '../screens/ManageCategoriesScreen';
import MainTabNavigator from './MainTabNavigator';
import { SnippetsProvider } from '../hooks/useSnippets';
import { useTheme } from '../hooks/useTheme';
import { syncPremiumStatusFromBilling, watchPremiumStatusFromBilling } from '../services/premiumSync';

// Ignore specific warnings if necessary
LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);

const Stack = createNativeStackNavigator<RootStackParamList>();

const LaunchSplash = ({ backgroundColor, textColor }: { backgroundColor: string; textColor: string }) => (
  <View style={[splashStyles.container, { backgroundColor }]}>
    <Image source={require('../../assets/splash.png')} style={splashStyles.logo} resizeMode="contain" />
    <Text style={[splashStyles.title, { color: textColor }]}>Qoppy</Text>
  </View>
);

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
    const unsubscribe = watchPremiumStatusFromBilling();

    (async () => {
      try {
        await Promise.all([
          db.init(),
          new Promise(resolve => setTimeout(resolve, 1200)),
        ]);
        try {
          await syncPremiumStatusFromBilling();
        } catch {
          // Keep launch resilient if Google Play is temporarily unavailable.
        }
        const onboarded = await db.getPreference('onboarded');
        setInitialRoute(onboarded === 'true' ? 'Main' : 'Onboarding');
      } catch {
        setInitialRoute('Onboarding');
      } finally {
        setIsReady(true);
      }
    })();

    return () => {
      unsubscribe?.();
    };
  }, []);

  if (!isReady) {
    return <LaunchSplash backgroundColor={theme.background} textColor={theme.text} />;
  }

  return (
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
            animation: 'fade',
            animationDuration: 250,
          }}
        >
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddSnippet"
            component={AddSnippetScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="ManageCategories"
            component={ManageCategoriesScreen}
            options={{ title: 'Categories' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SnippetsProvider>
  );
};

export default RootNavigator;

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    width: 220,
    height: 220,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
});
