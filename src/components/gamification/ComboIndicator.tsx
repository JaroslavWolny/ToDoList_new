import { motion, AnimatePresence } from 'framer-motion';

interface ComboIndicatorProps {
    multiplier: number;
}

function getTier(multiplier: number): 0 | 1 | 2 | 3 {
    if (multiplier >= 1.5) return 3;
    if (multiplier >= 1.25) return 2;
    if (multiplier >= 1.1) return 1;
    return 0;
}

type TierStyle = { label: string; emoji: string; tile: string; text: string; glow: string };

const TIERS: Record<1 | 2 | 3, TierStyle> = {
    1: { label: 'COMBO', emoji: '✨', tile: 'from-amber-400 to-orange-500', text: 'text-amber-400', glow: '' },
    2: { label: 'SUPER', emoji: '⚡', tile: 'from-orange-400 to-red-500', text: 'text-orange-400', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.45)]' },
    3: { label: 'FRENZY', emoji: '🔥', tile: 'from-amber-400 via-orange-500 to-red-500', text: 'text-red-400', glow: 'shadow-[0_0_16px_rgba(239,68,68,0.55)]' },
};

export function ComboIndicator({ multiplier }: ComboIndicatorProps) {
    const tier = getTier(multiplier);
    if (tier === 0) return null;
    const t = TIERS[tier];

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={tier}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                className="vital-chip"
            >
                <span className={`vital-chip-tile bg-gradient-to-br ${t.tile} ${t.glow}`}>
                    <span className="text-[10px] leading-none">{t.emoji}</span>
                </span>
                <span className={`text-sm font-black text-stat leading-none ${t.text}`}>×{multiplier}</span>
                <span className={`text-[9px] font-black uppercase tracking-wider leading-none opacity-80 ${t.text}`}>
                    {t.label}
                </span>
            </motion.div>
        </AnimatePresence>
    );
}
