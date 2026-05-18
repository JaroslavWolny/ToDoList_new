import { authFetch } from '../stores/authStore';
import type { DamageEvent, Raid } from '../types/raids';
import type { Priority } from '../types';

const handle = async <T>(res: Response): Promise<T> => {
    if (res.ok) return (await res.json()) as T;
    let message = `Request failed (${res.status})`;
    try {
        const data = await res.json() as { error?: string };
        if (typeof data.error === 'string') message = data.error;
    } catch { /* noop */ }
    throw new Error(message);
};

export const listRaids = async (): Promise<Raid[]> => {
    const res = await authFetch('/api/raids');
    const data = await handle<{ raids: Raid[] }>(res);
    return data.raids;
};

export const createRaid = async (input: {
    name: string;
    description?: string;
    bossName?: string;
    bossHp?: number;
}): Promise<Raid> => {
    const res = await authFetch('/api/raids', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    const data = await handle<{ raid: Raid }>(res);
    return data.raid;
};

export const joinRaid = async (inviteCode: string): Promise<Raid> => {
    const res = await authFetch('/api/raids/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
    });
    const data = await handle<{ raid: Raid }>(res);
    return data.raid;
};

export const getRaid = async (raidId: string): Promise<{ raid: Raid; events: DamageEvent[] }> => {
    const res = await authFetch(`/api/raids/${encodeURIComponent(raidId)}`);
    return await handle<{ raid: Raid; events: DamageEvent[] }>(res);
};

export const dealDamage = async (raidId: string, payload: {
    priority: Priority;
    isQuest: boolean;
    taskTitle: string;
}): Promise<{ damage: number; killed: boolean; bossHp: number; raid: Raid }> => {
    const res = await authFetch(`/api/raids/${encodeURIComponent(raidId)}?action=damage`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return await handle<{ damage: number; killed: boolean; bossHp: number; raid: Raid }>(res);
};

export const archiveRaid = async (raidId: string): Promise<void> => {
    const res = await authFetch(`/api/raids/${encodeURIComponent(raidId)}`, {
        method: 'DELETE',
    });
    await handle<{ success: boolean }>(res);
};
