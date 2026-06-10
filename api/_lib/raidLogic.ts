export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

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

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateInviteCode = (length = 6): string => {
    let code = '';
    for (let i = 0; i < length; i++) {
        code += INVITE_ALPHABET.charAt(Math.floor(Math.random() * INVITE_ALPHABET.length));
    }
    return code;
};

export const sanitizeName = (value: unknown, fallback: string, maxLen = 64): string => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim().slice(0, maxLen);
    return trimmed.length > 0 ? trimmed : fallback;
};

export const calculateNextBossHp = (defeatedCount: number, base = 50): number => {
    return Math.floor(base * Math.pow(1.6, defeatedCount));
};

export const isValidPriority = (value: unknown): value is Priority =>
    value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'CRITICAL';
