import { motion } from 'framer-motion';
import { useUserStore } from '../../stores/userStore';
import { xpProgressInLevel, xpForNextLevel } from '../../lib/gamification';

export function XPBar() {
    const { xp, level } = useUserStore();
    const progress = xpProgressInLevel(xp, level);
    const nextLevelXP = xpForNextLevel(level);
    const xpRemaining = Math.max(0, nextLevelXP - xp);

    return (
        <div className="w-full">
            <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                        Level
                    </span>
                    <span className="text-base font-black gradient-text text-stat leading-none">
                        {level}
                    </span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--color-text-tertiary)] text-stat">
                    {xpRemaining.toLocaleString()} XP to next
                </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-black/5 dark:bg-white/[0.04] overflow-hidden">
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full xp-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                    style={{
                        boxShadow: '0 0 14px rgba(34, 211, 238, 0.6), inset 0 1px 0 rgba(255,255,255,0.25)',
                    }}
                />
                {/* Highlight sweep */}
                <motion.div
                    className="absolute inset-y-0 w-1/3 pointer-events-none"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                    }}
                    animate={{ x: ['-100%', '350%'] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
                />
            </div>
        </div>
    );
}
