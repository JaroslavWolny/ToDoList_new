import { motion, AnimatePresence } from 'framer-motion';
import { useAchievementStore } from '../../stores/achievementStore';
import { Trophy } from 'lucide-react';

export function AchievementToast() {
    const { lastUnlocked, showUnlockAnimation, dismissUnlockAnimation } = useAchievementStore();

    return (
        <AnimatePresence>
            {showUnlockAnimation && lastUnlocked && (
                <motion.div
                    initial={{ y: -100, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -100, opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-sm"
                    onClick={dismissUnlockAnimation}
                >
                    <div className="glass rounded-2xl p-4 shadow-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-amber-500/10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                                <span className="text-2xl">{lastUnlocked.icon}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                                    <span className="text-xs font-semibold uppercase tracking-wider text-yellow-500">
                                        Achievement Unlocked!
                                    </span>
                                </div>
                                <h4 className="font-bold text-sm">{lastUnlocked.title}</h4>
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                    {lastUnlocked.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
