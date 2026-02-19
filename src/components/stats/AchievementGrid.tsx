import { motion } from 'framer-motion';
import { useAchievementStore } from '../../stores/achievementStore';
import { Lock } from 'lucide-react';

export function AchievementGrid() {
    const { achievements } = useAchievementStore();

    const categories = [
        { key: 'streak', label: 'Streak' },
        { key: 'tasks', label: 'Tasks' },
        { key: 'xp', label: 'XP' },
        { key: 'special', label: 'Special' },
    ];

    return (
        <div className="space-y-6">
            {categories.map((cat) => {
                const catAchievements = achievements.filter((a) => a.category === cat.key);
                if (catAchievements.length === 0) return null;
                return (
                    <div key={cat.key}>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
                            {cat.label}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            {catAchievements.map((achievement, i) => (
                                <motion.div
                                    key={achievement.key}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`card-surface rounded-2xl p-3 relative overflow-hidden ${!achievement.unlockedAt ? 'opacity-50' : ''
                                        }`}
                                >
                                    {achievement.unlockedAt && (
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-bl-full" />
                                    )}
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${achievement.unlockedAt
                                                ? 'bg-gradient-to-br from-yellow-400/20 to-amber-500/20'
                                                : 'bg-gray-100 dark:bg-gray-800'
                                            }`}>
                                            {achievement.unlockedAt ? (
                                                achievement.icon
                                            ) : (
                                                <Lock className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate">{achievement.title}</p>
                                            <p className="text-[10px] text-[var(--color-text-secondary)] line-clamp-1">
                                                {achievement.description}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
