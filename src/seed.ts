import { v4 as uuidv4 } from 'uuid';
import { useTaskStore } from './stores/taskStore';
import { useUserStore } from './stores/userStore';
import { useAchievementStore } from './stores/achievementStore';
import { useMissionStore } from './stores/missionStore';
import { Task, Completion, TaskStatus, Priority, Recurrence } from './types';
import { calculateXP, calculateComboMultiplier } from './lib/gamification';
import { toLocalDateKey } from './lib/dates';

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function seedData() {
    const now = new Date();

    // 1. CLEAR EXISTING STORES
    useTaskStore.setState({ tasks: [], completions: [], penalties: [] });
    useUserStore.getState().resetUser();

    // 2. SEED USER
    const userSettings = {
        dailyGoal: 5,
        gamificationLevel: 'STANDARD' as const,
        theme: 'DARK' as const,
        workStyle: 'FLEXIBLE' as const,
        workDays: [1, 2, 3, 4, 5],
        dailyMissionsEnabled: true,
        healthBarEnabled: true,
        notificationMorning: '08:00',
        notificationEvening: '21:00',
        notificationsEnabled: true,
    };

    useUserStore.setState({
        displayName: 'Alex',
        level: 28,
        xp: 28540,
        coins: 4250,
        health: 5,
        maxHealth: 5,
        streakCurrent: 14,
        streakLongest: 42,
        lastCompletedDate: toLocalDateKey(now),
        streakFreezeTokens: 2,
        settings: userSettings,
        onboardingComplete: true,
        createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        totalTasksCompleted: 342,
        totalXPEarned: 35000,
        equippedAvatar: 'skull',
        unlockedAvatars: ['default', 'sword', 'crown', 'skull'],
    });

    // 3. SEED TASKS (English)
    const tasks: Task[] = [
        // Active tasks for today
        {
            id: uuidv4(),
            title: 'Review PRs for core module',
            description: 'Check the latest pull requests from the backend team.',
            priority: 'HIGH',
            deadline: toLocalDateKey(now) + 'T17:00:00.000Z',
            startDate: null,
            recurrence: 'NONE',
            tags: ['Work', 'Coding'],
            status: 'ACTIVE',
            createdAt: now.toISOString(),
            completedAt: null,
            lastResetDate: null,
        },
        {
            id: uuidv4(),
            title: 'Workout (Upper Body)',
            description: 'Bench press, overhead press, and pull-ups.',
            priority: 'MEDIUM',
            deadline: null,
            startDate: null,
            recurrence: 'DAILY',
            tags: ['Health', 'Fitness'],
            status: 'ACTIVE',
            createdAt: now.toISOString(),
            completedAt: null,
            lastResetDate: toLocalDateKey(now),
        },
        {
            id: uuidv4(),
            title: 'Read chapter 4 of Clean Code',
            description: '',
            priority: 'LOW',
            deadline: null,
            startDate: null,
            recurrence: 'NONE',
            tags: ['Learning'],
            status: 'ACTIVE',
            createdAt: now.toISOString(),
            completedAt: null,
            lastResetDate: null,
        },
        {
            id: uuidv4(),
            title: 'Pay electricity bill',
            description: 'Due end of the week',
            priority: 'CRITICAL',
            deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            startDate: null,
            recurrence: 'NONE',
            tags: ['Finance', 'Life'],
            status: 'ACTIVE',
            createdAt: now.toISOString(),
            completedAt: null,
            lastResetDate: null,
        },
        {
            id: uuidv4(),
            title: 'Weekly team sync',
            description: 'Prepare notes for the marketing update',
            priority: 'MEDIUM',
            deadline: null,
            startDate: null,
            recurrence: 'WEEKLY',
            tags: ['Work', 'Meeting'],
            status: 'ACTIVE',
            createdAt: now.toISOString(),
            completedAt: null,
            lastResetDate: toLocalDateKey(now),
        }
    ];

    // Some completed tasks for today
    tasks.push({
        id: uuidv4(),
        title: 'Morning Meditation',
        description: '10 minutes of mindfulness',
        priority: 'LOW',
        deadline: null,
        startDate: null,
        recurrence: 'DAILY',
        tags: ['Health', 'Habit'],
        status: 'COMPLETED',
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
        lastResetDate: toLocalDateKey(now),
    });

    tasks.push({
        id: uuidv4(),
        title: 'Check emails',
        description: 'Inbox zero routine',
        priority: 'MEDIUM',
        deadline: null,
        startDate: null,
        recurrence: 'DAILY',
        tags: ['Work', 'Routine'],
        status: 'COMPLETED',
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        lastResetDate: toLocalDateKey(now),
    });

    // 4. SEED HISTORY (COMPLETIONS) for the Heatmap Stats
    const completions: Completion[] = [];

    // Generate a history for the past 90 days to make the heatmap look great
    for (let i = 89; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        // How many tasks completed on this day?
        let count = isWeekend ? getRandomInt(0, 3) : getRandomInt(2, 7);

        // Simulate some streak breaks
        if (i === 15 || i === 44 || i === 70) {
            count = 0; // A bad day
        }

        for (let j = 0; j < count; j++) {
            const priorityWeights: Priority[] = ['LOW', 'LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'CRITICAL'];
            const priority = priorityWeights[getRandomInt(0, priorityWeights.length - 1)];
            const baseXP = calculateXP(priority);
            const combo = calculateComboMultiplier(j + 1);

            completions.push({
                id: uuidv4(),
                taskId: uuidv4(), // We don't need real task refs for history heatmap
                completedAt: d.toISOString(),
                xpEarned: Math.floor(baseXP * combo),
                comboMultiplier: combo,
            });
        }
    }

    // Add completions for today's completed tasks
    completions.push({
        id: uuidv4(),
        taskId: tasks[tasks.length - 2].id,
        completedAt: tasks[tasks.length - 2].completedAt!,
        xpEarned: 20,
        comboMultiplier: 1.0,
    });
    completions.push({
        id: uuidv4(),
        taskId: tasks[tasks.length - 1].id,
        completedAt: tasks[tasks.length - 1].completedAt!,
        xpEarned: 31,
        comboMultiplier: 1.05,
    });

    useTaskStore.setState({ tasks, completions, penalties: [] });

    // 5. SEED MISSIONS
    useMissionStore.getState().generateDailyMissions();
    const missionsState = useMissionStore.getState();
    if (missionsState.missions.length > 0) {
        missionsState.updateMissionProgress(missionsState.missions[0].type, missionsState.missions[0].target); // Complete first mission
        if (missionsState.missions.length > 1) {
            missionsState.updateMissionProgress(missionsState.missions[1].type, 1); // Partial progress
        }
    }

    // 6. SEED ACHIEVEMENTS
    useAchievementStore.getState().initAchievements();
    const achievementsState = useAchievementStore.getState();

    const nowStr = now.toISOString();
    // Ensure we have 'achievements' in the state. Wait, the store uses 'achievements' property.
    const updatedAchievements = achievementsState.achievements.map((a, idx) => {
        // Unlock first 8 achievements
        if (idx < 8) {
            return { ...a, unlockedAt: nowStr };
        }
        return a;
    });
    useAchievementStore.setState({ achievements: updatedAchievements, lastUnlocked: null, showUnlockAnimation: false });

    window.location.href = window.location.pathname;
}
