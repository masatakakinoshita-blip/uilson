// Firebase Client SDK initialization
// On Firebase Hosting, config is auto-injected via /__/firebase/init.json
// For local dev, uses VITE_FIREBASE_* env vars

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

let app = null;
let db = null;

const DEFAULT_CONFIG = {
  projectId: 'uilson-489209',
  authDomain: 'uilson-489209.firebaseapp.com',
};

export async function initClientFirebase() {
  if (app) return { app, db };

  let config;

  // On Firebase Hosting, fetch auto-config
  try {
    const res = await fetch('/__/firebase/init.json');
    if (res.ok) {
      config = await res.json();
    }
  } catch {
    // Not on Firebase Hosting, use env vars or defaults
  }

  if (!config) {
    config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_CONFIG.authDomain,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_CONFIG.projectId,
    };
  }

  app = initializeApp(config);
  db = getFirestore(app);

  return { app, db };
}

export function getClientFirestore() {
  return db;
}
