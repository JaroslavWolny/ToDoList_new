import { memo, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../stores/userStore';
import { getCompletionsToday, useTaskStore } from '../../stores/taskStore';
import { useFocusHistoryStore } from '../../stores/focusHistoryStore';
import { computeTodayScore, buildFocusInputs, type FocusReason } from '../../lib/todayScore';
import { getCachedInsight, fetchDailyInsight } from '../../lib/dailyInsight';
import { toLocalDateKey } from '../../lib/dates';
import { useCountUp } from '../../lib/useCountUp';

const reasonClasses: Record<FocusReason['tone'], string> = {
    good: 'bg-emerald-500/12 border-emerald-500/30 text-emerald-400',
    bad: 'bg-red-500/12 border-red-500/30 text-red-400',
    neutral: 'bg-white/5 border-[var(--color-border)] text-[var(--color-text-secondary)]',
};

/** Tiny inline trend line for the last few days of Focus scores. */
function Sparkline({ scores, stroke }: { scores: number[]; stroke: string }) {
    if (scores.length < 2) return null;
    const w = 52;
    const h = 16;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;
    const pts = scores
        .map((s, i) => {
            const x = (i / (scores.length - 1)) * w;
            const y = h - ((s - min) / range) * h;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    return (
        <svg width={w} height={h} className="overflow-visible" aria-hidden="true">
            <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
            <circle
                cx={w}
                cy={h - ((scores[scores.length - 1] - min) / range) * h}
                r={1.9}
                fill={stroke}
            />
        </svg>
    );
}

interface TodayScoreCardProps {
    onAskCoach: () => void;
}

export const TodayScoreCard = memo(function TodayScoreCard({ onAskCoach }: TodayScoreCardProps) {
    const { health, maxHealth, streakCurrent, dailyGoal } = useUserStore(
        useShallow((s) => ({
            health: s.health,
            maxHealth: s.maxHealth,
            streakCurrent: s.streakCurrent,
            dailyGoal: s.settings.dailyGoal,
        }))
    );
    const { tasks, completions } = useTaskStore(
        useShallow((s) => ({ tasks: s.tasks, completions: s.completions }))
    );
    const history = useFocusHistoryStore((s) => s.history);
    const recordToday = useFocusHistoryStore((s) => s.recordToday);

    const completedToday = useMemo(() => getCompletionsToday(completions).length, [completions]);

    const focus = useMemo(
        () =>
            computeTodayScore(
                buildFocusInputs(tasks, completedToday, { health, maxHealth, streakCurrent, dailyGoal })
            ),
        [tasks, completedToday, health, maxHealth, streakCurrent, dailyGoal]
    );

    const displayScore = useCountUp(focus.score);

    // ── A) record + trend ──
    useEffect(() => {
        recordToday(focus.score);
    }, [focus.score, recordToday]);

    const { todayKey, yesterdayKey } = useMemo(() => {
        const now = new Date();
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        return { todayKey: toLocalDateKey(now), yesterdayKey: toLocalDateKey(y) };
    }, []);

    const sparkScores = useMemo(() => {
        const recent = history.slice(-7).map((e) => ({ date: e.date, score: e.score }));
        if (recent.length === 0 || recent[recent.length - 1].date !== todayKey) {
            recent.push({ date: todayKey, score: focus.score });
        } else {
            recent[recent.length - 1] = { date: todayKey, score: focus.score };
        }
        return recent.map((e) => e.score);
    }, [history, todayKey, focus.score]);

    const delta = useMemo(() => {
        const y = history.find((e) => e.date === yesterdayKey);
        return y ? focus.score - y.score : null;
    }, [history, yesterdayKey, focus.score]);

    // ── C) daily AI insight (cached once/day; silent on failure) ──
    const [insight, setInsight] = useState<string | null>(() => getCachedInsight());
    useEffect(() => {
        let alive = true;
        fetchDailyInsight().then((t) => {
            if (alive && t) setInsight(t);
        });
        return () => {
            alive = false;
        };
    }, []);

    const headline = insight ?? focus.headline;

    // Ring geometry
    const radius = 30;
    const stroke = 5;
    const r = radius - stroke;
    const circumference = r * 2 * Math.PI;
    const dash = (focus.score / 100) * circumference;
    const gradId = `focusGrad-${focus.tier.id}`;

    return (
        <div className="glass-card p-4">
            <div className="flex items-center gap-4">
                {/* ── Score ring ── */}
                <div className="relative shrink-0" style={{ width: radius * 2, height: radius * 2 }}>
                    <svg width={radius * 2} height={radius * 2} className="-rotate-90">
                        <circle cx={radius} cy={radius} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
                        <motion.circle
                            cx={radius} cy={radius} r={r} fill="none"
                            stroke={`url(#${gradId})`} strokeWidth={stroke} strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: circumference - dash }}
                            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                        />
                        <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={focus.tier.from} />
                                <stop offset="100%" stopColor={focus.tier.to} />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                        <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`text-lg font-black text-stat ${focus.tier.text}`}
                        >
                            {displayScore}
                        </motion.span>
                    </div>
                </div>

                {/* ── Label + headline ── */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                            Today's Focus
                        </span>
                        {/* trend: sparkline + delta vs yesterday */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Sparkline scores={sparkScores} stroke={focus.tier.to} />
                            {delta !== null && (
                                <span
                                    className={`inline-flex items-center gap-0.5 text-[10px] font-bold text-stat ${
                                        delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-[var(--color-text-tertiary)]'
                                    }`}
                                >
                                    {delta > 0 ? <TrendingUp className="w-3 h-3" strokeWidth={3} /> : delta < 0 ? <TrendingDown className="w-3 h-3" strokeWidth={3} /> : <Minus className="w-3 h-3" strokeWidth={3} />}
                                    {delta > 0 ? `+${delta}` : delta}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className={`text-sm font-black mt-0.5 ${focus.tier.text}`}>
                        {focus.tier.emoji} {focus.tier.label}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 leading-snug flex items-start gap-1">
                        {insight && <Sparkles className="w-3 h-3 mt-[1px] shrink-0 text-cyan-400" strokeWidth={2.6} />}
                        <span>{headline}</span>
                    </p>
                </div>
            </div>

            {/* ── Reasons (the "why") + Ask coach ── */}
            <div className="flex items-center justify-between gap-2 mt-3">
                <div className="flex flex-wrap gap-1.5 min-w-0">
                    {/* Only surface warnings here — the live streak/goal/HP numbers
                        already live in the vitals strip, so we don't duplicate them. */}
                    {focus.reasons.filter((r) => r.tone === 'bad').map((reason) => (
                        <span
                            key={reason.label}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${reasonClasses[reason.tone]}`}
                        >
                            {reason.label}
                        </span>
                    ))}
                </div>
                <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={onAskCoach}
                    className="shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-xs font-bold text-white fab-primary"
                    aria-label="Ask the AI coach"
                >
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={2.6} />
                    Ask coach
                </motion.button>
            </div>
        </div>
    );
});
