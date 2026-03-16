export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED';
export type Recurrence = 'NONE' | 'DAILY' | 'WEEKLY';
export type GamificationLevel = 'CASUAL' | 'STANDARD' | 'HARDCORE';
export type ThemeMode = 'LIGHT' | 'DARK' | 'AUTO';
export type WorkStyle = 'MORNING' | 'NIGHT' | 'FLEXIBLE';
export type MainMotivation = 'FOCUS' | 'DECLUTTER' | 'HABITS' | 'REWARDS';

export interface Task {
    id: string;
    title: string;
    description: string;
    priority: Priority;
    deadline: string | null;
    startDate: string | null;
    recurrence: Recurrence;
    tags: string[];
    status: TaskStatus;
    createdAt: string;
    completedAt: string | null;
    lastResetDate: string | null;
    lastPenaltyAt: string | null;
}

export interface Completion {
    id: string;
    taskId: string;
    completedAt: string;
    xpEarned: number;
    comboMultiplier: number;
}

export interface Achievement {
    key: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: string | null;
    category: 'streak' | 'tasks' | 'xp' | 'special';
}

export interface DailyMission {
    id: string;
    title: string;
    description: string;
    target: number;
    progress: number;
    rewardXP: number;
    rewardCoins: number;
    type: 'complete_tasks' | 'complete_critical' | 'early_bird' | 'complete_high' | 'night_owl' | 'no_sweat' | 'marathon';
    completed: boolean;
}

export interface Penalty {
    id: string;
    taskId: string | null;
    xpLost: number;
    reason: string;
    createdAt: string;
}

export interface UserSettings {
    mainMotivation: MainMotivation;
    dailyGoal: number;
    gamificationLevel: GamificationLevel;
    theme: ThemeMode;
    workStyle: WorkStyle;
    workDays: number[];
    dailyMissionsEnabled: boolean;
    healthBarEnabled: boolean;
    notificationMorning: string;
    notificationEvening: string;
    notificationsEnabled: boolean;
}

export interface UserState {
    displayName: string;
    level: number;
    xp: number;
    coins: number;
    health: number;
    maxHealth: number;
    streakCurrent: number;
    streakLongest: number;
    lastCompletedDate: string | null;
    streakFreezeTokens: number;
    settings: UserSettings;
    onboardingComplete: boolean;
    createdAt: string;
    totalTasksCompleted: number;
    totalXPEarned: number;
    equippedAvatar: string | null;
    unlockedAvatars: string[];
}

export interface Avatar {
    id: string;
    name: string;
    cost: number;
    icon: string;
    color: string;
}

export interface RandomReward {
    type: 'CHEST' | 'POUCH';
    amount: number;
    currency: 'XP' | 'COINS';
}
