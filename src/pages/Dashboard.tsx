import { Suspense, lazy, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, Sparkles, Gift, ChevronDown, ArrowUp, Clock, Repeat, Hash, Brain, CalendarDays } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../stores/userStore';
import { getCompletionsToday, getTasksForToday, useTaskStore } from '../stores/taskStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useMissionStore } from '../stores/missionStore';
import { XPBar } from '../components/gamification/XPBar';
import { LevelBadge } from '../components/gamification/LevelBadge';
import { VitalsStrip } from '../components/gamification/VitalsStrip';
import { CompletionFeedback, CompletionFeedbackData } from '../components/gamification/CompletionFeedback';
import { DailyRevealCard } from '../components/gamification/DailyRevealCard';
import { MilestoneShareOverlay } from '../components/gamification/MilestoneShareOverlay';
import { TodayScoreCard } from '../components/gamification/TodayScoreCard';
import { QuestCoach } from '../components/coach/QuestCoach';
import { BrainDumpModal } from '../components/tasks/BrainDumpModal';
import { WeeklyReview } from '../components/coach/WeeklyReview';
import { TaskList } from '../components/tasks/TaskList';
import { QuickRituals } from '../components/tasks/QuickRituals';
import { Task, RandomReward } from '../types';
import { completeTaskTransaction } from '../lib/taskCompletion';
import { toLocalDateKey } from '../lib/dates';
import { parseQuickInput, formatDeadlineChip } from '../lib/quickParse';
import { updateNotificationStats, syncTaskReminders } from '../lib/firebase';
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

function getQuickPlaceholder(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'Plan for tomorrow…';
    if (hour < 12) return "What's the goal today?";
    if (hour < 18) return "What's next on your list?";
    return 'Anything left to conquer?';
}

