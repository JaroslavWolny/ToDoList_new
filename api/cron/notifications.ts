import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

type FirebaseMessagingError = { code?: string; message?: string };

const getErrorDetails = (error: unknown): FirebaseMessagingError => {
    if (typeof error === 'object' && error !== null) {
        return error as FirebaseMessagingError;
    }
    return {};
};

const getHourInTimeZone = (date: Date, timeZone: string): string => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        hour: '2-digit',
    }).formatToParts(date);

    return parts.find((part) => part.type === 'hour')?.value ?? '';
};

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace escaped newlines for Vercel env variables
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

const db = admin.apps.length ? admin.firestore() : null;
const messaging = admin.apps.length ? admin.messaging() : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow GET requests (Vercel Cron natively uses GET)
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Security check: Only allow requests bearing the cron secret if configured
    const authHeader = req.headers.authorization;
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        if (!db || !messaging) {
            return res.status(500).json({ message: 'Firebase Admin is not configured' });
        }

        const tokensSnapshot = await db.collection('notification_tokens').get();
        let sentCount = 0;

        const sendPromises = tokensSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const { token, morningTime, eveningTime, timezone } = data;

            if (!token || !timezone) return;

            let title = "";
            let body = "";

            // Cron runs hourly; matching by hour triggers once per selected hour.
            const currentHour = getHourInTimeZone(new Date(), timezone);

            if (morningTime && morningTime.startsWith(currentHour)) {
                title = "🌅 Good Morning, Hero!";
                body = "A new day, a new quest. Check your daily missions and crush your goals!";
            } else if (eveningTime && eveningTime.startsWith(currentHour)) {
                title = "🌙 Evening Summary";
                body = "Did you complete all your quests today? Open the app to check your streak!";
            } else {
                return; // Not the time for this user
            }

            // Send push notification
            const message = {
                notification: {
                    title,
                    body,
                },
                token: token,
                webpush: {
                    fcmOptions: {
                        link: "/"
                    }
                }
            };

            try {
                await messaging.send(message);
                sentCount++;
            } catch (err: unknown) {
                const details = getErrorDetails(err);
                console.error(`Failed to send to ${doc.id}:`, err);
                // If token is invalid/unregistered, remove it to keep DB clean
                if (details.code === 'messaging/registration-token-not-registered') {
                    await doc.ref.delete();
                }
            }
        });

        await Promise.all(sendPromises);

        res.status(200).json({ success: true, sent: sentCount });

    } catch (error: unknown) {
        const details = getErrorDetails(error);
        console.error("Cron Error: ", error);
        res.status(500).json({ error: details.message ?? 'Internal Server Error' });
    }
}
