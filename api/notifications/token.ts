import { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminServices, admin } from '../lib/firebaseAdmin';
import {
    getNextReminderSchedule,
    isValidReminderSlot,
    isValidTimeZone,
} from '../lib/reminders';

type NotificationTokenPayload = {
    deviceId?: unknown;
    token?: unknown;
    morningTime?: unknown;
    eveningTime?: unknown;
    timezone?: unknown;
};

const getString = (value: unknown): string | null => (
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

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

        await db.collection('notification_tokens').doc(deviceId).set({
            token,
            morningTime,
            eveningTime,
            timezone,
            nextReminderType: schedule.reminderType,
            nextSendAtUtc: admin.firestore.Timestamp.fromDate(schedule.sendAtUtc),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return res.status(200).json({
            success: true,
            nextReminderType: schedule.reminderType,
            nextSendAtUtc: schedule.sendAtUtc.toISOString(),
        });
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
