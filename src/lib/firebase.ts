import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { DEVICE_ID_KEY } from './storage';

const FIREBASE_CONFIG_KEYS = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
] as const;

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const missingFirebaseConfigKeys = FIREBASE_CONFIG_KEYS.filter((key) => !import.meta.env[key]);
const missingMessagingConfigKeys = [
    ...missingFirebaseConfigKeys,
    ...(!import.meta.env.VITE_FIREBASE_VAPID_KEY ? ['VITE_FIREBASE_VAPID_KEY'] : []),
];

const app: FirebaseApp | null = missingFirebaseConfigKeys.length === 0 ? initializeApp(firebaseConfig) : null;

export const firebaseApp = app;
export const auth: Auth | null = app ? getAuth(app) : null;
export const firestore: Firestore | null = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();
export const messaging = app ? getMessaging(app) : null;

export const getFirebaseAuthConfigError = (): string | null => {
    if (missingFirebaseConfigKeys.length === 0) return null;
    return `Missing Firebase config: ${missingFirebaseConfigKeys.join(', ')}`;
};

const getNotificationsApiUrl = (): string => '/api/notifications/token';

export const getFirebaseMessagingConfigError = (): string | null => {
    if (missingMessagingConfigKeys.length === 0) return null;
    return `Missing notification config: ${missingMessagingConfigKeys.join(', ')}`;
};

const ensureMessagingConfigured = (): boolean => {
    const configError = getFirebaseMessagingConfigError();
    if (!configError) return true;

    console.error(configError);
    return false;
};

const getOrCreateDeviceId = (): string => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
};

const syncNotificationToken = async (
    method: 'POST' | 'DELETE',
    payload?: Record<string, unknown>
) => {
    const response = await fetch(getNotificationsApiUrl(), {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!response.ok) {
        let errorMessage = `Notification sync failed with status ${response.status}`;

        try {
            const data = await response.json() as { error?: string };
            if (typeof data.error === 'string' && data.error) {
                errorMessage = data.error;
            }
        } catch {
            // Ignore JSON parsing failures and keep the generic message.
        }

        throw new Error(errorMessage);
    }
};

export const requestFirebaseNotificationPermission = async () => {
    try {
        if (!ensureMessagingConfigured() || !messaging) {
            return null;
        }

        console.log('Requesting notification permission...');
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.log('Notification permission denied.');
            return null;
        }

        console.log('Notification permission granted.');
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

        if (!currentToken) {
            console.log('No registration token available. Request permission to generate one.');
            return null;
        }

        console.log('Firebase Cloud Messaging Token:', currentToken);
        return currentToken;
    } catch (error) {
        console.error('Error requesting notification permission or getting token:', error);
        return null;
    }
};

export const saveTokenToFirestore = async (token: string, morningTime: string, eveningTime: string) => {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        await syncNotificationToken('POST', {
            deviceId: getOrCreateDeviceId(),
            token,
            morningTime,
            eveningTime,
            timezone,
        });

        console.log('Token saved to backend');
    } catch (error) {
        console.error('Failed to save token to backend:', error);
        throw error;
    }
};

export type ReminderStats = {
    tasksDueSoon: number;
    dailyGoalProgress: number;
    dailyGoalTarget: number;
    streakCurrent: number;
    missionsCompleted: number;
    missionsTotal: number;
};

export const updateNotificationStats = async (stats: ReminderStats): Promise<void> => {
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) return; // no token registered yet — nothing to personalize

    try {
        const response = await fetch(getNotificationsApiUrl(), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, stats }),
        });
        if (!response.ok) {
            console.warn(`Failed to sync notification stats: ${response.status}`);
        }
    } catch (error) {
        console.warn('Failed to sync notification stats:', error);
    }
};

export const removeTokenFromFirestore = async () => {
    try {
        const deviceId = localStorage.getItem(DEVICE_ID_KEY);
        if (!deviceId) return;

        await syncNotificationToken('DELETE', { deviceId });
        console.log('Token removed from backend');
        localStorage.removeItem(DEVICE_ID_KEY);
    } catch (error) {
        console.error('Failed to remove token from backend:', error);
        throw error;
    }
};

export const subscribeToMessages = (callback: (payload: unknown) => void): (() => void) => {
    if (!messaging) return () => {};
    return onMessage(messaging, callback);
};

