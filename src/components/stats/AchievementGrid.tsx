import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, Target, Trophy } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAchievementStore } from '../../stores/achievementStore';
import { useUserStore } from '../../stores/userStore';
import { useTaskStore } from '../../stores/taskStore';
import { ACHIEVEMENT_DEFS } from '../../lib/achievements';
import { Achievement, UserState } from '../../types';

type AchievementProgress = { current: number; max: number };
type EnhancedAchievement = Achievement & {
    progress: AchievementProgress | null;
    progressRatio: number;
};

const categories = [
    { key: 'streak', label: 'Streak', tint: 'from-orange-500/15 to-red-500/5', accent: 'text-orange-500', activeBg: 'bg-orange-500 shadow-orange-500/25', activeText: 'text-orange-100' },
    { key: 'tasks', label: 'Tasks', tint: 'from-emerald-500/15 to-green-500/5', accent: 'text-emerald-500', activeBg: 'bg-emerald-500 shadow-emerald-500/25', activeText: 'text-emerald-100' },
    { key: 'xp', label: 'XP', tint: 'from-blue-500/15 to-blue-500/5', accent: 'text-blue-500', activeBg: 'bg-blue-500 shadow-blue-500/25', activeText: 'text-blue-100' },
    { key: 'special', label: 'Special', tint: 'from-sky-500/15 to-cyan-500/5', accent: 'text-sky-500', activeBg: 'bg-sky-500 shadow-sky-500/25', activeText: 'text-sky-100' },
] as const;

const achievementDefByKey = new Map(
    ACHIEVEMENT_DEFS.map((definition) => [definition.key, definition])
);

