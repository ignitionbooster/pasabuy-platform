import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// getAuth() must never run during Next.js's server-side static prerendering —
// there's no real browser there, and Firebase Auth throws immediately on
// init in that environment regardless of whether the API key looks valid.
// Only ever call this from client-side code (useEffect, event handlers).
export const auth = typeof window !== "undefined" ? getAuth(firebaseApp) : ({} as ReturnType<typeof getAuth>);

export async function getMessagingIfSupported() {
  if (typeof window === "undefined") return null;
  return (await isSupported()) ? getMessaging(firebaseApp) : null;
}
