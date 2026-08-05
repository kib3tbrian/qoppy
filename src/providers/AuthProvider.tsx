import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  signInWithGoogleAndLink: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogleAndLink: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: '364900923954-qe0oljp4d8vc67ntdt5enojo59lpdqud.apps.googleusercontent.com',
    });

    const subscriber = auth().onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        // No user yet — sign in anonymously. The resulting auth state change
        // will re-fire this callback with the new anonymous user, hitting the
        // else branch below. We do NOT set loading=false here so the app
        // stays on the splash until the anonymous session is established.
        try {
          await auth().signInAnonymously();
        } catch (error) {
          // Anonymous sign-in failed (no network, emulator issue, etc.).
          // Surface a safe null-user state rather than hanging forever.
          console.error('Anonymous auth failed:', error);
          setUser(null);
          setLoading(false);
        }
      } else {
        // Covers both the new anonymous user and any subsequent sign-in/link.
        setUser(currentUser);
        setLoading(false);
      }
    });

    return subscriber;
  }, []);

  const signInWithGoogleAndLink = useCallback(async (): Promise<boolean> => {
    try {
      // Check if device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get the user's ID token
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) {
        // If type is cancelled, handle gracefully
        if (response.type === 'cancelled') {
          return false;
        }
        throw new Error("No ID Token found from Google Sign In");
      }

      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Link the credential to the current anonymous user
      if (auth().currentUser) {
        try {
          await auth().currentUser!.linkWithCredential(googleCredential);
          // The user is now linked! uid remains the same.
        } catch (linkError: any) {
          const code = linkError?.code ?? linkError?.userInfo?.code ?? '';
          if (
            code === 'auth/credential-already-in-use' ||
            code === 'auth/provider-already-linked' ||
            code === 'auth/email-already-in-use'
          ) {
            // The Google account is already associated with another Firebase
            // user (e.g. after an app reinstall the anonymous UID changed).
            // Fall back to a full sign-in which adopts the existing account.
            console.warn(
              `[Auth] linkWithCredential failed (${code}). Falling back to signInWithCredential.`,
            );
            await auth().signInWithCredential(googleCredential);
          } else {
            throw linkError;
          }
        }
      } else {
        // Fallback: just sign in if no current user
        await auth().signInWithCredential(googleCredential);
      }
      return true;
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
        return false;
      }
      console.error("Google Sign-In failed:", error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogleAndLink }}>
      {children}
    </AuthContext.Provider>
  );
};
