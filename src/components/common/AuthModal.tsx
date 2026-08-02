import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { LogIn } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../providers/AuthProvider';
import Toast from 'react-native-toast-message';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { signInWithGoogleAndLink } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const success = await signInWithGoogleAndLink();
      if (success) {
        onClose();
        Toast.show({ type: 'success', text1: 'Signed in successfully!' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Sign in failed. Please try again.' });
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
            <LogIn size={32} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Sign in to Continue</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Sign in with your Google account to save, edit, share, and manage your message templates.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={handleSignIn}
              disabled={isSigningIn}
            >
              <Text style={[styles.primaryText, { color: theme.onPrimary }]}>
                {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
              onPress={onClose}
              disabled={isSigningIn}
            >
              <Text style={[styles.secondaryText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
