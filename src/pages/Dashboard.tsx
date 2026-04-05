import { Suspense, lazy, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../stores/userStore';
import { getCompletionsToday, getTasksForToday, useTaskStore } from '../stores/taskStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useMissionStore } from '../stores/missionStore';
import { XPBar } from '../components/gamification/XPBar';
import { StreakCounter } from '../components/gamification/StreakCounter';
import { LevelBadge } from '../components/gamification/LevelBadge';
import { HealthBar } from '../components/gamification/HealthBar';
import { ComboIndicator } from '../components/gamification/ComboIndicator';
import { TaskList } from '../components/tasks/TaskList';
import { QuickRituals, RITUAL_TAG } from '../components/tasks/QuickRituals';
import { Task, RandomReward } from '../types';
import { calculateComboMultiplier } from '../lib/gamification';
import { completeTaskTransaction } from '../lib/taskCompletion';
import { toLocalDateKey } from '../lib/dates';

const LevelUpOverlay = lazy(() => import('../components/gamification/LevelUpOverlay').then((module) => ({ default: module.LevelUpOverlay })));
const RandomRewardModal = lazy(() => import('../components/gamification/RandomRewardModal').then((module) => ({ default: module.RandomRewardModal })));
const TaskForm = lazy(() => import('../components/tasks/TaskForm').then((module) => ({ default: module.TaskForm })));

export function Dashboard() {
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState(0);
    const [rewardDrop, setRewardDrop] = useState<RandomReward | null>(null);
    const [showRituals, setShowRituals] = useState(false);
    const hasInitializedRef = useRef(false);

    const { displayName, dailyMissionsEnabled } = useUserStore(
        useShallow((state) => ({
            displayName: state.displayName,
            dailyMissionsEnabled: state.settings.dailyMissionsEnabled,
        }))
    );
    const { tasks, completions, addTask, updateTask, deleteTask } = useTaskStore(
        useShallow((state) => ({
            tasks: state.tasks,
            completions: state.completions,
            addTask: state.addTask,
            updateTask: state.updateTask,
            deleteTask: state.deleteTask,
        }))
    );
    const { initAchievements, checkAndUnlock } = useAchievementStore(
        useShallow((state) => ({
            initAchievements: state.initAchievements,
            checkAndUnlock: state.checkAndUnlock,
        }))
    );
    const { missions, lastGeneratedDate, generateDailyMissions } = useMissionStore(
        useShallow((state) => ({
            missions: state.missions,
            lastGeneratedDate: state.lastGeneratedDate,
            generateDailyMissions: state.generateDailyMissions,
        }))
    );

    const todayTasks = useMemo(() => getTasksForToday(tasks), [tasks]);
    const completionsToday = useMemo(() => getCompletionsToday(completions), [completions]);
    const currentCombo = calculateComboMultiplier(completionsToday.length);

    // Ritual tasks for quick access (all active/completed recurring tasks with 'ritual' tag)
    const ritualStats = useMemo(() => {
        const rituals = tasks.filter(
            (t) => t.tags.includes(RITUAL_TAG) && (t.status === 'ACTIVE' || t.status === 'COMPLETED') && t.recurrence !== 'NONE'
        );
        const remaining = rituals.filter((t) => t.status === 'ACTIVE').length;
        return { total: rituals.length, remaining };
    }, [tasks]);
    const missionsForToday = useMemo(() => {
        const today = toLocalDateKey(new Date());
        return lastGeneratedDate === today ? missions : [];
    }, [lastGeneratedDate, missions]);

    useEffect(() => {
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        generateDailyMissions();
        initAchievements();
        checkAndUnlock();
    }, [checkAndUnlock, generateDailyMissions, initAchievements]);

    const handleCompleteTask = useCallback((id: string) => {
        const result = completeTaskTransaction(id);
        if (!result) return;

        const { levelUpTo, reward } = result;
        if (reward) {
            setRewardDrop(reward);
        }

        if (levelUpTo !== null) {
            setNewLevel(levelUpTo);
            setShowLevelUp(true);
        }
    }, []);

    const handleAddTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'lastResetDate' | 'lastPenaltyAt'>) => {
        addTask(taskData);
    }, [addTask]);

    const handleDeleteTask = useCallback((id: string) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            deleteTask(id);
        }
    }, [deleteTask]);

    const handleEditTask = useCallback((task: Task) => {
        setEditingTask(task);
        setShowTaskForm(true);
    }, []);

    const handleUpdateTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'lastResetDate' | 'lastPenaltyAt'>) => {
        if (editingTask) {
            updateTask(editingTask.id, taskData);
            setEditingTask(null);
        }
    }, [editingTask, updateTask]);


    return (
        <div className="page-container">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col justify-center">
                    <h1 className="text-2xl font-bold">
                        {getGreeting()},
                    </h1>
                    <div className="pl-4 mt-0.5">
                        <span className="text-[1.7rem] font-black gradient-text leading-none tracking-tight">
                            {displayName || 'Hero'}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <LevelBadge />
                </div>
            </div>

            {/* XP Bar */}
            <div className="mb-4">
                <XPBar />
            </div>

            {/* Health & Combo */}
            <div className="flex items-center justify-between mb-4">
                <HealthBar />
                <ComboIndicator multiplier={currentCombo} />
            </div>

            {/* Streak */}
            <div className="mb-4">
                <StreakCounter />
            </div>


            {/* Daily Missions */}
            {dailyMissionsEnabled && missionsForToday.length > 0 && (
                <div className="mb-4">
                    <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Daily Missions
                    </h3>
                    <div className="space-y-2">
                        {missionsForToday.map((mission) => (
                            <div
                                key={mission.id}
                                className={`card-surface rounded-xl p-3 flex items-center gap-3 ${mission.completed ? 'opacity-60' : ''
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${mission.completed
                                    ? 'bg-green-100 dark:bg-green-900/30'
                                    : 'bg-yellow-100 dark:bg-yellow-900/30'
                                    }`}>
                                    {mission.completed ? '✅' : '⚡'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-semibold ${mission.completed ? 'line-through' : ''}`}>
                                        {mission.title}
                                    </p>
                                    <p className="text-[10px] text-[var(--color-text-secondary)]">
                                        {mission.description} • +{mission.rewardXP} XP
                                    </p>
                                </div>
                                <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                                    {mission.progress}/{mission.target}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Today's Tasks */}
            <div className="mb-6">
                <h3 className="text-sm font-bold mb-3">Today's Tasks</h3>
                <TaskList
                    tasks={todayTasks}
                    onComplete={handleCompleteTask}
                    onDelete={handleDeleteTask}
                    onEdit={handleEditTask}
                    emptyMessage="All clear! Add a task to earn XP 🎯"
                />
            </div>

            {/* Ritual Pill Button */}
            {ritualStats.total > 0 && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowRituals(true)}
                    className={`fixed left-6 z-20 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg transition-colors ${
                        ritualStats.remaining === 0
                            ? 'bg-green-500 shadow-green-500/30 text-white'
                            : 'bg-gradient-to-r from-purple-500 to-cyan-500 shadow-purple-500/30 text-white'
                    }`}
                    style={{
                        bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px) + 0.5rem)',
                        left: 'calc(1.5rem + env(safe-area-inset-left, 0px))',
                    }}
                >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold">
                        {ritualStats.remaining === 0 ? '✓ Rituals' : `${ritualStats.remaining} rituals`}
                    </span>
                    {ritualStats.remaining > 0 && (
                        <span className="ritual-pulse w-2 h-2 rounded-full bg-white/80" />
                    )}
                </motion.button>
            )}

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

            {/* Quick Rituals Drawer */}
            <QuickRituals
                isOpen={showRituals}
                onClose={() => setShowRituals(false)}
                tasks={tasks}
                onComplete={handleCompleteTask}
            />

            {/* Task Form Modal */}
            {showTaskForm && (
                <Suspense fallback={null}>
                    <TaskForm
                        onSubmit={editingTask ? handleUpdateTask : handleAddTask}
                        onClose={() => {
                            setShowTaskForm(false);
                            setEditingTask(null);
                        }}
                        editTask={editingTask}
                    />
                </Suspense>
            )}

            {/* Level Up Overlay */}
            {showLevelUp && (
                <Suspense fallback={null}>
                    <LevelUpOverlay
                        show={showLevelUp}
                        newLevel={newLevel}
                        onDismiss={() => setShowLevelUp(false)}
                    />
                </Suspense>
            )}

            {/* Random Reward Modal */}
            {rewardDrop && (
                <Suspense fallback={null}>
                    <RandomRewardModal
                        reward={rewardDrop}
                        onClose={() => setRewardDrop(null)}
                    />
                </Suspense>
            )}
        </div>
    );
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'Good night';
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}
