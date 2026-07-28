import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cachedApp: FirebaseApp | null = null;
function getFirebaseApp(): FirebaseApp {
  if (!cachedApp) cachedApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return cachedApp;
}

let cachedAuth: Auth | null = null;

// Lazy + never called at module scope, so a missing/placeholder API key
// throws only when a caller actually invokes this (inside a try/catch in a
// useEffect), instead of crashing the whole page the instant the bundle
// loads — which is what happened when this used to run eagerly at import time.
export function getFirebaseAuth(): Auth {
  if (typeof window === "undefined") {
    throw new Error("getFirebaseAuth() must only be called in the browser");
  }
  if (!cachedAuth) cachedAuth = getAuth(getFirebaseApp());
  return cachedAuth;
}

export async function getMessagingIfSupported() {
  if (typeof window === "undefined") return null;
  return (await isSupported()) ? getMessaging(getFirebaseApp()) : null;
}
