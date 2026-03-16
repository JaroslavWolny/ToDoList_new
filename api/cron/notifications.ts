import { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminServices, admin } from '../lib/firebaseAdmin';
import {
    getNextReminderSchedule,
    ReminderType,
    isValidReminderSlot,
    isValidTimeZone,
} from '../../src/lib/reminders';

type FirebaseMessagingError = { code?: string; message?: string };

type NotificationTokenDoc = {
    token?: unknown;
    morningTime?: unknown;
    eveningTime?: unknown;
    timezone?: unknown;
};

const getErrorDetails = (error: unknown): FirebaseMessagingError => {
    if (typeof error === 'object' && error !== null) {
        return error as FirebaseMessagingError;
    }
    return {};
};

const getReminderMessage = (reminderType: ReminderType) => {
    if (reminderType === 'MORNING') {
        return {
            title: '🌅 Good Morning, Hero!',
            body: 'A new day, a new quest. Check your daily missions and crush your goals!',
        };
    }

    if (reminderType === 'EVENING') {
        return {
            title: '🌙 Evening Summary',
            body: 'Did you complete all your quests today? Open the app to check your streak!',
        };
    }

    return {
        title: '🔔 QuestDo Reminder',
        body: 'Time to check your quests, streak, and daily progress.',
    };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const authHeader = req.headers.authorization;
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { db, messaging, envError } = getFirebaseAdminServices();

    try {
        if (!db || !messaging) {
            return res.status(500).json({ message: envError ?? 'Firebase Admin is not configured' });
        }

        const now = new Date();
        const dueSnapshot = await db
            .collection('notification_tokens')
            .where('nextSendAtUtc', '<=', admin.firestore.Timestamp.fromDate(now))
            .orderBy('nextSendAtUtc')
            .get();

        let sentCount = 0;

        const sendPromises = dueSnapshot.docs.map(async (doc) => {
            const data = doc.data() as NotificationTokenDoc & { nextReminderType?: ReminderType };
            const token = typeof data.token === 'string' ? data.token : null;
            const morningTime = typeof data.morningTime === 'string' ? data.morningTime : null;
            const eveningTime = typeof data.eveningTime === 'string' ? data.eveningTime : null;
            const timezone = typeof data.timezone === 'string' ? data.timezone : null;
            const reminderType = data.nextReminderType ?? 'MORNING';

            if (!token || !morningTime || !eveningTime || !timezone) {
                console.error(`Skipping ${doc.id}: incomplete notification token document`);
                return;
            }

            if (
                !isValidReminderSlot(morningTime)
                || !isValidReminderSlot(eveningTime)
                || !isValidTimeZone(timezone)
            ) {
                console.error(`Skipping ${doc.id}: invalid reminder configuration`);
                return;
            }

            const messageText = getReminderMessage(reminderType);

            try {
                await messaging.send({
                    notification: messageText,
                    token,
                    webpush: {
                        fcmOptions: {
                            link: '/',
                        },
                    },
                });

                const nextSchedule = getNextReminderSchedule(
                    { morningTime, eveningTime, timezone },
                    now
                );

                if (!nextSchedule) {
                    console.error(`Unable to schedule next reminder for ${doc.id}`);
                    return;
                }

                await doc.ref.update({
                    nextReminderType: nextSchedule.reminderType,
                    nextSendAtUtc: admin.firestore.Timestamp.fromDate(nextSchedule.sendAtUtc),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                sentCount += 1;
            } catch (err: unknown) {
                const details = getErrorDetails(err);
                console.error(`Failed to send to ${doc.id}:`, err);

                if (details.code === 'messaging/registration-token-not-registered') {
                    await doc.ref.delete();
                }
            }
        });

        await Promise.all(sendPromises);

        return res.status(200).json({ success: true, sent: sentCount });
    } catch (error: unknown) {
        const details = getErrorDetails(error);
        console.error('Cron Error: ', error);
        return res.status(500).json({ error: details.message ?? 'Internal Server Error' });
    }
}
