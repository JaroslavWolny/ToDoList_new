import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserState, UserSettings, GamificationLevel } from '../types';
import { calculateLevel, calculateStreakBreakPenalty, isStreakDay } from '../lib/gamification';

interface UserStore extends UserState {
    addXP: (amount: number) => void;
    removeXP: (amount: number) => void;
    updateStreak: () => void;
    breakStreak: () => void;
    useStreakFreeze: () => boolean;
    loseHealth: () => void;
    gainHealth: () => void;
    incrementTasksCompleted: () => void;
    updateSettings: (settings: Partial<UserSettings>) => void;
    completeOnboarding: (settings: Partial<UserSettings> & { displayName?: string }) => void;
    resetUser: () => void;
    checkStreakOnLoad: () => void;
}

const defaultSettings: UserSettings = {
    dailyGoal: 3,
    gamificationLevel: 'STANDARD',
    theme: 'DARK',
    workStyle: 'FLEXIBLE',
    workDays: [1, 2, 3, 4, 5, 6, 0],
    dailyMissionsEnabled: true,
    healthBarEnabled: true,
    notificationMorning: '08:00',
    notificationEvening: '21:00',
    notificationsEnabled: true,
};

const initialState: UserState = {
    displayName: '',
    level: 0,
    xp: 0,
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
};

export const useUserStore = create<UserStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            addXP: (amount: number) => {
                set((state) => {
                    const newXP = state.xp + amount;
                    const newLevel = calculateLevel(newXP);
                    return {
                        xp: newXP,
                        level: Math.max(state.level, newLevel),
                        totalXPEarned: state.totalXPEarned + amount,
                    };
                });
            },

            removeXP: (amount: number) => {
                set((state) => ({
                    xp: Math.max(0, state.xp - amount),
                }));
            },

            updateStreak: () => {
                set((state) => {
                    const today = new Date().toISOString().split('T')[0];
                    const lastDate = state.lastCompletedDate?.split('T')[0];

                    if (lastDate === today) return {};

                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    let newStreak = state.streakCurrent;

                    if (lastDate === yesterdayStr || !lastDate) {
                        newStreak = state.streakCurrent + 1;
                    } else {
                        // Check grace period (before 3 AM)
                        const now = new Date();
                        if (now.getHours() < 3) {
                            const twoDaysAgo = new Date();
                            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                            const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
                            if (lastDate === twoDaysAgoStr) {
                                newStreak = state.streakCurrent + 1;
                            } else {
                                newStreak = 1;
                            }
                        } else {
                            newStreak = 1;
                        }
                    }

                    return {
                        streakCurrent: newStreak,
                        streakLongest: Math.max(state.streakLongest, newStreak),
                        lastCompletedDate: new Date().toISOString(),
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

            useStreakFreeze: () => {
                const state = get();
                if (state.streakFreezeTokens <= 0) return false;
                if (state.settings.gamificationLevel === 'HARDCORE') return false;
                set({
                    streakFreezeTokens: state.streakFreezeTokens - 1,
                    lastCompletedDate: new Date().toISOString(),
                });
                return true;
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
                    settings: { ...state.settings, ...newSettings },
                }));
            },

            completeOnboarding: (data) => {
                const { displayName, ...settingsData } = data;
                set((state) => ({
                    onboardingComplete: true,
                    displayName: displayName || state.displayName,
                    settings: { ...state.settings, ...settingsData },
                }));
            },

            checkStreakOnLoad: () => {
                const state = get();
                if (!state.onboardingComplete) return;
                if (!state.lastCompletedDate) return;

                const streakStatus = isStreakDay(state.lastCompletedDate);

                if (streakStatus === 'broken' && state.streakCurrent > 0) {
                    // Streak is broken — apply penalty
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

            resetUser: () => {
                set({ ...initialState, createdAt: new Date().toISOString() });
            },
        }),
        {
            name: 'todolist-user-store',
        }
    )
);