export function AchievementGrid() {
    const achievements = useAchievementStore((state) => state.achievements);
    const user = useUserStore(
        useShallow((state): UserState => ({
            displayName: state.displayName,
            level: state.level,
            xp: state.xp,
            coins: state.coins,
            health: state.health,
            maxHealth: state.maxHealth,
            streakCurrent: state.streakCurrent,
            streakLongest: state.streakLongest,
            lastCompletedDate: state.lastCompletedDate,
            streakFreezeTokens: state.streakFreezeTokens,
            settings: state.settings,
            onboardingComplete: state.onboardingComplete,
            createdAt: state.createdAt,
            totalTasksCompleted: state.totalTasksCompleted,
            totalXPEarned: state.totalXPEarned,
            equippedAvatar: state.equippedAvatar,
            unlockedAvatars: state.unlockedAvatars,
            lastRevealDate: state.lastRevealDate,
            dailyThemeId: state.dailyThemeId,
            lastSharedStreakMilestone: state.lastSharedStreakMilestone,
            moodLog: state.moodLog,
        }))
    );
    const completions = useTaskStore((state) => state.completions);
    const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]['key']>('tasks');
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const { enhancedAchievements, focusAchievement, totalUnlocked, categoryStats, achievementsByCategory } = useMemo(() => {
        const statsByCategory = new Map<
            (typeof categories)[number]['key'],
            { total: number; unlocked: number }
        >(
            categories.map((category) => [category.key, { total: 0, unlocked: 0 }])
        );
        const groupedAchievements = new Map<
            (typeof categories)[number]['key'],
            EnhancedAchievement[]
        >(
            categories.map((category) => [category.key, []])
        );
        const nextEnhancedAchievements = achievements.map((achievement) => {
            const definition = achievementDefByKey.get(achievement.key);
            let progress: AchievementProgress | null = null;
            let progressRatio = 0;

            if (!achievement.unlockedAt && definition?.getProgress) {
                const rawProgress = definition.getProgress(user, completions);

                if (rawProgress) {
                    const current = rawProgress.max > 0
                        ? Math.min(rawProgress.current, rawProgress.max)
                        : rawProgress.current;

                    progress = {
                        ...rawProgress,
                        current,
                    };

                    if (rawProgress.max > 0) {
                        progressRatio = Math.max(0, Math.min(1, current / rawProgress.max));
                    }
                }
            }

            const enhancedAchievement = {
                ...achievement,
                progress,
                progressRatio,
            };

            groupedAchievements.get(achievement.category)?.push(enhancedAchievement);

            const stats = statsByCategory.get(achievement.category);
            if (stats) {
                stats.total += 1;
                if (achievement.unlockedAt) {
                    stats.unlocked += 1;
                }
            }

            return enhancedAchievement;
        });

        const nextFocusAchievement: EnhancedAchievement | null = Array.from(groupedAchievements.values()).reduce<EnhancedAchievement | null>(
            (best, group) => {
                group.sort((a, b) => {
                    if (!!a.unlockedAt !== !!b.unlockedAt) return a.unlockedAt ? 1 : -1;
                    return b.progressRatio - a.progressRatio;
                });

                return group.reduce<EnhancedAchievement | null>((current, achievement) => {
                    if (
                        !achievement.unlockedAt
                        && achievement.progress
                        && achievement.progress.max > 0
                        && (!current || achievement.progressRatio > current.progressRatio)
                    ) {
                        return achievement;
                    }
                    return current;
                }, best);
            },
            null
        );

        return {
            enhancedAchievements: nextEnhancedAchievements,
            focusAchievement: nextFocusAchievement,
            totalUnlocked: nextEnhancedAchievements.filter((achievement) => achievement.unlockedAt).length,
            categoryStats: statsByCategory,
            achievementsByCategory: groupedAchievements,
        };
    }, [achievements, completions, user]);

    const activeCategoryMeta = categories.find((category) => category.key === activeCategory) ?? categories[0];
    const activeCategoryAchievements = achievementsByCategory.get(activeCategory) ?? [];
    const unlockedInCategory = activeCategoryAchievements.filter((achievement) => achievement.unlockedAt).length;
    const selectedAchievement = activeCategoryAchievements.find((achievement) => achievement.key === selectedKey)
        ?? activeCategoryAchievements[0]
        ?? focusAchievement
        ?? null;

    const renderProgressBar = (progress: AchievementProgress, compact = false) => {
        const pct = Math.min(100, Math.max(0, (progress.current / progress.max) * 100));
        return (
            <div className={compact ? 'mt-2' : 'mt-3'}>
                <div className="flex justify-between items-center text-[10px] text-[var(--color-text-secondary)] mb-1">
                    <span className="font-medium">Progress</span>
                    <span className="font-bold">{progress.current} / {progress.max}</span>
                </div>
                <div className={`w-full rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-2'} bg-black/5 dark:bg-white/10`}>
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                </div>
            </div>
        );
    };

    const renderMedal = (achievement: EnhancedAchievement) => {
        const isLocked = !achievement.unlockedAt;
        const isSelected = achievement.key === selectedAchievement?.key;
        const progressPct = achievement.progress ? Math.round((achievement.progress.current / achievement.progress.max) * 100) : null;

        return (
            <button
                key={achievement.key}
                type="button"
                onClick={() => setSelectedKey(achievement.key)}
                className="text-left w-[calc((100%_-_2rem)_/_3)] min-w-[5.75rem] max-w-[8.25rem]"
            >
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`card-surface rounded-[1.125rem] px-2.5 py-3 h-full flex flex-col items-center transition-all ${isSelected ? 'border-blue-500/50 bg-blue-500/[0.06] shadow-lg shadow-blue-500/10' : ''
                        }`}
                >
                    <div className={`relative w-[3.5rem] h-[3.5rem] rounded-[1rem] flex items-center justify-center border transition-all ${isSelected ? 'border-blue-500/40' : 'border-[var(--color-border)]'
                        } ${isLocked ? 'bg-black/[0.03] dark:bg-white/[0.04]' : 'bg-gradient-to-br from-yellow-400/20 to-amber-500/10'}`}>
                        <div className={`absolute inset-0.5 rounded-[0.85rem] bg-gradient-to-br ${isLocked ? activeCategoryMeta.tint : 'from-yellow-300/20 to-transparent'}`} />
                        <div className="relative text-xl">
                            {isLocked ? <Lock className="w-[1.125rem] h-[1.125rem] text-[var(--color-text-secondary)]" /> : achievement.icon}
                        </div>
                        {!isLocked && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 text-slate-900 flex items-center justify-center shadow-md">
                                <Sparkles className="w-3 h-3" />
                            </div>
                        )}
                    </div>
                    <div className="mt-2 text-center w-full min-h-[2rem] flex items-start justify-center">
                        <p className="text-[10px] sm:text-[11px] font-semibold leading-[1.125rem] line-clamp-2">{achievement.title}</p>
                    </div>
                    <div className="mt-auto pt-1">
                        {isLocked && achievement.progress ? (
                            <span className="inline-flex items-center rounded-full px-2 py-[0.125rem] text-[9.5px] font-bold bg-white/5 text-[var(--color-text-secondary)]">
                                {progressPct}% done
                            </span>
                        ) : (
                            <span className="inline-flex items-center rounded-full px-2 py-[0.125rem] text-[9.5px] font-bold bg-yellow-400/10 text-yellow-500">
                                Earned
                            </span>
                        )}
                    </div>
                </motion.div>
            </button>
        );
    };

    return (
        <div className="space-y-5 pb-6">
            {focusAchievement && (
                <div className="card-surface rounded-[28px] p-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent" />
                    <div className="relative">
                        <div className="flex items-center gap-2 text-blue-500 mb-2">
                            <Target className="w-4 h-4" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.18em]">Up Next</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold">{focusAchievement.title}</p>
                                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{focusAchievement.description}</p>
                                {focusAchievement.progress && renderProgressBar(focusAchievement.progress, true)}
                            </div>
                        </div>
                    </div>
                </div>
            )}



            <div>
                <div className="flex items-end justify-between gap-3 mb-3">
                    <div>
                        <h4 className="text-sm font-bold">Awards</h4>
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">Pick a section, then tap a badge</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black">{totalUnlocked}/{enhancedAchievements.length}</p>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Unlocked</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {categories.map((category) => {
                        const stats = categoryStats.get(category.key) ?? { total: 0, unlocked: 0 };
                        const active = category.key === activeCategory;

                        return (
                            <button
                                key={category.key}
                                type="button"
                                onClick={() => setActiveCategory(category.key)}
                                className={`rounded-2xl px-4 py-3 text-left transition-all border min-w-0 ${active
                                    ? `border-transparent ${category.activeBg} text-white shadow-lg`
                                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`text-sm font-bold truncate ${active ? 'text-white' : category.accent}`}>{category.label}</span>
                                    <span className={`text-[11px] font-semibold shrink-0 ${active ? category.activeText : 'text-[var(--color-text-secondary)]'}`}>
                                        {stats.unlocked}/{stats.total}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 px-1">
                    <div>
                        <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${activeCategoryMeta.accent}`}>{activeCategoryMeta.label}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                            {activeCategoryAchievements.length - unlockedInCategory} still to unlock
                        </p>
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Tap badge</span>
                </div>

                {selectedAchievement && (
                    <div className="card-surface rounded-[26px] p-4 relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${selectedAchievement.unlockedAt ? 'from-yellow-400/10 to-amber-500/5' : activeCategoryMeta.tint}`} />
                        <div className="relative">
                            <div className="flex items-start gap-3">
                                <div className={`w-14 h-14 rounded-2xl border border-white/5 flex items-center justify-center shrink-0 text-2xl ${selectedAchievement.unlockedAt ? 'bg-yellow-400/15' : 'bg-white/5'
                                    }`}>
                                    {selectedAchievement.unlockedAt ? selectedAchievement.icon : <Lock className="w-5 h-5 text-[var(--color-text-secondary)]" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-bold">{selectedAchievement.title}</p>
                                        <span className={`text-[10px] uppercase tracking-[0.18em] font-bold ${selectedAchievement.unlockedAt ? 'text-yellow-500' : 'text-[var(--color-text-secondary)]'
                                            }`}>
                                            {selectedAchievement.unlockedAt ? 'Earned' : 'Locked'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-5">
                                        {selectedAchievement.description}
                                    </p>
                                    {selectedAchievement.progress && !selectedAchievement.unlockedAt
                                        ? renderProgressBar(selectedAchievement.progress, true)
                                        : (
                                            <div className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold bg-yellow-400/10 text-yellow-500">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                On your shelf
                                            </div>
                                        )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap justify-center gap-x-4 gap-y-7 px-1">
                    {activeCategoryAchievements.map((achievement) => renderMedal(achievement))}
                </div>
            </div>
        </div>
    );
}
