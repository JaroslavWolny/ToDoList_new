import { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminServices, admin } from '../_lib/firebaseAdmin';

type TaskReminderInput = {
    taskId?: unknown;
    title?: unknown;
    deadline?: unknown;
};

type TaskRemindersPayload = {
    deviceId?: unknown;
    reminders?: unknown;
};

const MAX_REMINDERS = 100;
const HORIZON_MS = 30 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const getString = (value: unknown): string | null => (
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

// Cron fires hourly on the hour, so align each reminder to the top of the hour
// at or before the deadline — that gives the user up to ~1h of lead time.
const floorToHourUtc = (date: Date): Date => new Date(Math.floor(date.getTime() / HOUR_MS) * HOUR_MS);

const getDeviceIdFromRequest = (req: VercelRequest): string | null => {
    const body = (req.body ?? {}) as TaskRemindersPayload;
    const queryValue = Array.isArray(req.query.deviceId) ? req.query.deviceId[0] : req.query.deviceId;
    return getString(body.deviceId) ?? getString(queryValue);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { db, envError } = getFirebaseAdminServices();

    if (!db) {
        return res.status(500).json({ error: envError ?? 'Firebase Admin is not configured' });
    }

    const collection = db.collection('task_reminders');

    if (req.method === 'POST') {
        const body = (req.body ?? {}) as TaskRemindersPayload;
        const deviceId = getString(body.deviceId);
        if (!deviceId) {
            return res.status(400).json({ error: 'Missing deviceId' });
        }

        if (!Array.isArray(body.reminders)) {
            return res.status(400).json({ error: 'Missing reminders array' });
        }

        // We push using the FCM token registered for this device. No token means
        // the device never opted in to notifications, so there is nothing to do.
        const tokenDoc = await db.collection('notification_tokens').doc(deviceId).get();
        const token = getString(tokenDoc.exists ? (tokenDoc.data()?.token as unknown) : null);

        // Always clear previously-synced reminders for this device so completed,
        // deleted, or rescheduled tasks never fire a stale push.
        const existing = await collection.where('deviceId', '==', deviceId).get();
        const batch = db.batch();
        existing.docs.forEach((doc) => batch.delete(doc.ref));

        let written = 0;

        if (token) {
            const now = Date.now();
            const seen = new Set<string>();

            for (const raw of body.reminders as TaskReminderInput[]) {
                if (written >= MAX_REMINDERS) break;

                const taskId = getString(raw?.taskId);
                const title = getString(raw?.title);
                const deadlineRaw = getString(raw?.deadline);
                if (!taskId || !title || !deadlineRaw || seen.has(taskId)) continue;

                const deadlineMs = Date.parse(deadlineRaw);
                if (!Number.isFinite(deadlineMs)) continue;
                // Only schedule future deadlines inside a sane horizon.
                if (deadlineMs <= now || deadlineMs > now + HORIZON_MS) continue;

                seen.add(taskId);
                const deadline = new Date(deadlineMs);
                const sendAt = floorToHourUtc(deadline);

                batch.set(collection.doc(`${deviceId}__${taskId}`), {
                    deviceId,
                    token,
                    taskId,
                    title: title.slice(0, 120),
                    sendAtUtc: admin.firestore.Timestamp.fromDate(sendAt),
                    deadlineUtc: admin.firestore.Timestamp.fromDate(deadline),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                written += 1;
            }
        }

        await batch.commit();

        return res.status(200).json({ success: true, scheduled: written, hasToken: Boolean(token) });
    }

    if (req.method === 'DELETE') {
        const deviceId = getDeviceIdFromRequest(req);
        if (!deviceId) {
            return res.status(400).json({ error: 'Missing deviceId' });
        }

        const existing = await collection.where('deviceId', '==', deviceId).get();
        const batch = db.batch();
        existing.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}
