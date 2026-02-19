import { motion } from 'framer-motion';
import { useUserStore } from '../../stores/userStore';
import { getLevelTitle } from '../../lib/gamification';

export function LevelBadge() {
    const { level } = useUserStore();
    const title = getLevelTitle(level);

    const getBadgeColor = () => {
        if (level >= 30) return 'from-yellow-400 via-amber-500 to-yellow-600';
        if (level >= 20) return 'from-purple-400 via-violet-500 to-purple-600';
        if (level >= 10) return 'from-blue-400 via-cyan-500 to-blue-600';
        if (level >= 5) return 'from-emerald-400 via-green-500 to-emerald-600';
        return 'from-gray-400 via-slate-500 to-gray-600';
    };

    return (
        <motion.div
            className="relative inline-flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
        >
            <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${getBadgeColor()} flex items-center justify-center shadow-lg`}>
                <span className="text-white font-bold text-sm">{level}</span>
                <div className="absolute inset-0 rounded-xl bg-white/10" />
            </div>
            <div>
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">Level</p>
                <p className="text-sm font-bold">{title}</p>
            </div>
        </motion.div>
    );
}
