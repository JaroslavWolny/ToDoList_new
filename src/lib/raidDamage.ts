import { useAuthStore } from '../stores/authStore';
import { dealDamage, listRaids } from './raidApi';
import type { Raid } from '../types/raids';
import type { Priority } from '../types';

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
                })
                .catch(() => {
                    // best-effort; do not throw to avoid breaking task completion
                })
        )
    );
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
