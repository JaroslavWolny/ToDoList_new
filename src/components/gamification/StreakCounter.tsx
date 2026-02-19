import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { getStreakMilestone } from '../../lib/gamification';

export function StreakCounter() {
    const { streakCurrent, streakLongest } = useUserStore();
    const milestone = getStreakMilestone(streakCurrent);
    const isOnFire = streakCurrent >= 3;

    return (
        <motion.div
            className="flex items-center gap-3 card-surface rounded-2xl p-4"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="relative">
                <motion.div
                    animate={isOnFire ? {
                        scale: [1, 1.2, 1],
                        rotate: [0, -5, 5, 0],
                    } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${streakCurrent > 0
                            ? 'streak-gradient shadow-lg shadow-orange-500/30'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}>
                        <Flame className="w-6 h-6 text-white" />
                    </div>
                </motion.div>
                {milestone && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center"
                    >
                        <span className="text-[10px]">⭐</span>
                    </motion.div>
                )}
            </div>
            <div className="flex-1">
                <div className="flex items-baseline gap-1">
                    <motion.span
                        key={streakCurrent}
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-2xl font-extrabold"
                    >
                        {streakCurrent}
                    </motion.span>
                    <span className="text-sm text-[var(--color-text-secondary)]">
                        {streakCurrent === 1 ? 'day' : 'days'}
                    </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                    Best: {streakLongest} days
                </p>
            </div>
            {isOnFire && (
                <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-2xl"
                >
                    🔥
                </motion.span>
            )}
        </motion.div>
    );
}
