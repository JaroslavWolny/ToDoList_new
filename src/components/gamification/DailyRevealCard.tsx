import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../stores/userStore';
import { DAILY_THEMES, getTheme } from '../../lib/dailyThemes';

const toDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
                className="glass-card w-full px-4 py-3 flex items-center gap-3"
            >
                <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${activeTheme.accent} shadow-lg overflow-hidden`}
                >
                    {/* Emojis don't sit on the Latin baseline — wrap in a span with
                        leading-none + an explicit font-size so they render crisply
                        and centre visually inside the gradient tile. */}
                    <span
                        aria-hidden="true"
                        className="block leading-none text-center select-none"
                        style={{ fontSize: '22px', lineHeight: 1 }}
                    >
                        {activeTheme.emoji}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                            Today's Buff
                        </span>
                        <Sparkles className="w-2.5 h-2.5 text-purple-400" />
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
                            <Sparkles className="w-3 h-3 text-fuchsia-300" />
                            <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-fuchsia-200/90">
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

    // Just revealed → big celebration card (then collapses to banner via state)
    return (
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
                            className={`relative w-24 h-24 rounded-3xl flex items-center justify-center bg-gradient-to-br ${justRevealedTheme.accent} shadow-2xl mb-5 overflow-hidden`}
                            style={{ boxShadow: '0 24px 60px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)' }}
                        >
                            {/* Emojis don't share Latin baseline metrics — render
                                inside a sized span with leading-none so the glyph
                                fills the tile and centres exactly. Avoids the
                                "small + offset to one side" look caused by flex
                                centring a text node with a 1.2 line-height. */}
                            <span
                                aria-hidden="true"
                                className="block leading-none text-center select-none"
                                style={{ fontSize: '64px', lineHeight: 1 }}
                            >
                                {justRevealedTheme.emoji}
                            </span>
                        </motion.div>
                        <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-fuchsia-200/80 mb-1">
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
        </AnimatePresence>
    );
}
