import type { VercelRequest } from '@vercel/node';
import { admin } from './firebaseAdmin';

/**
 * Verifies the Firebase ID token passed in the Authorization header.
 * Returns the authenticated user's UID.
 */
export async function verifyFirebaseToken(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing or invalid token header');
  }

  const idToken = authHeader.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return decodedToken.uid;
}
