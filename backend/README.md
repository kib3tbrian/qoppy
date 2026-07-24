# Sagent Vercel API Backend

Serverless API routes for verifying Google Play Android Subscriptions and handling Real-Time Developer Notifications (RTDN).

## Endpoints

1. **`POST /api/verify-purchase`**
   - **Auth:** Requires `Authorization: Bearer <FIREBASE_ID_TOKEN>` header.
   - **Body:** `{ "uid": "...", "purchaseToken": "...", "productId": "..." }`
   - Verifies purchase with Google Play Developer API and updates Firestore entitlement document.

2. **`POST /api/rtdn-webhook`**
   - **Auth:** Public / PubSub Push Endpoint.
   - Handles real-time subscription status changes (renewals, cancellations, grace period, expirations).

---

## Vercel Environment Variables Configuration

Set the following environment variables in your Vercel Project Settings (**Settings > Environment Variables**):

| Variable | Description | Example / Value |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | Minified JSON string of your Firebase Service Account Private Key | `{"type":"service_account","project_id":"...","private_key":"..."}` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Minified JSON string of your Google Cloud Service Account linked to Google Play Console | `{"type":"service_account","project_id":"...","private_key":"..."}` |
| `ANDROID_PACKAGE_NAME` | Your Android application package name | `com.sagent.app` |

---

## Deployment Instructions

### Option 1: Via Vercel CLI
```bash
cd backend
npx vercel --prod
```

### Option 2: Via GitHub / Git Integration
Push the `backend` folder or root repo to GitHub/GitLab, create a project on [Vercel](https://vercel.com), and set Root Directory to `backend` (if deploying separately).

---

## Updating the React Native App Configuration

In your `app.json`, set the `backendVerifyUrl` field under `expo.extra`:

```json
{
  "expo": {
    "extra": {
      "backendVerifyUrl": "https://your-vercel-domain.vercel.app/api/verify-purchase"
    }
  }
}
```
