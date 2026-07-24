import express, { Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import * as admin from 'firebase-admin';
import { OAuth2Client } from 'google-auth-library';

// ==========================================
// CONFIGURATION & SETUP
// ==========================================
const PORT = process.env.PORT || 3000;
const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || 'com.sagent.app';
const PUBSUB_AUDIENCE = process.env.PUBSUB_VERIFICATION_AUDIENCE;
const PUBSUB_SECRET_TOKEN = process.env.PUBSUB_SECRET_TOKEN;

// 1. Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountEnv) {
    try {
      const rawJson = serviceAccountEnv.startsWith('{')
        ? serviceAccountEnv
        : Buffer.from(serviceAccountEnv, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(rawJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[Firebase] Admin initialized via FIREBASE_SERVICE_ACCOUNT env var.');
    } catch (e: any) {
      console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', e.message);
      admin.initializeApp();
    }
  } else {
    admin.initializeApp();
    console.log('[Firebase] Admin initialized via default credentials.');
  }
}
const db = admin.firestore();

// 2. Initialize Google Play Developer API Client
let authClient;
const playServiceAccountEnv = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
if (playServiceAccountEnv) {
  try {
    const rawJson = playServiceAccountEnv.startsWith('{')
      ? playServiceAccountEnv
      : Buffer.from(playServiceAccountEnv, 'base64').toString('utf-8');
    const credentials = JSON.parse(rawJson);
    authClient = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    console.log('[Google Play API] Initialized via GOOGLE_PLAY_SERVICE_ACCOUNT env var.');
  } catch (e: any) {
    console.error('[Google Play API] Failed to parse GOOGLE_PLAY_SERVICE_ACCOUNT env var:', e.message);
    authClient = new google.auth.GoogleAuth({
      keyFile: './google-service-account.json',
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
  }
} else {
  authClient = new google.auth.GoogleAuth({
    keyFile: './google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  console.log('[Google Play API] Initialized via local keyFile.');
}

const playDeveloperApi = google.androidpublisher({
  version: 'v3',
  auth: authClient,
});

const oAuth2Client = new OAuth2Client();

// Express App Initialization
const app = express();
app.use(express.json());

// ==========================================
// HEALTH CHECK ENDPOINTS
// ==========================================
app.get('/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    packageName: PACKAGE_NAME,
  });
});

app.get('/', (req: Request, res: Response) => {
  return res.status(200).send('Sagent Purchase Verification & RTDN Server is running.');
});

// ==========================================
// MIDDLEWARE: FIREBASE AUTH TOKEN VERIFICATION
// ==========================================
const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token header' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as any).uid = decodedToken.uid;
    next();
  } catch (error: any) {
    console.error('[Auth] Firebase token verification failed:', error.message);
    return res.status(403).json({ error: 'Unauthorized: Token verification failed' });
  }
};

// ==========================================
// MIDDLEWARE / HELPER: PUBSUB JWT VERIFICATION
// ==========================================
async function verifyPubSubRequest(req: Request): Promise<boolean> {
  // Option A: Secret token verification via header or query parameter
  if (PUBSUB_SECRET_TOKEN) {
    const providedToken = (req.headers['x-pubsub-token'] as string) || (req.query.token as string);
    if (providedToken === PUBSUB_SECRET_TOKEN) {
      return true;
    }
  }

  // Option B: OIDC JWT verification in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    try {
      const ticket = await oAuth2Client.verifyIdToken({
        idToken,
        audience: PUBSUB_AUDIENCE || undefined,
      });
      const payload = ticket.getPayload();
      if (payload && (payload.iss === 'accounts.google.com' || payload.iss === 'https://accounts.google.com')) {
        return true;
      }
    } catch (err: any) {
      console.warn('[Pub/Sub Auth] Token verification failed:', err.message);
    }
  }

  // If no strict audience or secret token configured, log warning and allow for transition
  if (!PUBSUB_AUDIENCE && !PUBSUB_SECRET_TOKEN) {
    console.warn('[Pub/Sub Auth] Neither PUBSUB_VERIFICATION_AUDIENCE nor PUBSUB_SECRET_TOKEN set. Proceeding without JWT verification.');
    return true;
  }

  return false;
}

