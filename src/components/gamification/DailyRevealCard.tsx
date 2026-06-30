import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gift,
    Sparkles,
    Sword,
    Gem,
    Shield,
    Zap,
    Coins,
    Target,
    Sunrise,
    type LucideIcon,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../stores/userStore';
import { DAILY_THEMES, getTheme } from '../../lib/dailyThemes';
import type { DailyThemeId } from '../../types';

const toDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * Crisp vector icon per buff theme.
 *
 * Emoji glyphs render blurry once scaled up inside the gradient tile (they
 * rasterise at the system emoji size and then get stretched). Lucide SVGs stay
 * razor-sharp at any size and inherit the white tile foreground colour.
 */
const THEME_ICONS: Record<DailyThemeId, LucideIcon> = {
    DOUBLE_HIGH: Sword,
    DOUBLE_CHEST: Gem,
    STREAK_SHIELD: Shield,
    COMBO_BOOST: Zap,
    COIN_RAIN: Coins,
    CRITICAL_FOCUS: Target,
    EARLY_RISER: Sunrise,
};

interface DailyRevealCardProps {
    onReveal?: () => void;
}

export function DailyRevealCard({ onReveal }: DailyRevealCardProps) {
    const { lastRevealDate, dailyThemeId, revealDailyTheme } = useUserStore(
        useShallow((s) => ({
            lastRevealDate: s.lastRevealDate,
            dailyThemeId: s.dailyThemeId,
            revealDailyTheme: s.revealDailyTheme,
        }))
    );
    const today = useMemo(() => toDateKey(new Date()), []);
    const opened = lastRevealDate === today && dailyThemeId !== null;
    const [isAnimating, setIsAnimating] = useState(false);
    const [justRevealedTheme, setJustRevealedTheme] = useState<typeof DAILY_THEMES[keyof typeof DAILY_THEMES] | null>(null);

    const activeTheme = opened ? getTheme(dailyThemeId) : null;

    const handleOpen = () => {
        if (opened || isAnimating) return;
        setIsAnimating(true);
        // Brief delay for box-shake animation
        window.setTimeout(() => {
            const id = revealDailyTheme();
            const theme = DAILY_THEMES[id];
            setJustRevealedTheme(theme);
            try { navigator.vibrate?.([8, 40, 12, 30, 16]); } catch { /* noop */ }
            onReveal?.();
            window.setTimeout(() => setIsAnimating(false), 600);
        }, 360);
    };

    if (opened && activeTheme && !justRevealedTheme) {
        // Compact post-reveal banner
        return (
            <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card w-full px-4 py-2.5 flex items-center gap-3"
            >
                <div
                    className={`relative w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${activeTheme.accent} shadow-lg overflow-hidden`}
                    style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 12px rgba(0,0,0,0.18)' }}
                >
                    {/* Glossy top highlight for a modern, tactile tile */}
                    <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-b-[40%]" />
                    {(() => {
                        const Icon = THEME_ICONS[activeTheme.id];
                        return (
                            <Icon
                                className="relative w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
                                strokeWidth={2.4}
                            />
                        );
                    })()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                            Today's Buff
                        </span>
                        <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                    </div>
                    <p className="text-sm font-bold leading-tight truncate">{activeTheme.title}</p>
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)] max-w-[45%] text-right leading-tight">
                    {activeTheme.description}
                </p>
            </motion.div>
        );
    }

    // Unrevealed: mystery box
    if (!opened) {
        return (
            <motion.button
                type="button"
                onClick={handleOpen}
                whileHover={{ scale: isAnimating ? 1 : 1.015 }}
                whileTap={{ scale: 0.985 }}
                className="reveal-card-shell w-full p-5 cursor-pointer"
                disabled={isAnimating}
                aria-label="Open today's reveal"
            >
                <div className="relative z-10 flex items-center gap-4">
                    <motion.div
                        animate={
                            isAnimating
                                ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.05, 1] }
                                : { y: [0, -4, 0] }
                        }
                        transition={
                            isAnimating
                                ? { duration: 0.4 }
                                : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                        }
                        className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-2xl"
                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 32px rgba(0,0,0,0.4)' }}
                    >
                        <Gift className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={2.2} />
                    </motion.div>

                    <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-amber-200/90">
                                Daily Reveal
                            </span>
                        </div>
                        <p className="mt-1 text-lg font-black text-white leading-tight">
                            Open today's buff
                        </p>
                        <p className="text-[12px] text-white/60 mt-0.5 leading-tight">
                            One mystery boost. Resets at midnight.
                        </p>
                    </div>
                </div>
            </motion.button>
        );
    }

    // Just revealed → big celebration card (then collapses to banner via state).
    // Portalled to <body> so the fixed overlay escapes the dashboard's
    // backdrop-filter ancestors (glass cards), which otherwise become the
    // containing block for position:fixed and let later content paint over it.
    return createPortal(
        <AnimatePresence>
            {justRevealedTheme && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setJustRevealedTheme(null)}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-6"
                >
                    <motion.div
                        initial={{ scale: 0.3, rotate: -12, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                        onClick={(e) => e.stopPropagation()}
                        className="reveal-card-shell w-full max-w-xs p-7 flex flex-col items-center text-center"
                    >
                        <motion.div
                            initial={{ scale: 0, rotate: -12 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 16, delay: 0.1 }}
                            className={`relative w-24 h-24 rounded-[1.75rem] flex items-center justify-center bg-gradient-to-br ${justRevealedTheme.accent} shadow-2xl mb-5 overflow-hidden`}
                            style={{ boxShadow: '0 24px 60px -8px rgba(0,0,0,0.5), inset 0 1.5px 0 rgba(255,255,255,0.4)' }}
                        >
                            {/* Glossy highlight sweep across the top of the tile */}
                            <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-white/25 rounded-b-[45%]" />
                            <span
                                aria-hidden
                                className="absolute -inset-2 opacity-40"
                                style={{ background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.7), transparent 60%)' }}
                            />
                            {(() => {
                                const Icon = THEME_ICONS[justRevealedTheme.id];
                                return (
                                    <Icon
                                        className="relative w-12 h-12 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                                        strokeWidth={2.1}
                                    />
                                );
                            })()}
                        </motion.div>
                        <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-amber-200/80 mb-1">
                            Today's Buff
                        </p>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                            {justRevealedTheme.title}
                        </h2>
                        <p className="text-sm text-white/75 leading-snug mb-6">
                            {justRevealedTheme.description}
                        </p>
                        <button
                            type="button"
                            onClick={() => setJustRevealedTheme(null)}
                            className="w-full py-3 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-sm font-bold text-white hover:bg-white/20 transition"
                        >
                            Let's go
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
