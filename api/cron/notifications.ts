import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

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

const db = admin.firestore();
const messaging = admin.messaging();

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
        const tokensSnapshot = await db.collection('notification_tokens').get();
        let sentCount = 0;

        const sendPromises = tokensSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const { token, morningTime, eveningTime, timezone } = data;

            if (!token || !timezone) return;

            // Get current hour in the user's timezone.
            // E.g., if it's 08:15 in Europe/Prague currently, this will be "08:15"
            const userDateStr = new Date().toLocaleString("en-US", { timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit' });

            let title = "";
            let body = "";

            // We check if the current hour matches the setting
            // Since Cron runs hourly at minute 00, checking the hour prefix is usually sufficient
            const currentHour = userDateStr.split(':')[0];

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
            } catch (err: any) {
                console.error(`Failed to send to ${doc.id}:`, err);
                // If token is invalid/unregistered, remove it to keep DB clean
                if (err.code === 'messaging/registration-token-not-registered') {
                    await doc.ref.delete();
                }
            }
        });

        await Promise.all(sendPromises);

        res.status(200).json({ success: true, sent: sentCount });

    } catch (error: any) {
        console.error("Cron Error: ", error);
        res.status(500).json({ error: error.message });
    }
}
