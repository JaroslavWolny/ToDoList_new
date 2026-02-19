import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Filter, SortAsc } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import { useUserStore } from '../stores/userStore';
import { useAchievementStore } from '../stores/achievementStore';
import { TaskList } from '../components/tasks/TaskList';
import { TaskForm } from '../components/tasks/TaskForm';
import { Task, Priority, TaskStatus } from '../types';
import { calculateComboMultiplier, calculateLevel } from '../lib/gamification';
import { LevelUpOverlay } from '../components/gamification/LevelUpOverlay';
import { useMissionStore } from '../stores/missionStore';

type SortOption = 'deadline' | 'priority' | 'created';
type FilterStatus = 'ALL' | TaskStatus;

const priorityOrder: Record<Priority, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export function Tasks() {
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
    const [filterPriority, setFilterPriority] = useState<Priority | 'ALL'>('ALL');
    const [sortBy, setSortBy] = useState<SortOption>('created');
    const [showFilters, setShowFilters] = useState(false);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState(0);

    const taskStore = useTaskStore();
    const userStore = useUserStore();
    const achievementStore = useAchievementStore();
    const missionStore = useMissionStore();

    const filteredTasks = useMemo(() => {
        let result = [...taskStore.tasks];

        if (filterStatus !== 'ALL') {
            result = result.filter((t) => t.status === filterStatus);
        }
        if (filterPriority !== 'ALL') {
            result = result.filter((t) => t.priority === filterPriority);
        }

        result.sort((a, b) => {
            if (sortBy === 'priority') return priorityOrder[b.priority] - priorityOrder[a.priority];
            if (sortBy === 'deadline') {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return a.deadline.localeCompare(b.deadline);
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return result;
    }, [taskStore.tasks, filterStatus, filterPriority, sortBy]);

    const handleCompleteTask = useCallback((id: string) => {
        const prevLevel = userStore.level;
        const result = taskStore.completeTask(id);
        if (!result) return;
        userStore.addXP(result.xpEarned);
        userStore.updateStreak();
        userStore.incrementTasksCompleted();
        userStore.gainHealth();

        const completionsNow = taskStore.getCompletionsToday();
        missionStore.updateMissionProgress('complete_tasks', completionsNow.length);

        const currentLevel = calculateLevel(useUserStore.getState().xp);
        if (currentLevel > prevLevel) {
            setNewLevel(currentLevel);
            setShowLevelUp(true);
        }
        achievementStore.checkAndUnlock();
    }, [userStore, taskStore, achievementStore, missionStore]);

    const stats = useMemo(() => ({
        total: taskStore.tasks.length,
        active: taskStore.tasks.filter((t) => t.status === 'ACTIVE').length,
        completed: taskStore.tasks.filter((t) => t.status === 'COMPLETED').length,
    }), [taskStore.tasks]);

    return (
        <div className="page-container">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Tasks</h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        {stats.active} active • {stats.completed} done
                    </p>
                </div>
                <div className="flex gap-2">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2.5 rounded-xl ${showFilters ? 'bg-primary-500 text-white' : 'card-surface'}`}
                    >
                        <Filter className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="card-surface rounded-2xl p-4 mb-4 space-y-3"
                >
                    <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Status</label>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                            {(['ALL', 'ACTIVE', 'COMPLETED', 'FAILED'] as FilterStatus[]).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === s
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                                        }`}
                                >
                                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Priority</label>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                            {(['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as (Priority | 'ALL')[]).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setFilterPriority(p)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterPriority === p
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                                        }`}
                                >
                                    {p === 'ALL' ? 'All' : p.charAt(0) + p.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Sort by</label>
                        <div className="flex gap-2 mt-1.5">
                            {([
                                { value: 'created', label: 'Newest' },
                                { value: 'priority', label: 'Priority' },
                                { value: 'deadline', label: 'Deadline' },
                            ] as { value: SortOption; label: string }[]).map((s) => (
                                <button
                                    key={s.value}
                                    onClick={() => setSortBy(s.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sortBy === s.value
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                                        }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Task List */}
            <TaskList
                tasks={filteredTasks}
                onComplete={handleCompleteTask}
                onDelete={(id) => taskStore.deleteTask(id)}
                onEdit={(task) => {
                    setEditingTask(task);
                    setShowTaskForm(true);
                }}
                emptyMessage="No tasks found. Create one with the + button!"
            />

            {/* FAB */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                    setEditingTask(null);
                    setShowTaskForm(true);
                }}
                className="fixed right-6 w-14 h-14 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-xl shadow-primary-500/40 flex items-center justify-center z-20"
                style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px) + 0.5rem)', right: 'calc(1.5rem + env(safe-area-inset-right, 0px))' }}
            >
                <Plus className="w-6 h-6" />
            </motion.button>

            {showTaskForm && (
                <TaskForm
                    onSubmit={(data) => {
                        if (editingTask) {
                            taskStore.updateTask(editingTask.id, data);
                        } else {
                            taskStore.addTask(data);
                        }
                        setEditingTask(null);
                    }}
                    onClose={() => {
                        setShowTaskForm(false);
                        setEditingTask(null);
                    }}
                    editTask={editingTask}
                />
            )}

            <LevelUpOverlay
                show={showLevelUp}
                newLevel={newLevel}
                onDismiss={() => setShowLevelUp(false)}
            />
        </div>
    );
}
