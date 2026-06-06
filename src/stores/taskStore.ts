import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Task, Completion, TaskStatus, RandomReward, Recurrence, DailyThemeId } from '../types';
import { calculateXP, calculateComboMultiplier, calculatePenalty } from '../lib/gamification';
import { toLocalDateKey } from '../lib/dates';
import { useUserStore } from './userStore';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// The "Daily Reveal" buff only applies on the day it was opened. Read it lazily
// from the user store so completing a task picks up the currently active theme.
const getActiveDailyTheme = (now: Date): DailyThemeId | null => {
    const user = useUserStore.getState();
    return user.lastRevealDate === toLocalDateKey(now) ? user.dailyThemeId : null;
};

const getPenaltyPeriodMs = (recurrence: Recurrence): number =>
    recurrence === 'WEEKLY' ? WEEK_MS : DAY_MS;

const shiftRecurringTimestamp = (
    value: string | null,
    periods: number,
    recurrence: Recurrence
): string | null => {
    if (!value || periods <= 0) return value;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const nextDate = new Date(date);
    nextDate.setDate(
        nextDate.getDate() + (recurrence === 'WEEKLY' ? periods * 7 : periods)
    );
    return nextDate.toISOString();
};

const shiftRecurringDateKey = (
    value: string,
    periods: number,
    recurrence: Recurrence
): string => {
    const referenceDay = toLocalDateKey(value);
    if (!referenceDay || periods <= 0) return referenceDay;

    const shifted = shiftRecurringTimestamp(
        `${referenceDay}T00:00:00`,
        periods,
        recurrence
    );

    return shifted ? toLocalDateKey(shifted) : referenceDay;
};

const getRecurringResetPeriods = (
    referenceDate: string,
    recurrence: Recurrence,
    today: Date
): number => {
    const referenceDay = toLocalDateKey(referenceDate);
    if (!referenceDay) return 0;

    const todayDay = toLocalDateKey(today);
    const referenceStart = new Date(`${referenceDay}T00:00:00Z`);
    const todayStart = new Date(`${todayDay}T00:00:00Z`);
    const daysDiff = Math.round((todayStart.getTime() - referenceStart.getTime()) / DAY_MS);

    if (daysDiff <= 0) return 0;
    return recurrence === 'WEEKLY' ? Math.floor(daysDiff / 7) : daysDiff;
};

export type CompletionDayStats = {
    count: number;
    xp: number;
};

export const getTasksForToday = (tasks: Task[], today = new Date()): Task[] => {
    const todayKey = toLocalDateKey(today);

    return tasks.filter((task) => {
        if (task.status !== 'ACTIVE') return false;

        if (task.startDate) {
            const startDate = toLocalDateKey(task.startDate);
            if (startDate > todayKey) return false;
        }

        if (task.recurrence !== 'NONE') return true;

        if (task.deadline) {
            const deadlineDate = toLocalDateKey(task.deadline);
            return deadlineDate <= todayKey;
        }

        const createdDate = new Date(task.createdAt);
        const daysSinceCreated = Math.floor(
            (today.getTime() - createdDate.getTime()) / DAY_MS
        );

        return daysSinceCreated <= 7;
    });
};

export const getActiveTasks = (tasks: Task[]): Task[] =>
    tasks.filter((task) => task.status === 'ACTIVE');

export const getOverdueTasks = (tasks: Task[], now = new Date()): Task[] => {
    const nowMs = now.getTime();

    return tasks.filter(
        (task) =>
            task.status === 'ACTIVE'
            && task.deadline !== null
            && Date.parse(task.deadline) < nowMs
    );
};

export const getCompletionsForDate = (
    completions: Completion[],
    date: string
): Completion[] =>
    completions.filter((completion) => toLocalDateKey(completion.completedAt) === date);

export const getCompletionsToday = (
    completions: Completion[],
    today = new Date()
): Completion[] => getCompletionsForDate(completions, toLocalDateKey(today));

export const buildCompletionStatsByDate = (
    completions: Completion[]
): Map<string, CompletionDayStats> => {
    const statsByDate = new Map<string, CompletionDayStats>();

    completions.forEach((completion) => {
        const date = toLocalDateKey(completion.completedAt);
        const existing = statsByDate.get(date);

        if (existing) {
            existing.count += 1;
            existing.xp += completion.xpEarned;
            return;
        }

        statsByDate.set(date, {
            count: 1,
            xp: completion.xpEarned,
        });
    });

    return statsByDate;
};

export const getTaskStatusCounts = (tasks: Task[]) => {
    let active = 0;
    let completed = 0;
    let failed = 0;

    tasks.forEach((task) => {
        if (task.status === 'ACTIVE') active += 1;
        if (task.status === 'COMPLETED') completed += 1;
        if (task.status === 'FAILED') failed += 1;
    });

    return {
        total: tasks.length,
        active,
        completed,
        failed,
    };
};

const COMPLETIONS_MAX_AGE_MS = 180 * DAY_MS; // ~6 months

