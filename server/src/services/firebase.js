// Firebase Admin SDK initialization
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function initFirebase() {
  if (getApps().length > 0) return getApps()[0];

  // On Cloud Run, Application Default Credentials work automatically
  const app = initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'uilson-489209',
  });

  const db = getFirestore();
  console.log('[Firebase] Initialized');
  return app;
}
