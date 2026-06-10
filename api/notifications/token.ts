import { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminServices, admin } from '../_lib/firebaseAdmin';
import {
    getNextReminderSchedule,
    isValidReminderSlot,
    isValidTimeZone,
} from '../_lib/reminders';

type NotificationTokenPayload = {
    deviceId?: unknown;
    token?: unknown;
    morningTime?: unknown;
    eveningTime?: unknown;
    timezone?: unknown;
    stats?: unknown;
};

export type ReminderStats = {
    tasksDueSoon: number;
    dailyGoalProgress: number;
    dailyGoalTarget: number;
    streakCurrent: number;
    missionsCompleted: number;
    missionsTotal: number;
};

const getString = (value: unknown): string | null => (
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

const getNumber = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return Math.floor(value);
    }
    return 0;
};

const sanitizeStats = (value: unknown): ReminderStats | null => {
    if (typeof value !== 'object' || value === null) return null;
    const v = value as Record<string, unknown>;
    return {
        tasksDueSoon: getNumber(v.tasksDueSoon),
        dailyGoalProgress: getNumber(v.dailyGoalProgress),
        dailyGoalTarget: getNumber(v.dailyGoalTarget),
        streakCurrent: getNumber(v.streakCurrent),
        missionsCompleted: getNumber(v.missionsCompleted),
        missionsTotal: getNumber(v.missionsTotal),
    };
};

const getDeviceIdFromRequest = (req: VercelRequest): string | null => {
    const body = (req.body ?? {}) as NotificationTokenPayload;
    const queryValue = Array.isArray(req.query.deviceId) ? req.query.deviceId[0] : req.query.deviceId;
    return getString(body.deviceId) ?? getString(queryValue);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { db, envError } = getFirebaseAdminServices();

    if (!db) {
        return res.status(500).json({ error: envError ?? 'Firebase Admin is not configured' });
    }

    if (req.method === 'POST') {
        const body = (req.body ?? {}) as NotificationTokenPayload;

        const deviceId = getString(body.deviceId);
        const token = getString(body.token);
        const morningTime = getString(body.morningTime);
        const eveningTime = getString(body.eveningTime);
        const timezone = getString(body.timezone);

        if (!deviceId || !token || !morningTime || !eveningTime || !timezone) {
            return res.status(400).json({ error: 'Missing notification token payload fields' });
        }

        if (!isValidReminderSlot(morningTime) || !isValidReminderSlot(eveningTime)) {
            return res.status(400).json({ error: 'Reminder slots must use HH:00 format' });
        }

        if (!isValidTimeZone(timezone)) {
            return res.status(400).json({ error: 'Invalid timezone' });
        }

        const schedule = getNextReminderSchedule({
            morningTime,
            eveningTime,
            timezone,
        });

        if (!schedule) {
            return res.status(400).json({ error: 'Unable to calculate next reminder schedule' });
        }

        const stats = sanitizeStats(body.stats);

        await db.collection('notification_tokens').doc(deviceId).set({
            token,
            morningTime,
            eveningTime,
            timezone,
            nextReminderType: schedule.reminderType,
            nextSendAtUtc: admin.firestore.Timestamp.fromDate(schedule.sendAtUtc),
            ...(stats ? { stats } : {}),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return res.status(200).json({
            success: true,
            nextReminderType: schedule.reminderType,
            nextSendAtUtc: schedule.sendAtUtc.toISOString(),
        });
    }

    if (req.method === 'PATCH') {
        const body = (req.body ?? {}) as NotificationTokenPayload;
        const deviceId = getString(body.deviceId);
        if (!deviceId) {
            return res.status(400).json({ error: 'Missing deviceId' });
        }

        const stats = sanitizeStats(body.stats);
        if (!stats) {
            return res.status(400).json({ error: 'Missing or invalid stats payload' });
        }

        await db.collection('notification_tokens').doc(deviceId).set({
            stats,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
        const deviceId = getDeviceIdFromRequest(req);
        if (!deviceId) {
            return res.status(400).json({ error: 'Missing deviceId' });
        }

        await db.collection('notification_tokens').doc(deviceId).delete();
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}
