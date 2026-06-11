import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X, Zap, Coins, Target, Swords, Minus, Plus, AlertTriangle, Sparkles, Check, Heart, ShieldAlert } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useFocusSessionStore } from '../../stores/focusSessionStore';
import { useUserStore } from '../../stores/userStore';
import { useTaskStore } from '../../stores/taskStore';
import { completeFocusSession, forfeitFocusSession } from '../../lib/focusCompletion';
import { completeTaskTransaction } from '../../lib/taskCompletion';
import {
    FOCUS_PRESETS,
    FOCUS_MIN_MINUTES,
    FOCUS_MAX_MINUTES,
    FOCUS_STEP_MINUTES,
    FOCUS_DEFAULT_MINUTES,
    FOCUS_FORFEIT_HP,
    FOCUS_AWAY_GRACE_SEC,
    focusXp,
    focusCoins,
    focusForfeitXp,
    formatClock,
    formatFocusMinutes,
} from '../../lib/focus';
import { ConfettiBurst } from '../gamification/ConfettiBurst';

const HOLD_TO_FORFEIT_MS = 1400;

// ── setup dial geometry (the duration picker ring) ──
const SETUP_DIAL = 208;
const SETUP_DIAL_STROKE = 12;
const SETUP_DIAL_R = SETUP_DIAL / 2 - SETUP_DIAL_STROKE;
const SETUP_DIAL_C = SETUP_DIAL_R * 2 * Math.PI;

/** Staggered entrance for the setup sections (header → dial → … → CTA). */
const setupSection = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.04 + i * 0.05, duration: 0.3, ease: 'easeOut' as const },
});

/**
 * Full-screen Deep-Work overlay. Mounted once at the app shell so a running
 * session survives navigation between tabs. Phases:
 *   setup     → pick a length (25/50/custom) + an optional quest; see the stakes
 *   running   → a countdown that "takes over" the app (deep focus). There's no
 *               close button, the back gesture is trapped, and leaving the app
 *               (app switch / home / lock) beyond a short grace window forfeits
 *               the session — the only way out is to finish (reward) or
 *               hold-to-forfeit (real XP + HP penalty)
 *   done      → reward summary (XP · coins · focus minutes · boss damage)
 *   forfeited → the damage you took for bailing (loss aversion with teeth)
 */
