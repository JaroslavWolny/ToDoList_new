import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
    initializeAuth,
    browserLocalPersistence,
    indexedDBLocalPersistence,
    browserPopupRedirectResolver,
    GoogleAuthProvider,
    type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getMessaging, getToken, type Messaging } from 'firebase/messaging';
import { hasFirebaseConfig } from './notificationSync';

/**
 * The heavy Firebase entry point. This module (and the ~500 kB SDK chunk
 * behind it) must never be imported statically from the app shell or the
 * dashboard — consumers either live on rarely-visited lazy routes (Login)
 * or load it on demand via `await import('./firebase')` (authStore,
 * cloudSync, notificationSync). Keep it that way: first paint should not
 * pay for Firebase.
 */

// iOS Safari sign-in no longer goes through signInWithRedirect — Login.tsx
// drives Google Identity Services and finishes the auth locally with
// signInWithCredential, which sidesteps the cross-origin storage problem.
// That means `authDomain` only matters for the legacy popup/redirect fallback,
// where the Firebase-managed firebaseapp.com host works out of the box
// because it is the one already registered with Google's OAuth client.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app: FirebaseApp | null = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;

// iOS Safari in PWA standalone mode can hang on the default IndexedDB persistence,
// which leaves onAuthStateChanged silent and the UI stuck on "Loading...". Prefer
// localStorage and fall back to IndexedDB so we still get persistence elsewhere.
const initAuthForApp = (firebaseApp: FirebaseApp): Auth => {
    return initializeAuth(firebaseApp, {
        persistence: [browserLocalPersistence, indexedDBLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
    });
};

export const firebaseApp = app;
export const auth: Auth | null = app ? initAuthForApp(app) : null;
export const firestore: Firestore | null = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();

let messagingInstance: Messaging | null = null;
if (app) {
    try {
        messagingInstance = getMessaging(app);
    } catch (err) {
        // Some browsers (older iOS Safari, certain PWA contexts) throw when constructing
        // Messaging because the underlying APIs are missing. Keep auth working anyway.
        console.warn('Firebase Messaging unavailable:', err);
    }
}
export const messaging = messagingInstance;

// Re-exported so dynamic importers (`await import('./firebase')`) get the SDK
// functions and the initialized instances from one module — no second entry
// point into firebase/* that the bundler would have to duplicate.
export {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithCredential,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut as firebaseSignOut,
    updateProfile,
} from 'firebase/auth';
export { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

/** SDK half of the push-permission flow — call via notificationSync, not directly. */
export const requestNotificationToken = async (): Promise<string | null> => {
    try {
        if (!messaging) return null;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return null;

        let swRegistration: ServiceWorkerRegistration | undefined;
        if ('serviceWorker' in navigator) {
            swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/firebase-cloud-messaging-push-scope',
            });
        }

        const currentToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: swRegistration,
        });

        return currentToken || null;
    } catch (error) {
        console.error('Error requesting notification permission or getting token:', error);
        return null;
    }
};
