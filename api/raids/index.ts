import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminServices, admin } from '../_lib/firebaseAdmin';
import { verifyAuth } from '../_lib/auth';
import { calculateNextBossHp, generateInviteCode, sanitizeName } from '../_lib/raidLogic';

type Boss = {
    id: string;
    name: string;
    maxHp: number;
    currentHp: number;
    status: 'ALIVE' | 'DEFEATED';
    spawnedAt: string;
    defeatedAt: string | null;
    tier: number;
};

const MAX_RAIDS_PER_USER = 25;
const DEFAULT_BOSS_HP = 50;
const MAX_BOSS_HP = 100_000;

const clampHp = (n: number): number => {
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_BOSS_HP;
    return Math.min(Math.max(Math.floor(n), 5), MAX_BOSS_HP);
};

const generateUniqueInviteCode = async (db: FirebaseFirestore.Firestore): Promise<string> => {
    for (let attempt = 0; attempt < 8; attempt++) {
        const code = generateInviteCode(6);
        const existing = await db.collection('raids').where('inviteCode', '==', code).limit(1).get();
        if (existing.empty) return code;
    }
    return generateInviteCode(8);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.ok) {
        return res.status(auth.status).json({ error: auth.error });
    }

    const { db, envError } = getFirebaseAdminServices();
    if (!db) {
        return res.status(500).json({ error: envError ?? 'Firebase Admin is not configured' });
    }

    if (req.method === 'GET') {
        // NOTE: no orderBy here on purpose. Combining `array-contains` with
        // `orderBy` on a different field requires a composite Firestore index.
        // We sort in memory instead (a user has at most MAX_RAIDS_PER_USER raids).
        const snapshot = await db
            .collection('raids')
            .where('memberUids', 'array-contains', auth.user.uid)
            .limit(50)
            .get();

        const raids = snapshot.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() as { createdAt?: string; status?: string }) }))
            // Hide archived raids so a deleted raid actually disappears from the
            // list. (Filtering in memory avoids a composite index on
            // memberUids + status.)
            .filter((r) => r.status !== 'ARCHIVED')
            .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        return res.status(200).json({ raids });
    }

    if (req.method === 'POST') {
        const body = (req.body ?? {}) as { name?: unknown; description?: unknown; bossName?: unknown; bossHp?: unknown };

        const raidName = sanitizeName(body.name, 'Boss Raid', 60);
        const description = sanitizeName(body.description, '', 240);
        const bossName = sanitizeName(body.bossName, 'Shadow Giant', 60);
        const bossHp = clampHp(typeof body.bossHp === 'number' ? body.bossHp : DEFAULT_BOSS_HP);

        const ownerCountSnap = await db
            .collection('raids')
            .where('ownerUid', '==', auth.user.uid)
            .count()
            .get();
        if (ownerCountSnap.data().count >= MAX_RAIDS_PER_USER) {
            return res.status(429).json({ error: `Max ${MAX_RAIDS_PER_USER} raids per user` });
        }

        const inviteCode = await generateUniqueInviteCode(db);
        const now = new Date().toISOString();
        const memberDisplayName = auth.user.name ?? auth.user.email ?? 'Hero';

        const boss: Boss = {
            id: db.collection('_ids').doc().id,
            name: bossName,
            maxHp: bossHp,
            currentHp: bossHp,
            status: 'ALIVE',
            spawnedAt: now,
            defeatedAt: null,
            tier: 1,
        };

        const raidRef = db.collection('raids').doc();
        const raidDoc = {
            name: raidName,
            description,
            ownerUid: auth.user.uid,
            inviteCode,
            status: 'ACTIVE',
            createdAt: now,
            memberUids: [auth.user.uid],
            members: {
                [auth.user.uid]: {
                    uid: auth.user.uid,
                    displayName: memberDisplayName,
                    photoURL: auth.user.picture,
                    joinedAt: now,
                    totalDamage: 0,
                },
            },
            activeBoss: boss,
            bossesDefeated: 0,
            nextBossMaxHp: calculateNextBossHp(1, bossHp),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await raidRef.set(raidDoc);
        return res.status(201).json({ raid: { id: raidRef.id, ...raidDoc, updatedAt: now } });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('[api/raids] unhandled error', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(500).json({ error: message });
  }
}
