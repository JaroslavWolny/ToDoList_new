import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';

export function HealthBar() {
    const { health, maxHealth, settings } = useUserStore();
    if (!settings.healthBarEnabled) return null;

    return (
        <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] mr-1">HP</span>
            {Array.from({ length: maxHealth }).map((_, i) => (
                <motion.div
                    key={i}
                    initial={false}
                    animate={{
                        scale: i < health ? 1 : 0.8,
                        opacity: i < health ? 1 : 0.3,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                    <Heart
                        className={`w-5 h-5 ${i < health
                                ? 'text-red-500 fill-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                    />
                </motion.div>
            ))}
        </div>
    );
}
