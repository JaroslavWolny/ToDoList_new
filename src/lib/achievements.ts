import { UserState, Completion, Task } from '../types';
import { calculateComboMultiplier } from './gamification';
import { toLocalDateKey } from './dates';

export interface AchievementDef {
    key: string;
    title: string;
    description: string;
    icon: string;
    category: 'streak' | 'tasks' | 'xp' | 'special';
    check: (user: UserState, completions: Completion[], tasks?: Task[]) => boolean;
    getProgress?: (user: UserState, completions: Completion[], tasks?: Task[]) => { current: number; max: number };
}

function getCompletionCountByDate(completions: Completion[]) {
    const byDate = new Map<string, number>();
    completions.forEach((completion) => {
        const date = toLocalDateKey(completion.completedAt);
        byDate.set(date, (byDate.get(date) || 0) + 1);
    });
    return byDate;
}

function getMaxCompletionsInSingleDay(completions: Completion[]) {
    const byDate = getCompletionCountByDate(completions);
    return Math.max(0, ...Array.from(byDate.values()));
}

function getUniqueCompletionDays(completions: Completion[]) {
    return new Set(completions.map((completion) => toLocalDateKey(completion.completedAt))).size;
}

function buildTaskMap(tasks?: Task[]): Map<string, Task> {
    return new Map((tasks ?? []).map((t) => [t.id, t]));
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
    // ── Streak achievements ───────────────────────────────────────────────────
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
        key: 'streak_champion',
        title: 'Streak Champion',
        description: 'Maintain a 45-day streak',
        icon: '🛡️',
        category: 'streak',
        check: (u) => u.streakCurrent >= 45 || u.streakLongest >= 45,
        getProgress: (u) => ({ current: Math.max(u.streakCurrent, u.streakLongest), max: 45 }),
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

    // ── Task-count achievements ───────────────────────────────────────────────
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
        key: 'momentum_builder',
        title: 'Momentum Builder',
        description: 'Complete 250 tasks',
        icon: '📈',
        category: 'tasks',
        check: (u) => u.totalTasksCompleted >= 250,
        getProgress: (u) => ({ current: u.totalTasksCompleted, max: 250 }),
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
        key: 'task_titan',
        title: 'Task Titan',
        description: 'Complete 1,000 tasks',
        icon: '🏛️',
        category: 'tasks',
        check: (u) => u.totalTasksCompleted >= 1000,
        getProgress: (u) => ({ current: u.totalTasksCompleted, max: 1000 }),
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
    {
        key: 'daily_sprinter',
        title: 'Daily Sprinter',
        description: 'Complete 5 tasks in a single day',
        icon: '🏃',
        category: 'tasks',
        check: (_u, completions) => getMaxCompletionsInSingleDay(completions) >= 5,
        getProgress: (_u, completions) => ({ current: getMaxCompletionsInSingleDay(completions), max: 5 }),
    },
    {
        key: 'consistency_club',
        title: 'Consistency Club',
        description: 'Complete tasks on 14 different days',
        icon: '🗓️',
        category: 'tasks',
        check: (_u, completions) => getUniqueCompletionDays(completions) >= 14,
        getProgress: (_u, completions) => ({ current: getUniqueCompletionDays(completions), max: 14 }),
    },

    // ── XP achievements ───────────────────────────────────────────────────────
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
        key: 'xp_tycoon',
        title: 'XP Tycoon',
        description: 'Earn 25,000 total XP',
        icon: '🏦',
        category: 'xp',
        check: (u) => u.totalXPEarned >= 25000,
        getProgress: (u) => ({ current: u.totalXPEarned, max: 25000 }),
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
    {
        key: 'level_15',
        title: 'Elite Status',
        description: 'Reach level 15',
        icon: '✨',
        category: 'xp',
        check: (u) => u.level >= 15,
        getProgress: (u) => ({ current: u.level, max: 15 }),
    },
    {
        key: 'coin_collector',
        title: 'Coin Collector',
        description: 'Accumulate 250 coins in your purse at once',
        icon: '🪙',
        category: 'xp',
        check: (u) => u.coins >= 250,
        getProgress: (u) => ({ current: u.coins, max: 250 }),
    },

    // ── Special achievements ──────────────────────────────────────────────────
    {
        key: 'combo_king',
        title: 'Combo King',
        description: 'Reach ×1.5 combo multiplier in a day',
        icon: '👊',
        category: 'special',
        check: (_u, completions) => {
            const maxPerDay = getMaxCompletionsInSingleDay(completions);
            return completions.some(c => c.comboMultiplier >= 1.5) || maxPerDay >= 8;
        },
        getProgress: (_u, completions) => {
            const maxPerDay = getMaxCompletionsInSingleDay(completions);
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
    {
        key: 'vampire_hunter',
        title: 'Vampire Hunter',
        description: 'Complete a task between 1:00 AM and 4:00 AM',
        icon: '🦇',
        category: 'special',
        check: (_u, completions) => completions.some(c => {
            const h = new Date(c.completedAt).getHours();
            return h >= 1 && h < 4;
        }),
        getProgress: (_u, completions) => ({
            current: completions.some(c => {
                const h = new Date(c.completedAt).getHours();
                return h >= 1 && h < 4;
            }) ? 1 : 0, max: 1
        }),
    },
    {
        key: 'weekend_warrior',
        title: 'Weekend Warrior',
        description: 'Complete 20 tasks during weekends',
        icon: '🍻',
        category: 'tasks',
        check: (_u, completions) => completions.filter(c => [0, 6].includes(new Date(c.completedAt).getDay())).length >= 20,
        getProgress: (_u, completions) => ({
            current: completions.filter(c => [0, 6].includes(new Date(c.completedAt).getDay())).length,
            max: 20
        }),
    },
    {
        key: 'dragon_hoarder',
        title: 'Dragon Hoarder',
        description: 'Accumulate 1,000 coins in your purse at once',
        icon: '🐉',
        category: 'xp',
        check: (u) => u.coins >= 1000,
        getProgress: (u) => ({ current: u.coins, max: 1000 }),
    },
    {
        key: 'fashionista',
        title: 'Fashionista',
        description: 'Unlock 5 different avatars',
        icon: '👗',
        category: 'special',
        check: (u) => u.unlockedAvatars.length >= 5,
        getProgress: (u) => ({ current: u.unlockedAvatars.length, max: 5 }),
    },
    {
        key: 'avatar_archivist',
        title: 'Avatar Archivist',
        description: 'Unlock all 8 avatars',
        icon: '🎭',
        category: 'special',
        check: (u) => u.unlockedAvatars.length >= 8,
        getProgress: (u) => ({ current: u.unlockedAvatars.length, max: 8 }),
    },
    {
        key: 'ice_wizard',
        title: 'Ice Wizard',
        description: 'Stockpile 3 Streak Freeze tokens at the same time',
        icon: '🧊',
        category: 'special',
        check: (u) => u.streakFreezeTokens >= 3,
        getProgress: (u) => ({ current: u.streakFreezeTokens, max: 3 }),
    },
    {
        key: 'berserker',
        title: 'Berserker',
        description: 'Complete 15 tasks in a single day',
        icon: '😡',
        category: 'tasks',
        check: (_u, completions) => getMaxCompletionsInSingleDay(completions) >= 15,
        getProgress: (_u, completions) => ({ current: getMaxCompletionsInSingleDay(completions), max: 15 }),
    },

    // ── NEW: Time-of-day achievements ─────────────────────────────────────────

    {
        key: 'early_bird',
        title: 'Early Bird',
        description: 'Complete a task before 8:00 AM',
        icon: '🌅',
        category: 'special',
        check: (_u, completions) =>
            completions.some((c) => new Date(c.completedAt).getHours() < 8),
        getProgress: (_u, completions) => ({
            current: completions.some((c) => new Date(c.completedAt).getHours() < 8) ? 1 : 0,
            max: 1,
        }),
    },
    {
        key: 'night_owl',
        title: 'Night Owl',
        description: 'Complete a task after 10:00 PM',
        icon: '🦉',
        category: 'special',
        check: (_u, completions) =>
            completions.some((c) => new Date(c.completedAt).getHours() >= 22),
        getProgress: (_u, completions) => ({
            current: completions.some((c) => new Date(c.completedAt).getHours() >= 22) ? 1 : 0,
            max: 1,
        }),
    },
    {
        key: 'lunchtime_legend',
        title: 'Lunchtime Legend',
        description: 'Complete a task between 12:00 PM and 1:00 PM',
        icon: '🌮',
        category: 'special',
        check: (_u, completions) =>
            completions.some((c) => new Date(c.completedAt).getHours() === 12),
        getProgress: (_u, completions) => ({
            current: completions.some((c) => new Date(c.completedAt).getHours() === 12) ? 1 : 0,
            max: 1,
        }),
    },

    // ── NEW: Day-of-week achievement ──────────────────────────────────────────

    {
        key: 'monday_motivation',
        title: 'Monday Motivation',
        description: 'Complete a task on a Monday',
        icon: '💼',
        category: 'special',
        check: (_u, completions) =>
            completions.some((c) => new Date(c.completedAt).getDay() === 1),
        getProgress: (_u, completions) => ({
            current: completions.some((c) => new Date(c.completedAt).getDay() === 1) ? 1 : 0,
            max: 1,
        }),
    },

    // ── NEW: Speed & timing achievements (require tasks) ─────────────────────

    {
        key: 'speed_runner',
        title: 'Speed Runner',
        description: 'Complete a task within 5 minutes of creating it',
        icon: '⚡',
        category: 'special',
        check: (_u, completions, tasks) => {
            const taskMap = buildTaskMap(tasks);
            return completions.some((c) => {
                const task = taskMap.get(c.taskId);
                if (!task) return false;
                const diffMs = new Date(c.completedAt).getTime() - new Date(task.createdAt).getTime();
                return diffMs >= 0 && diffMs <= 5 * 60 * 1000;
            });
        },
        getProgress: (_u, completions, tasks) => {
            const taskMap = buildTaskMap(tasks);
            const found = completions.some((c) => {
                const task = taskMap.get(c.taskId);
                if (!task) return false;
                const diffMs = new Date(c.completedAt).getTime() - new Date(task.createdAt).getTime();
                return diffMs >= 0 && diffMs <= 5 * 60 * 1000;
            });
            return { current: found ? 1 : 0, max: 1 };
        },
    },
    {
        key: 'procrastinator',
        title: 'Procrastinator',
        description: 'Complete a task that was 7+ days overdue',
        icon: '😅',
        category: 'special',
        check: (_u, completions, tasks) => {
            const taskMap = buildTaskMap(tasks);
            return completions.some((c) => {
                const task = taskMap.get(c.taskId);
                if (!task || !task.deadline) return false;
                const overdueDays =
                    (new Date(c.completedAt).getTime() - new Date(task.deadline).getTime()) /
                    (24 * 60 * 60 * 1000);
                return overdueDays >= 7;
            });
        },
        getProgress: (_u, completions, tasks) => {
            const taskMap = buildTaskMap(tasks);
            const maxOverdueDays = completions.reduce((max, c) => {
                const task = taskMap.get(c.taskId);
                if (!task || !task.deadline) return max;
                const days =
                    (new Date(c.completedAt).getTime() - new Date(task.deadline).getTime()) /
                    (24 * 60 * 60 * 1000);
                return Math.max(max, days);
            }, 0);
            return { current: Math.min(Math.max(0, Math.floor(maxOverdueDays)), 7), max: 7 };
        },
    },
    {
        key: 'deadline_dasher',
        title: 'Deadline Dasher',
        description: 'Complete 5 tasks on their exact deadline day',
        icon: '🏁',
        category: 'tasks',
        check: (_u, completions, tasks) => {
            const taskMap = buildTaskMap(tasks);
            const count = completions.filter((c) => {
                const task = taskMap.get(c.taskId);
                if (!task || !task.deadline) return false;
                return toLocalDateKey(c.completedAt) === toLocalDateKey(task.deadline);
            }).length;
            return count >= 5;
        },
        getProgress: (_u, completions, tasks) => {
            const taskMap = buildTaskMap(tasks);
            const count = completions.filter((c) => {
                const task = taskMap.get(c.taskId);
                if (!task || !task.deadline) return false;
                return toLocalDateKey(c.completedAt) === toLocalDateKey(task.deadline);
            }).length;
            return { current: Math.min(count, 5), max: 5 };
        },
    },

    // ── NEW: Tag achievement (requires tasks) ─────────────────────────────────

    {
        key: 'tag_specialist',
        title: 'Tag Specialist',
        description: 'Complete 10 tasks sharing the same tag',
        icon: '🏷️',
        category: 'tasks',
        check: (_u, completions, tasks) => {
            const taskMap = buildTaskMap(tasks);
            const tagCounts = new Map<string, number>();
            completions.forEach((c) => {
                const task = taskMap.get(c.taskId);
                if (!task) return;
                task.tags.forEach((tag) => {
                    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
                });
            });
            return Array.from(tagCounts.values()).some((n) => n >= 10);
        },
        getProgress: (_u, completions, tasks) => {
            const taskMap = buildTaskMap(tasks);
            const tagCounts = new Map<string, number>();
            completions.forEach((c) => {
                const task = taskMap.get(c.taskId);
                if (!task) return;
                task.tags.forEach((tag) => {
                    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
                });
            });
            const best = Math.max(0, ...Array.from(tagCounts.values()));
            return { current: Math.min(best, 10), max: 10 };
        },
    },

    // ── NEW: Recurring tasks achievement (requires tasks) ─────────────────────

    {
        key: 'recurring_hero',
        title: 'Recurring Hero',
        description: 'Complete 20 recurring tasks',
        icon: '🔄',
        category: 'tasks',
        check: (_u, completions, tasks) => {
            const taskMap = buildTaskMap(tasks);
            const count = completions.filter((c) => {
                const task = taskMap.get(c.taskId);
                return task?.recurrence !== 'NONE';
            }).length;
            return count >= 20;
        },
        getProgress: (_u, completions, tasks) => {
            const taskMap = buildTaskMap(tasks);
            const count = completions.filter((c) => {
                const task = taskMap.get(c.taskId);
                return task?.recurrence !== 'NONE';
            }).length;
            return { current: Math.min(count, 20), max: 20 };
        },
    },

    // ── NEW: Daily volume achievements ────────────────────────────────────────

    {
        key: 'daily_dozen',
        title: 'Daily Dozen',
        description: 'Complete 12 tasks in a single day',
        icon: '🥊',
        category: 'tasks',
        check: (_u, completions) => getMaxCompletionsInSingleDay(completions) >= 12,
        getProgress: (_u, completions) => ({ current: getMaxCompletionsInSingleDay(completions), max: 12 }),
    },

    // ── NEW: Consistency milestone ────────────────────────────────────────────

    {
        key: 'workaholic',
        title: 'Workaholic',
        description: 'Complete tasks on 30 different days',
        icon: '🗂️',
        category: 'tasks',
        check: (_u, completions) => getUniqueCompletionDays(completions) >= 30,
        getProgress: (_u, completions) => ({ current: getUniqueCompletionDays(completions), max: 30 }),
    },

    // ── NEW: XP single-day achievement ───────────────────────────────────────

    {
        key: 'high_roller',
        title: 'High Roller',
        description: 'Earn 500 XP in a single day',
        icon: '🎰',
        category: 'xp',
        check: (_u, completions) => {
            const xpByDate = new Map<string, number>();
            completions.forEach((c) => {
                const date = toLocalDateKey(c.completedAt);
                xpByDate.set(date, (xpByDate.get(date) ?? 0) + c.xpEarned);
            });
            return Array.from(xpByDate.values()).some((xp) => xp >= 500);
        },
        getProgress: (_u, completions) => {
            const xpByDate = new Map<string, number>();
            completions.forEach((c) => {
                const date = toLocalDateKey(c.completedAt);
                xpByDate.set(date, (xpByDate.get(date) ?? 0) + c.xpEarned);
            });
            const best = Math.max(0, ...Array.from(xpByDate.values()));
            return { current: Math.min(best, 500), max: 500 };
        },
    },
];

export function checkAchievements(
    user: UserState,
    completions: Completion[],
    unlockedKeys: Set<string>,
    tasks?: Task[]
): AchievementDef[] {
    return ACHIEVEMENT_DEFS.filter(
        (def) => !unlockedKeys.has(def.key) && def.check(user, completions, tasks)
    );
}
