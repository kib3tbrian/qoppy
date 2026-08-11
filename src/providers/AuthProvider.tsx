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
        // Firebase Auth automatically persists the session, so on app restart
        // this branch will be hit with the existing user (anonymous or linked).
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
          // Reload to get fresh email/displayName from the provider
          await auth().currentUser!.reload();
          const refreshed = auth().currentUser;
          setUser(refreshed);
        } catch (linkError: any) {
          const code = linkError?.code ?? linkError?.userInfo?.code ?? '';
          if (
            code === 'auth/credential-already-in-use' ||
            code === 'auth/provider-already-linked' ||
            code === 'auth/email-already-in-use'
          ) {
            // The Google account is already tied to another Firebase user.
            // Sign in directly — this adopts the existing account.
            console.warn(`[Auth] linkWithCredential failed (${code}). Falling back to signInWithCredential.`);
            const result = await auth().signInWithCredential(googleCredential);
            await result.user.reload();
            setUser(auth().currentUser);
          } else {
            throw linkError;
          }
        }
      } else {
        const result = await auth().signInWithCredential(googleCredential);
        await result.user.reload();
        setUser(auth().currentUser);
      }
      return true;
    } catch (error: any) {
      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === 'SIGN_IN_CANCELLED'
      ) {
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
