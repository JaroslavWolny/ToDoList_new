import { motion } from 'framer-motion';
import { useAchievementStore } from '../../stores/achievementStore';
import { useUserStore } from '../../stores/userStore';
import { useTaskStore } from '../../stores/taskStore';
import { ACHIEVEMENT_DEFS } from '../../lib/achievements';
import { Lock, Target } from 'lucide-react';

export function AchievementGrid() {
    const { achievements } = useAchievementStore();
    const user = useUserStore();
    const completions = useTaskStore((state) => state.completions);

    const categories = [
        { key: 'streak', label: 'Streak' },
        { key: 'tasks', label: 'Tasks' },
        { key: 'xp', label: 'XP' },
        { key: 'special', label: 'Special' },
    ];

    // Map achievements with their current progress and calculate ratios
    const enhancedAchievements = achievements.map((achievement) => {
        const def = ACHIEVEMENT_DEFS.find((d) => d.key === achievement.key);
        let progress = null;
        let progressRatio = 0;

        if (!achievement.unlockedAt && def?.getProgress) {
            progress = def.getProgress(user, completions);
            // Ensure bounds and non-NaN
            if (progress && progress.max > 0) {
                progress.current = Math.min(progress.current, progress.max);
                progressRatio = Math.max(0, Math.min(1, progress.current / progress.max));
            }
        }

        return {
            ...achievement,
            progress,
            progressRatio,
        };
    });

    // Find the achievement closest to being completed (must have at least some progress)
    const lockedAchievements = enhancedAchievements.filter((a) => !a.unlockedAt && a.progress && a.progress.max > 0);
    const closestAchievement = lockedAchievements.length > 0
        ? lockedAchievements.reduce((prev, current) => (prev.progressRatio > current.progressRatio) ? prev : current)
        : null;

    // Remove the closest achievement from the categories display to avoid duplication
    const gridAchievements = enhancedAchievements.filter(a => a.key !== closestAchievement?.key);

    const renderProgressBar = (progress: { current: number; max: number }) => {
        const pct = Math.min(100, Math.max(0, (progress.current / progress.max) * 100));
        return (
            <div className="mt-2.5">
                <div className="flex justify-between items-center text-[10px] text-[var(--color-text-secondary)] mb-1">
                    <span className="font-medium">Postup</span>
                    <span className="font-bold">{progress.current} / {progress.max}</span>
                </div>
                <div className="h-1.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </div>
            </div>
        );
    };

    const renderAchievementCard = (achievement: any, isHighlight = false) => {
        const isLocked = !achievement.unlockedAt;

        return (
            <motion.div
                key={achievement.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card-surface rounded-2xl relative overflow-hidden flex flex-col justify-between ${isLocked && !isHighlight ? 'opacity-70' : ''
                    } ${isHighlight ? 'p-4 border-2 border-blue-500/20 shadow-lg shadow-blue-500/10' : 'p-3'}`}
            >
                {!isLocked && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-bl-full" />
                )}
                {isHighlight && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-bl-full" />
                )}
                <div className="flex items-start gap-3 relative z-10 w-full">
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl ${!isLocked
                            ? 'bg-gradient-to-br from-yellow-400/20 to-amber-500/20 shadow-inner'
                            : isHighlight
                                ? 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-500'
                                : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                        {!isLocked ? (
                            achievement.icon
                        ) : isHighlight ? (
                            <Target className="w-5 h-5 text-blue-500" />
                        ) : (
                            <Lock className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`font-bold truncate ${isHighlight ? 'text-sm' : 'text-xs'}`}>
                            {achievement.title}
                        </p>
                        <p className={`text-[var(--color-text-secondary)] line-clamp-2 mt-0.5 ${isHighlight ? 'text-[11px]' : 'text-[10px]'}`}>
                            {achievement.description}
                        </p>
                    </div>
                </div>
                {isLocked && achievement.progress && renderProgressBar(achievement.progress)}
            </motion.div>
        );
    };

    return (
        <div className="space-y-6 pb-6">
            {closestAchievement && closestAchievement.progressRatio > 0 && (
                <div className="mb-8">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Právě plníš...
                    </h4>
                    {renderAchievementCard(closestAchievement, true)}
                </div>
            )}

            {categories.map((cat) => {
                const catAchievements = gridAchievements.filter((a) => a.category === cat.key);
                if (catAchievements.length === 0) return null;
                return (
                    <div key={cat.key}>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
                            {cat.label}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            {catAchievements.map((achievement) => renderAchievementCard(achievement))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
