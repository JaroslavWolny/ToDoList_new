import { calculateLevel } from './gamification';
import { getMissionProgressUpdates } from './missions';
import { useAchievementStore } from '../stores/achievementStore';
import { useMissionStore } from '../stores/missionStore';
import { useTaskStore } from '../stores/taskStore';
import { useUserStore } from '../stores/userStore';
import { DailyMission, RandomReward } from '../types';

export type TaskCompletionTransactionResult = {
    levelUpTo: number | null;
    reward: RandomReward | null;
};

const applyMissionProgressUpdates = (
    updates: Partial<Record<DailyMission['type'], number>>
) => {
    const missionStore = useMissionStore.getState();

    Object.entries(updates).forEach(([missionType, progress]) => {
        if (progress === undefined) return;
        missionStore.updateMissionProgress(missionType as DailyMission['type'], progress);
    });
};

const settleCompletedMissions = () => {
    const missionStore = useMissionStore.getState();
    const userStore = useUserStore.getState();

    missionStore.getMissionsForToday().forEach((mission) => {
        if (mission.completed || mission.progress < mission.target) return;

        const { xp, coins } = missionStore.completeMission(mission.id);
        if (xp > 0) {
            userStore.addXP(xp);
        }
        if (coins > 0) {
            userStore.addCoins(coins);
        }
    });
};

export const completeTaskTransaction = (
    taskId: string
): TaskCompletionTransactionResult | null => {
    const userStore = useUserStore.getState();
    const taskStore = useTaskStore.getState();
    const achievementStore = useAchievementStore.getState();

    const prevLevel = userStore.level;
    const result = taskStore.completeTask(taskId);
    if (!result) return null;

    userStore.addXP(result.xpEarned);
    userStore.updateStreak();
    userStore.incrementTasksCompleted();
    userStore.gainHealth();

    if (result.reward) {
        if (result.reward.currency === 'XP') {
            userStore.addXP(result.reward.amount);
        } else {
            userStore.addCoins(result.reward.amount);
        }
    }

    const latestTaskStore = useTaskStore.getState();
    const task = latestTaskStore.tasks.find((item) => item.id === taskId);
    const missionUpdates = getMissionProgressUpdates(
        task,
        latestTaskStore.getCompletionsToday(),
        latestTaskStore.tasks
    );

    applyMissionProgressUpdates(missionUpdates);
    settleCompletedMissions();

    const currentLevel = calculateLevel(useUserStore.getState().xp);
    achievementStore.checkAndUnlock();

    return {
        levelUpTo: currentLevel > prevLevel ? currentLevel : null,
        reward: result.reward,
    };
};
