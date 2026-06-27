import { motion } from 'framer-motion';
import { Timer, ChevronRight } from 'lucide-react';
import { useFocusSessionStore } from '../../stores/focusSessionStore';
import { FOCUS_DAILY_TARGET_MINUTES, formatFocusMinutes } from '../../lib/focus';

// Progress-ring geometry (today's focus minutes vs the 2h daily target).
const RING = 56;
const RING_STROKE = 4;
const RING_R = RING / 2 - RING_STROKE;
const RING_C = RING_R * 2 * Math.PI;

/**
 * Dashboard entry point into the Deep-Work focus timer. Doubles as the live
 * read-out of today's focus-minutes metric so the loop ("earn more minutes")
 * is visible without opening anything.
 */
export function FocusLauncher() {
    const todayMinutes = useFocusSessionStore((s) => s.getTodayMinutes());
    const openSetup = useFocusSessionStore((s) => s.openSetup);

    const goalPct = Math.min(100, Math.round((todayMinutes / FOCUS_DAILY_TARGET_MINUTES) * 100));
    const goalReached = todayMinutes >= FOCUS_DAILY_TARGET_MINUTES;
    const hasFocus = todayMinutes > 0;

    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={openSetup}
            className="relative w-full glass-card p-4 flex items-center gap-4 text-left overflow-hidden active:scale-[0.99] transition-transform"
            aria-label="Start a focus session"
        >
            {/* Ambient corner glow — signature premium surface */}
            <div
                aria-hidden
                className="pointer-events-none absolute -top-10 -right-8 w-32 h-32 rounded-full blur-3xl opacity-60"
                style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.22), transparent 70%)' }}
            />

            {/* Progress ring (today vs the 2h daily target) wrapping the timer mark */}
            <div className="relative shrink-0" style={{ width: RING, height: RING }}>
                <svg width={RING} height={RING} className="-rotate-90">
                    <circle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke="var(--color-border)" strokeWidth={RING_STROKE} />
                    <circle
                        cx={RING / 2}
                        cy={RING / 2}
                        r={RING_R}
                        fill="none"
                        stroke="url(#focusLauncherGrad)"
                        strokeWidth={RING_STROKE}
                        strokeLinecap="round"
                        strokeDasharray={RING_C}
                        strokeDashoffset={RING_C * (1 - goalPct / 100)}
                        style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.34, 1.3, 0.64, 1)' }}
                    />
                    <defs>
                        <linearGradient id="focusLauncherGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="55%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                    </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center">
                    <Timer className={`w-5 h-5 ${goalReached ? 'text-emerald-400' : 'text-cyan-400'}`} strokeWidth={2.4} />
                </span>
            </div>

            <div className="flex-1 min-w-0 relative">
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-cyan-400/90 leading-none">
                    Deep Work
                </p>
                <p className="text-[15px] font-black leading-tight mt-1">Start a focus session</p>
                {hasFocus ? (
                    <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">
                        {goalReached ? (
                            <span className="font-bold text-emerald-400">2h focus goal reached 🎯</span>
                        ) : (
                            <>
                                <span className="font-bold text-cyan-400 text-stat">{formatFocusMinutes(todayMinutes)}</span>
                                {' '}of 2h focused today
                            </>
                        )}
                    </p>
                ) : (
                    <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">
                        15 · 25 · 50 · 90 min · earn focus minutes
                    </p>
                )}
            </div>

            <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0 relative" strokeWidth={2.6} />
        </motion.button>
    );
}