// ==========================================
// ENDPOINT: POST /api/verify-purchase
// ==========================================
app.post('/api/verify-purchase', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { uid, purchaseToken, productId } = req.body || {};
    const authenticatedUid = (req as any).uid;

    if (!purchaseToken || !productId || !uid) {
      return res.status(400).json({ error: 'Missing required fields: uid, purchaseToken, productId' });
    }

    if (uid !== authenticatedUid) {
      return res.status(403).json({ error: 'Forbidden: UID mismatch' });
    }

    // Call Google Play Developer API to verify the subscription
    const response = await playDeveloperApi.purchases.subscriptionsv2.get({
      packageName: PACKAGE_NAME,
      token: purchaseToken,
    });

    const subscription = response.data;
    const lineItem = subscription.lineItems?.[0];

    if (!lineItem) {
      return res.status(400).json({ active: false, error: 'No subscription line items found' });
    }

    const state = subscription.subscriptionState;
    const expiryDate = lineItem.expiryTime; // ISO 8601 string
    const isExpiryFuture = expiryDate ? Date.parse(expiryDate) > Date.now() : false;

    const isActive = state === 'SUBSCRIPTION_STATE_ACTIVE' ||
                     state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' ||
                     (state === 'SUBSCRIPTION_STATE_CANCELED' && isExpiryFuture);

    const basePlanId = lineItem.productId;
    const entitlementRef = db.collection('users').doc(uid).collection('entitlement').doc('pro');

    if (isActive) {
      await entitlementRef.set({
        isPro: true,
        basePlanId,
        expiryDate,
        purchaseToken,
        subscriptionState: state,
        lastVerified: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return res.status(200).json({
        active: true,
        expiryDate,
        basePlanId,
        subscriptionState: state,
      });
    } else {
      await entitlementRef.set({
        isPro: false,
        reason: state,
        lastVerified: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return res.status(200).json({
        active: false,
        reason: state,
      });
    }
  } catch (error: any) {
    console.error('[Verify Purchase Error]:', error.message || error);
    return res.status(500).json({ error: 'Failed to verify subscription with Google Play' });
  }
});

// ==========================================
// SUBSCRIPTION NOTIFICATION TYPE MAP
// ==========================================
const NOTIFICATION_TYPES: Record<number, string> = {
  1: 'SUBSCRIPTION_RECOVERED',
  2: 'SUBSCRIPTION_RENEWED',
  3: 'SUBSCRIPTION_CANCELED',
  4: 'SUBSCRIPTION_PURCHASED',
  5: 'SUBSCRIPTION_ON_HOLD',
  6: 'SUBSCRIPTION_IN_GRACE_PERIOD',
  7: 'SUBSCRIPTION_RESTARTED',
  8: 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED',
  9: 'SUBSCRIPTION_DEFERRED',
  10: 'SUBSCRIPTION_PAUSED',
  11: 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED',
  12: 'SUBSCRIPTION_REVOKED',
  13: 'SUBSCRIPTION_EXPIRED',
};

// ==========================================
// ENDPOINT: RTDN HANDLER (POST /rtdn & POST /api/rtdn-webhook)
// ==========================================
const handleRtdnWebhook = async (req: Request, res: Response) => {
  // Always acknowledge Pub/Sub quickly to prevent retries
  res.status(200).send('OK');

  try {
    const isValid = await verifyPubSubRequest(req);
    if (!isValid) {
      console.error('[RTDN] Unauthorized request received on RTDN webhook.');
      return;
    }

    const { message } = req.body || {};
    if (!message || !message.data) {
      console.warn('[RTDN] Received request without message.data:', req.body);
      return;
    }

    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    const notification = JSON.parse(decodedData);

    console.log('[RTDN] Received notification envelope:', {
      version: notification.version,
      packageName: notification.packageName,
      eventTimeMillis: notification.eventTimeMillis,
    });

    if (notification.testNotification) {
      console.log('[RTDN] Received TEST notification from Play Console:', notification.testNotification);
      return;
    }

    const subNotif = notification.subscriptionNotification;
    if (!subNotif || !subNotif.purchaseToken) {
      console.log('[RTDN] Notification does not contain subscription purchaseToken:', notification);
      return;
    }

    const purchaseToken = subNotif.purchaseToken;
    const notificationTypeNum = subNotif.notificationType;
    const notificationTypeStr = NOTIFICATION_TYPES[notificationTypeNum] || `TYPE_${notificationTypeNum}`;

    console.log(`[RTDN] Processing notification for token ${purchaseToken.substring(0, 10)}... | Event: ${notificationTypeStr}`);

    // Lookup Firestore user entitlement by purchase token
    const usersSnapshot = await db.collectionGroup('entitlement')
      .where('purchaseToken', '==', purchaseToken)
      .get();

    if (usersSnapshot.empty) {
      console.warn(`[RTDN] No entitlement document found matching purchaseToken=${purchaseToken.substring(0, 10)}...`);
      return;
    }

    // Call Google Play Developer API to fetch the full ground truth subscription state
    const playResponse = await playDeveloperApi.purchases.subscriptionsv2.get({
      packageName: PACKAGE_NAME,
      token: purchaseToken,
    });

    const subscription = playResponse.data;
    const lineItem = subscription.lineItems?.[0];
    const state = subscription.subscriptionState;
    const expiryDate = lineItem?.expiryTime;
    const isExpiryFuture = expiryDate ? Date.parse(expiryDate) > Date.now() : false;

    const isActive = state === 'SUBSCRIPTION_STATE_ACTIVE' ||
                     state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' ||
                     (state === 'SUBSCRIPTION_STATE_CANCELED' && isExpiryFuture);

    const batch = db.batch();
    usersSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      batch.update(doc.ref, {
        isPro: isActive,
        subscriptionState: state,
        notificationType: notificationTypeStr,
        expiryDate: expiryDate ?? null,
        lastVerified: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log(`[RTDN] Successfully updated ${usersSnapshot.size} user entitlement doc(s) -> active=${isActive}, state=${state}`);

  } catch (error: any) {
    console.error('[RTDN Processing Error]:', error.message || error);
  }
};

app.post('/rtdn', handleRtdnWebhook);
app.post('/api/rtdn-webhook', handleRtdnWebhook);

// ==========================================
// START SERVER
// ==========================================
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`==================================================`);
  console.log(`Sagent Backend Server running on port ${PORT}`);
  console.log(`Health Check: GET http://0.0.0.0:${PORT}/health`);
  console.log(`RTDN Webhook: POST http://0.0.0.0:${PORT}/rtdn`);
  console.log(`Verify Purchase: POST http://0.0.0.0:${PORT}/api/verify-purchase`);
  console.log(`==================================================`);
});
