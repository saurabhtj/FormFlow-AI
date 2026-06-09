import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// In a real app, load the service account key properly
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin Initialized successfully.");
    } else {
      console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is missing from .env! Backend DB calls will fail.");
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || "formflow-ai-304e2" });
    }
  } catch (error) {
    console.error("Firebase Admin Initialization Error", error);
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || "formflow-ai-304e2" });
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
