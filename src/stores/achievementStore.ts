import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Achievement } from '../types';
import { ACHIEVEMENT_DEFS, checkAchievements } from '../lib/achievements';
import { useUserStore } from './userStore';
import { useTaskStore } from './taskStore';

interface AchievementStore {
    achievements: Achievement[];
    lastUnlocked: Achievement | null;
    showUnlockAnimation: boolean;
    initAchievements: () => void;
    checkAndUnlock: () => Achievement[];
    dismissUnlockAnimation: () => void;
    getUnlockedCount: () => number;
}

export const useAchievementStore = create<AchievementStore>()(
    persist(
        (set, get) => ({
            achievements: ACHIEVEMENT_DEFS.map((def) => ({
                key: def.key,
                title: def.title,
                description: def.description,
                icon: def.icon,
                unlockedAt: null,
                category: def.category,
            })),
            lastUnlocked: null,
            showUnlockAnimation: false,

            initAchievements: () => {
                const current = get().achievements;
                const existingKeys = new Set(current.map((a) => a.key));
                const newAchievements = ACHIEVEMENT_DEFS
                    .filter((def) => !existingKeys.has(def.key))
                    .map((def) => ({
                        key: def.key,
                        title: def.title,
                        description: def.description,
                        icon: def.icon,
                        unlockedAt: null,
                        category: def.category as Achievement['category'],
                    }));
                if (newAchievements.length > 0) {
                    set({ achievements: [...current, ...newAchievements] });
                }
            },

            checkAndUnlock: () => {
                const userState = useUserStore.getState();
                const completions = useTaskStore.getState().completions;
                const { achievements } = get();
                const unlockedKeys = new Set(
                    achievements.filter((a) => a.unlockedAt).map((a) => a.key)
                );

                const newlyUnlocked = checkAchievements(userState, completions, unlockedKeys);
                if (newlyUnlocked.length === 0) return [];

                const now = new Date().toISOString();
                const updatedAchievements = achievements.map((a) => {
                    if (newlyUnlocked.some((n) => n.key === a.key)) {
                        return { ...a, unlockedAt: now };
                    }
                    return a;
                });

                const lastAchievement = updatedAchievements.find(
                    (a) => a.key === newlyUnlocked[newlyUnlocked.length - 1].key
                )!;

                set({
                    achievements: updatedAchievements,
                    lastUnlocked: lastAchievement,
                    showUnlockAnimation: true,
                });

                return newlyUnlocked.map((n) => ({
                    key: n.key,
                    title: n.title,
                    description: n.description,
                    icon: n.icon,
                    unlockedAt: now,
                    category: n.category,
                }));
            },

            dismissUnlockAnimation: () => {
                set({ showUnlockAnimation: false });
            },

            getUnlockedCount: () => {
                return get().achievements.filter((a) => a.unlockedAt).length;
            },
        }),
        {
            name: 'todolist-achievement-store',
            partialize: (state) => ({
                achievements: state.achievements,
            }),
        }
    )
);
