import { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, ArrowRight, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../stores/userStore';
import {
    useTaskStore,
    getTasksForToday,
    getOverdueTasks,
    getCompletionsToday,
} from '../../stores/taskStore';
import { toLocalDateKey } from '../../lib/dates';

const DISMISS_KEY = 'questdo:coach-nudge-dismissed';

interface CoachNudgeProps {
    /** Open the coach with this auto-sent prompt. */
    onAsk: (prompt: string) => void;
}

interface Nudge {
    line: string;
    cta: string;
    prompt: string;
}

/**
 * Pick the single most relevant proactive coaching offer from the player's
 * live state. ADHD players get anti-overwhelm framing (one tiny step, no shame).
 * Returns null only when there is genuinely nothing useful to offer.
 */
function buildNudge(
    adhd: boolean,
    overdue: number,
    todayCount: number,
    completedToday: number,
    dailyGoal: number
): Nudge {
    if (overdue > 0) {
        const q = overdue === 1 ? 'quest' : 'quests';
        return adhd
            ? {
                line: `${overdue} ${q} slipped — no shame. Want the one tiny step to restart?`,
                cta: 'Restart plan',
                prompt: `I have ${overdue} overdue quests and I'm overwhelmed. Don't lecture me — give me ONE tiny first step to restart, then the next two, shortest first.`,
            }
            : {
                line: `${overdue} ${q} slipped. Want a recovery plan?`,
                cta: 'Recovery plan',
                prompt: `I have ${overdue} overdue quests. Give me a calm, ordered recovery plan — what to do first. Keep it short.`,
            };
    }

    if (todayCount === 0) {
        return adhd
            ? {
                line: "Brain busy, board empty? Let's pick one tiny thing.",
                cta: 'Plan my day',
                prompt: 'Plan a low-pressure, ADHD-friendly day: 3 short, concrete quests, easiest first. Number them. Keep it calm.',
            }
            : {
                line: 'Blank slate. Want me to plan a focused day?',
                cta: 'Plan my day',
                prompt: 'Plan my day — suggest 3 concrete, short quests based on my patterns and what matters most. Number them.',
            };
    }

    if (dailyGoal > 0 && completedToday >= dailyGoal) {
        return adhd
            ? {
                line: "Goal done — that's a real win. Stretch or stop?",
                cta: 'Ask coach',
                prompt: 'I hit my daily goal. Should I do one more or stop for today? Keep it short and kind.',
            }
            : {
                line: 'Daily goal smashed. Push for more or call it?',
                cta: 'Ask coach',
                prompt: 'I hit my daily goal. Suggest one optional stretch quest, or tell me to rest. Keep it short.',
            };
    }

    if (todayCount >= 5) {
        return adhd
            ? {
                line: `${todayCount} on the board — that's a lot. Want just your first move?`,
                cta: 'Pick my first move',
                prompt: `I have ${todayCount} quests and feel overwhelmed. Pick the single best one to start now and why, in one short paragraph.`,
            }
            : {
                line: `${todayCount} quests on the board. Want me to pick your first 3?`,
                cta: 'Prioritize',
                prompt: `I have ${todayCount} quests today. Pick the 3 I should do first, in order, with one-line reasons.`,
            };
    }

    return adhd
        ? {
            line: "Not sure where to start? I'll pick one tiny thing.",
            cta: "What's first?",
            prompt: 'Pick the ONE quest I should start right now and the 2-minute first action to begin it. Keep it short.',
        }
        : {
            line: 'Want me to pick what to tackle first?',
            cta: "What's first?",
            prompt: 'What should I tackle first right now and why? Keep it to a couple of sentences.',
        };
}

export const CoachNudge = memo(function CoachNudge({ onAsk }: CoachNudgeProps) {
    const todayKey = toLocalDateKey(new Date());
    const [dismissed, setDismissed] = useState<boolean>(() => {
        try {
            return localStorage.getItem(DISMISS_KEY) === todayKey;
        } catch {
            return false;
        }
    });

    const { dailyGoal, mainMotivation } = useUserStore(
        useShallow((s) => ({
            dailyGoal: s.settings.dailyGoal,
            mainMotivation: s.settings.mainMotivation,
        }))
    );
    const { tasks, completions } = useTaskStore(
        useShallow((s) => ({ tasks: s.tasks, completions: s.completions }))
    );

    const nudge = useMemo(() => {
        const overdue = getOverdueTasks(tasks).length;
        const todayCount = getTasksForToday(tasks).length;
        const completedToday = getCompletionsToday(completions).length;
        return buildNudge(mainMotivation === 'ADHD', overdue, todayCount, completedToday, dailyGoal);
    }, [tasks, completions, mainMotivation, dailyGoal]);

    if (dismissed) return null;

    const dismiss = () => {
        setDismissed(true);
        try { localStorage.setItem(DISMISS_KEY, todayKey); } catch { /* noop */ }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="relative glass-card p-3.5 overflow-hidden"
        >
            {/* Ambient coach glow so it reads as the signature AI surface */}
            <div
                aria-hidden
                className="pointer-events-none absolute -top-12 -left-8 w-32 h-32 rounded-full blur-3xl opacity-50"
                style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.28), transparent 70%)' }}
            />
            <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss coach for today"
                className="absolute top-2 right-2 z-10 p-1 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-white/5 transition-colors"
            >
                <X className="w-3.5 h-3.5" strokeWidth={2.6} />
            </button>

            <div className="relative flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500/25 to-blue-500/20 border border-cyan-500/30">
                    <Compass className="w-4.5 h-4.5 text-cyan-400" strokeWidth={2.4} />
                </div>
                <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                        Quest Coach
                    </span>
                    <p className="text-[13px] font-semibold leading-snug mt-0.5 pr-5">
                        {nudge.line}
                    </p>
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onAsk(nudge.prompt)}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white fab-primary active:scale-[0.98] transition-transform"
                    >
                        {nudge.cta}
                        <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
});
