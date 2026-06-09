import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminServices, admin } from '../lib/firebaseAdmin';
import { verifyAuth } from '../lib/auth';
import { calculateDamage, calculateNextBossHp, isValidPriority, sanitizeName } from '../lib/raidLogic';

const MAX_DAMAGE_PER_EVENT = 200;
const DEFAULT_BOSS_NAMES = [
    'Shadow Giant',
    'Crimson Dragon',
    'Frost Titan',
    'Dark Plague',
    'Burnt-Out Lich',
    'Flame Colossus',
    'Iron Moloch',
    'Hungry Kraken',
    'Thundering Sorcerer',
    'Eclipsed King',
];

type RaidData = {
    memberUids?: string[];
    members?: Record<string, { uid: string; displayName: string; photoURL: string | null; joinedAt: string; totalDamage: number }>;
    activeBoss?: {
        id: string;
        name: string;
        maxHp: number;
        currentHp: number;
        status: 'ALIVE' | 'DEFEATED';
        spawnedAt: string;
        defeatedAt: string | null;
        tier: number;
    } | null;
    bossesDefeated?: number;
    nextBossMaxHp?: number;
    status?: string;
    ownerUid?: string;
};

const pickBossName = (tier: number): string => {
    const idx = (tier - 1) % DEFAULT_BOSS_NAMES.length;
    return DEFAULT_BOSS_NAMES[idx];
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

    const raidId = Array.isArray(req.query.raidId) ? req.query.raidId[0] : req.query.raidId;
    if (typeof raidId !== 'string' || !raidId) {
        return res.status(400).json({ error: 'Missing raidId' });
    }

    const raidRef = db.collection('raids').doc(raidId);

    if (req.method === 'GET') {
        const snap = await raidRef.get();
        if (!snap.exists) return res.status(404).json({ error: 'Raid not found' });
        const data = snap.data() as RaidData;
        if (!data.memberUids?.includes(auth.user.uid)) {
            return res.status(403).json({ error: 'You are not a member of this raid' });
        }

        const eventsSnap = await raidRef
            .collection('damageEvents')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        return res.status(200).json({
            raid: { id: snap.id, ...data },
            events: eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        });
    }

    const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

    if (req.method === 'POST' && action === 'damage') {
        const body = (req.body ?? {}) as { priority?: unknown; isQuest?: unknown; taskTitle?: unknown };

        if (!isValidPriority(body.priority)) {
            return res.status(400).json({ error: 'Invalid priority' });
        }
        const priority = body.priority;
        const isQuest = body.isQuest === true;
        const taskTitle = sanitizeName(body.taskTitle, 'Task', 120);

        const damage = Math.min(calculateDamage(priority, isQuest), MAX_DAMAGE_PER_EVENT);
        const displayName = sanitizeName(auth.user.name ?? auth.user.email, 'Hero', 60);
        const now = new Date();
        const nowIso = now.toISOString();

        try {
            const result = await db.runTransaction(async (tx) => {
                const snap = await tx.get(raidRef);
                if (!snap.exists) throw new Error('NOT_FOUND');
                const data = snap.data() as RaidData;

                if (!data.memberUids?.includes(auth.user.uid)) {
                    throw new Error('FORBIDDEN');
                }
                if (data.status === 'ARCHIVED') {
                    throw new Error('ARCHIVED');
                }
                const boss = data.activeBoss;
                if (!boss || boss.status !== 'ALIVE') {
                    throw new Error('NO_ACTIVE_BOSS');
                }

                const applied = Math.min(damage, boss.currentHp);
                const newHp = Math.max(0, boss.currentHp - applied);
                const killed = newHp === 0;

                const eventRef = raidRef.collection('damageEvents').doc();
                tx.set(eventRef, {
                    raidId,
                    bossId: boss.id,
                    actorUid: auth.user.uid,
                    actorName: displayName,
                    amount: applied,
                    priority,
                    isQuest,
                    taskTitle,
                    createdAt: nowIso,
                });

                const existingDamage = data.members?.[auth.user.uid]?.totalDamage ?? 0;

                const update: Record<string, unknown> = {
                    [`members.${auth.user.uid}.totalDamage`]: existingDamage + applied,
                    [`members.${auth.user.uid}.displayName`]: displayName,
                    [`members.${auth.user.uid}.photoURL`]: auth.user.picture,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };

                if (killed) {
                    const defeated = (data.bossesDefeated ?? 0) + 1;
                    const nextTier = (boss.tier ?? 1) + 1;
                    const nextHp = data.nextBossMaxHp && data.nextBossMaxHp > 0
                        ? data.nextBossMaxHp
                        : calculateNextBossHp(defeated, boss.maxHp);

                    const newBoss = {
                        id: db.collection('_ids').doc().id,
                        name: pickBossName(nextTier),
                        maxHp: nextHp,
                        currentHp: nextHp,
                        status: 'ALIVE' as const,
                        spawnedAt: nowIso,
                        defeatedAt: null,
                        tier: nextTier,
                    };

                    update.activeBoss = newBoss;
                    update.bossesDefeated = defeated;
                    update.nextBossMaxHp = calculateNextBossHp(defeated + 1, boss.maxHp);

                    // Record the killed boss in a history collection
                    const historyRef = raidRef.collection('bossHistory').doc(boss.id);
                    tx.set(historyRef, {
                        ...boss,
                        currentHp: 0,
                        status: 'DEFEATED',
                        defeatedAt: nowIso,
                        killedByUid: auth.user.uid,
                        killedByName: displayName,
                    });
                } else {
                    update[`activeBoss.currentHp`] = newHp;
                }

                tx.update(raidRef, update);

                return { applied, killed, newHp };
            });

            const updated = await raidRef.get();
            return res.status(200).json({
                damage: result.applied,
                killed: result.killed,
                bossHp: result.newHp,
                raid: { id: updated.id, ...updated.data() },
            });
        } catch (err) {
            const code = err instanceof Error ? err.message : 'UNKNOWN';
            if (code === 'NOT_FOUND') return res.status(404).json({ error: 'Raid not found' });
            if (code === 'FORBIDDEN') return res.status(403).json({ error: 'You are not a member of this raid' });
            if (code === 'ARCHIVED') return res.status(410).json({ error: 'Raid is archived' });
            if (code === 'NO_ACTIVE_BOSS') return res.status(409).json({ error: 'No active boss' });
            return res.status(500).json({ error: 'Damage failed' });
        }
    }

    if (req.method === 'DELETE') {
        const snap = await raidRef.get();
        if (!snap.exists) return res.status(404).json({ error: 'Raid not found' });
        const data = snap.data() as RaidData;
        if (data.ownerUid !== auth.user.uid) {
            return res.status(403).json({ error: 'Only the creator can delete this raid' });
        }
        // Hard delete: remove the raid document along with its subcollections
        // (damageEvents, bossHistory). A previous version only flipped the
        // status to ARCHIVED, which left the boss showing in the list — so the
        // delete looked like it did nothing. recursiveDelete frees the owner's
        // raid quota too.
        await db.recursiveDelete(raidRef);
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('[api/raids/[raidId]] unhandled error', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(500).json({ error: message });
  }
}
