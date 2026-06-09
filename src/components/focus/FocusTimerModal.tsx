import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X, Zap, Coins, Target, Swords, Minus, Plus, AlertTriangle, Sparkles, Check } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useFocusSessionStore } from '../../stores/focusSessionStore';
import { getTasksForToday, useTaskStore } from '../../stores/taskStore';
import { completeFocusSession } from '../../lib/focusCompletion';
import { completeTaskTransaction } from '../../lib/taskCompletion';
import {
    FOCUS_PRESETS,
    FOCUS_MIN_MINUTES,
    FOCUS_MAX_MINUTES,
    FOCUS_STEP_MINUTES,
    FOCUS_DEFAULT_MINUTES,
    formatClock,
    formatFocusMinutes,
} from '../../lib/focus';
import { ConfettiBurst } from '../gamification/ConfettiBurst';

const QUEST_PICKER_LIMIT = 6;

/**
 * Full-screen Deep-Work overlay. Mounted once at the app shell so a running
 * session survives navigation between tabs. Three phases:
 *   setup   → pick a length (25/50/custom) + an optional quest to focus on
 *   running → a countdown that "takes over" the app (deep focus); bailing early
 *             forfeits everything (loss aversion); the clock is wall-clock based
 *             so a reload or tab-switch resumes instead of cheating the timer
 *   done    → reward summary (XP · coins · focus minutes · boss damage)
 */
