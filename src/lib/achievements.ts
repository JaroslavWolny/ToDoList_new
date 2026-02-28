import { UserState, Completion } from '../types';
import { calculateComboMultiplier } from './gamification';
import { toLocalDateKey } from './dates';

export interface AchievementDef {
    key: string;
    title: string;
    description: string;
    icon: string;
    category: 'streak' | 'tasks' | 'xp' | 'special';
    check: (user: UserState, completions: Completion[]) => boolean;
    getProgress?: (user: UserState, completions: Completion[]) => { current: number; max: number };
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
    // Streak achievements
    {
        key: 'streak_starter',
        title: 'Streak Starter',
        description: 'Maintain a 7-day streak',
        icon: '🔥',
        category: 'streak',
        check: (u) => u.streakCurrent >= 7 || u.streakLongest >= 7,
        getProgress: (u) => ({ current: Math.max(u.streakCurrent, u.streakLongest), max: 7 }),
    },
    {
        key: 'streak_warrior',
        title: 'Streak Warrior',
        description: 'Maintain a 14-day streak',
        icon: '⚔️',
        category: 'streak',
        check: (u) => u.streakCurrent >= 14 || u.streakLongest >= 14,
        getProgress: (u) => ({ current: Math.max(u.streakCurrent, u.streakLongest), max: 14 }),
    },
    {
        key: 'streak_master',
        title: 'Streak Master',
        description: 'Maintain a 30-day streak',
        icon: '👑',
        category: 'streak',
        check: (u) => u.streakCurrent >= 30 || u.streakLongest >= 30,
        getProgress: (u) => ({ current: Math.max(u.streakCurrent, u.streakLongest), max: 30 }),
    },
    {
        key: 'streak_legend',
        title: 'Streak Legend',
        description: 'Maintain a 60-day streak',
        icon: '🏆',
        category: 'streak',
        check: (u) => u.streakCurrent >= 60 || u.streakLongest >= 60,
        getProgress: (u) => ({ current: Math.max(u.streakCurrent, u.streakLongest), max: 60 }),
    },
    {
        key: 'streak_god',
        title: 'Streak God',
        description: 'Maintain a 100-day streak',
        icon: '⚡',
        category: 'streak',
        check: (u) => u.streakCurrent >= 100 || u.streakLongest >= 100,
        getProgress: (u) => ({ current: Math.max(u.streakCurrent, u.streakLongest), max: 100 }),
    },
    {
        key: 'marathon_runner',
        title: 'Marathon Runner',
        description: 'Maintain a 365-day streak',
        icon: '🏅',
        category: 'streak',
        check: (u) => u.streakCurrent >= 365 || u.streakLongest >= 365,
        getProgress: (u) => ({ current: Math.max(u.streakCurrent, u.streakLongest), max: 365 }),
    },

    // Task achievements
    {
        key: 'first_step',
        title: 'First Step',
        description: 'Complete your first task',
        icon: '👣',
        category: 'tasks',
        check: (u) => u.totalTasksCompleted >= 1,
        getProgress: (u) => ({ current: u.totalTasksCompleted, max: 1 }),
    },
    {
        key: 'getting_started',
        title: 'Getting Started',
        description: 'Complete 10 tasks',
        icon: '🚀',
        category: 'tasks',
        check: (u) => u.totalTasksCompleted >= 10,
        getProgress: (u) => ({ current: u.totalTasksCompleted, max: 10 }),
    },
    {
        key: 'centurion',
        title: 'Centurion',
        description: 'Complete 100 tasks',
        icon: '💯',
        category: 'tasks',
        check: (u) => u.totalTasksCompleted >= 100,
        getProgress: (u) => ({ current: u.totalTasksCompleted, max: 100 }),
    },
    {
        key: 'taskmaster',
        title: 'Taskmaster',
        description: 'Complete 500 tasks',
        icon: '🎯',
        category: 'tasks',
        check: (u) => u.totalTasksCompleted >= 500,
        getProgress: (u) => ({ current: u.totalTasksCompleted, max: 500 }),
    },
    {
        key: 'critical_thinker',
        title: 'Critical Thinker',
        description: 'Complete 10 critical priority tasks',
        icon: '🧠',
        category: 'tasks',
        check: (_u, completions) => {
            return completions.filter(c => c.xpEarned >= 100).length >= 10;
        },
        getProgress: (_u, completions) => ({ current: completions.filter(c => c.xpEarned >= 100).length, max: 10 }),
    },

