import { motion } from 'framer-motion';
import { Timer, ChevronRight } from 'lucide-react';
import { useFocusSessionStore } from '../../stores/focusSessionStore';
import { FOCUS_DAILY_TARGET_MINUTES, formatFocusMinutes } from '../../lib/focus';

/**
 * Dashboard entry point into the Deep-Work focus timer. Doubles as the live
 * read-out of today's focus-minutes metric so the loop ("earn more minutes")
 * is visible without opening anything.
 */
export function FocusLauncher() {
    const todayMinutes = useFocusSessionStore((s) => s.getTodayMinutes());
    const openSetup = useFocusSessionStore((s) => s.openSetup);

    const goalPct = Math.min(100, Math.round((todayMinutes / FOCUS_DAILY_TARGET_MINUTES) * 100));

    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={openSetup}
            className="w-full glass-card p-3.5 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
            aria-label="Start a focus session"
        >
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-cyan-500/25 to-blue-500/25 border border-cyan-400/30 shrink-0">
                <Timer className="w-5 h-5 text-cyan-400" strokeWidth={2.4} />
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-black leading-tight">Start a focus session</p>
                {todayMinutes > 0 ? (
                    <>
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                            <span className="font-bold text-cyan-400 text-stat">{formatFocusMinutes(todayMinutes)}</span> focused today
                        </p>
                        <div className="h-1 rounded-full bg-black/5 dark:bg-white/[0.06] overflow-hidden mt-1.5">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                                style={{ width: `${goalPct}%` }}
                            />
                        </div>
                    </>
                ) : (
                    <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                        Deep-work block · 25 / 50 min · earn focus minutes
                    </p>
                )}
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" strokeWidth={2.6} />
        </motion.button>
    );
}
