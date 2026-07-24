import { google } from 'googleapis';

const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;

let auth;
if (serviceAccountJson) {
  try {
    const credentials = JSON.parse(serviceAccountJson);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
  } catch (e) {
    console.error('Failed to parse GOOGLE_PLAY_SERVICE_ACCOUNT environment variable:', e);
    auth = new google.auth.GoogleAuth({
      keyFile: './google-service-account.json',
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
  }
} else {
  auth = new google.auth.GoogleAuth({
    keyFile: './google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
}

export const playDeveloperApi = google.androidpublisher({
  version: 'v3',
  auth,
});

export const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || 'com.sagent.app';
