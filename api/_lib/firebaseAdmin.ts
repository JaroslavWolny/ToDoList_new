import * as admin from 'firebase-admin';

const getFirebaseAdminEnvError = (): string | null => {
    if (!process.env.FIREBASE_PROJECT_ID) return 'Missing FIREBASE_PROJECT_ID';
    if (!process.env.FIREBASE_CLIENT_EMAIL) return 'Missing FIREBASE_CLIENT_EMAIL';
    if (!process.env.FIREBASE_PRIVATE_KEY) return 'Missing FIREBASE_PRIVATE_KEY';
    return null;
};

export const getFirebaseAdminServices = () => {
    const envError = getFirebaseAdminEnvError();
    if (envError) {
        return { db: null, messaging: null, envError };
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    }

    return {
        db: admin.firestore(),
        messaging: admin.messaging(),
        envError: null,
    };
};

export { admin };
