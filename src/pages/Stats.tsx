import { motion } from 'framer-motion';
import { useUserStore } from '../stores/userStore';
import { useTaskStore } from '../stores/taskStore';
import { useAchievementStore } from '../stores/achievementStore';
import { HeatmapCalendar } from '../components/stats/HeatmapCalendar';
import { XPChart } from '../components/stats/XPChart';
import { AchievementGrid } from '../components/stats/AchievementGrid';
import { Flame, Zap, CheckCircle2, Trophy } from 'lucide-react';

export function Stats() {
    const { xp, level, streakCurrent, streakLongest, totalTasksCompleted, totalXPEarned } = useUserStore();
    const achievementStore = useAchievementStore();
    const unlockedCount = achievementStore.getUnlockedCount();
    const totalAchievements = achievementStore.achievements.length;

    const statCards = [
        {
            icon: <Zap className="w-5 h-5" />,
            label: 'Total XP',
            value: totalXPEarned.toLocaleString(),
            color: 'from-purple-500 to-violet-600',
            shadow: 'shadow-purple-500/20',
        },
        {
            icon: <CheckCircle2 className="w-5 h-5" />,
            label: 'Tasks Done',
            value: totalTasksCompleted.toLocaleString(),
            color: 'from-emerald-500 to-green-600',
            shadow: 'shadow-emerald-500/20',
        },
        {
            icon: <Flame className="w-5 h-5" />,
            label: 'Best Streak',
            value: `${streakLongest}d`,
            color: 'from-orange-500 to-red-600',
            shadow: 'shadow-orange-500/20',
        },
        {
            icon: <Trophy className="w-5 h-5" />,
            label: 'Achievements',
            value: `${unlockedCount}/${totalAchievements}`,
            color: 'from-yellow-500 to-amber-600',
            shadow: 'shadow-yellow-500/20',
        },
    ];

    return (
        <div className="page-container">
            <h1 className="text-2xl font-bold mb-6">Statistics</h1>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`card-surface rounded-2xl p-4 ${stat.shadow}`}
                    >
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-2`}>
                            {stat.icon}
                        </div>
                        <p className="text-xl font-extrabold">{stat.value}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Heatmap Calendar */}
            <div className="mb-6">
                <HeatmapCalendar />
            </div>

            {/* XP Chart */}
            <div className="mb-6">
                <XPChart days={14} />
            </div>

            {/* Achievements */}
            <div className="mb-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Achievements
                </h2>
                <AchievementGrid />
            </div>
        </div>
    );
}
