import { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminServices, admin } from '../lib/firebaseAdmin';
import {
    getNextReminderSchedule,
    ReminderType,
    isValidReminderSlot,
    isValidTimeZone,
} from '../lib/reminders';

type FirebaseMessagingError = { code?: string; message?: string };

type ReminderStats = {
    tasksDueSoon?: number;
    dailyGoalProgress?: number;
    dailyGoalTarget?: number;
    streakCurrent?: number;
    missionsCompleted?: number;
    missionsTotal?: number;
};

type NotificationTokenDoc = {
    token?: unknown;
    morningTime?: unknown;
    eveningTime?: unknown;
    timezone?: unknown;
    stats?: ReminderStats;
};

const n = (v: number | undefined): number => (typeof v === 'number' && v >= 0 ? v : 0);

const getErrorDetails = (error: unknown): FirebaseMessagingError => {
    if (typeof error === 'object' && error !== null) {
        return error as FirebaseMessagingError;
    }
    return {};
};

const getReminderMessage = (reminderType: ReminderType, stats?: ReminderStats) => {
    const dueSoon = n(stats?.tasksDueSoon);
    const goalDone = n(stats?.dailyGoalProgress);
    const goalTarget = n(stats?.dailyGoalTarget);
    const streak = n(stats?.streakCurrent);
    const missionsDone = n(stats?.missionsCompleted);
    const missionsTotal = n(stats?.missionsTotal);

    // Highest-signal trigger first: deadlines approaching
    if (dueSoon > 0) {
        return {
            title: '⏰ Deadline Alert',
            body: dueSoon === 1
                ? 'You have 1 quest before its deadline.'
                : `You have ${dueSoon} quests before their deadlines.`,
        };
    }

    if (reminderType === 'EVENING') {
        if (goalTarget > 0 && goalDone < goalTarget) {
            return {
                title: '🌙 Evening check',
                body: `${goalDone}/${goalTarget} of your daily goal done. One more push before midnight.`,
            };
        }
        if (streak > 0 && goalDone === 0) {
            return {
                title: '🔥 Your streak is alive',
                body: `${streak}-day streak. One small task is all it takes to keep it going.`,
            };
        }
        if (missionsTotal > 0 && missionsDone < missionsTotal) {
            return {
                title: '🌙 Quests still open',
                body: `${missionsDone}/${missionsTotal} daily quests done. Finish strong tonight.`,
            };
        }
        return {
            title: '🌙 Evening check',
            body: 'Lock in your streak before midnight. Open the app for a quick win.',
        };
    }

    // MORNING (default)
    if (streak > 0) {
        return {
            title: `🌅 Day ${streak + 1} starts now`,
            body: missionsTotal > 0
                ? `Your ${streak}-day streak is live. ${missionsTotal} fresh quests waiting.`
                : `Your ${streak}-day streak is live. Pick a quest and grow it.`,
        };
    }
    if (missionsTotal > 0) {
        return {
            title: "🌅 Today's quests are ready",
            body: `${missionsTotal} quests. Crush them, claim your reward, start a streak.`,
        };
    }
    return {
        title: '🌅 Good morning, hero',
        body: 'A new day, 3 fresh quests. Open the app and claim your XP.',
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

            const messageText = getReminderMessage(reminderType, data.stats);

            try {
                await messaging.send({
                    data: {
                        title: messageText.title,
                        body: messageText.body,
                        link: '/',
                    },
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
