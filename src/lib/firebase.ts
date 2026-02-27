// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFirestore, doc, setDoc, deleteDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBorLSWHq3K4EA3inO74cnFjiSOoybUGEU",
    authDomain: "todolist-app-63415.firebaseapp.com",
    projectId: "todolist-app-63415",
    storageBucket: "todolist-app-63415.firebasestorage.app",
    messagingSenderId: "170107298960",
    appId: "1:170107298960:web:29f5d266ff58543afce415",
    measurementId: "G-37DDPQH4QY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
export const messaging = getMessaging(app);

// VAPID key
export const VAPID_KEY = "BAA1IW18he9Nqj_zgwmq1UD4tXFytU9NzF3c01EBwolq1AQEmdYJTRwAl5FmwOR69ODDtzuGNCHs66AND30Wwu0";

export const requestFirebaseNotificationPermission = async () => {
    try {
        console.log('Requesting notification permission...');
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('Notification permission granted.');
            let swRegistration: ServiceWorkerRegistration | undefined;

            if ('serviceWorker' in navigator) {
                swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                    scope: '/firebase-cloud-messaging-push-scope',
                });
            }

            const currentToken = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration,
            });
            if (currentToken) {
                console.log('Firebase Cloud Messaging Token:', currentToken);
                // Here we could send this token to our backend
                return currentToken;
            } else {
                console.log('No registration token available. Request permission to generate one.');
                return null;
            }
        } else {
            console.log('Notification permission denied.');
            return null;
        }
    } catch (error) {
        console.error('Error requesting notification permission or getting token:', error);
        return null;
    }
};

// Initialize Firestore
export const db = getFirestore(app);

export const saveTokenToFirestore = async (token: string, morningTime: string, eveningTime: string) => {
    try {
        let deviceId = localStorage.getItem('todolist_device_id');
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('todolist_device_id', deviceId);
        }

        // Attempt to save to Firestore
        await setDoc(doc(db, "notification_tokens", deviceId), {
            token,
            morningTime,
            eveningTime,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            updatedAt: new Date().toISOString()
        });
        console.log('Token saved to Firestore');
    } catch (error) {
        console.error('Failed to save token to Firestore:', error);
    }
};

export const removeTokenFromFirestore = async () => {
    try {
        const deviceId = localStorage.getItem('todolist_device_id');
        if (deviceId) {
            await deleteDoc(doc(db, "notification_tokens", deviceId));
            console.log('Token removed from Firestore');
        }
    } catch (error) {
        console.error('Failed to remove token from Firestore:', error);
    }
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
