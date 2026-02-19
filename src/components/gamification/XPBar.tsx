import { motion } from 'framer-motion';
import { useUserStore } from '../../stores/userStore';
import { xpProgressInLevel, xpForNextLevel, getLevelTitle } from '../../lib/gamification';

export function XPBar() {
    const { xp, level } = useUserStore();
    const progress = xpProgressInLevel(xp, level);
    const nextLevelXP = xpForNextLevel(level);
    const title = getLevelTitle(level);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                        {title}
                    </span>
                    <span className="text-xs font-bold gradient-text">Lv.{level}</span>
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                    {xp} / {nextLevelXP} XP
                </span>
            </div>
            <div className="relative h-3 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full xp-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                <div className="absolute inset-0 rounded-full opacity-30 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
        </div>
    );
}
