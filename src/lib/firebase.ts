import { initializeApp, getApps, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// PLACEHOLDER CONFIG - REPLACE WITH YOUR REAL FIREBASE CREDENTIALS
const defaultConfig: FirebaseOptions = {
  apiKey: "YOUR_REAL_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

function loadFirebaseConfig(): FirebaseOptions {
  try {
    const raw = localStorage.getItem('firebaseConfig');
    if (raw) {
      const override = JSON.parse(raw);
      const cfg = { ...defaultConfig, ...override } as FirebaseOptions;
      return cfg;
    }
  } catch (e) {
    console.warn('Invalid firebaseConfig in localStorage:', e);
  }
  return defaultConfig;
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(loadFirebaseConfig());

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;