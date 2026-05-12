import { Suspense, lazy, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, Sparkles, Gift, ChevronDown } from 'lucide-react';
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
import { DailyRevealCard } from '../components/gamification/DailyRevealCard';
import { MilestoneShareOverlay } from '../components/gamification/MilestoneShareOverlay';
import { TaskList } from '../components/tasks/TaskList';
import { QuickRituals, RITUAL_TAG } from '../components/tasks/QuickRituals';
import { Task, RandomReward } from '../types';
import { calculateComboMultiplier } from '../lib/gamification';
import { completeTaskTransaction } from '../lib/taskCompletion';
import { toLocalDateKey } from '../lib/dates';
import { updateNotificationStats } from '../lib/firebase';
import { DAILY_CHEST_XP, DAILY_CHEST_COINS } from '../stores/missionStore';

const LevelUpOverlay = lazy(() => import('../components/gamification/LevelUpOverlay').then((module) => ({ default: module.LevelUpOverlay })));
const RandomRewardModal = lazy(() => import('../components/gamification/RandomRewardModal').then((module) => ({ default: module.RandomRewardModal })));
const TaskForm = lazy(() => import('../components/tasks/TaskForm').then((module) => ({ default: module.TaskForm })));

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'Good night';
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

export function Dashboard() {
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState(0);
    const [rewardDrop, setRewardDrop] = useState<RandomReward | null>(null);
    const [showRituals, setShowRituals] = useState(false);
    const [missionsExpanded, setMissionsExpanded] = useState(false);
    const hasInitializedRef = useRef(false);

    const { displayName, dailyMissionsEnabled, quickRitualsEnabled } = useUserStore(
        useShallow((state) => ({
            displayName: state.displayName,
            dailyMissionsEnabled: state.settings.dailyMissionsEnabled,
            quickRitualsEnabled: state.settings.quickRitualsEnabled,
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
    const { missions, lastGeneratedDate, dailyChestClaimed, generateDailyMissions, claimDailyChest } = useMissionStore(
        useShallow((state) => ({
            missions: state.missions,
            lastGeneratedDate: state.lastGeneratedDate,
            dailyChestClaimed: state.dailyChestClaimed,
            generateDailyMissions: state.generateDailyMissions,
            claimDailyChest: state.claimDailyChest,
        }))
    );
    const { streakCurrent, dailyGoal, addXP, addCoins } = useUserStore(
        useShallow((state) => ({
            streakCurrent: state.streakCurrent,
            dailyGoal: state.settings.dailyGoal,
            addXP: state.addXP,
            addCoins: state.addCoins,
        }))
    );

    const todayTasks = useMemo(() => getTasksForToday(tasks), [tasks]);
    const completionsToday = useMemo(() => getCompletionsToday(completions), [completions]);
    const currentCombo = calculateComboMultiplier(completionsToday.length);

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

    const missionsCompleted = useMemo(
        () => missionsForToday.filter((m) => m.completed).length,
        [missionsForToday]
    );
    const allMissionsDone = missionsForToday.length > 0 && missionsCompleted === missionsForToday.length;

    const tasksDueSoon = useMemo(() => {
        const now = Date.now();
        const horizon = now + 24 * 60 * 60 * 1000;
        return tasks.filter((t) => {
            if (t.status !== 'ACTIVE' || !t.deadline) return false;
            const due = new Date(t.deadline).getTime();
            return Number.isFinite(due) && due >= now && due <= horizon;
        }).length;
    }, [tasks]);

    useEffect(() => {
        updateNotificationStats({
            tasksDueSoon,
            dailyGoalProgress: completionsToday.length,
            dailyGoalTarget: dailyGoal,
            streakCurrent,
            missionsCompleted,
            missionsTotal: missionsForToday.length,
        });
    }, [tasksDueSoon, completionsToday.length, dailyGoal, streakCurrent, missionsCompleted, missionsForToday.length]);

    const handleClaimDailyChest = useCallback(() => {
        const reward = claimDailyChest();
        if (!reward) return;
        addXP(reward.xp);
        addCoins(reward.coins);
        setRewardDrop({ type: 'CHEST', amount: reward.xp, currency: 'XP' });
    }, [claimDailyChest, addXP, addCoins]);

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

        try { navigator.vibrate?.(12); } catch { /* noop */ }

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

    const goalProgress = dailyGoal > 0 ? Math.min(100, (completionsToday.length / dailyGoal) * 100) : 0;

    return (
        <div className="page-container">
            {/* ============== HEADER ============== */}
            <div className="flex items-start justify-between mb-5">
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                        {getGreeting()}
                    </span>
                    <h1 className="mt-0.5 text-3xl font-black leading-none tracking-tight truncate">
                        <span className="gradient-text">{displayName || 'Hero'}</span>
                    </h1>
                </div>
                <LevelBadge />
            </div>

            {/* ============== XP BAR ============== */}
            <div className="mb-5">
                <XPBar />
            </div>

            {/* ============== DAILY REVEAL ============== */}
            <div className="mb-4">
                <DailyRevealCard />
            </div>

            {/* ============== STREAK (hero) ============== */}
            <div className="mb-4">
                <StreakCounter />
            </div>

            {/* ============== STATUS ROW (HP / Combo / Goal pill) ============== */}
            <div className="mb-6 flex items-center justify-between gap-2">
                <HealthBar />
                <div className="flex items-center gap-2">
                    {currentCombo > 1 && <ComboIndicator multiplier={currentCombo} />}
                    {dailyGoal > 0 && (
                        <div className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-white/5 dark:bg-white/[0.04] border border-[var(--color-border)]">
                            <div className="relative w-3.5 h-3.5">
                                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 -rotate-90">
                                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-tertiary)] opacity-30" />
                                    <circle
                                        cx="8" cy="8" r="6" fill="none"
                                        stroke="url(#goalGrad)" strokeWidth="2" strokeLinecap="round"
                                        strokeDasharray={`${(goalProgress / 100) * 37.7} 37.7`}
                                    />
                                    <defs>
                                        <linearGradient id="goalGrad" x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0%" stopColor="#a855f7" />
                                            <stop offset="100%" stopColor="#ec4899" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <span className="text-[10px] font-bold text-stat text-[var(--color-text-secondary)]">
                                {completionsToday.length}/{dailyGoal}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ============== TODAY'S TASKS (primary action) ============== */}
            <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                        Today's Quests
                    </h2>
                    <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)] text-stat">
                        {todayTasks.length}
                    </span>
                </div>
                <TaskList
                    tasks={todayTasks}
                    onComplete={handleCompleteTask}
                    onDelete={handleDeleteTask}
                    onEdit={handleEditTask}
                    emptyMessage="All clear. Tap + to add a quest."
                />
            </div>

            {/* ============== DAILY MISSIONS (collapsible) ============== */}
            {dailyMissionsEnabled && missionsForToday.length > 0 && (
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => setMissionsExpanded((v) => !v)}
                        className="w-full flex items-center justify-between mb-2.5 group"
                    >
                        <div className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-amber-500" strokeWidth={3} />
                            <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                                Daily Missions
                            </span>
                            <span className="text-[10px] font-bold text-amber-500 text-stat">
                                {missionsCompleted}/{missionsForToday.length}
                            </span>
                        </div>
                        <motion.span
                            animate={{ rotate: missionsExpanded ? 180 : 0 }}
                            className="text-[var(--color-text-tertiary)]"
                        >
                            <ChevronDown className="w-3.5 h-3.5" />
                        </motion.span>
                    </button>

                    {/* Mini progress bar always visible */}
                    <div className="h-1 rounded-full bg-black/5 dark:bg-white/[0.04] overflow-hidden mb-2.5">
                        <motion.div
                            initial={false}
                            animate={{
                                width: missionsForToday.length === 0
                                    ? '0%'
                                    : `${(missionsCompleted / missionsForToday.length) * 100}%`,
                            }}
                            transition={{ type: 'spring', stiffness: 100, damping: 18 }}
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                        />
                    </div>

                    <AnimatePresence initial={false}>
                        {missionsExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-2">
                                    {missionsForToday.map((mission) => (
                                        <div
                                            key={mission.id}
                                            className={`glass-card px-3.5 py-3 flex items-center gap-3 ${mission.completed ? 'opacity-60' : ''}`}
                                        >
                                            <div
                                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${mission.completed
                                                    ? 'bg-green-500/15 text-green-500 border border-green-500/30'
                                                    : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                                }`}
                                            >
                                                {mission.completed ? '✓' : '⚡'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[13px] font-bold leading-tight ${mission.completed ? 'line-through text-[var(--color-text-secondary)]' : ''}`}>
                                                    {mission.title}
                                                </p>
                                                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                                                    {mission.description} · +{mission.rewardXP} XP
                                                </p>
                                            </div>
                                            <span className="text-[11px] font-black text-stat text-[var(--color-text-secondary)]">
                                                {mission.progress}/{mission.target}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* ============== DAILY CHEST CLAIM ============== */}
            {dailyMissionsEnabled && missionsForToday.length > 0 && (
                <div className="mb-4">
                    <AnimatePresence>
                        {allMissionsDone && !dailyChestClaimed && (
                            <motion.button
                                initial={{ scale: 0.95, opacity: 0, y: 8 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleClaimDailyChest}
                                className="reveal-card-shell w-full p-4 flex items-center gap-3"
                            >
                                <div className="relative z-10 w-12 h-12 rounded-xl bg-yellow-400/25 backdrop-blur-sm flex items-center justify-center border border-yellow-300/40">
                                    <Gift className="w-6 h-6 text-yellow-200 drop-shadow" strokeWidth={2.4} />
                                </div>
                                <div className="relative z-10 flex-1 text-left">
                                    <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-yellow-200/90">
                                        Daily Chest Ready
                                    </p>
                                    <p className="text-sm font-bold text-white mt-0.5">
                                        +{DAILY_CHEST_XP} XP · +{DAILY_CHEST_COINS} coins
                                    </p>
                                </div>
                                <span className="relative z-10 px-3 py-1.5 rounded-full bg-yellow-300/95 text-yellow-950 text-[10px] font-black tracking-wider">
                                    OPEN
                                </span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                    {allMissionsDone && dailyChestClaimed && (
                        <div className="glass-card px-4 py-3 text-center">
                            <p className="text-xs font-semibold">
                                🔥 Day {streakCurrent} locked in. Tomorrow: fresh quests.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ============== RITUAL PILL ============== */}
            {quickRitualsEnabled && ritualStats.total > 0 && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowRituals(true)}
                    className={`fixed z-20 flex items-center gap-2 px-4 py-3 rounded-2xl text-white ${
                        ritualStats.remaining === 0
                            ? 'bg-green-500 shadow-lg shadow-green-500/40'
                            : 'fab-ritual'
                    }`}
                    style={{
                        bottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))',
                        left: 'calc(1.5rem + env(safe-area-inset-left, 0px))',
                    }}
                >
                    <Sparkles className="w-4 h-4" strokeWidth={2.6} />
                    <span className="text-xs font-bold">
                        {ritualStats.remaining === 0 ? 'Rituals ✓' : `${ritualStats.remaining} rituals`}
                    </span>
                    {ritualStats.remaining > 0 && (
                        <span className="ritual-pulse w-1.5 h-1.5 rounded-full bg-white/85" />
                    )}
                </motion.button>
            )}

            {/* ============== FAB ============== */}
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                    setEditingTask(null);
                    setShowTaskForm(true);
                }}
                className="fixed w-14 h-14 rounded-2xl text-white flex items-center justify-center z-20 fab-primary"
                style={{
                    bottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))',
                    right: 'calc(1.5rem + env(safe-area-inset-right, 0px))',
                }}
            >
                <Plus className="w-6 h-6" strokeWidth={2.6} />
            </motion.button>

            {/* ============== MODALS ============== */}
            <QuickRituals
                isOpen={showRituals}
                onClose={() => setShowRituals(false)}
                tasks={tasks}
                onComplete={handleCompleteTask}
            />

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

            {showLevelUp && (
                <Suspense fallback={null}>
                    <LevelUpOverlay
                        show={showLevelUp}
                        newLevel={newLevel}
                        onDismiss={() => setShowLevelUp(false)}
                    />
                </Suspense>
            )}

            {rewardDrop && (
                <Suspense fallback={null}>
                    <RandomRewardModal
                        reward={rewardDrop}
                        onClose={() => setRewardDrop(null)}
                    />
                </Suspense>
            )}

            <MilestoneShareOverlay />
        </div>
    );
}
