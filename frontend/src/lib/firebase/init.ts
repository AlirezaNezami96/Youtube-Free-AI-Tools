// Firebase initialization — client-side only.
// All Firebase calls are guarded by typeof window !== 'undefined'.
import { initializeApp, getApps, FirebaseApp } from "firebase/app";

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
	measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let firebaseApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
	if (typeof window === "undefined") return null;
	if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
		// Firebase env vars not configured — silently skip
		return null;
	}
	if (!firebaseApp) {
		if (getApps().length === 0) {
			firebaseApp = initializeApp(firebaseConfig);
		} else {
			firebaseApp = getApps()[0];
		}
	}
	return firebaseApp;
}
