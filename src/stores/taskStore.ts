import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Task, Completion, Priority, Recurrence, TaskStatus } from '../types';
import { calculateXP, calculateComboMultiplier } from '../lib/gamification';

interface TaskStore {
    tasks: Task[];
    completions: Completion[];
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'lastResetDate'>) => Task;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    completeTask: (id: string) => { xpEarned: number; comboMultiplier: number } | null;
    failTask: (id: string) => void;
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
                const comboMultiplier = calculateComboMultiplier(completionsToday.length);
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
                    if (t.deadline) {
                        const deadlineDate = t.deadline.split('T')[0];
                        return deadlineDate <= today;
                    }
                    // Show tasks created today that have no deadline
                    const createdDate = t.createdAt.split('T')[0];
                    return createdDate === today || !t.deadline;
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
