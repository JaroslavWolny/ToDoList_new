import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';

export function HealthBar() {
    const { health, maxHealth, settings } = useUserStore();
    if (!settings.healthBarEnabled) return null;

    const low = health <= 1;

    return (
        <div className="vital-chip" aria-label={`Health ${health} of ${maxHealth}`}>
            <span
                className={`vital-chip-tile bg-gradient-to-br from-red-400 to-red-600 ${
                    low ? 'shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 'shadow-[0_0_8px_rgba(239,68,68,0.35)]'
                }`}
            >
                <Heart className="w-3 h-3 text-white fill-white" strokeWidth={2.5} />
            </span>
            <span className="flex items-center gap-[3px]">
                {Array.from({ length: maxHealth }).map((_, i) => {
                    const filled = i < health;
                    return (
                        <motion.span
                            key={i}
                            initial={false}
                            animate={{ opacity: filled ? 1 : 0.3, scaleY: filled ? 1 : 0.82 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                            className={`w-1.5 h-3.5 rounded-[2px] ${
                                filled
                                    ? 'bg-gradient-to-b from-red-400 to-red-600'
                                    : 'bg-[var(--color-text-tertiary)]'
                            }`}
                        />
                    );
                })}
            </span>
        </div>
    );
}
