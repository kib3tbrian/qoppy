// App.tsx — root entry point

import 'react-native-gesture-handler';
import React from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { RootNavigator } from './src/navigation/RootNavigator';
import { textFont } from './src/constants/typography';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import { AuthProvider } from './src/providers/AuthProvider';
import { useFonts } from 'expo-font';
import {
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
  Onest_700Bold,
  Onest_800ExtraBold,
  Onest_900Black,
} from '@expo-google-fonts/onest';

// ── Global font defaults ─────────────────────────────────────────────────────

const TextWithDefaults = Text as typeof Text & { defaultProps?: { style?: unknown } };
const TextInputWithDefaults = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };

TextWithDefaults.defaultProps = TextWithDefaults.defaultProps ?? {};
TextWithDefaults.defaultProps.style = [TextWithDefaults.defaultProps.style, textFont()];

TextInputWithDefaults.defaultProps = TextInputWithDefaults.defaultProps ?? {};
TextInputWithDefaults.defaultProps.style = [TextInputWithDefaults.defaultProps.style, textFont()];

import ErrorBoundary from './src/components/common/ErrorBoundary';

// ── Global Error Handling ─────────────────────────────────────────────────────

// Catch unhandled promise rejections (silent failures in Bugs 1-3)
// and prevent raw errors from surfacing in development or production.
if (!__DEV__) {
  // In production, we don't want raw JS crashes shown by the default handler.
  const globalAny = global as any;
  if (globalAny.ErrorUtils) {
    const defaultHandler = globalAny.ErrorUtils.getGlobalHandler();
    globalAny.ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
      console.error('[GlobalError] Caught error:', error, isFatal);
      // We let the default handler run if it's fatal to allow app to crash/restart,
      // but the ErrorBoundary should catch render-cycle errors first.
      if (defaultHandler) defaultHandler(error, isFatal);
    });
  }
}

// ── App shell ─────────────────────────────────────────────────────────────────

const AppShell: React.FC<{ fontsReady: boolean }> = ({ fontsReady }) => {
  const { theme } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaProvider>
        <RootNavigator fontsReady={fontsReady} />
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

import { NetworkProvider } from './src/providers/NetworkProvider';

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
    Onest_800ExtraBold,
    Onest_900Black,
  });

  // If fonts fail to load (no network, corrupted cache) treat them as ready
  // so the app doesn't stall forever — system fallback fonts will be used.
  const fontsReady = fontsLoaded || fontError !== null;

  return (
    <ErrorBoundary>
      <NetworkProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppShell fontsReady={fontsReady} />
          </AuthProvider>
        </ThemeProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}
