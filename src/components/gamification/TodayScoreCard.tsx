import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../stores/userStore';
import { getCompletionsToday, useTaskStore } from '../../stores/taskStore';
import { computeTodayScore, buildFocusInputs, type FocusReason } from '../../lib/todayScore';

const reasonClasses: Record<FocusReason['tone'], string> = {
    good: 'bg-emerald-500/12 border-emerald-500/30 text-emerald-400',
    bad: 'bg-red-500/12 border-red-500/30 text-red-400',
    neutral: 'bg-white/5 border-[var(--color-border)] text-[var(--color-text-secondary)]',
};

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

    const completedToday = useMemo(() => getCompletionsToday(completions).length, [completions]);

    const focus = useMemo(
        () =>
            computeTodayScore(
                buildFocusInputs(tasks, completedToday, { health, maxHealth, streakCurrent, dailyGoal })
            ),
        [tasks, completedToday, health, maxHealth, streakCurrent, dailyGoal]
    );

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
                        <circle
                            cx={radius} cy={radius} r={r} fill="none"
                            stroke="var(--color-border)" strokeWidth={stroke}
                        />
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
                            key={focus.score}
                            initial={{ scale: 1.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`text-lg font-black text-stat ${focus.tier.text}`}
                        >
                            {focus.score}
                        </motion.span>
                    </div>
                </div>

                {/* ── Label + headline ── */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                            Today's Focus
                        </span>
                    </div>
                    <p className={`text-sm font-black mt-0.5 ${focus.tier.text}`}>
                        {focus.tier.emoji} {focus.tier.label}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 leading-snug">
                        {focus.headline}
                    </p>
                </div>
            </div>

            {/* ── Reasons (the "why") + Ask coach ── */}
            <div className="flex items-center justify-between gap-2 mt-3">
                <div className="flex flex-wrap gap-1.5 min-w-0">
                    {focus.reasons.map((reason) => (
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
