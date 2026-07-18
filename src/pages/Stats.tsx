import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../stores/userStore';
import { useAchievementStore } from '../stores/achievementStore';
import { HeatmapCalendar } from '../components/stats/HeatmapCalendar';
import { XPChart } from '../components/stats/XPChart';
import { MoodTrendChart } from '../components/stats/MoodTrendChart';
import { AchievementGrid } from '../components/stats/AchievementGrid';
import { WeeklyReview } from '../components/coach/WeeklyReview';
import { Flame, Zap, CheckCircle2, Trophy, CalendarDays, Sparkles, ChevronRight } from 'lucide-react';

export function Stats() {
    const { streakLongest, totalTasksCompleted, totalXPEarned } = useUserStore(
        useShallow((state) => ({
            streakLongest: state.streakLongest,
            totalTasksCompleted: state.totalTasksCompleted,
            totalXPEarned: state.totalXPEarned,
        }))
    );
    const [showWeekly, setShowWeekly] = useState(false);
    const achievements = useAchievementStore((state) => state.achievements);
    const unlockedCount = useMemo(
        () => achievements.filter((achievement) => achievement.unlockedAt).length,
        [achievements]
    );
    const totalAchievements = achievements.length;

    const statCards = [
        {
            icon: <Zap className="w-5 h-5" />,
            label: 'Total XP',
            value: totalXPEarned.toLocaleString(),
            color: 'from-cyan-500 to-blue-600',
            shadow: 'shadow-cyan-500/20',
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
            <div className="mb-6 animate-rise">
                <p className="section-label mb-1.5">Your journey</p>
                <h1 className="text-3xl font-black tracking-tight gradient-text leading-none">Statistics</h1>
            </div>

            {/* Weekly Review entry */}
            <button
                type="button"
                onClick={() => setShowWeekly(true)}
                className="w-full glass-card p-4 mb-6 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
            >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 shrink-0">
                    <CalendarDays className="w-5 h-5 text-amber-400" strokeWidth={2.4} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold flex items-center gap-1.5">
                        Weekly Review
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" strokeWidth={2.6} />
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Your last 7 days + AI plan for next week</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--color-text-tertiary)] shrink-0" />
            </button>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`glass-card p-4 ${stat.shadow}`}
                    >
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-2.5`}>
                            {stat.icon}
                        </div>
                        <p className="text-[26px] font-black text-stat leading-none">{stat.value}</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1.5">{stat.label}</p>
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

            {/* Vibe Trend (hidden until mood check-ins accumulate) */}
            <div className="mb-6">
                <MoodTrendChart days={14} />
            </div>

            {/* Achievements */}
            <div className="mb-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Achievements
                </h2>
                <AchievementGrid />
            </div>

            <WeeklyReview isOpen={showWeekly} onClose={() => setShowWeekly(false)} />
        </div>
    );
}
