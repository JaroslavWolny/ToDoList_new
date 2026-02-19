import { motion, AnimatePresence } from 'framer-motion';
import { getComboLabel } from '../../lib/gamification';

interface ComboIndicatorProps {
    multiplier: number;
}

export function ComboIndicator({ multiplier }: ComboIndicatorProps) {
    const label = getComboLabel(multiplier);
    if (!label) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ scale: 0, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0, y: -20, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
            >
                <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-sm font-bold text-amber-500"
                >
                    {label}
                </motion.span>
            </motion.div>
        </AnimatePresence>
    );
}
