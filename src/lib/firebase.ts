import { initializeApp, getApps, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const defaultConfig: FirebaseOptions = {
  apiKey: "AIzaSyBX4qKVYGXKJVBNTUGJVTpKRYBJqUbzIcc",
  authDomain: "support-system-app.firebaseapp.com",
  projectId: "support-system-app",
  storageBucket: "support-system-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
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