export function FocusTimerModal() {
    const {
        phase, active, lastResult, lastForfeit, start, showForfeit, showResult, openSetup, close, resume,
        markHidden, clearHidden,
    } = useFocusSessionStore(
            useShallow((s) => ({
                phase: s.phase,
                active: s.active,
                lastResult: s.lastResult,
                lastForfeit: s.lastForfeit,
                start: s.start,
                showForfeit: s.showForfeit,
                showResult: s.showResult,
                openSetup: s.openSetup,
                close: s.close,
                resume: s.resume,
                markHidden: s.markHidden,
                clearHidden: s.clearHidden,
            }))
        );
    const tasks = useTaskStore((s) => s.tasks);
    const gamificationLevel = useUserStore((s) => s.settings.gamificationLevel);

    // ── setup form state ──
    const [minutes, setMinutes] = useState(FOCUS_DEFAULT_MINUTES);

    // ── running state ──
    const [remainingSec, setRemainingSec] = useState(0);
    const [confettiKey, setConfettiKey] = useState(0);
    const [giveUpOpen, setGiveUpOpen] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const [showNudge, setShowNudge] = useState(false);
    const [questDone, setQuestDone] = useState(false);
    const completingRef = useRef(false);
    const holdIntervalRef = useRef<number | null>(null);
    const holdStartRef = useRef(0);
    const nudgeTimerRef = useRef<number | null>(null);

    // Resume a persisted session after a reload (no-op when there's nothing live).
    useEffect(() => {
        resume();
    }, [resume]);

    // Lock background scroll whenever the overlay is up.
    useEffect(() => {
        if (phase !== 'idle') document.body.classList.add('modal-scroll-lock');
        else document.body.classList.remove('modal-scroll-lock');
        return () => document.body.classList.remove('modal-scroll-lock');
    }, [phase]);

    // Fresh session → reset the per-session guards/flags.
    const sessionKey = active?.startedAt ?? 0;
    useEffect(() => {
        completingRef.current = false;
        setGiveUpOpen(false);
        setHoldProgress(0);
        setShowNudge(false);
        setQuestDone(false);
    }, [sessionKey]);

    const handleForfeit = useCallback((reason: 'gave-up' | 'left-app' = 'gave-up') => {
        const session = useFocusSessionStore.getState().active;
        if (completingRef.current || !session) return;
        completingRef.current = true;
        try { navigator.vibrate?.([0, 90, 50, 140]); } catch { /* noop */ }
        const result = forfeitFocusSession({
            minutes: session.durationMin,
            taskTitle: session.taskTitle,
            reason,
        });
        showForfeit(result);
    }, [showForfeit]);

    // Staying out of the app past the grace window = bail. Checked on every
    // tick, on return to the foreground, and before paying out a completion,
    // so the order in which iOS resumes our timers/listeners can't matter.
    const settleIfAwayTooLong = useCallback(() => {
        const session = useFocusSessionStore.getState().active;
        if (session?.hiddenAt && Date.now() - session.hiddenAt > FOCUS_AWAY_GRACE_SEC * 1000) {
            handleForfeit('left-app');
            return true;
        }
        return false;
    }, [handleForfeit]);

    const handleComplete = useCallback(async () => {
        if (settleIfAwayTooLong()) return;
        const session = useFocusSessionStore.getState().active;
        if (completingRef.current || !session) return;
        completingRef.current = true;
        try { navigator.vibrate?.([0, 60, 40, 60]); } catch { /* noop */ }
        setConfettiKey((k) => k + 1);
        const result = await completeFocusSession({
            minutes: session.durationMin,
            taskId: session.taskId,
            taskTitle: session.taskTitle,
        });
        showResult(result);
    }, [showResult, settleIfAwayTooLong]);

    // Countdown driven by wall-clock so throttled/background tabs stay accurate.
    useEffect(() => {
        if (phase !== 'running' || !active) return;
        // Settle an absence still pending from before a reload/relaunch —
        // killing the app while backgrounded doesn't dodge the forfeit.
        if (active.hiddenAt) {
            if (Date.now() - active.hiddenAt > FOCUS_AWAY_GRACE_SEC * 1000) {
                handleForfeit('left-app');
                return;
            }
            if (document.visibilityState === 'visible') clearHidden();
        }
        const computeRemaining = () => active.durationSec - (Date.now() - active.startedAt) / 1000;
        const first = computeRemaining();
        setRemainingSec(first);
        if (first <= 0) {
            void handleComplete();
            return;
        }
        const id = window.setInterval(() => {
            if (settleIfAwayTooLong()) return;
            const rem = computeRemaining();
            setRemainingSec(rem);
            if (rem <= 0) void handleComplete();
        }, 250);
        return () => window.clearInterval(id);
    }, [phase, active, handleComplete, handleForfeit, settleIfAwayTooLong, clearHidden]);

    // Deep focus: warn before the tab is closed/refreshed mid-session.
    useEffect(() => {
        if (phase !== 'running') return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [phase]);

    // Deep focus: trap the back gesture so a session can't be swiped away.
    // Instead of leaving, re-pin the history entry and surface the forfeit prompt.
    useEffect(() => {
        if (phase !== 'running') return;
        window.history.pushState({ focusGuard: true }, '');
        const onPop = () => {
            window.history.pushState({ focusGuard: true }, '');
            setGiveUpOpen(true);
            try { navigator.vibrate?.(20); } catch { /* noop */ }
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, [phase]);

    // Deep focus: leaving the app is the contract-breaker. Stamp the moment we
    // go to background (persisted); on return either pardon a quick peek
    // (within the grace window, with a warning nudge) or forfeit the session.
    useEffect(() => {
        if (phase !== 'running') return;
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                markHidden();
                return;
            }
            if (settleIfAwayTooLong()) return;
            const wasAway = Boolean(useFocusSessionStore.getState().active?.hiddenAt);
            clearHidden();
            if (wasAway) {
                setShowNudge(true);
                if (nudgeTimerRef.current) window.clearTimeout(nudgeTimerRef.current);
                nudgeTimerRef.current = window.setTimeout(() => setShowNudge(false), 4000);
            }
        };
        const onPageHide = () => markHidden();
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pagehide', onPageHide);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', onPageHide);
        };
    }, [phase, markHidden, clearHidden, settleIfAwayTooLong]);

    // Keep the screen awake while running — otherwise iOS auto-lock would
    // background the app and trip the away-forfeit through no fault of the user.
    useEffect(() => {
        if (phase !== 'running') return;
        let released = false;
        let sentinel: WakeLockSentinel | null = null;
        const acquire = async () => {
            try {
                const lock = await navigator.wakeLock?.request('screen');
                if (!lock) return;
                if (released) { void lock.release().catch(() => undefined); return; }
                sentinel = lock;
            } catch { /* unsupported or denied — auto-lock stays on */ }
        };
        void acquire();
        // The lock is dropped by the OS whenever the app is backgrounded —
        // re-acquire it every time we come back to the foreground.
        const reacquire = () => {
            if (document.visibilityState === 'visible') void acquire();
        };
        document.addEventListener('visibilitychange', reacquire);
        return () => {
            released = true;
            document.removeEventListener('visibilitychange', reacquire);
            void sentinel?.release().catch(() => undefined);
        };
    }, [phase]);

    const cancelHold = useCallback(() => {
        if (holdIntervalRef.current) {
            window.clearInterval(holdIntervalRef.current);
            holdIntervalRef.current = null;
        }
        setHoldProgress(0);
    }, []);

    const startHold = useCallback(() => {
        holdStartRef.current = Date.now();
        if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = window.setInterval(() => {
            const p = Math.min(1, (Date.now() - holdStartRef.current) / HOLD_TO_FORFEIT_MS);
            setHoldProgress(p);
            if (p >= 1) {
                if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
                holdIntervalRef.current = null;
                setHoldProgress(0);
                handleForfeit();
            }
        }, 30);
    }, [handleForfeit]);

    useEffect(() => () => {
        if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
        if (nudgeTimerRef.current) window.clearTimeout(nudgeTimerRef.current);
    }, []);

    const adjustMinutes = (delta: number) =>
        setMinutes((m) => Math.min(FOCUS_MAX_MINUTES, Math.max(FOCUS_MIN_MINUTES, m + delta)));

    const handleStart = () => {
        try { navigator.vibrate?.(12); } catch { /* noop */ }
        start(minutes, null, null);
    };

    const handleMarkQuestDone = () => {
        if (!lastResult?.taskId) return;
        completeTaskTransaction(lastResult.taskId);
        try { navigator.vibrate?.(12); } catch { /* noop */ }
        setQuestDone(true);
    };

    // Is the done-screen quest still completable?
    const linkedTaskActive = useMemo(() => {
        if (!lastResult?.taskId) return false;
        return tasks.some((t) => t.id === lastResult.taskId && t.status === 'ACTIVE');
    }, [lastResult, tasks]);

    if (phase === 'idle') return <ConfettiBurst fireKey={confettiKey} />;

    // ── reward / penalty stakes (shown so quitting reads as a real loss) ──
    const setupRewardXp = focusXp(minutes);
    const setupRewardCoins = focusCoins(minutes);
    const setupPenaltyXp = focusForfeitXp(minutes, gamificationLevel);
    const runRewardXp = active ? focusXp(active.durationMin) : 0;
    const runPenaltyXp = active ? focusForfeitXp(active.durationMin, gamificationLevel) : 0;

    // ── countdown ring geometry ──
    const radius = 130;
    const stroke = 12;
    const r = radius - stroke;
    const circumference = r * 2 * Math.PI;
    const progress = active && active.durationSec > 0
        ? Math.min(1, Math.max(0, 1 - remainingSec / active.durationSec))
        : 0;

    return (
        <>
            <ConfettiBurst fireKey={confettiKey} />
            <AnimatePresence>
                <motion.div
                    key="focus-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[70] flex flex-col items-center overflow-y-auto px-6 safe-x"
                    style={{
                        background:
                            'radial-gradient(120% 90% at 50% 0%, rgba(34,211,238,0.16), transparent 55%), var(--color-bg)',
                        paddingTop: 'calc(1.25rem + var(--safe-top))',
                        paddingBottom: 'calc(1.5rem + var(--safe-bottom))',
                    }}
                >
                    {/* ============ SETUP ============ */}
                    {phase === 'setup' && (
                        <motion.div
                            initial={{ scale: 0.97, opacity: 0, y: 14 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="w-full max-w-sm flex-1 flex flex-col"
                        >
                            <motion.div {...setupSection(0)} className="flex items-start justify-between">
                                <div className="leading-tight">
                                    <h2 className="text-2xl font-black tracking-tight">Deep Work</h2>
                                    <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1">
                                        Lock in. No escape till it's done.
                                    </p>
                                </div>
                                <button
                                    onClick={close}
                                    className="p-2 -mr-2 rounded-full hover:bg-white/5 active:scale-95 text-[var(--color-text-tertiary)] transition-transform"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5" strokeWidth={2.4} />
                                </button>
                            </motion.div>

                            {/* Hero: duration dial + presets, centered in the free space */}
                            <motion.div
                                {...setupSection(1)}
                                className="flex-1 flex flex-col items-center justify-center gap-8 py-6"
                            >
                                <div className="flex items-center justify-center gap-3">
                                <motion.button
                                    whileTap={{ scale: 0.88 }}
                                    onClick={() => adjustMinutes(-FOCUS_STEP_MINUTES)}
                                    disabled={minutes <= FOCUS_MIN_MINUTES}
                                    className="w-10 h-10 shrink-0 rounded-full glass flex items-center justify-center text-[var(--color-text-secondary)] disabled:opacity-25 transition-opacity"
                                    aria-label="Less time"
                                >
                                    <Minus className="w-[18px] h-[18px]" strokeWidth={2.8} />
                                </motion.button>

                                <div className="relative" style={{ width: SETUP_DIAL, height: SETUP_DIAL }}>
                                    <div
                                        aria-hidden
                                        className="absolute inset-6 rounded-full blur-2xl"
                                        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.18), transparent 70%)' }}
                                    />
                                    <svg width={SETUP_DIAL} height={SETUP_DIAL} className="relative -rotate-90">
                                        <circle
                                            cx={SETUP_DIAL / 2}
                                            cy={SETUP_DIAL / 2}
                                            r={SETUP_DIAL_R}
                                            fill="none"
                                            stroke="var(--color-border)"
                                            strokeWidth={SETUP_DIAL_STROKE}
                                        />
                                        <circle
                                            cx={SETUP_DIAL / 2}
                                            cy={SETUP_DIAL / 2}
                                            r={SETUP_DIAL_R}
                                            fill="none"
                                            stroke="url(#focusSetupGrad)"
                                            strokeWidth={SETUP_DIAL_STROKE}
                                            strokeLinecap="round"
                                            strokeDasharray={SETUP_DIAL_C}
                                            strokeDashoffset={SETUP_DIAL_C * (1 - minutes / FOCUS_MAX_MINUTES)}
                                            style={{ transition: 'stroke-dashoffset 0.35s cubic-bezier(0.34, 1.3, 0.64, 1)' }}
                                        />
                                        <defs>
                                            <linearGradient id="focusSetupGrad" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#22d3ee" />
                                                <stop offset="55%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#8b5cf6" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <div className="h-[64px] flex items-center">
                                            <AnimatePresence mode="popLayout" initial={false}>
                                                <motion.span
                                                    key={minutes}
                                                    initial={{ y: 12, opacity: 0, scale: 0.92 }}
                                                    animate={{ y: 0, opacity: 1, scale: 1 }}
                                                    exit={{ y: -12, opacity: 0, scale: 0.92 }}
                                                    transition={{ duration: 0.16, ease: 'easeOut' }}
                                                    className="text-[60px] font-black text-stat leading-none"
                                                >
                                                    {minutes}
                                                </motion.span>
                                            </AnimatePresence>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-[0.24em] font-bold text-[var(--color-text-tertiary)] mt-1.5">
                                            minutes
                                        </span>
                                    </div>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.88 }}
                                    onClick={() => adjustMinutes(FOCUS_STEP_MINUTES)}
                                    disabled={minutes >= FOCUS_MAX_MINUTES}
                                    className="w-10 h-10 shrink-0 rounded-full glass flex items-center justify-center text-[var(--color-text-secondary)] disabled:opacity-25 transition-opacity"
                                    aria-label="More time"
                                >
                                    <Plus className="w-[18px] h-[18px]" strokeWidth={2.8} />
                                </motion.button>
                                </div>

                                {/* Quick presets */}
                                <div className="flex items-center justify-center gap-2">
                                    {FOCUS_PRESETS.map((preset) => (
                                        <button
                                            key={preset}
                                            onClick={() => {
                                                setMinutes(preset);
                                                try { navigator.vibrate?.(8); } catch { /* noop */ }
                                            }}
                                            className={`px-4 py-2.5 rounded-full text-[13px] font-bold transition-all active:scale-95 ${
                                                minutes === preset
                                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                                                    : 'glass rounded-full text-[var(--color-text-secondary)]'
                                            }`}
                                        >
                                            {preset}m
                                        </button>
                                    ))}
                                </div>
                            </motion.div>

                            {/* The contract: what finishing pays vs what bailing costs */}
                            <motion.div
                                {...setupSection(2)}
                                className="flex items-stretch rounded-2xl overflow-hidden border border-[var(--color-border)] mb-4"
                            >
                                <div className="flex-1 flex items-center gap-2.5 px-3.5 py-3 bg-emerald-500/[0.07]">
                                    <span className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                                        <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={3} />
                                    </span>
                                    <div className="leading-tight">
                                        <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-emerald-400/70">Finish</p>
                                        <p className="text-[12px] font-black text-emerald-300 mt-0.5 flex items-center gap-1">
                                            +{setupRewardXp} XP · +{setupRewardCoins}
                                            <Coins className="w-3 h-3" strokeWidth={2.6} />
                                        </p>
                                    </div>
                                </div>
                                <div className="w-px bg-[var(--color-border)]" />
                                <div className="flex-1 flex items-center gap-2.5 px-3.5 py-3 bg-red-500/[0.07]">
                                    <span className="w-7 h-7 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                                        <Heart className="w-3.5 h-3.5 text-red-400 fill-current" strokeWidth={2.6} />
                                    </span>
                                    <div className="leading-tight">
                                        <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-red-400/70">Bail early</p>
                                        <p className="text-[12px] font-black text-red-300 mt-0.5">
                                            −{setupPenaltyXp} XP · −{FOCUS_FORFEIT_HP} HP
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div {...setupSection(3)}>
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleStart}
                                    className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-black text-white fab-primary"
                                >
                                    <Timer className="w-[18px] h-[18px]" strokeWidth={2.6} />
                                    Start {minutes}-minute session
                                </motion.button>
                                <p className="text-center text-[10px] text-[var(--color-text-tertiary)] mt-3 leading-relaxed">
                                    Once it starts there's no escape — bailing or leaving the app costs XP and a heart.
                                </p>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* ============ RUNNING ============ */}
                    {phase === 'running' && active && (
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-sm flex flex-col items-center my-auto"
                        >
                            <AnimatePresence>
                                {showNudge && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -12 }}
                                        className="absolute inset-x-6 mx-auto max-w-xs flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30"
                                        style={{ top: 'calc(0.75rem + var(--safe-top))' }}
                                    >
                                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={2.6} />
                                        <span className="text-[11px] font-semibold text-amber-200">
                                            That was close — over {FOCUS_AWAY_GRACE_SEC}s outside the app forfeits the session.
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <span className="text-[11px] uppercase tracking-[0.22em] font-bold text-cyan-400 mb-6">
                                Deep Focus
                            </span>

                            <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
                                {/* Ambient pulse so the timer reads as a living, immersive surface */}
                                <div
                                    aria-hidden
                                    className="absolute inset-4 rounded-full blur-2xl animate-pulse"
                                    style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.22), transparent 70%)' }}
                                />
                                <svg width={radius * 2} height={radius * 2} className="relative -rotate-90">
                                    <circle cx={radius} cy={radius} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
                                    <circle
                                        cx={radius}
                                        cy={radius}
                                        r={r}
                                        fill="none"
                                        stroke="url(#focusRunGrad)"
                                        strokeWidth={stroke}
                                        strokeLinecap="round"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={circumference * (1 - progress)}
                                        style={{ transition: 'stroke-dashoffset 0.3s linear' }}
                                    />
                                    <defs>
                                        <linearGradient id="focusRunGrad" x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0%" stopColor="#22d3ee" />
                                            <stop offset="55%" stopColor="#3b82f6" />
                                            <stop offset="100%" stopColor="#8b5cf6" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-stat tabular-nums">
                                        {formatClock(remainingSec)}
                                    </span>
                                    <span className="text-[11px] text-[var(--color-text-tertiary)] mt-1">
                                        of {active.durationMin}m
                                    </span>
                                </div>
                            </div>

                            {active.taskTitle ? (
                                <div className="mt-7 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full glass-card max-w-full">
                                    <Target className="w-3.5 h-3.5 text-cyan-400 shrink-0" strokeWidth={2.6} />
                                    <span className="text-[13px] font-semibold truncate">{active.taskTitle}</span>
                                </div>
                            ) : (
                                <p className="mt-7 text-[13px] text-[var(--color-text-secondary)]">Eyes on one thing. Nothing else.</p>
                            )}

                            {/* Stakes ticker — keeps the cost of bailing in view */}
                            <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold">
                                <span className="text-emerald-400">Finish +{runRewardXp} XP</span>
                                <span className="text-[var(--color-text-tertiary)]">·</span>
                                <span className="text-red-400 inline-flex items-center gap-0.5">
                                    Bail −{runPenaltyXp} XP −<Heart className="w-3 h-3 fill-current" strokeWidth={2.6} />
                                </span>
                            </div>
                            <p className="mt-2 text-[10px] font-semibold text-[var(--color-text-tertiary)]">
                                Switching apps or locking the screen for over {FOCUS_AWAY_GRACE_SEC}s counts as bailing.
                            </p>

                            {/* Give-up: gated behind an explicit warning + hold-to-confirm */}
                            <div className="mt-8 w-full flex flex-col items-center min-h-[96px] justify-start">
                                {!giveUpOpen ? (
                                    <button
                                        onClick={() => { setGiveUpOpen(true); try { navigator.vibrate?.(8); } catch { /* noop */ } }}
                                        className="text-[11px] font-bold text-[var(--color-text-tertiary)] underline underline-offset-4 decoration-[var(--color-border)] hover:text-[var(--color-text-secondary)]"
                                    >
                                        Give up
                                    </button>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="w-full rounded-2xl p-3.5 bg-red-500/10 border border-red-500/25"
                                    >
                                        <div className="flex items-start gap-2 mb-3">
                                            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" strokeWidth={2.6} />
                                            <p className="text-[12px] font-semibold text-red-200 leading-snug">
                                                Bail now and you lose <span className="font-black">−{runPenaltyXp} XP</span> and{' '}
                                                <span className="font-black">−{FOCUS_FORFEIT_HP} ❤️</span>. Your focus minutes won't count.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => { setGiveUpOpen(false); cancelHold(); }}
                                                className="flex-1 py-2.5 rounded-xl text-xs font-black text-white fab-primary"
                                            >
                                                Keep focusing
                                            </button>
                                            <button
                                                onPointerDown={startHold}
                                                onPointerUp={cancelHold}
                                                onPointerLeave={cancelHold}
                                                onPointerCancel={cancelHold}
                                                onContextMenu={(e) => e.preventDefault()}
                                                className="relative flex-1 py-2.5 rounded-xl text-xs font-bold text-red-300 border border-red-500/40 overflow-hidden select-none touch-none"
                                            >
                                                <span
                                                    aria-hidden
                                                    className="absolute inset-y-0 left-0 bg-red-500/30"
                                                    style={{ width: `${holdProgress * 100}%`, transition: 'width 0.03s linear' }}
                                                />
                                                <span className="relative">
                                                    {holdProgress > 0 ? 'Keep holding…' : 'Hold to forfeit'}
                                                </span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ============ DONE ============ */}
                    {phase === 'done' && lastResult && (
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 12 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="w-full max-w-sm flex flex-col items-center text-center my-auto"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                                className="w-20 h-20 rounded-3xl flex items-center justify-center bg-gradient-to-br from-emerald-500/25 to-cyan-500/25 border border-emerald-400/30 mb-5"
                            >
                                <span className="text-4xl">🎯</span>
                            </motion.div>

                            <h2 className="text-2xl font-black gradient-text">Session complete</h2>
                            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                                {formatFocusMinutes(lastResult.minutes)} of deep work banked.
                            </p>

                            {lastResult.leveledUpTo !== null && (
                                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
                                    <Sparkles className="w-3.5 h-3.5" strokeWidth={2.8} />
                                    Level {lastResult.leveledUpTo} reached!
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 w-full mt-6">
                                <div className="glass-card px-3 py-3 flex flex-col items-center gap-1">
                                    <Zap className="w-4 h-4 text-cyan-400" strokeWidth={2.6} />
                                    <span className="text-base font-black text-stat leading-none">+{lastResult.xpEarned}</span>
                                    <span className="text-[10px] text-[var(--color-text-tertiary)]">XP</span>
                                </div>
                                <div className="glass-card px-3 py-3 flex flex-col items-center gap-1">
                                    <Coins className="w-4 h-4 text-amber-400" strokeWidth={2.6} />
                                    <span className="text-base font-black text-stat leading-none">+{lastResult.coinsEarned}</span>
                                    <span className="text-[10px] text-[var(--color-text-tertiary)]">coins</span>
                                </div>
                                <div className="glass-card px-3 py-3 flex flex-col items-center gap-1">
                                    <Timer className="w-4 h-4 text-emerald-400" strokeWidth={2.6} />
                                    <span className="text-base font-black text-stat leading-none">{lastResult.minutes}</span>
                                    <span className="text-[10px] text-[var(--color-text-tertiary)]">focus min</span>
                                </div>
                            </div>

                            {lastResult.bossDamage > 0 && (
                                <div className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-500/12 border border-red-500/25 text-red-300 text-xs font-bold">
                                    <Swords className="w-3.5 h-3.5" strokeWidth={2.6} />
                                    {lastResult.bossDamage} bonus damage{lastResult.bossName ? ` to ${lastResult.bossName}` : ''}
                                </div>
                            )}

                            <div className="w-full mt-7 space-y-2">
                                {lastResult.taskId && linkedTaskActive && !questDone && (
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleMarkQuestDone}
                                        className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-black text-white fab-primary"
                                    >
                                        <Check className="w-4 h-4" strokeWidth={3} />
                                        Mark quest done
                                    </motion.button>
                                )}
                                {questDone && (
                                    <div className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-black text-emerald-400 bg-emerald-500/12 border border-emerald-500/30">
                                        <Check className="w-4 h-4" strokeWidth={3} />
                                        Quest completed
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={openSetup}
                                        className="flex-1 py-3 rounded-2xl text-sm font-bold glass-card text-[var(--color-text-secondary)] active:scale-[0.98] transition-transform"
                                    >
                                        Another
                                    </button>
                                    <button
                                        onClick={close}
                                        className={`py-3 rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform ${
                                            lastResult.taskId && linkedTaskActive && !questDone
                                                ? 'flex-1 glass-card text-[var(--color-text-secondary)]'
                                                : 'flex-1 fab-primary text-white'
                                        }`}
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ============ FORFEITED ============ */}
                    {phase === 'forfeited' && lastForfeit && (
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 12 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="w-full max-w-sm flex flex-col items-center text-center my-auto"
                        >
                            <motion.div
                                initial={{ rotate: -8, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 240, damping: 14 }}
                                className="w-20 h-20 rounded-3xl flex items-center justify-center bg-gradient-to-br from-red-500/25 to-rose-600/25 border border-red-400/30 mb-5"
                            >
                                <span className="text-4xl">💔</span>
                            </motion.div>

                            <h2 className="text-2xl font-black text-red-400">
                                {lastForfeit.reason === 'left-app' ? 'You left the app' : 'You bailed'}
                            </h2>
                            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                                {lastForfeit.reason === 'left-app'
                                    ? `Deep focus means staying in. ${formatFocusMinutes(lastForfeit.minutes)} of deep work, gone.`
                                    : `${formatFocusMinutes(lastForfeit.minutes)} of deep work, gone. No minutes counted.`}
                            </p>

                            <div className="grid grid-cols-2 gap-2 w-full mt-6">
                                <div className="px-3 py-3 rounded-2xl bg-red-500/10 border border-red-500/25 flex flex-col items-center gap-1">
                                    <Zap className="w-4 h-4 text-red-400" strokeWidth={2.6} />
                                    <span className="text-base font-black text-stat leading-none text-red-300">−{lastForfeit.xpLost}</span>
                                    <span className="text-[10px] text-[var(--color-text-tertiary)]">XP lost</span>
                                </div>
                                <div className="px-3 py-3 rounded-2xl bg-red-500/10 border border-red-500/25 flex flex-col items-center gap-1">
                                    <Heart className="w-4 h-4 text-red-400 fill-current" strokeWidth={2.6} />
                                    <span className="text-base font-black text-stat leading-none text-red-300">−{lastForfeit.hpLost}</span>
                                    <span className="text-[10px] text-[var(--color-text-tertiary)]">HP lost</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-4 leading-relaxed">
                                Quitting costs more than finishing. Next block — see it through.
                            </p>

                            <div className="flex items-center gap-2 w-full mt-7">
                                <button
                                    onClick={openSetup}
                                    className="flex-1 py-3 rounded-2xl text-sm font-bold glass-card text-[var(--color-text-secondary)] active:scale-[0.98] transition-transform"
                                >
                                    Try again
                                </button>
                                <button
                                    onClick={close}
                                    className="flex-1 py-3 rounded-2xl text-sm font-bold fab-primary text-white active:scale-[0.98] transition-transform"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>
        </>
    );
}
