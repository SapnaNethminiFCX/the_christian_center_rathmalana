import { initializeApp, getApps, FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Reuse the existing app on Next.js hot-reload to avoid "duplicate app" errors.
export const firebaseApp: FirebaseApp =
  getApps()[0] ?? initializeApp(firebaseConfig);

if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[firebase] NEXT_PUBLIC_FIREBASE_API_KEY is missing — auth will fail until .env is populated."
  );
}
