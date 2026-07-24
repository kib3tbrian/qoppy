import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, admin } from '../lib/firebaseAdmin';
import { playDeveloperApi, PACKAGE_NAME } from '../lib/googlePlayApi';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message } = req.body || {};

    if (!message || !message.data) {
      return res.status(400).send('Bad Request: Missing message data');
    }

    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    const notification = JSON.parse(decodedData);
    const purchaseToken = notification?.subscriptionNotification?.purchaseToken;

    if (!purchaseToken) {
      console.log('Received RTDN without purchaseToken:', notification);
      return res.status(200).send('OK');
    }

    // Look up the user who owns this purchase token by searching Firestore
    const usersSnapshot = await db.collectionGroup('entitlement')
      .where('purchaseToken', '==', purchaseToken)
      .get();

    if (usersSnapshot.empty) {
      console.warn(`RTDN: No entitlement document found for purchaseToken=${purchaseToken}`);
      return res.status(200).send('OK');
    }

    // Verify the subscription with Google Play
    const playResponse = await playDeveloperApi.purchases.subscriptionsv2.get({
      packageName: PACKAGE_NAME,
      token: purchaseToken,
    });

    const subscription = playResponse.data;
    const lineItem = subscription.lineItems?.[0];
    const isActive = subscription.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE'
                  || subscription.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';
    const expiryDate = lineItem?.expiryTime;

    // Update each entitlement document that matches this purchase token
    const batch = db.batch();
    usersSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      batch.update(doc.ref, {
        isPro: isActive,
        expiryDate: expiryDate ?? null,
        lastVerified: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    console.log(`RTDN: Updated ${usersSnapshot.size} user(s) — active=${isActive}`);
    return res.status(200).send('OK');
  } catch (error) {
    console.error('RTDN processing error:', error);
    return res.status(200).send('OK');
  }
}
