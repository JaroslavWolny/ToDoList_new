import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserState, UserSettings, DailyThemeId, MoodLevel } from '../types';
import { calculateLevel, calculateStreakBreakPenalty } from '../lib/gamification';
import { pickRandomTheme } from '../lib/dailyThemes';
import {
    DEFAULT_NOTIFICATION_EVENING,
    DEFAULT_NOTIFICATION_MORNING,
    normalizeReminderSettings,
} from '../lib/reminders';

const MAX_FREEZE_TOKENS = 3;
const STREAK_GRACE_HOUR = 3;
const MAX_WORKDAY_LOOKBACK = 14;

const toDateOnlyString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getPreviousWorkDay = (
    fromDate: Date,
    workDays: number[],
    steps = 1
): Date | null => {
    const cursor = new Date(fromDate);
    let found = 0;

    for (let i = 0; i < MAX_WORKDAY_LOOKBACK; i += 1) {
        cursor.setDate(cursor.getDate() - 1);
        if (workDays.includes(cursor.getDay())) {
            found += 1;
            if (found === steps) {
                return new Date(cursor);
            }
        }
    }

    return null;
};

interface UserStore extends UserState {
    addXP: (amount: number) => void;
    removeXP: (amount: number) => void;
    addCoins: (amount: number) => void;
    buyAvatar: (avatarId: string, cost: number) => boolean;
    equipAvatar: (avatarId: string) => void;
    updateStreak: () => void;
    breakStreak: () => void;
    loseHealth: () => void;
    gainHealth: () => void;
    incrementTasksCompleted: () => void;
    updateSettings: (settings: Partial<UserSettings>) => void;
    completeOnboarding: (settings: Partial<UserSettings> & { displayName?: string }) => void;
    resetUser: () => void;
    checkStreakOnLoad: () => void;
    revealDailyTheme: () => DailyThemeId;
    markStreakMilestoneShared: (milestone: number) => void;
    logMood: (level: MoodLevel) => void;
}

const defaultSettings: UserSettings = {
    mainMotivation: 'FOCUS',
    dailyGoal: 3,
    gamificationLevel: 'STANDARD',
    theme: 'DARK',
    workStyle: 'FLEXIBLE',
    workDays: [1, 2, 3, 4, 5, 6, 0],
    dailyMissionsEnabled: true,
    healthBarEnabled: true,
    quickRitualsEnabled: true,
    notificationMorning: DEFAULT_NOTIFICATION_MORNING,
    notificationEvening: DEFAULT_NOTIFICATION_EVENING,
    notificationsEnabled: true,
};

const initialState: UserState = {
    displayName: '',
    level: 0,
    xp: 0,
    coins: 0,
    health: 5,
    maxHealth: 5,
    streakCurrent: 0,
    streakLongest: 0,
    lastCompletedDate: null,
    streakFreezeTokens: 2,
    settings: defaultSettings,
    onboardingComplete: false,
    createdAt: new Date().toISOString(),
    totalTasksCompleted: 0,
    totalXPEarned: 0,
    equippedAvatar: 'default',
    unlockedAvatars: ['default'],
    lastRevealDate: null,
    dailyThemeId: null,
    lastSharedStreakMilestone: 0,
    moodLog: {},
};

// Cap synced mood history so the Firestore user doc stays small.
const MOOD_LOG_MAX_DAYS = 60;

