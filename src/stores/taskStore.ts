import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Task, Completion, Penalty, Priority, Recurrence, TaskStatus } from '../types';
import { calculateXP, calculateComboMultiplier, calculatePenalty } from '../lib/gamification';

interface TaskStore {
    tasks: Task[];
    completions: Completion[];
    penalties: Penalty[];
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'lastResetDate'>) => Task;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    completeTask: (id: string) => { xpEarned: number; comboMultiplier: number } | null;
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
                };
                set((state) => ({ tasks: [...state.tasks, newTask] }));
                return newTask;
            },

            updateTask: (id, updates) => {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === id ? { ...t, ...updates } : t
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
                            ? { ...t, status: 'COMPLETED' as TaskStatus, completedAt: new Date().toISOString() }
                            : t
                    ),
                    completions: [...state.completions, completion],
                }));

                return { xpEarned, comboMultiplier };
            },

            failTask: (id) => {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === id ? { ...t, status: 'FAILED' as TaskStatus } : t
                    ),
                }));
            },

            processOverdueTasks: (gamificationLevel) => {
                const state = get();
                const now = new Date();
                const newPenalties: Penalty[] = [];

                const overdueTasks = state.tasks.filter(
                    (t) => t.status === 'ACTIVE' && t.deadline && new Date(t.deadline) < now
                );

                // Only penalize tasks that are overdue by more than 24h
                const penalizedTaskIds = new Set(state.penalties.map(p => p.taskId));

                overdueTasks.forEach((task) => {
                    if (penalizedTaskIds.has(task.id)) return; // already penalized

                    const overdueDuration = now.getTime() - new Date(task.deadline!).getTime();
                    if (overdueDuration > 24 * 60 * 60 * 1000) {
                        const xpLost = calculatePenalty(task.priority, gamificationLevel);
                        const penalty: Penalty = {
                            id: uuidv4(),
                            taskId: task.id,
                            xpLost,
                            reason: `Overdue: ${task.title}`,
                            createdAt: now.toISOString(),
                        };
                        newPenalties.push(penalty);
                    }
                });

                if (newPenalties.length > 0) {
                    set((state) => ({
                        penalties: [...state.penalties, ...newPenalties],
                    }));
                }

                return newPenalties;
            },

            resetRecurringTasks: () => {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];

                set((state) => ({
                    tasks: state.tasks.map((task) => {
                        // Only reset completed or failed recurring tasks
                        if (task.recurrence === 'NONE' || task.status === 'ACTIVE') {
                            return task;
                        }

                        // Determine the reference date (last reset or completion date)
                        const referenceDate = task.lastResetDate || task.completedAt || task.createdAt;
                        const refDateStr = referenceDate.split('T')[0];

                        if (task.recurrence === 'DAILY') {
                            // Reset if the reference date is before today
                            if (refDateStr < todayStr) {
                                return {
                                    ...task,
                                    status: 'ACTIVE' as TaskStatus,
                                    completedAt: null,
                                    lastResetDate: todayStr,
                                };
                            }
                        } else if (task.recurrence === 'WEEKLY') {
                            // Reset if 7+ days have passed since the reference date
                            const refDate = new Date(refDateStr + 'T00:00:00');
                            const daysDiff = Math.floor(
                                (today.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
                            );
                            if (daysDiff >= 7) {
                                return {
                                    ...task,
                                    status: 'ACTIVE' as TaskStatus,
                                    completedAt: null,
                                    lastResetDate: todayStr,
                                };
                            }
                        }

                        return task;
                    }),
                }));
            },

            getTasksForToday: () => {
                const { tasks } = get();
                const today = new Date().toISOString().split('T')[0];
                return tasks.filter((t) => {
                    if (t.status !== 'ACTIVE') return false;

                    // Recurring tasks always show
                    if (t.recurrence !== 'NONE') return true;

                    // Tasks with deadline today or past
                    if (t.deadline) {
                        const deadlineDate = t.deadline.split('T')[0];
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
                const now = new Date().toISOString();
                return tasks.filter(
                    (t) => t.status === 'ACTIVE' && t.deadline && t.deadline < now
                );
            },

            getCompletionsToday: () => {
                const { completions } = get();
                const today = new Date().toISOString().split('T')[0];
                return completions.filter(
                    (c) => c.completedAt.split('T')[0] === today
                );
            },

            getCompletionsForDate: (date: string) => {
                const { completions } = get();
                return completions.filter(
                    (c) => c.completedAt.split('T')[0] === date
                );
            },

            getTotalCompletionsCount: () => {
                return get().completions.length;
            },
        }),
        {
            name: 'todolist-task-store',
        }
    )
);
