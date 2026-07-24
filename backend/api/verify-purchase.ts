import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, admin } from '../lib/firebaseAdmin';
import { playDeveloperApi, PACKAGE_NAME } from '../lib/googlePlayApi';
import { verifyFirebaseToken } from '../lib/authMiddleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const authenticatedUid = await verifyFirebaseToken(req);
    const { uid, purchaseToken, productId } = req.body || {};

    if (!purchaseToken || !productId || !uid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prevent spoofing: Ensure the token uid matches the body uid
    if (uid !== authenticatedUid) {
      return res.status(403).json({ error: 'UID mismatch' });
    }

    // Call Google Play Developer API to verify the subscription
    const response = await playDeveloperApi.purchases.subscriptionsv2.get({
      packageName: PACKAGE_NAME,
      token: purchaseToken,
    });

    const subscription = response.data;
    const lineItem = subscription.lineItems?.[0];

    if (!lineItem) {
      return res.status(400).json({ active: false, error: 'No subscription details found' });
    }

    const isActive = subscription.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE'
                  || subscription.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';

    const expiryDate = lineItem.expiryTime; // ISO 8601 string
    const basePlanId = lineItem.productId;

    const entitlementRef = db.collection('users').doc(uid).collection('entitlement').doc('pro');

    if (isActive) {
      // Write active subscription status to Firestore
      await entitlementRef.set({
        isPro: true,
        basePlanId,
        expiryDate,
        purchaseToken,
        lastVerified: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return res.status(200).json({
        active: true,
        expiryDate,
        basePlanId,
      });
    } else {
      // Subscription is expired, canceled, or revoked
      await entitlementRef.set({
        isPro: false,
        reason: subscription.subscriptionState,
        lastVerified: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return res.status(200).json({
        active: false,
        reason: subscription.subscriptionState,
      });
    }
  } catch (error: any) {
    console.error('Google Play Verification Error:', error.message || error);
    const isAuthErr = error.message?.startsWith('Unauthorized');
    const statusCode = isAuthErr ? 401 : 500;
    return res.status(statusCode).json({ error: error.message || 'Failed to verify subscription' });
  }
}
