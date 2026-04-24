// App.tsx — root entry point

import 'react-native-gesture-handler';
import React from 'react';
import { Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as WebBrowser from 'expo-web-browser';

import { RootNavigator } from './src/navigation/RootNavigator';
import { textFont } from './src/constants/typography';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import { useFonts } from 'expo-font';
import { 
  DMSans_400Regular, 
  DMSans_500Medium, 
  DMSans_600SemiBold, 
  DMSans_700Bold, 
  DMSans_800ExtraBold, 
  DMSans_900Black 
} from '@expo-google-fonts/dm-sans';

WebBrowser.maybeCompleteAuthSession();

const TextWithDefaults = Text as typeof Text & { defaultProps?: { style?: unknown } };
const TextInputWithDefaults = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };

TextWithDefaults.defaultProps = TextWithDefaults.defaultProps ?? {};
TextWithDefaults.defaultProps.style = [TextWithDefaults.defaultProps.style, textFont()];

TextInputWithDefaults.defaultProps = TextInputWithDefaults.defaultProps ?? {};
TextInputWithDefaults.defaultProps.style = [TextInputWithDefaults.defaultProps.style, textFont()];

const AppShell: React.FC = () => {
  const { theme } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaProvider>
        <RootNavigator />
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSans_900Black,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
