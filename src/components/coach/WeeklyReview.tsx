import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { X, CalendarDays, Sparkles, Loader2, ArrowLeft, CheckCircle2, Zap, Flame } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../stores/userStore';
import { useTaskStore, buildCompletionStatsByDate } from '../../stores/taskStore';
import { toLocalDateKey } from '../../lib/dates';
import { askCoach } from '../../lib/coachApi';
import { suggestNextWeek, addQuests, type ParsedQuest } from '../../lib/brainDumpApi';
import { QuestPreviewList } from '../tasks/QuestPreviewList';

interface WeeklyReviewProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WeeklyReview = memo(function WeeklyReview({ isOpen, onClose }: WeeklyReviewProps) {
    const dragControls = useDragControls();
    const streakCurrent = useUserStore((s) => s.streakCurrent);
    const { completions } = useTaskStore(useShallow((s) => ({ completions: s.completions })));

    const stats = useMemo(() => {
        const byDate = buildCompletionStatsByDate(completions);
        const now = new Date();
        let done = 0;
        let xp = 0;
        let active = 0;
        let best = { key: '', count: 0 };
        for (let i = 0; i < 7; i += 1) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const key = toLocalDateKey(d);
            const s = byDate.get(key);
            if (s) {
                done += s.count;
                xp += s.xp;
                active += 1;
                if (s.count > best.count) best = { key, count: s.count };
            }
        }
        const bestLabel = best.count > 0
            ? new Date(`${best.key}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })
            : '—';
        return { done, xp, active, bestLabel };
    }, [completions]);

    const weeklyPrompt = useMemo(
        () =>
            `Weekly review. Over the last 7 days I completed ${stats.done} quests, earned ${stats.xp} XP, was active ${stats.active}/7 days` +
            `${stats.bestLabel !== '—' ? `, my best day was ${stats.bestLabel}` : ''}, and my current streak is ${streakCurrent} days. ` +
            `In 2-3 sentences give me an honest, encouraging recap of my week and one focus for next week. No greeting.`,
        [stats, streakCurrent]
    );

    const [recap, setRecap] = useState<string | null>(null);
    const [recapLoading, setRecapLoading] = useState(false);
    const [nextQuests, setNextQuests] = useState<ParsedQuest[] | null>(null);
    const [planLoading, setPlanLoading] = useState(false);
    const [planError, setPlanError] = useState<string | null>(null);
    const [addedCount, setAddedCount] = useState(0);

    // Reset to a clean state each time the sheet opens (render-time reset —
    // the React-recommended alternative to a reset effect).
    const [wasOpen, setWasOpen] = useState(isOpen);
    if (isOpen !== wasOpen) {
        setWasOpen(isOpen);
        if (isOpen) {
            setNextQuests(null);
            setPlanError(null);
            setAddedCount(0);
            setRecap(null);
            setRecapLoading(true);
        }
    }

    useEffect(() => {
        if (isOpen) document.body.classList.add('modal-scroll-lock');
        else document.body.classList.remove('modal-scroll-lock');
        return () => document.body.classList.remove('modal-scroll-lock');
    }, [isOpen]);

    // Fetch the AI recap when opened (no synchronous setState in the effect body).
    useEffect(() => {
        if (!isOpen) return;
        let alive = true;
        askCoach(weeklyPrompt)
            .then((t) => { if (alive) setRecap(t); })
            .catch(() => { if (alive) setRecap(null); })
            .finally(() => { if (alive) setRecapLoading(false); });
        return () => { alive = false; };
    }, [isOpen, weeklyPrompt]);

    const fallbackRecap = useMemo(
        () =>
            stats.done === 0
                ? 'Quiet week on the quest log. Pick one small win to get the momentum back next week.'
                : `You completed ${stats.done} quests across ${stats.active}/7 days and banked ${stats.xp} XP. Keep the rhythm going next week.`,
        [stats]
    );

    const handlePlan = useCallback(async () => {
        setPlanLoading(true);
        setPlanError(null);
        const q = await suggestNextWeek();
        setPlanLoading(false);
        if (q.length === 0) {
            setPlanError('Could not generate suggestions right now. Try again in a moment.');
        } else {
            setNextQuests(q);
        }
    }, []);

    const handleAdd = useCallback((selected: ParsedQuest[]) => {
        const n = addQuests(selected);
        setAddedCount(n);
        try { navigator.vibrate?.(12); } catch { /* noop */ }
        window.setTimeout(() => onClose(), 850);
    }, [onClose]);

    const handleDragEnd = useCallback(
        (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (info.offset.y > 120 || info.velocity.y > 500) onClose();
        },
        [onClose]
    );

    const tiles = [
        { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Done', value: stats.done },
        { icon: <Zap className="w-4 h-4" />, label: 'XP', value: stats.xp.toLocaleString() },
        { icon: <Flame className="w-4 h-4" />, label: 'Active', value: `${stats.active}/7` },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    />
                    <motion.div
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        drag="y" dragControls={dragControls} dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
                        onDragEnd={handleDragEnd}
                        className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] flex flex-col rounded-t-3xl overflow-hidden"
                        style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}
                    >
                        <div onPointerDown={(e) => dragControls.start(e)} className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0 touch-none">
                            <div className="w-10 h-1.5 rounded-full bg-[var(--color-text-secondary)] opacity-30" />
                        </div>

                        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
                            <div className="flex items-center gap-2">
                                {nextQuests && (
                                    <button onClick={() => setNextQuests(null)} className="p-1.5 -ml-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-white/5" aria-label="Back">
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                )}
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                                    <CalendarDays className="w-4 h-4 text-amber-400" strokeWidth={2.4} />
                                </div>
                                <div className="leading-tight">
                                    <h2 className="text-base font-bold">Weekly Review</h2>
                                    <p className="text-[10px] text-[var(--color-text-tertiary)]">
                                        {nextQuests ? 'Pick quests for next week' : 'Your last 7 days'}
                                    </p>
                                </div>
                            </div>
                            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-[var(--color-text-secondary)]" aria-label="Close">
                                <X className="w-5 h-5" />
                            </motion.button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 pb-6">
                            {addedCount > 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="text-4xl mb-2">✅</div>
                                    <p className="text-sm font-bold">Added {addedCount} quest{addedCount === 1 ? '' : 's'} for next week!</p>
                                </div>
                            ) : nextQuests ? (
                                <QuestPreviewList quests={nextQuests} onAdd={handleAdd} addLabel="Add to quests" />
                            ) : (
                                <>
                                    {/* Stat tiles */}
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {tiles.map((t) => (
                                            <div key={t.label} className="glass-card px-3 py-2.5 flex flex-col items-center gap-0.5">
                                                <span className="text-cyan-400">{t.icon}</span>
                                                <span className="text-base font-black text-stat leading-none mt-1">{t.value}</span>
                                                <span className="text-[10px] text-[var(--color-text-tertiary)]">{t.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {stats.bestLabel !== '—' && (
                                        <p className="text-[11px] text-[var(--color-text-tertiary)] mb-3">
                                            Best day this week: <span className="font-bold text-[var(--color-text-secondary)]">{stats.bestLabel}</span>
                                        </p>
                                    )}

                                    {/* AI recap */}
                                    <div className="glass-card p-3.5 mb-4">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" strokeWidth={2.6} />
                                            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">Coach's recap</span>
                                        </div>
                                        {recapLoading ? (
                                            <div className="flex items-center gap-2 text-[var(--color-text-tertiary)]">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-xs">Reviewing your week…</span>
                                            </div>
                                        ) : (
                                            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{recap ?? fallbackRecap}</p>
                                        )}
                                    </div>

                                    {planError && <p className="mb-2 text-xs text-red-400">{planError}</p>}

                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        disabled={planLoading}
                                        onClick={handlePlan}
                                        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white fab-primary disabled:opacity-50"
                                    >
                                        {planLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" strokeWidth={2.6} />}
                                        {planLoading ? 'Planning next week…' : 'Plan next week with coach'}
                                    </motion.button>
                                </>
                            )}
                            <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});
