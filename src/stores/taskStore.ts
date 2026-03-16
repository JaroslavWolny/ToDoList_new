import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Task, Completion, Penalty, TaskStatus, RandomReward, Recurrence } from '../types';
import { calculateXP, calculateComboMultiplier, calculatePenalty } from '../lib/gamification';
import { toLocalDateKey } from '../lib/dates';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

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
    const referenceStart = new Date(`${referenceDay}T00:00:00`);
    const todayStart = new Date(`${todayDay}T00:00:00`);
    const daysDiff = Math.floor((todayStart.getTime() - referenceStart.getTime()) / DAY_MS);

    if (daysDiff <= 0) return 0;
    return recurrence === 'WEEKLY' ? Math.floor(daysDiff / 7) : daysDiff;
};

interface TaskStore {
    tasks: Task[];
    completions: Completion[];
    penalties: Penalty[];
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'lastResetDate' | 'lastPenaltyAt'>) => Task;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    completeTask: (id: string) => { xpEarned: number; comboMultiplier: number; reward: RandomReward | null } | null;
    failTask: (id: string) => void;
    processOverdueTasks: (gamificationLevel: 'CASUAL' | 'STANDARD' | 'HARDCORE') => Penalty[];
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
            penalties: [],

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

                const completionsToday = state.getCompletionsToday();
                const comboMultiplier = calculateComboMultiplier(completionsToday.length + 1);
                const baseXP = calculateXP(task.priority);
                const xpEarned = Math.floor(baseXP * comboMultiplier);

                const completion: Completion = {
                    id: uuidv4(),
                    taskId: id,
                    completedAt: new Date().toISOString(),
                    xpEarned,
                    comboMultiplier,
                };

                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === id
                            ? {
                                ...t,
                                status: 'COMPLETED' as TaskStatus,
                                completedAt: new Date().toISOString(),
                                lastPenaltyAt: null,
                            }
                            : t
                    ),
                    completions: [...state.completions, completion],
                }));

                // 12% chance to drop a random reward (rarer)
                let reward: RandomReward | null = null;
                if (Math.random() < 0.12) {
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
                const newPenalties: Penalty[] = [];
                const latestPenaltyByTaskId = new Map<string, string>();

                const overdueTasks = state.tasks.filter(
                    (t) => t.status === 'ACTIVE' && t.deadline && new Date(t.deadline) < now
                );

                overdueTasks.forEach((task) => {
                    const deadlineTime = new Date(task.deadline!).getTime();
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

                    for (
                        let periodIndex = appliedPeriods + 1;
                        periodIndex <= elapsedPeriods;
                        periodIndex += 1
                    ) {
                        newPenalties.push({
                            id: uuidv4(),
                            taskId: task.id,
                            xpLost,
                            reason: `Overdue: ${task.title}`,
                            createdAt: new Date(deadlineTime + periodIndex * periodMs).toISOString(),
                        });
                    }

                    latestPenaltyByTaskId.set(
                        task.id,
                        new Date(deadlineTime + elapsedPeriods * periodMs).toISOString()
                    );
                });

                if (newPenalties.length > 0) {
                    set((state) => ({
                        tasks: state.tasks.map((task) => {
                            const lastPenaltyAt = latestPenaltyByTaskId.get(task.id);
                            return lastPenaltyAt ? { ...task, lastPenaltyAt } : task;
                        }),
                        penalties: [...(Array.isArray(state.penalties) ? state.penalties : []), ...newPenalties],
                    }));
                }

                return newPenalties;
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
                const { tasks } = get();
                const today = toLocalDateKey(new Date());
                return tasks.filter((t) => {
                    if (t.status !== 'ACTIVE') return false;

                    // Exclude tasks scheduled for the future
                    if (t.startDate) {
                        const startDate = toLocalDateKey(t.startDate);
                        if (startDate > today) return false;
                    }

                    // Recurring tasks always show
                    if (t.recurrence !== 'NONE') return true;

                    // Tasks with deadline today or past
                    if (t.deadline) {
                        const deadlineDate = toLocalDateKey(t.deadline);
                        return deadlineDate <= today;
                    }

                    // Non-recurring tasks without deadline: show if created within 7 days
                    const createdDate = new Date(t.createdAt);
                    const now = new Date();
                    const daysSinceCreated = Math.floor(
                        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return daysSinceCreated <= 7;
                });
            },

            getActiveTasks: () => {
                return get().tasks.filter((t) => t.status === 'ACTIVE');
            },

            getOverdueTasks: () => {
                const { tasks } = get();
                const now = new Date().getTime();
                return tasks.filter(
                    (t) => t.status === 'ACTIVE' && t.deadline !== null && new Date(t.deadline).getTime() < now
                );
            },

            getCompletionsToday: () => {
                const { completions } = get();
                const today = toLocalDateKey(new Date());
                return completions.filter(
                    (c) => toLocalDateKey(c.completedAt) === today
                );
            },

            getCompletionsForDate: (date: string) => {
                const { completions } = get();
                return completions.filter(
                    (c) => toLocalDateKey(c.completedAt) === date
                );
            },

            getTotalCompletionsCount: () => {
                return get().completions.length;
            },
        }),
        {
            name: 'todolist-task-store',
            merge: (persistedState, currentState) => {
                const persisted = (persistedState as Partial<TaskStore> | undefined) ?? {};

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
                    completions: Array.isArray(persisted.completions)
                        ? persisted.completions
                        : currentState.completions,
                    penalties: Array.isArray(persisted.penalties)
                        ? persisted.penalties
                        : currentState.penalties,
                };
            },
        }
    )
);