    // XP achievements
    {
        key: 'xp_collector',
        title: 'XP Collector',
        description: 'Earn 1,000 total XP',
        icon: '💎',
        category: 'xp',
        check: (u) => u.totalXPEarned >= 1000,
        getProgress: (u) => ({ current: u.totalXPEarned, max: 1000 }),
    },
    {
        key: 'xp_hoarder',
        title: 'XP Hoarder',
        description: 'Earn 10,000 total XP',
        icon: '💰',
        category: 'xp',
        check: (u) => u.totalXPEarned >= 10000,
        getProgress: (u) => ({ current: u.totalXPEarned, max: 10000 }),
    },
    {
        key: 'level_5',
        title: 'Rising Star',
        description: 'Reach level 5',
        icon: '⭐',
        category: 'xp',
        check: (u) => u.level >= 5,
        getProgress: (u) => ({ current: u.level, max: 5 }),
    },
    {
        key: 'level_10',
        title: 'Double Digits',
        description: 'Reach level 10',
        icon: '🌟',
        category: 'xp',
        check: (u) => u.level >= 10,
        getProgress: (u) => ({ current: u.level, max: 10 }),
    },

    // Special achievements
    {
        key: 'combo_king',
        title: 'Combo King',
        description: 'Reach ×1.5 combo multiplier in a day',
        icon: '👊',
        category: 'special',
        check: (_u, completions) => {
            const byDate = new Map<string, number>();
            completions.forEach(c => {
                const date = toLocalDateKey(c.completedAt);
                byDate.set(date, (byDate.get(date) || 0) + 1);
            });
            const maxPerDay = Math.max(0, ...Array.from(byDate.values()));
            return completions.some(c => c.comboMultiplier >= 1.5) || maxPerDay >= 8;
        },
        getProgress: (_u, completions) => {
            const byDate = new Map<string, number>();
            completions.forEach(c => {
                const date = toLocalDateKey(c.completedAt);
                byDate.set(date, (byDate.get(date) || 0) + 1);
            });
            const maxPerDay = Math.max(0, ...Array.from(byDate.values()));
            const maxMultiplier = completions.reduce((max, c) => Math.max(max, c.comboMultiplier), 1);
            const calculatedMax = calculateComboMultiplier(maxPerDay);
            return { current: Math.max(maxMultiplier, calculatedMax), max: 1.5 };
        },
    },
    {
        key: 'comeback_kid',
        title: 'Comeback Kid',
        description: 'Rebuild a streak after breaking one',
        icon: '💪',
        category: 'special',
        check: (u) => u.streakCurrent >= 3 && u.streakLongest > u.streakCurrent,
        getProgress: (u) => ({ current: (u.streakLongest > u.streakCurrent && u.streakCurrent > 0) ? u.streakCurrent : 0, max: 3 }),
    },
    {
        key: 'health_nut',
        title: 'Health Nut',
        description: 'Maintain full health for 7 consecutive days',
        icon: '❤️',
        category: 'special',
        check: (u) => u.health === u.maxHealth && u.streakCurrent >= 7,
        getProgress: (u) => ({ current: u.health === u.maxHealth ? u.streakCurrent : 0, max: 7 }),
    },
];

export function checkAchievements(
    user: UserState,
    completions: Completion[],
    unlockedKeys: Set<string>
): AchievementDef[] {
    return ACHIEVEMENT_DEFS.filter(
        (def) => !unlockedKeys.has(def.key) && def.check(user, completions)
    );
}
