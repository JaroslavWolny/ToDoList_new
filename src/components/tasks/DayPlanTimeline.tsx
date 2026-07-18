import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock } from 'lucide-react';
import { useTaskStore, getTasksForToday } from '../../stores/taskStore';
import type { Task, Priority } from '../../types';

const PRIORITY_DOTS: Record<Priority, string> = {
    LOW: 'bg-slate-400',
    MEDIUM: 'bg-blue-400',
    HIGH: 'bg-orange-400',
    CRITICAL: 'bg-red-500',
};

const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

interface DayPlanTimelineProps {
    onEdit: (task: Task) => void;
}

/**
 * Vertical time-blocked plan for today: every active quest with a
 * plannedTime, sorted by time, with a "now" marker. Hidden entirely
 * when nothing is planned — assign times in the quest form ("Plan for").
 */
export function DayPlanTimeline({ onEdit }: DayPlanTimelineProps) {
    const tasks = useTaskStore((s) => s.tasks);
    const [nowMinutes, setNowMinutes] = useState(() => {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
    });

    // Keep the "now" marker honest while the dashboard stays open.
    useEffect(() => {
        const id = window.setInterval(() => {
            const d = new Date();
            setNowMinutes(d.getHours() * 60 + d.getMinutes());
        }, 60_000);
        return () => window.clearInterval(id);
    }, []);

    const planned = useMemo(
        () =>
            getTasksForToday(tasks)
                .filter((t): t is Task & { plannedTime: string } => Boolean(t.plannedTime))
                .sort((a, b) => toMinutes(a.plannedTime) - toMinutes(b.plannedTime)),
        [tasks]
    );

    if (planned.length === 0) return null;

    let nowShown = false;

    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card w-full px-4 py-3"
        >
            <div className="flex items-center gap-1.5 mb-2">
                <CalendarClock className="w-3 h-3 text-cyan-400" />
                <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                    Today's Plan
                </span>
            </div>
            <div className="space-y-1">
                {planned.map((task) => {
                    const isPast = toMinutes(task.plannedTime) <= nowMinutes;
                    const showNowBefore = !isPast && !nowShown;
                    if (showNowBefore) nowShown = true;
                    return (
                        <div key={task.id}>
                            {showNowBefore && (
                                <div className="flex items-center gap-2 py-0.5" aria-label="Current time">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                    <span className="flex-1 h-px bg-cyan-400/40" />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => onEdit(task)}
                                className="w-full flex items-center gap-3 py-1.5 text-left rounded-lg hover:bg-white/5 transition"
                            >
                                <span
                                    className={`text-xs font-bold tabular-nums w-11 shrink-0 ${
                                        isPast
                                            ? 'text-[var(--color-text-tertiary)]'
                                            : 'text-cyan-400'
                                    }`}
                                >
                                    {task.plannedTime}
                                </span>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOTS[task.priority]}`} />
                                <span
                                    className={`text-sm font-semibold truncate ${
                                        isPast ? 'text-[var(--color-text-secondary)]' : ''
                                    }`}
                                >
                                    {task.title}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
