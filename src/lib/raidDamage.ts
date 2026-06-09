import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { dealDamage, listRaids } from './raidApi';
import type { Raid } from '../types/raids';
import type { Priority } from '../types';

// ── Boss loot ──────────────────────────────────────────────────────────────
// Defeating a boss now drops loot. Only the hero who lands the killing blow
// (i.e. the task completion that takes the boss to 0 HP) claims it — a "Last
// Hit" bonus that makes finishing a boss a genuine prize and ties raids into
// the avatar-shop economy. Loot scales with the slain boss's tier, so the
// reward grows alongside the difficulty.
export type RaidLoot = {
    coins: number;
    xp: number;
    bossName: string;
    tier: number;
    kills: number;
};

const LAST_HIT_BONUS = 1.5;

export const computeLoot = (slainTier: number): { coins: number; xp: number } => {
    const tier = Math.max(1, slainTier);
    return {
        coins: Math.round((10 + tier * 5) * LAST_HIT_BONUS),
        xp: 15 + tier * 10,
    };
};

const lootListeners = new Set<(loot: RaidLoot) => void>();

/** Subscribe to boss-defeat loot drops. Returns an unsubscribe fn. */
export const onRaidLoot = (listener: (loot: RaidLoot) => void): (() => void) => {
    lootListeners.add(listener);
    return () => { lootListeners.delete(listener); };
};

const emitLoot = (loot: RaidLoot): void => {
    lootListeners.forEach((fn) => {
        try { fn(loot); } catch { /* a bad listener must not break others */ }
    });
};

type CachedRaids = { fetchedAt: number; raids: Raid[]; uid: string | null };

const CACHE_TTL_MS = 30_000;
let cache: CachedRaids | null = null;
let inflight: Promise<Raid[]> | null = null;

const QUEST_TAGS = ['quest', 'questy', 'epic', 'main'];

const isQuestTask = (tags: string[] | undefined): boolean => {
    if (!Array.isArray(tags)) return false;
    return tags.some((t) => QUEST_TAGS.includes(t.toLowerCase()));
};

const getActiveRaidsForUser = async (): Promise<Raid[]> => {
    const uid = useAuthStore.getState().user?.uid ?? null;
    if (!uid) return [];

    const now = Date.now();
    if (cache && cache.uid === uid && now - cache.fetchedAt < CACHE_TTL_MS) {
        return cache.raids;
    }

    if (inflight) return inflight;
    inflight = listRaids()
        .then((raids) => {
            const active = raids.filter((r) => r.status === 'ACTIVE' && r.activeBoss);
            cache = { fetchedAt: Date.now(), raids: active, uid };
            return active;
        })
        .catch(() => [])
        .finally(() => { inflight = null; });

    return inflight;
};

export const invalidateRaidCache = (): void => {
    cache = null;
};

export type DamageDispatchInput = {
    taskTitle: string;
    priority: Priority;
    tags?: string[];
};

export const dispatchRaidDamage = async (input: DamageDispatchInput): Promise<void> => {
    const status = useAuthStore.getState().status;
    if (status !== 'signed-in') return;

    const raids = await getActiveRaidsForUser();
    if (raids.length === 0) return;

    const isQuest = isQuestTask(input.tags);
    const title = input.taskTitle.trim() || 'Task';

    const kills: { name: string; tier: number }[] = [];

    await Promise.all(
        raids.map((raid) =>
            dealDamage(raid.id, {
                priority: input.priority,
                isQuest,
                taskTitle: title,
            })
                .then((res) => {
                    if (cache && cache.uid === useAuthStore.getState().user?.uid) {
                        cache = {
                            ...cache,
                            raids: cache.raids.map((r) => r.id === raid.id ? res.raid : r),
                            fetchedAt: Date.now(),
                        };
                    }
                    // `raid` here is the pre-hit snapshot, so its activeBoss is the
                    // boss we just slew (the response carries the *next* boss).
                    if (res.killed) {
                        kills.push({
                            name: raid.activeBoss?.name ?? 'Boss',
                            tier: raid.activeBoss?.tier ?? 1,
                        });
                    }
                })
                .catch(() => {
                    // best-effort; do not throw to avoid breaking task completion
                })
        )
    );

    if (kills.length > 0) {
        let coins = 0;
        let xp = 0;
        let top = kills[0];
        for (const k of kills) {
            const loot = computeLoot(k.tier);
            coins += loot.coins;
            xp += loot.xp;
            if (k.tier >= top.tier) top = k;
        }
        // Award immediately (works regardless of which screen is mounted), then
        // emit so a celebratory loot-drop modal can play.
        const user = useUserStore.getState();
        user.addCoins(coins);
        user.addXP(xp);
        emitLoot({ coins, xp, bossName: top.name, tier: top.tier, kills: kills.length });
    }
};

// Reset cache on sign-in/out so we don't show stale state
let lastUid: string | null = null;
useAuthStore.subscribe((state) => {
    const uid = state.user?.uid ?? null;
    if (uid !== lastUid) {
        invalidateRaidCache();
        lastUid = uid;
    }
});