export const useUserStore = create<UserStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            addXP: (amount: number) => {
                set((state) => {
                    const newXP = state.xp + amount;
                    const newLevel = calculateLevel(newXP);
                    const didLevelUp = newLevel > state.level;
                    return {
                        xp: newXP,
                        level: Math.max(state.level, newLevel),
                        totalXPEarned: state.totalXPEarned + amount,
                        // Award a freeze token on level-up (max 3)
                        streakFreezeTokens: didLevelUp
                            ? Math.min(state.streakFreezeTokens + 1, MAX_FREEZE_TOKENS)
                            : state.streakFreezeTokens,
                    };
                });
            },

            removeXP: (amount: number) => {
                set((state) => ({
                    xp: Math.max(0, state.xp - amount),
                }));
            },

            addCoins: (amount: number) => {
                set((state) => ({
                    coins: state.coins + amount,
                }));
            },

            buyAvatar: (avatarId: string, cost: number) => {
                const state = get();
                if (state.coins >= cost && !state.unlockedAvatars.includes(avatarId)) {
                    set({
                        coins: state.coins - cost,
                        unlockedAvatars: [...state.unlockedAvatars, avatarId],
                    });
                    return true;
                }
                return false;
            },

            equipAvatar: (avatarId: string) => {
                const state = get();
                if (state.unlockedAvatars.includes(avatarId)) {
                    set({ equippedAvatar: avatarId });
                }
            },

            updateStreak: () => {
                set((state) => {
                    const now = new Date();
                    if (!state.settings.workDays.includes(now.getDay())) {
                        return {};
                    }

                    const today = toDateOnlyString(now);
                    const lastDate = state.lastCompletedDate?.split('T')[0];

                    if (lastDate === today) return {};

                    const previousWorkDay = getPreviousWorkDay(now, state.settings.workDays);
                    const previousWorkDayStr = previousWorkDay ? toDateOnlyString(previousWorkDay) : null;

                    let newStreak = state.streakCurrent;

                    if (!lastDate || lastDate === previousWorkDayStr) {
                        newStreak = state.streakCurrent + 1;
                    } else {
                        if (now.getHours() < STREAK_GRACE_HOUR) {
                            const graceWorkDay = getPreviousWorkDay(now, state.settings.workDays, 2);
                            const graceWorkDayStr = graceWorkDay ? toDateOnlyString(graceWorkDay) : null;
                            newStreak = lastDate === graceWorkDayStr
                                ? state.streakCurrent + 1
                                : 1;
                        } else {
                            newStreak = 1;
                        }
                    }

                    return {
                        streakCurrent: newStreak,
                        streakLongest: Math.max(state.streakLongest, newStreak),
                        lastCompletedDate: today,
                    };
                });
            },

            breakStreak: () => {
                const state = get();
                const penalty = calculateStreakBreakPenalty(
                    state.xp,
                    state.settings.gamificationLevel
                );
                set({
                    streakCurrent: 0,
                    xp: Math.max(0, state.xp - penalty),
                    health: Math.max(0, state.health - 1),
                });
            },



            loseHealth: () => {
                set((state) => ({
                    health: Math.max(0, state.health - 1),
                }));
            },

            gainHealth: () => {
                set((state) => ({
                    health: Math.min(state.maxHealth, state.health + 1),
                }));
            },

            incrementTasksCompleted: () => {
                set((state) => ({
                    totalTasksCompleted: state.totalTasksCompleted + 1,
                }));
            },

            updateSettings: (newSettings: Partial<UserSettings>) => {
                set((state) => ({
                    settings: normalizeReminderSettings({
                        ...state.settings,
                        ...newSettings,
                    }),
                }));
            },

            completeOnboarding: (data) => {
                const { displayName, ...settingsData } = data;
                set((state) => ({
                    onboardingComplete: true,
                    displayName: displayName || state.displayName,
                    settings: normalizeReminderSettings({
                        ...state.settings,
                        ...settingsData,
                    }),
                }));
            },

            checkStreakOnLoad: () => {
                const state = get();
                if (!state.onboardingComplete) return;
                if (!state.lastCompletedDate) return;

                const now = new Date();
                if (!state.settings.workDays.includes(now.getDay())) return;

                const lastDate = state.lastCompletedDate.split('T')[0];
                const today = toDateOnlyString(now);
                const previousWorkDay = getPreviousWorkDay(now, state.settings.workDays);
                const previousWorkDayStr = previousWorkDay ? toDateOnlyString(previousWorkDay) : null;
                const graceWorkDay = now.getHours() < STREAK_GRACE_HOUR
                    ? getPreviousWorkDay(now, state.settings.workDays, 2)
                    : null;
                const graceWorkDayStr = graceWorkDay ? toDateOnlyString(graceWorkDay) : null;
                const streakBroken = !(
                    lastDate === today ||
                    lastDate === previousWorkDayStr ||
                    (graceWorkDayStr !== null && lastDate === graceWorkDayStr)
                );

                if (streakBroken && state.streakCurrent > 0) {
                    // Try to auto-use a freeze token (not available in HARDCORE)
                    if (
                        state.streakFreezeTokens > 0 &&
                        state.settings.gamificationLevel !== 'HARDCORE'
                    ) {
                        // Freeze protects the streak by anchoring to previous configured work day.
                        const protectedDate = previousWorkDayStr ?? today;
                        set({
                            streakFreezeTokens: state.streakFreezeTokens - 1,
                            lastCompletedDate: protectedDate,
                        });
                        return;
                    }

                    // No freeze available — streak breaks
                    const penalty = calculateStreakBreakPenalty(
                        state.xp,
                        state.settings.gamificationLevel
                    );
                    set({
                        streakCurrent: 0,
                        xp: Math.max(0, state.xp - penalty),
                        health: Math.max(0, state.health - 1),
                    });
                }
            },

            revealDailyTheme: () => {
                const themeId = pickRandomTheme();
                const today = toDateOnlyString(new Date());
                set((state) => ({
                    lastRevealDate: today,
                    dailyThemeId: themeId,
                    // STREAK_SHIELD arms a protective freeze token so one missed day
                    // won't break the streak (reuses the auto-freeze in checkStreakOnLoad).
                    // No-op in HARDCORE, where freeze tokens are disabled by design.
                    streakFreezeTokens:
                        themeId === 'STREAK_SHIELD' && state.settings.gamificationLevel !== 'HARDCORE'
                            ? Math.min(state.streakFreezeTokens + 1, MAX_FREEZE_TOKENS)
                            : state.streakFreezeTokens,
                }));
                return themeId;
            },

            logMood: (level: MoodLevel) => {
                const today = toDateOnlyString(new Date());
                set((state) => {
                    const entries = Object.entries({ ...state.moodLog, [today]: level })
                        .sort(([a], [b]) => a.localeCompare(b))
                        .slice(-MOOD_LOG_MAX_DAYS);
                    return { moodLog: Object.fromEntries(entries) as Record<string, MoodLevel> };
                });
            },

            markStreakMilestoneShared: (milestone: number) => {
                set((state) => ({
                    lastSharedStreakMilestone: Math.max(state.lastSharedStreakMilestone, milestone),
                }));
            },

            resetUser: () => {
                set({ ...initialState, createdAt: new Date().toISOString() });
            },
        }),
        {
            name: 'todolist-user-store',
            merge: (persistedState, currentState) => {
                const persisted = (persistedState as Partial<UserStore> | undefined) ?? {};

                return {
                    ...currentState,
                    ...persisted,
                    settings: normalizeReminderSettings({
                        ...defaultSettings,
                        ...(persisted.settings ?? {}),
                    }),
                };
            },
        }
    )
);
