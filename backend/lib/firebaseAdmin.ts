import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', e);
      admin.initializeApp();
    }
  } else {
    // Uses GOOGLE_APPLICATION_CREDENTIALS or default credentials if available
    admin.initializeApp();
  }
}

export const db = admin.firestore();
export { admin };