interface TaskStore {
    tasks: Task[];
    completions: Completion[];
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'lastResetDate' | 'lastPenaltyAt'>) => Task;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    completeTask: (id: string) => { xpEarned: number; comboMultiplier: number; reward: RandomReward | null } | null;
    failTask: (id: string) => void;
    processOverdueTasks: (gamificationLevel: 'CASUAL' | 'STANDARD' | 'HARDCORE') => { taskId: string; xpLost: number }[];
    resetRecurringTasks: () => void;
    getTasksForToday: () => Task[];
    getActiveTasks: () => Task[];
    getOverdueTasks: () => Task[];
    getCompletionsToday: () => Completion[];
    getCompletionsForDate: (date: string) => Completion[];
    getTotalCompletionsCount: () => number;
}

export const useTaskStore = create<TaskStore>()(
    persist(
        (set, get) => ({
            tasks: [],
            completions: [],

            addTask: (taskData) => {
                const newTask: Task = {
                    id: uuidv4(),
                    ...taskData,
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                    lastResetDate: null,
                    lastPenaltyAt: null,
                };
                set((state) => ({ tasks: [...state.tasks, newTask] }));
                return newTask;
            },

            updateTask: (id, updates) => {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === id
                            ? {
                                ...t,
                                ...updates,
                                lastPenaltyAt: updates.deadline !== undefined || updates.recurrence !== undefined
                                    ? null
                                    : updates.lastPenaltyAt ?? t.lastPenaltyAt,
                            }
                            : t
                    ),
                }));
            },

            deleteTask: (id) => {
                set((state) => ({
                    tasks: state.tasks.filter((t) => t.id !== id),
                }));
            },

            completeTask: (id) => {
                const state = get();
                const task = state.tasks.find((t) => t.id === id);
                if (!task || task.status !== 'ACTIVE') return null;

                const now = new Date();
                const nowIso = now.toISOString();
                const activeTheme = getActiveDailyTheme(now);
                const completionsToday = getCompletionsToday(state.completions, now);

                // COMBO_BOOST: combo tiers are reached faster (as if +2 completions).
                const comboReach = completionsToday.length + 1 + (activeTheme === 'COMBO_BOOST' ? 2 : 0);
                const comboMultiplier = calculateComboMultiplier(comboReach);

                // DOUBLE_HIGH / CRITICAL_FOCUS: priority-targeted XP multipliers.
                let baseXP = calculateXP(task.priority);
                if (activeTheme === 'DOUBLE_HIGH' && task.priority === 'HIGH') baseXP *= 2;
                if (activeTheme === 'CRITICAL_FOCUS' && task.priority === 'CRITICAL') baseXP *= 3;

                const xpEarned = Math.floor(baseXP * comboMultiplier);

                const completion: Completion = {
                    id: uuidv4(),
                    taskId: id,
                    completedAt: nowIso,
                    xpEarned,
                    comboMultiplier,
                };

                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === id
                            ? {
                                ...t,
                                status: 'COMPLETED' as TaskStatus,
                                completedAt: nowIso,
                                lastPenaltyAt: null,
                            }
                            : t
                    ),
                    completions: [...state.completions, completion],
                }));

                // 12% chance to drop a random reward (rarer). DOUBLE_CHEST doubles it.
                let reward: RandomReward | null = null;
                const dropChance = activeTheme === 'DOUBLE_CHEST' ? 0.24 : 0.12;
                if (Math.random() < dropChance) {
                    const isChest = Math.random() < 0.2; // 20% chance of chest (rare, bigger reward), 80% pouch
                    const isCoins = Math.random() < 0.6; // 60% chance for coins, 40% for XP

                    if (isChest) {
                        reward = {
                            type: 'CHEST',
                            currency: isCoins ? 'COINS' : 'XP',
                            amount: isCoins ? Math.floor(Math.random() * 150) + 100 : Math.floor(Math.random() * 200) + 150,
                        };
                    } else {
                        reward = {
                            type: 'POUCH',
                            currency: isCoins ? 'COINS' : 'XP',
                            amount: isCoins ? Math.floor(Math.random() * 40) + 30 : Math.floor(Math.random() * 60) + 40,
                        };
                    }
                }

                // EARLY_RISER: the 3rd quest finished before noon drops a guaranteed bonus chest.
                if (activeTheme === 'EARLY_RISER' && now.getHours() < 12) {
                    const beforeNoonCount =
                        completionsToday.filter((c) => new Date(c.completedAt).getHours() < 12).length + 1;
                    if (beforeNoonCount === 3) {
                        reward = { type: 'CHEST', currency: 'COINS', amount: Math.floor(Math.random() * 150) + 150 };
                    }
                }

                // COIN_RAIN: +50% on any coin reward earned today.
                if (reward && reward.currency === 'COINS' && activeTheme === 'COIN_RAIN') {
                    reward = { ...reward, amount: Math.floor(reward.amount * 1.5) };
                }

                return { xpEarned, comboMultiplier, reward };
            },

            failTask: (id) => {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === id
                            ? { ...t, status: 'FAILED' as TaskStatus, lastPenaltyAt: null }
                            : t
                    ),
                }));
            },

            processOverdueTasks: (gamificationLevel) => {
                const state = get();
                const now = new Date();
                const nowMs = now.getTime();
                const results: { taskId: string; xpLost: number }[] = [];
                const latestPenaltyByTaskId = new Map<string, string>();

                const overdueTasks = state.tasks.filter(
                    (t) => t.status === 'ACTIVE' && t.deadline && Date.parse(t.deadline) < nowMs
                );

                overdueTasks.forEach((task) => {
                    const deadlineTime = Date.parse(task.deadline!);
                    if (Number.isNaN(deadlineTime)) return;

                    const periodMs = getPenaltyPeriodMs(task.recurrence);
                    const elapsedPeriods = Math.floor((now.getTime() - deadlineTime) / periodMs);
                    if (elapsedPeriods < 1) return;

                    const lastPenaltyTime = task.lastPenaltyAt
                        ? new Date(task.lastPenaltyAt).getTime()
                        : Number.NaN;
                    const appliedPeriods = Number.isNaN(lastPenaltyTime) || lastPenaltyTime < deadlineTime
                        ? 0
                        : Math.floor((lastPenaltyTime - deadlineTime) / periodMs);

                    if (elapsedPeriods <= appliedPeriods) return;

                    const xpLost = calculatePenalty(task.priority, gamificationLevel);
                    const missedPeriods = elapsedPeriods - appliedPeriods;

                    for (let i = 0; i < missedPeriods; i++) {
                        results.push({ taskId: task.id, xpLost });
                    }

                    latestPenaltyByTaskId.set(
                        task.id,
                        new Date(deadlineTime + elapsedPeriods * periodMs).toISOString()
                    );
                });

                if (results.length > 0) {
                    set((state) => ({
                        tasks: state.tasks.map((task) => {
                            const lastPenaltyAt = latestPenaltyByTaskId.get(task.id);
                            return lastPenaltyAt ? { ...task, lastPenaltyAt } : task;
                        }),
                    }));
                }

                return results;
            },

            resetRecurringTasks: () => {
                const today = new Date();

                set((state) => ({
                    tasks: state.tasks.map((task) => {
                        // Only reset completed or failed recurring tasks
                        if (task.recurrence === 'NONE' || task.status === 'ACTIVE') {
                            return task;
                        }

                        // Determine the reference date (last reset or completion date)
                        const referenceDate = task.lastResetDate || task.completedAt || task.createdAt;
                        const periodsElapsed = getRecurringResetPeriods(
                            referenceDate,
                            task.recurrence,
                            today
                        );

                        if (periodsElapsed > 0) {
                            return {
                                ...task,
                                status: 'ACTIVE' as TaskStatus,
                                completedAt: null,
                                lastResetDate: shiftRecurringDateKey(
                                    referenceDate,
                                    periodsElapsed,
                                    task.recurrence
                                ),
                                lastPenaltyAt: null,
                                deadline: shiftRecurringTimestamp(
                                    task.deadline,
                                    periodsElapsed,
                                    task.recurrence
                                ),
                                startDate: shiftRecurringTimestamp(
                                    task.startDate,
                                    periodsElapsed,
                                    task.recurrence
                                ),
                            };
                        }

                        return task;
                    }),
                }));
            },

            getTasksForToday: () => {
                return getTasksForToday(get().tasks);
            },

            getActiveTasks: () => {
                return getActiveTasks(get().tasks);
            },

            getOverdueTasks: () => {
                return getOverdueTasks(get().tasks);
            },

            getCompletionsToday: () => {
                return getCompletionsToday(get().completions);
            },

            getCompletionsForDate: (date: string) => {
                return getCompletionsForDate(get().completions, date);
            },

            getTotalCompletionsCount: () => {
                return get().completions.length;
            },
        }),
        {
            name: 'todolist-task-store',
            merge: (persistedState, currentState) => {
                const persisted = (persistedState as Partial<TaskStore> | undefined) ?? {};

                // Prune old completions (keep last 6 months)
                const cutoff = Date.now() - COMPLETIONS_MAX_AGE_MS;
                const prunedCompletions = Array.isArray(persisted.completions)
                    ? persisted.completions.filter((c) => {
                        const ts = new Date(c.completedAt).getTime();
                        return !Number.isNaN(ts) && ts >= cutoff;
                    })
                    : currentState.completions;

                return {
                    ...currentState,
                    ...persisted,
                    tasks: Array.isArray(persisted.tasks)
                        ? persisted.tasks.map((task) => ({
                            ...task,
                            lastResetDate: task.lastResetDate ?? null,
                            lastPenaltyAt: task.lastPenaltyAt ?? null,
                        }))
                        : currentState.tasks,
                    completions: prunedCompletions,
                };
            },
        }
    )
);
