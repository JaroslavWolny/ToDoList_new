import { DailyTheme, DailyThemeId } from '../types';

export const DAILY_THEMES: Record<DailyThemeId, DailyTheme> = {
    DOUBLE_HIGH: {
        id: 'DOUBLE_HIGH',
        title: 'Heroic Focus',
        description: '2× XP from HIGH-priority quests today.',
        emoji: '⚔️',
        accent: 'from-orange-400 via-rose-500 to-pink-600',
    },
    DOUBLE_CHEST: {
        id: 'DOUBLE_CHEST',
        title: 'Treasure Hunter',
        description: 'Loot drops happen twice as often today.',
        emoji: '💎',
        accent: 'from-amber-300 via-yellow-500 to-orange-500',
    },
    STREAK_SHIELD: {
        id: 'STREAK_SHIELD',
        title: 'Iron Discipline',
        description: 'Streak shield active — one slip won\'t break you.',
        emoji: '🛡️',
        accent: 'from-cyan-300 via-sky-500 to-blue-600',
    },
    COMBO_BOOST: {
        id: 'COMBO_BOOST',
        title: 'Lightning Rush',
        description: 'Combo multipliers grow faster today.',
        emoji: '⚡',
        accent: 'from-yellow-300 via-amber-500 to-orange-500',
    },
    COIN_RAIN: {
        id: 'COIN_RAIN',
        title: 'Coin Rain',
        description: '+50% coins from every completion.',
        emoji: '🪙',
        accent: 'from-yellow-200 via-amber-400 to-yellow-600',
    },
    CRITICAL_FOCUS: {
        id: 'CRITICAL_FOCUS',
        title: 'Critical Hour',
        description: '3× XP from CRITICAL quests today.',
        emoji: '🎯',
        accent: 'from-red-400 via-rose-500 to-fuchsia-600',
    },
    EARLY_RISER: {
        id: 'EARLY_RISER',
        title: 'Dawnbreaker',
        description: 'Finish 3 quests before noon → bonus chest.',
        emoji: '🌅',
        accent: 'from-orange-300 via-pink-400 to-purple-500',
    },
};

export function pickRandomTheme(): DailyThemeId {
    const ids = Object.keys(DAILY_THEMES) as DailyThemeId[];
    return ids[Math.floor(Math.random() * ids.length)];
}

export function getTheme(id: DailyThemeId | null | undefined): DailyTheme | null {
    if (!id) return null;
    return DAILY_THEMES[id] ?? null;
}
