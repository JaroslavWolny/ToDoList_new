import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';

export function HealthBar() {
    const { health, maxHealth, settings } = useUserStore();
    if (!settings.healthBarEnabled) return null;

    return (
        <div className="inline-flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)] mr-0.5">
                HP
            </span>
            {Array.from({ length: maxHealth }).map((_, i) => {
                const filled = i < health;
                return (
                    <motion.div
                        key={i}
                        initial={false}
                        animate={{ scale: filled ? 1 : 0.86, opacity: filled ? 1 : 0.35 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                    >
                        <Heart
                            className={
                                filled
                                    ? 'w-4 h-4 text-red-500 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.55)]'
                                    : 'w-4 h-4 text-[var(--color-text-tertiary)]'
                            }
                            strokeWidth={2.5}
                        />
                    </motion.div>
                );
            })}
        </div>
    );
}
