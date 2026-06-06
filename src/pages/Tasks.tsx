import { Suspense, lazy, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Filter } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { getTaskStatusCounts, useTaskStore } from '../stores/taskStore';
import { TaskList } from '../components/tasks/TaskList';
import { Task, Priority, TaskStatus } from '../types';
import { completeTaskTransaction } from '../lib/taskCompletion';
import { CompletionFeedback, CompletionFeedbackData } from '../components/gamification/CompletionFeedback';

const TaskForm = lazy(() => import('../components/tasks/TaskForm').then((module) => ({ default: module.TaskForm })));
const LevelUpOverlay = lazy(() => import('../components/gamification/LevelUpOverlay').then((module) => ({ default: module.LevelUpOverlay })));

type SortOption = 'deadline' | 'priority' | 'created';
type FilterStatus = 'ALL' | TaskStatus;

const priorityOrder: Record<Priority, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export function Tasks() {
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('ACTIVE');
    const [filterPriority, setFilterPriority] = useState<Priority | 'ALL'>('ALL');
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('created');
    const [showFilters, setShowFilters] = useState(false);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState(0);
    const [completionFeedback, setCompletionFeedback] = useState<CompletionFeedbackData | null>(null);

    const { tasks, addTask, updateTask, deleteTask } = useTaskStore(
        useShallow((state) => ({
            tasks: state.tasks,
            addTask: state.addTask,
            updateTask: state.updateTask,
            deleteTask: state.deleteTask,
        }))
    );
    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        tasks.forEach((t) => {
            // Only show tags from tasks that match the current status filter
            if (filterStatus === 'ALL' || t.status === filterStatus) {
                t.tags.forEach((tag) => tags.add(tag));
            }
        });
        return Array.from(tags).sort();
    }, [tasks, filterStatus]);

    const filteredTasks = useMemo(() => {
        let result = [...tasks];

        if (filterStatus !== 'ALL') {
            result = result.filter((t) => t.status === filterStatus);
        }
        if (filterPriority !== 'ALL') {
            result = result.filter((t) => t.priority === filterPriority);
        }
        if (filterTag) {
            result = result.filter((t) => t.tags.includes(filterTag));
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
    }, [tasks, filterStatus, filterPriority, filterTag, sortBy]);

    const handleCompleteTask = useCallback((id: string) => {
        const result = completeTaskTransaction(id);
        if (!result) return;

        try { navigator.vibrate?.(12); } catch { /* noop */ }

        setCompletionFeedback({
            id: Date.now(),
            xpEarned: result.xpEarned,
            comboMultiplier: result.comboMultiplier,
            appliedBuff: result.appliedBuff,
        });

        if (result.levelUpTo !== null) {
            setNewLevel(result.levelUpTo);
            setShowLevelUp(true);
        }
    }, []);

    const handleDeleteTask = useCallback((id: string) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            deleteTask(id);
        }
    }, [deleteTask]);

    const handleEditTask = useCallback((task: Task) => {
        setEditingTask(task);
        setShowTaskForm(true);
    }, []);

    const stats = useMemo(() => getTaskStatusCounts(tasks), [tasks]);

    return (
        <div className="page-container">
            <div className="flex items-center justify-between mb-4">
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
                        className={`p-2.5 rounded-xl ${showFilters ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'card-surface'}`}
                    >
                        <Filter className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                            setEditingTask(null);
                            setShowTaskForm(true);
                        }}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-2 rounded-xl fab-primary text-white text-xs font-bold"
                    >
                        <Plus className="w-4 h-4" strokeWidth={3} />
                        New Quest
                    </motion.button>
                </div>
            </div>

            {/* Tag Filters (Quick Filters) */}
            {availableTags.length > 0 && (
                <div className="mb-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide flex gap-2">
                    <button
                        onClick={() => setFilterTag(null)}
                        className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all ${filterTag === null
                                ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                            }`}
                    >
                        All
                    </button>
                    {availableTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                            className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all ${filterTag === tag
                                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
                                }`}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}

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
                onDelete={handleDeleteTask}
                onEdit={handleEditTask}
                onTagClick={(tag) => {
                    setFilterTag(tag === filterTag ? null : tag);
                }}
                emptyMessage="No tasks found."
            />

            {showTaskForm && (
                <Suspense fallback={null}>
                    <TaskForm
                        onSubmit={(data) => {
                            if (editingTask) {
                                updateTask(editingTask.id, data);
                            } else {
                                addTask(data);
                            }
                            setEditingTask(null);
                        }}
                        onClose={() => {
                            setShowTaskForm(false);
                            setEditingTask(null);
                        }}
                        editTask={editingTask}
                    />
                </Suspense>
            )}

            {showLevelUp && (
                <Suspense fallback={null}>
                    <LevelUpOverlay
                        show={showLevelUp}
                        newLevel={newLevel}
                        onDismiss={() => setShowLevelUp(false)}
                    />
                </Suspense>
            )}

            <CompletionFeedback
                feedback={completionFeedback}
                onDone={() => setCompletionFeedback(null)}
            />
        </div>
    );
}