export function FocusTimerModal() {
    const { phase, active, lastResult, start, giveUp, showResult, openSetup, close, resume } =
        useFocusSessionStore(
            useShallow((s) => ({
                phase: s.phase,
                active: s.active,
                lastResult: s.lastResult,
                start: s.start,
                giveUp: s.giveUp,
                showResult: s.showResult,
                openSetup: s.openSetup,
                close: s.close,
                resume: s.resume,
            }))
        );
    const tasks = useTaskStore((s) => s.tasks);
    const todayTasks = useMemo(() => getTasksForToday(tasks).slice(0, QUEST_PICKER_LIMIT), [tasks]);

    // ── setup form state ──
    const [minutes, setMinutes] = useState(FOCUS_DEFAULT_MINUTES);
    const [selTaskId, setSelTaskId] = useState<string | null>(null);

    // ── running state ──
    const [remainingSec, setRemainingSec] = useState(0);
    const [confettiKey, setConfettiKey] = useState(0);
    const [confirmGiveUp, setConfirmGiveUp] = useState(false);
    const [showNudge, setShowNudge] = useState(false);
    const [questDone, setQuestDone] = useState(false);
    const completingRef = useRef(false);
    const giveUpTimerRef = useRef<number | null>(null);
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
        setConfirmGiveUp(false);
        setShowNudge(false);
        setQuestDone(false);
    }, [sessionKey]);

    const handleComplete = useCallback(async () => {
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
    }, [showResult]);

    // Countdown driven by wall-clock so throttled/background tabs stay accurate.
    useEffect(() => {
        if (phase !== 'running' || !active) return;
        const computeRemaining = () => active.durationSec - (Date.now() - active.startedAt) / 1000;
        const first = computeRemaining();
        setRemainingSec(first);
        if (first <= 0) {
            void handleComplete();
            return;
        }
        const id = window.setInterval(() => {
            const rem = computeRemaining();
            setRemainingSec(rem);
            if (rem <= 0) void handleComplete();
        }, 250);
        return () => window.clearInterval(id);
    }, [phase, active, handleComplete]);

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

    // Deep focus: nudge the user when they tab away and come back.
    useEffect(() => {
        if (phase !== 'running') return;
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                setShowNudge(true);
                if (nudgeTimerRef.current) window.clearTimeout(nudgeTimerRef.current);
                nudgeTimerRef.current = window.setTimeout(() => setShowNudge(false), 4000);
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [phase]);

    useEffect(() => () => {
        if (giveUpTimerRef.current) window.clearTimeout(giveUpTimerRef.current);
        if (nudgeTimerRef.current) window.clearTimeout(nudgeTimerRef.current);
    }, []);

    const adjustMinutes = (delta: number) =>
        setMinutes((m) => Math.min(FOCUS_MAX_MINUTES, Math.max(FOCUS_MIN_MINUTES, m + delta)));

    const handleStart = () => {
        const task = todayTasks.find((t) => t.id === selTaskId) ?? null;
        try { navigator.vibrate?.(12); } catch { /* noop */ }
        start(minutes, task?.id ?? null, task?.title ?? null);
    };

    const handleGiveUp = () => {
        if (!confirmGiveUp) {
            setConfirmGiveUp(true);
            try { navigator.vibrate?.(8); } catch { /* noop */ }
            if (giveUpTimerRef.current) window.clearTimeout(giveUpTimerRef.current);
            giveUpTimerRef.current = window.setTimeout(() => setConfirmGiveUp(false), 3000);
            return;
        }
        if (giveUpTimerRef.current) window.clearTimeout(giveUpTimerRef.current);
        giveUp();
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
                    className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6 safe-x safe-bottom"
                    style={{
                        background:
                            'radial-gradient(120% 90% at 50% 0%, rgba(34,211,238,0.14), transparent 60%), var(--color-bg)',
                    }}
                >
                    {/* ============ SETUP ============ */}
                    {phase === 'setup' && (
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 12 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="w-full max-w-sm"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500/25 to-blue-500/25 border border-cyan-400/30">
                                        <Timer className="w-5 h-5 text-cyan-400" strokeWidth={2.4} />
                                    </span>
                                    <div className="leading-tight">
                                        <h2 className="text-base font-black">Deep Work</h2>
                                        <p className="text-[10px] text-[var(--color-text-tertiary)]">Pick a block. Stay in it.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={close}
                                    className="p-2 rounded-xl hover:bg-white/5 text-[var(--color-text-secondary)]"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Duration */}
                            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)] mb-2">
                                Session length
                            </p>
                            <div className="flex items-center gap-2 mb-3">
                                {FOCUS_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setMinutes(preset)}
                                        className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all ${
                                            minutes === preset
                                                ? 'fab-primary text-white shadow-lg shadow-cyan-500/20'
                                                : 'glass-card text-[var(--color-text-secondary)]'
                                        }`}
                                    >
                                        {preset}m
                                    </button>
                                ))}
                                <div className="flex-1 flex items-center justify-between glass-card rounded-2xl px-2 py-2">
                                    <button
                                        onClick={() => adjustMinutes(-FOCUS_STEP_MINUTES)}
                                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-white/5 active:scale-95"
                                        aria-label="Less time"
                                    >
                                        <Minus className="w-4 h-4" strokeWidth={3} />
                                    </button>
                                    <span className="text-sm font-black text-stat tabular-nums">{minutes}</span>
                                    <button
                                        onClick={() => adjustMinutes(FOCUS_STEP_MINUTES)}
                                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-white/5 active:scale-95"
                                        aria-label="More time"
                                    >
                                        <Plus className="w-4 h-4" strokeWidth={3} />
                                    </button>
                                </div>
                            </div>

                            {/* Quest link */}
                            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)] mb-2 mt-5">
                                Focus on a quest <span className="text-[var(--color-text-tertiary)] normal-case font-medium tracking-normal">(optional)</span>
                            </p>
                            <div className="flex flex-col gap-1.5 mb-6 max-h-44 overflow-y-auto">
                                <button
                                    onClick={() => setSelTaskId(null)}
                                    className={`text-left px-3.5 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors ${
                                        selTaskId === null
                                            ? 'border-cyan-400/50 bg-cyan-500/10 text-[var(--color-text)]'
                                            : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                                    }`}
                                >
                                    Just focus — no quest
                                </button>
                                {todayTasks.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelTaskId(t.id)}
                                        className={`text-left px-3.5 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors truncate ${
                                            selTaskId === t.id
                                                ? 'border-cyan-400/50 bg-cyan-500/10 text-[var(--color-text)]'
                                                : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                                        }`}
                                    >
                                        {t.title}
                                    </button>
                                ))}
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handleStart}
                                className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white fab-primary"
                            >
                                <Timer className="w-4 h-4" strokeWidth={2.6} />
                                Start {minutes}-minute session
                            </motion.button>
                            <p className="text-center text-[10px] text-[var(--color-text-tertiary)] mt-3 leading-relaxed">
                                Leaving early forfeits the reward. Finish it to bank XP + focus minutes.
                            </p>
                        </motion.div>
                    )}

                    {/* ============ RUNNING ============ */}
                    {phase === 'running' && active && (
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-sm flex flex-col items-center"
                        >
                            <AnimatePresence>
                                {showNudge && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -12 }}
                                        className="absolute top-6 inset-x-6 mx-auto max-w-xs flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30"
                                    >
                                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={2.6} />
                                        <span className="text-[11px] font-semibold text-amber-200">
                                            Still ticking — get back in the zone before you lose it.
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <span className="text-[11px] uppercase tracking-[0.22em] font-bold text-cyan-400 mb-6">
                                Deep Focus
                            </span>

                            <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
                                <svg width={radius * 2} height={radius * 2} className="-rotate-90">
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
                                            <stop offset="100%" stopColor="#3b82f6" />
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

                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleGiveUp}
                                className={`mt-10 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                                    confirmGiveUp
                                        ? 'bg-red-500/15 border-red-500/40 text-red-400'
                                        : 'border-[var(--color-border)] text-[var(--color-text-tertiary)]'
                                }`}
                            >
                                {confirmGiveUp ? 'Tap again to forfeit reward' : 'Give up'}
                            </motion.button>
                        </motion.div>
                    )}

                    {/* ============ DONE ============ */}
                    {phase === 'done' && lastResult && (
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 12 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="w-full max-w-sm flex flex-col items-center text-center"
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
                </motion.div>
            </AnimatePresence>
        </>
    );
}
