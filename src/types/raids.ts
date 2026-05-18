import type { Priority } from './index';

export type RaidStatus = 'ACTIVE' | 'ARCHIVED';
export type BossStatus = 'ALIVE' | 'DEFEATED';

export type RaidMember = {
    uid: string;
    displayName: string;
    photoURL: string | null;
    joinedAt: string;
    totalDamage: number;
};

export type Boss = {
    id: string;
    name: string;
    maxHp: number;
    currentHp: number;
    status: BossStatus;
    spawnedAt: string;
    defeatedAt: string | null;
    tier: number;
};

export type DamageEvent = {
    id: string;
    raidId: string;
    bossId: string;
    actorUid: string;
    actorName: string;
    amount: number;
    priority: Priority;
    isQuest: boolean;
    taskTitle: string;
    createdAt: string;
};

export type Raid = {
    id: string;
    name: string;
    description: string;
    ownerUid: string;
    inviteCode: string;
    status: RaidStatus;
    createdAt: string;
    memberUids: string[];
    members: Record<string, RaidMember>;
    activeBoss: Boss | null;
    bossesDefeated: number;
    nextBossMaxHp: number;
};

export const DAMAGE_BY_PRIORITY: Record<Priority, number> = {
    LOW: 1,
    MEDIUM: 3,
    HIGH: 5,
    CRITICAL: 8,
};

export const QUEST_DAMAGE_MULTIPLIER = 2;

export const calculateDamage = (priority: Priority, isQuest: boolean): number => {
    const base = DAMAGE_BY_PRIORITY[priority] ?? 1;
    return isQuest ? base * QUEST_DAMAGE_MULTIPLIER : base;
};
