import { calculateLevel } from './gamification';
import { getMissionProgressUpdates } from './missions';
import { dispatchRaidDamage } from './raidDamage';
import { useAchievementStore } from '../stores/achievementStore';
import { useMissionStore } from '../stores/missionStore';
import { useTaskStore } from '../stores/taskStore';
import { useUserStore } from '../stores/userStore';
import { DailyMission, DailyThemeId, RandomReward } from '../types';

export type TaskCompletionTransactionResult = {
    levelUpTo: number | null;
    reward: RandomReward | null;
    xpEarned: number;
    comboMultiplier: number;
    appliedBuff: DailyThemeId | null;
};

export const completeTaskTransaction = (
    taskId: string
): TaskCompletionTransactionResult | null => {
    const userState = useUserStore.getState();
    const taskStore = useTaskStore.getState();

    const prevLevel = userState.level;
    const result = taskStore.completeTask(taskId);
    if (!result) return null;

    // ── 1. Compute all user-store deltas up front ──────────────────
    let xpDelta = result.xpEarned;
    let coinsDelta = 0;

    if (result.reward) {
        if (result.reward.currency === 'XP') {
            xpDelta += result.reward.amount;
        } else {
            coinsDelta += result.reward.amount;
        }
    }

    // ── 2. Mission progress (updates mission store only) ───────────
    const latestTaskStore = useTaskStore.getState();
    const task = latestTaskStore.tasks.find((item) => item.id === taskId);
    const completionsToday = latestTaskStore.getCompletionsToday();
    const missionUpdates = getMissionProgressUpdates(
        task,
        completionsToday,
        latestTaskStore.tasks
    );

    // ── HP economy: heal ONLY on the completion that reaches the daily goal,
    // i.e. once per day. Previously every completion did health+1, which pinned
    // HP at max and neutralised the overdue-deadline damage mechanic entirely.
    // Now small slips actually hurt and finishing the day's goal restores 1 HP.
    const dailyGoal = Math.max(1, userState.settings.dailyGoal);
    const healthDelta = completionsToday.length === dailyGoal ? 1 : 0;

    const missionStore = useMissionStore.getState();
    Object.entries(missionUpdates).forEach(([missionType, progress]) => {
        if (progress === undefined) return;
        missionStore.updateMissionProgress(missionType as DailyMission['type'], progress);
    });

    // Settle completed missions and collect their rewards
    useMissionStore.getState().getMissionsForToday().forEach((mission) => {
        if (mission.completed || mission.progress < mission.target) return;
        const { xp, coins } = useMissionStore.getState().completeMission(mission.id);
        xpDelta += xp;
        coinsDelta += coins;
    });

    // ── 3. Apply all user changes in ONE set() call ────────────────
    useUserStore.setState((state) => {
        const newXP = state.xp + xpDelta;
        const newLevel = calculateLevel(newXP);
        const didLevelUp = newLevel > state.level;

        // Inline streak update logic (mirrors updateStreak)
        const now = new Date();
        const toDateKey = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        const today = toDateKey(now);
        const lastDate = state.lastCompletedDate?.split('T')[0];
        let newStreak = state.streakCurrent;
        let newLastCompleted: string | null = state.lastCompletedDate;

        if (state.settings.workDays.includes(now.getDay()) && lastDate !== today) {
            // Get previous work day
            const getPrevWorkDay = (from: Date, steps = 1) => {
                const cursor = new Date(from);
                let found = 0;
                for (let i = 0; i < 14; i++) {
                    cursor.setDate(cursor.getDate() - 1);
                    if (state.settings.workDays.includes(cursor.getDay())) {
                        found++;
                        if (found === steps) return toDateKey(cursor);
                    }
                }
                return null;
            };

            const prevWorkDayStr = getPrevWorkDay(now);

            if (!lastDate || lastDate === prevWorkDayStr) {
                newStreak = state.streakCurrent + 1;
            } else if (now.getHours() < 3) {
                const graceStr = getPrevWorkDay(now, 2);
                newStreak = lastDate === graceStr ? state.streakCurrent + 1 : 1;
            } else {
                newStreak = 1;
            }
            newLastCompleted = today;
        }

        return {
            xp: newXP,
            level: Math.max(state.level, newLevel),
            totalXPEarned: state.totalXPEarned + xpDelta,
            coins: state.coins + coinsDelta,
            health: Math.min(state.maxHealth, state.health + healthDelta),
            totalTasksCompleted: state.totalTasksCompleted + 1,
            streakCurrent: newStreak,
            streakLongest: Math.max(state.streakLongest, newStreak),
            lastCompletedDate: newLastCompleted,
            // Award a freeze token on level-up (max 3)
            streakFreezeTokens: didLevelUp
                ? Math.min(state.streakFreezeTokens + 1, 3)
                : state.streakFreezeTokens,
        };
    });

    // ── 4. Check achievements (reads from stores, may produce one set) ──
    const currentLevel = calculateLevel(useUserStore.getState().xp);
    useAchievementStore.getState().checkAndUnlock();

    // ── 5. Co-op raid damage (best-effort, non-blocking) ──
    if (task) {
        void dispatchRaidDamage({
            taskTitle: task.title,
            priority: task.priority,
            tags: task.tags,
        });
    }

    return {
        levelUpTo: currentLevel > prevLevel ? currentLevel : null,
        reward: result.reward,
        xpEarned: result.xpEarned,
        comboMultiplier: result.comboMultiplier,
        appliedBuff: result.appliedBuff,
    };
};

