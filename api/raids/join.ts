import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminServices, admin } from '../lib/firebaseAdmin';
import { verifyAuth } from '../lib/auth';
import { sanitizeName } from '../lib/raidLogic';

const MAX_MEMBERS = 25;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const auth = await verifyAuth(req);
    if (!auth.ok) {
        return res.status(auth.status).json({ error: auth.error });
    }

    const { db, envError } = getFirebaseAdminServices();
    if (!db) {
        return res.status(500).json({ error: envError ?? 'Firebase Admin is not configured' });
    }

    const body = (req.body ?? {}) as { inviteCode?: unknown };
    const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode.trim().toUpperCase() : '';
    if (!inviteCode || inviteCode.length < 4 || inviteCode.length > 12) {
        return res.status(400).json({ error: 'Neplatný kód pozvánky' });
    }

    const snapshot = await db
        .collection('raids')
        .where('inviteCode', '==', inviteCode)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return res.status(404).json({ error: 'Pozvánka neexistuje' });
    }

    const raidDoc = snapshot.docs[0];
    const data = raidDoc.data() as { memberUids?: string[]; status?: string };

    if (data.status === 'ARCHIVED') {
        return res.status(410).json({ error: 'Raid je archivován' });
    }

    if (Array.isArray(data.memberUids) && data.memberUids.includes(auth.user.uid)) {
        return res.status(200).json({ raid: { id: raidDoc.id, ...data }, alreadyMember: true });
    }

    if (Array.isArray(data.memberUids) && data.memberUids.length >= MAX_MEMBERS) {
        return res.status(429).json({ error: `Maximum ${MAX_MEMBERS} členů` });
    }

    const now = new Date().toISOString();
    const displayName = sanitizeName(auth.user.name ?? auth.user.email, 'Hero', 60);

    await raidDoc.ref.update({
        memberUids: admin.firestore.FieldValue.arrayUnion(auth.user.uid),
        [`members.${auth.user.uid}`]: {
            uid: auth.user.uid,
            displayName,
            photoURL: auth.user.picture,
            joinedAt: now,
            totalDamage: 0,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await raidDoc.ref.get();
    return res.status(200).json({ raid: { id: updated.id, ...updated.data() } });
}
