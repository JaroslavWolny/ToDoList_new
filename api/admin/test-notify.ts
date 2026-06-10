import { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminServices } from '../_lib/firebaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const authHeader = req.headers.authorization;
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { db, messaging, envError } = getFirebaseAdminServices();
    if (!db || !messaging) {
        return res.status(500).json({ error: envError ?? 'Firebase Admin not configured' });
    }

    const snap = await db.collection('notification_tokens').get();
    const results: Array<{ deviceId: string; ok: boolean; error?: string }> = [];

    for (const doc of snap.docs) {
        const data = doc.data() as { token?: string };
        if (typeof data.token !== 'string') {
            results.push({ deviceId: doc.id, ok: false, error: 'no token' });
            continue;
        }
        try {
            await messaging.send({
                notification: {
                    title: '🧪 QuestDo Test',
                    body: 'Push notifications are live! Carry on, hero.',
                },
                token: data.token,
                webpush: { fcmOptions: { link: '/' } },
            });
            results.push({ deviceId: doc.id, ok: true });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            results.push({ deviceId: doc.id, ok: false, error: message });
        }
    }

    return res.status(200).json({
        total: snap.size,
        sent: results.filter((r) => r.ok).length,
        results,
    });
}
