import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

interface ComboIndicatorProps {
    multiplier: number;
}

function getTier(multiplier: number): 0 | 1 | 2 | 3 {
    if (multiplier >= 1.5) return 3;
    if (multiplier >= 1.25) return 2;
    if (multiplier >= 1.1) return 1;
    return 0;
}

const TIER_LABELS: Record<1 | 2 | 3, string> = {
    1: 'COMBO',
    2: 'SUPER',
    3: 'FRENZY',
};

const TIER_EMOJIS: Record<1 | 2 | 3, string> = {
    1: '✨',
    2: '⚡',
    3: '🔥',
};

export function ComboIndicator({ multiplier }: ComboIndicatorProps) {
    const tier = getTier(multiplier);
    if (tier === 0) return null;

    const tierClass =
        tier === 3 ? 'combo-tier-3' :
        tier === 2 ? 'combo-tier-2' :
        'combo-tier-1';

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={tier}
                initial={{ scale: 0.6, y: 8, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.6, y: -8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                className={`inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full ${tierClass}`}
            >
                <span className="text-base leading-none">{TIER_EMOJIS[tier]}</span>
                <span className="text-[11px] font-black tracking-wider leading-none">
                    {TIER_LABELS[tier]}
                </span>
                <div className="flex items-center gap-0.5 pl-1.5 ml-0.5 border-l border-white/30">
                    <Zap className="w-2.5 h-2.5" strokeWidth={3} />
                    <span className="text-[11px] font-black text-stat leading-none">
                        ×{multiplier.toFixed(multiplier % 1 === 0 ? 0 : 2).replace(/0+$/, '').replace(/\.$/, '')}
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
