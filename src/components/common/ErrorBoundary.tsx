// src/components/common/ErrorBoundary.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandIcon } from './BrandIcon';
import { textFont } from '../../constants/typography';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught JS Error:', error, errorInfo);
  }

  handleReload = async (): Promise<void> => {
    try {
      // Try expo-updates reload if available
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Updates = require('expo-updates');
      if (Updates && typeof Updates.reloadAsync === 'function') {
        await Updates.reloadAsync();
        return;
      }
    } catch {
      // Fallback if expo-updates is not installed or enabled in dev
    }

    // Reset local error state as fallback
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <BrandIcon size={72} />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            Please restart the app. If the issue persists, try reopening Sagent.
          </Text>
          <TouchableOpacity
            style={styles.reloadBtn}
            onPress={this.handleReload}
            activeOpacity={0.85}
          >
            <Text style={styles.reloadBtnText}>Reload</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F13',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconCircle: {
    marginBottom: 24,
  },
  title: {
    ...textFont('bold'),
    fontSize: 24,
    color: '#F8F7FF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    ...textFont('regular'),
    fontSize: 15,
    color: '#B5B3C7',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 280,
  },
  reloadBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  reloadBtnText: {
    ...textFont('bold'),
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default ErrorBoundary;
