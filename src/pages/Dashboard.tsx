import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Zap, Target } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { useTaskStore } from '../stores/taskStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useMissionStore } from '../stores/missionStore';
import { XPBar } from '../components/gamification/XPBar';
import { StreakCounter } from '../components/gamification/StreakCounter';
import { LevelBadge } from '../components/gamification/LevelBadge';
import { HealthBar } from '../components/gamification/HealthBar';
import { ComboIndicator } from '../components/gamification/ComboIndicator';
import { LevelUpOverlay } from '../components/gamification/LevelUpOverlay';
import { RandomRewardModal } from '../components/gamification/RandomRewardModal';
import { TaskList } from '../components/tasks/TaskList';
import { TaskForm } from '../components/tasks/TaskForm';
import { Task, RandomReward } from '../types';
import { calculateComboMultiplier, calculateLevel } from '../lib/gamification';

export function Dashboard() {
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState(0);
    const [rewardDrop, setRewardDrop] = useState<RandomReward | null>(null);

    const userStore = useUserStore();
    const taskStore = useTaskStore();
    const achievementStore = useAchievementStore();
    const missionStore = useMissionStore();

    const todayTasks = taskStore.getTasksForToday();
    const completionsToday = taskStore.getCompletionsToday();
    const currentCombo = calculateComboMultiplier(completionsToday.length);
    const missions = missionStore.getMissionsForToday();

    useEffect(() => {
        taskStore.resetRecurringTasks();
        missionStore.generateDailyMissions();
        achievementStore.initAchievements();
        achievementStore.checkAndUnlock();
    }, []);

    const handleCompleteTask = useCallback((id: string) => {
        const prevLevel = userStore.level;
        const result = taskStore.completeTask(id);
        if (!result) return;

        const { xpEarned, comboMultiplier, reward } = result;

        userStore.addXP(xpEarned);
        userStore.updateStreak();
        userStore.incrementTasksCompleted();
        userStore.gainHealth();

        if (reward) {
            if (reward.currency === 'XP') {
                userStore.addXP(reward.amount);
            } else {
                userStore.addCoins(reward.amount);
            }
            setRewardDrop(reward);
        }

        // Update missions
        const completionsNow = taskStore.getCompletionsToday();
        missionStore.updateMissionProgress('complete_tasks', completionsNow.length);
        missionStore.updateMissionProgress('marathon', completionsNow.length);

        const task = taskStore.tasks.find((t) => t.id === id);
        if (task?.priority === 'CRITICAL') {
            missionStore.updateMissionProgress('complete_critical', 1);
        }
        if (task?.priority === 'LOW') {
            const lowPriorityCount = completionsNow.filter(c => {
                const t = taskStore.tasks.find(tk => tk.id === c.taskId);
                return t?.priority === 'LOW';
            }).length;
            missionStore.updateMissionProgress('no_sweat', lowPriorityCount);
        }
        if (task?.priority === 'HIGH') {
            const highPriorityCount = completionsNow.filter(c => {
                const t = taskStore.tasks.find(tk => tk.id === c.taskId);
                return t?.priority === 'HIGH' || t?.priority === 'CRITICAL';
            }).length;
            missionStore.updateMissionProgress('complete_high', highPriorityCount);
        }

        const hour = new Date().getHours();
        if (hour < 10) {
            missionStore.updateMissionProgress('early_bird', 1);
        }
        if (hour >= 20) {
            missionStore.updateMissionProgress('night_owl', 1);
        }

        // Check for completed missions
        const currentMissions = missionStore.getMissionsForToday();
        currentMissions.forEach((m) => {
            if (!m.completed && m.progress >= m.target) {
                const { xp: bonusXP, coins: bonusCoins } = missionStore.completeMission(m.id);
                if (bonusXP > 0) {
                    userStore.addXP(bonusXP);
                }
                if (bonusCoins > 0) {
                    userStore.addCoins(bonusCoins);
                }
            }
        });

        // Check level up
        const currentLevel = calculateLevel(useUserStore.getState().xp);
        if (currentLevel > prevLevel) {
            setNewLevel(currentLevel);
            setShowLevelUp(true);
        }

        // Check achievements
        achievementStore.checkAndUnlock();
    }, [userStore, taskStore, achievementStore, missionStore]);

    const handleAddTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'lastResetDate'>) => {
        taskStore.addTask(taskData);
    }, [taskStore]);

    const handleDeleteTask = useCallback((id: string) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            taskStore.deleteTask(id);
        }
    }, [taskStore]);

    const handleEditTask = useCallback((task: Task) => {
        setEditingTask(task);
        setShowTaskForm(true);
    }, []);

    const handleUpdateTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'lastResetDate'>) => {
        if (editingTask) {
            taskStore.updateTask(editingTask.id, taskData);
            setEditingTask(null);
        }
    }, [editingTask, taskStore]);

    const completedTodayCount = completionsToday.length;
    const dailyGoal = userStore.settings.dailyGoal;
    const dailyProgress = Math.min((completedTodayCount / dailyGoal) * 100, 100);

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
                            {userStore.displayName || 'Hero'}
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

            {/* Daily Progress */}
            <div className="card-surface rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary-500" />
                        <span className="text-sm font-semibold">Daily Goal</span>
                    </div>
                    <span className="text-sm font-bold text-primary-500">
                        {completedTodayCount}/{dailyGoal}
                    </span>
                </div>
                <div className="relative h-2 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
                    <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                        animate={{ width: `${dailyProgress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            {/* Daily Missions */}
            {userStore.settings.dailyMissionsEnabled && missions.length > 0 && (
                <div className="mb-4">
                    <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Daily Missions
                    </h3>
                    <div className="space-y-2">
                        {missions.map((mission) => (
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

            {/* Task Form Modal */}
            {showTaskForm && (
                <TaskForm
                    onSubmit={editingTask ? handleUpdateTask : handleAddTask}
                    onClose={() => {
                        setShowTaskForm(false);
                        setEditingTask(null);
                    }}
                    editTask={editingTask}
                />
            )}

            {/* Level Up Overlay */}
            <LevelUpOverlay
                show={showLevelUp}
                newLevel={newLevel}
                onDismiss={() => setShowLevelUp(false)}
            />

            {/* Random Reward Modal */}
            <RandomRewardModal
                reward={rewardDrop}
                onClose={() => setRewardDrop(null)}
            />
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