export function Dashboard() {
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState(0);
    const [rewardDrop, setRewardDrop] = useState<RandomReward | null>(null);
    const [completionFeedback, setCompletionFeedback] = useState<CompletionFeedbackData | null>(null);
    const [showRituals, setShowRituals] = useState(false);
    const [showCoach, setShowCoach] = useState(false);
    const [coachPrompt, setCoachPrompt] = useState<string | undefined>(undefined);
    const [showBrainDump, setShowBrainDump] = useState(false);
    const [showWeekly, setShowWeekly] = useState(false);
    const [missionsExpanded, setMissionsExpanded] = useState(true);
    const [quickTitle, setQuickTitle] = useState('');
    const [quickFocused, setQuickFocused] = useState(false);
    const [quickJustAdded, setQuickJustAdded] = useState(false);
    const hasInitializedRef = useRef(false);
    const quickInputRef = useRef<HTMLInputElement>(null);
    const quickAddedTimerRef = useRef<number | null>(null);
    const quickPlaceholder = useMemo(() => getQuickPlaceholder(), []);
    const quickParsed = useMemo(
        () => (quickTitle.trim() ? parseQuickInput(quickTitle) : null),
        [quickTitle]
    );
    const hasParsedHints = !!(
        quickParsed &&
        (quickParsed.deadline ||
            quickParsed.priority ||
            quickParsed.recurrence !== 'NONE' ||
            quickParsed.tags.length > 0)
    );

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
        // eslint-disable-next-line react-hooks/purity -- "now" is intentionally read at compute time
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

    // Per-task deadline reminders: collect active quests with a future deadline
    // and hand them to the backend so the hourly cron can ping near each deadline.
    const upcomingReminders = useMemo(() => {
        // eslint-disable-next-line react-hooks/purity -- "now" is intentionally read at compute time
        const now = Date.now();
        const horizon = now + 30 * 24 * 60 * 60 * 1000;
        return tasks
            .filter((t) => {
                if (t.status !== 'ACTIVE' || !t.deadline) return false;
                const due = Date.parse(t.deadline);
                return Number.isFinite(due) && due > now && due <= horizon;
            })
            .map((t) => ({ taskId: t.id, title: t.title, deadline: t.deadline as string }))
            .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
    }, [tasks]);

    const lastReminderSignatureRef = useRef<string>('');
    useEffect(() => {
        const signature = upcomingReminders
            .map((r) => `${r.taskId}:${r.deadline}:${r.title}`)
            .join('|');
        if (signature === lastReminderSignatureRef.current) return;
        lastReminderSignatureRef.current = signature;
        syncTaskReminders(upcomingReminders);
    }, [upcomingReminders]);

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

        const { levelUpTo, reward, xpEarned, comboMultiplier, appliedBuff } = result;

        setCompletionFeedback({
            id: Date.now(),
            xpEarned,
            comboMultiplier,
            appliedBuff,
        });

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

    const handleQuickAdd = useCallback(() => {
        const raw = quickTitle.trim();
        if (!raw) {
            setEditingTask(null);
            setShowTaskForm(true);
            return;
        }
        const parsed = parseQuickInput(raw);
        if (!parsed.title) return;
        addTask({
            title: parsed.title,
            description: '',
            priority: parsed.priority ?? 'MEDIUM',
            deadline: parsed.deadline,
            startDate: null,
            recurrence: parsed.recurrence,
            tags: parsed.tags,
        });
        setQuickTitle('');
        setQuickJustAdded(true);
        try { navigator.vibrate?.(10); } catch { /* noop */ }
        if (quickAddedTimerRef.current !== null) window.clearTimeout(quickAddedTimerRef.current);
        quickAddedTimerRef.current = window.setTimeout(() => setQuickJustAdded(false), 900);
    }, [addTask, quickTitle]);

    useEffect(() => {
        return () => {
            if (quickAddedTimerRef.current !== null) window.clearTimeout(quickAddedTimerRef.current);
        };
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

    const handleUpdateTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'lastResetDate' | 'lastPenaltyAt'>) => {
        if (editingTask) {
            updateTask(editingTask.id, taskData);
            setEditingTask(null);
        }
    }, [editingTask, updateTask]);

    return (
        <div className="page-container">
            {/* ============== HEADER ============== */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                        {getGreeting()}
                    </span>
                    <h1 className="mt-0.5 text-3xl font-black leading-none tracking-tight truncate">
                        <span className="gradient-text">{displayName || 'Hero'}</span>
                    </h1>
                </div>
                <LevelBadge />
            </div>

            {/* ============== QUICK-ADD QUEST BAR ============== */}
            <div
                onClick={() => quickInputRef.current?.focus()}
                className={`relative w-full mb-5 flex items-center gap-2.5 pl-3.5 pr-1.5 py-1.5 rounded-2xl cursor-text transition-all duration-200 glass-card ${
                    quickFocused ? 'border-cyan-400/50 shadow-lg shadow-cyan-400/10' : ''
                }`}
            >
                <Sparkles
                    className={`w-4 h-4 shrink-0 transition-colors ${
                        quickFocused || quickTitle ? 'text-cyan-400' : 'text-[var(--color-text-tertiary)]'
                    }`}
                    strokeWidth={2.4}
                />
                <input
                    ref={quickInputRef}
                    type="text"
                    value={quickTitle}
                    placeholder={quickPlaceholder}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onFocus={() => setQuickFocused(true)}
                    onBlur={() => setQuickFocused(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAdd();
                        } else if (e.key === 'Escape') {
                            setQuickTitle('');
                            quickInputRef.current?.blur();
                        }
                    }}
                    enterKeyHint="send"
                    maxLength={140}
                    aria-label="Add a quest"
                    className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm font-semibold placeholder:font-medium placeholder:text-[var(--color-text-tertiary)]"
                />
                <AnimatePresence mode="wait" initial={false}>
                    {quickTitle.trim() ? (
                        <motion.button
                            key="send"
                            type="button"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); handleQuickAdd(); }}
                            className="shrink-0 w-9 h-9 rounded-xl fab-primary text-white flex items-center justify-center"
                            aria-label="Add quest"
                        >
                            <ArrowUp className="w-4 h-4" strokeWidth={3} />
                        </motion.button>
                    ) : (
                        <motion.button
                            key="open"
                            type="button"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: quickJustAdded ? [1, 1.18, 1] : 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(null);
                                setShowTaskForm(true);
                            }}
                            className="shrink-0 w-9 h-9 rounded-xl fab-primary text-white flex items-center justify-center"
                            aria-label="Open quest form"
                        >
                            <Plus className="w-4 h-4" strokeWidth={3} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {hasParsedHints && quickParsed && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="-mt-3 mb-4 flex flex-wrap gap-1.5 pl-3 overflow-hidden"
                    >
                        {quickParsed.deadline && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/12 border border-cyan-500/30 text-[10px] font-bold text-cyan-500">
                                <Clock className="w-2.5 h-2.5" strokeWidth={3} />
                                {formatDeadlineChip(quickParsed.deadline)}
                            </span>
                        )}
                        {quickParsed.priority && (
                            <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    quickParsed.priority === 'CRITICAL'
                                        ? 'bg-red-500/12 border-red-500/30 text-red-400'
                                        : quickParsed.priority === 'HIGH'
                                        ? 'bg-orange-500/12 border-orange-500/30 text-orange-400'
                                        : quickParsed.priority === 'LOW'
                                        ? 'bg-slate-500/12 border-slate-500/30 text-slate-400'
                                        : 'bg-amber-500/12 border-amber-500/30 text-amber-400'
                                }`}
                            >
                                <Zap className="w-2.5 h-2.5" strokeWidth={3} />
                                {quickParsed.priority.toLowerCase()}
                            </span>
                        )}
                        {quickParsed.recurrence !== 'NONE' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/12 border border-blue-500/30 text-[10px] font-bold text-blue-400">
                                <Repeat className="w-2.5 h-2.5" strokeWidth={3} />
                                {quickParsed.recurrence.toLowerCase()}
                            </span>
                        )}
                        {quickParsed.tags.map((t) => (
                            <span
                                key={t}
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/5 border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-text-secondary)]"
                            >
                                <Hash className="w-2.5 h-2.5" strokeWidth={3} />
                                {t}
                            </span>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ============== BRAIN DUMP / WEEKLY REVIEW ============== */}
            <div className="flex items-center gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => setShowBrainDump(true)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-violet-500/12 border border-violet-500/30 text-violet-300 active:scale-[0.98] transition-transform"
                >
                    <Brain className="w-3.5 h-3.5" strokeWidth={2.6} /> Brain dump
                </button>
                <button
                    type="button"
                    onClick={() => setShowWeekly(true)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/12 border border-amber-500/30 text-amber-300 active:scale-[0.98] transition-transform"
                >
                    <CalendarDays className="w-3.5 h-3.5" strokeWidth={2.6} /> Weekly review
                </button>
            </div>

            {/* ============== TODAY'S FOCUS (hero score + coach) ============== */}
            <div className="mb-4">
                <TodayScoreCard onAskCoach={() => { setCoachPrompt(undefined); setShowCoach(true); }} />
            </div>

            {/* ============== VITALS STRIP (streak · HP · combo · goal · rituals) ============== */}
            <div className="mb-4">
                <VitalsStrip onOpenRituals={() => setShowRituals(true)} />
            </div>

            {/* ============== XP BAR ============== */}
            <div className="mb-5">
                <XPBar />
            </div>

            {/* ============== DAILY REVEAL (buff) ============== */}
            <div className="mb-4">
                <DailyRevealCard />
            </div>

            {/* ============== DAILY MISSIONS (collapsible) — moved above quests so it's always visible ============== */}
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

            {/* ============== TODAY'S QUESTS ============== */}
            <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                        Today's Quests
                    </h2>
                    <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)] text-stat">
                        {todayTasks.length}
                    </span>
                </div>
                {todayTasks.length === 0 ? (
                    <div className="glass-card px-4 py-4 flex flex-col items-center text-center gap-3">
                        <p className="text-sm text-[var(--color-text-secondary)]">🎯 All clear for today.</p>
                        <div className="flex items-center gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => setShowBrainDump(true)}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-violet-500/12 border border-violet-500/30 text-violet-300 active:scale-[0.98] transition-transform"
                            >
                                <Brain className="w-3.5 h-3.5" strokeWidth={2.6} /> Brain dump
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCoachPrompt('Plan tomorrow for me — suggest 3 concrete, short quests based on my recent patterns and what matters most. Number them.');
                                    setShowCoach(true);
                                }}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white fab-primary active:scale-[0.98] transition-transform"
                            >
                                <Sparkles className="w-3.5 h-3.5" strokeWidth={2.6} /> Plan tomorrow
                            </button>
                        </div>
                    </div>
                ) : (
                    <TaskList
                        tasks={todayTasks}
                        onComplete={handleCompleteTask}
                        onDelete={handleDeleteTask}
                        onEdit={handleEditTask}
                    />
                )}
            </div>

            {/* ============== MODALS ============== */}
            <QuickRituals
                isOpen={showRituals}
                onClose={() => setShowRituals(false)}
                tasks={tasks}
                onComplete={handleCompleteTask}
            />

            <QuestCoach isOpen={showCoach} onClose={() => setShowCoach(false)} autoPrompt={coachPrompt} />

            <BrainDumpModal isOpen={showBrainDump} onClose={() => setShowBrainDump(false)} />

            <WeeklyReview isOpen={showWeekly} onClose={() => setShowWeekly(false)} />

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

            <CompletionFeedback
                feedback={completionFeedback}
                onDone={() => setCompletionFeedback(null)}
            />

            <MilestoneShareOverlay />
        </div>
    );
}
