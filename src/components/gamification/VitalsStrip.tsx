import { Suspense, lazy, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Shield, Sparkles, Target, AlertTriangle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../stores/userStore';
import { useTaskStore, getCompletionsToday } from '../../stores/taskStore';
import { calculateComboMultiplier, getLevelTitle } from '../../lib/gamification';
import { computeShareStats, getAvatarHex, slugifyHandle } from '../../lib/shareCard';
import { HealthBar } from './HealthBar';
import { ComboIndicator } from './ComboIndicator';
import { RITUAL_TAG } from '../tasks/QuickRituals';

const StreakShareModal = lazy(() =>
    import('./StreakShareModal').then((m) => ({ default: m.StreakShareModal }))
);

interface VitalsStripProps {
    onOpenRituals: () => void;
}

/**
 * One compact "vitals" row that consolidates streak, HP, combo, daily goal and
 * rituals — replacing the separate streak hero card, the HP/combo/goal status
 * row, and the floating rituals FAB (which used to overlap content).
 */
export function VitalsStrip({ onOpenRituals }: VitalsStripProps) {
    const {
        streakCurrent, streakLongest, streakFreezeTokens,
        displayName, level, xp, totalTasksCompleted, equippedAvatar,
        dailyGoal, quickRitualsEnabled,
    } = useUserStore(
        useShallow((s) => ({
            streakCurrent: s.streakCurrent,
            streakLongest: s.streakLongest,
            streakFreezeTokens: s.streakFreezeTokens,
            displayName: s.displayName,
            level: s.level,
            xp: s.xp,
            totalTasksCompleted: s.totalTasksCompleted,
            equippedAvatar: s.equippedAvatar,
            dailyGoal: s.settings.dailyGoal,
            quickRitualsEnabled: s.settings.quickRitualsEnabled,
        }))
    );
    const { tasks, completions } = useTaskStore(
        useShallow((s) => ({ tasks: s.tasks, completions: s.completions }))
    );

    const [showShare, setShowShare] = useState(false);

    const completionsToday = useMemo(() => getCompletionsToday(completions).length, [completions]);
    const combo = calculateComboMultiplier(completionsToday);

    const ritualStats = useMemo(() => {
        const rituals = tasks.filter(
            (t) => t.tags.includes(RITUAL_TAG) && (t.status === 'ACTIVE' || t.status === 'COMPLETED') && t.recurrence !== 'NONE'
        );
        return { total: rituals.length, remaining: rituals.filter((t) => t.status === 'ACTIVE').length };
    }, [tasks]);

    const ritualDone = ritualStats.total - ritualStats.remaining;
    const ritualAllDone = ritualStats.total > 0 && ritualStats.remaining === 0;
    const ritualPct = ritualStats.total > 0 ? (ritualDone / ritualStats.total) * 100 : 0;

    // Streak risk (recomputed on render — no ticker needed for a glanceable cue).
    const risk = useMemo(() => {
        if (streakCurrent <= 0 || completionsToday > 0) return 'safe' as const;
        const hour = new Date().getHours();
        if (hour < 12) return 'fresh' as const;
        if (hour < 19) return 'at-risk' as const;
        return 'critical' as const;
    }, [streakCurrent, completionsToday]);

    const flameClass =
        risk === 'critical' ? 'streak-gradient-critical' :
        risk === 'at-risk' ? 'streak-gradient-risk' :
        streakCurrent > 0 ? 'streak-gradient' : 'bg-white/10';
    const danger = risk === 'at-risk' || risk === 'critical';

    return (
        <>
            <div className="glass-card p-3 flex flex-col gap-2.5">
                {/* Primary vitals — single row that never wraps (scrolls if tight),
                    so no pill is ever orphaned onto a second line. */}
                <div className="flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-hide">
                    {/* Streak → share */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowShare(true)}
                        className="shrink-0 inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-white/5 border border-[var(--color-border)]"
                        aria-label="Share your streak"
                    >
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${flameClass}`}>
                            <Flame className="w-3.5 h-3.5 text-white drop-shadow" strokeWidth={2.6} />
                        </span>
                        <span className="text-sm font-black text-stat leading-none">{streakCurrent}</span>
                        {danger ? (
                            <AlertTriangle className={`w-3 h-3 ${risk === 'critical' ? 'text-red-400' : 'text-amber-400'}`} strokeWidth={3} />
                        ) : streakFreezeTokens > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-cyan-400">
                                <Shield className="w-3 h-3" strokeWidth={2.6} />
                                <span className="text-[10px] font-bold text-stat">{streakFreezeTokens}</span>
                            </span>
                        ) : null}
                    </motion.button>

                    {/* HP (self-hides when disabled in settings) */}
                    <div className="shrink-0"><HealthBar /></div>

                    {/* Combo — only when active */}
                    {combo > 1 && <div className="shrink-0"><ComboIndicator multiplier={combo} /></div>}

                    {/* Daily goal */}
                    {dailyGoal > 0 && (
                        <div className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-[var(--color-border)]">
                            <Target className="w-3.5 h-3.5 text-cyan-400" strokeWidth={2.6} />
                            <span className="text-[11px] font-bold text-stat text-[var(--color-text-secondary)]">
                                {completionsToday}/{dailyGoal}
                            </span>
                        </div>
                    )}
                </div>

                {/* Rituals — full-width tracker bar (was a wrapping pill that
                    orphaned onto its own line). Progress fills as they're done. */}
                {quickRitualsEnabled && ritualStats.total > 0 && (
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={onOpenRituals}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors ${
                            ritualAllDone
                                ? 'bg-green-500/10 border-green-500/25'
                                : 'bg-cyan-500/[0.08] border-cyan-500/25'
                        }`}
                        aria-label="Open rituals"
                    >
                        <span className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                            ritualAllDone ? 'bg-green-500/20 text-green-400' : 'bg-cyan-500/15 text-cyan-300'
                        }`}>
                            <Sparkles className="w-3.5 h-3.5" strokeWidth={2.6} />
                        </span>
                        <span className={`shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] ${
                            ritualAllDone ? 'text-green-400' : 'text-cyan-300'
                        }`}>
                            Rituals
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                                initial={false}
                                animate={{ width: `${ritualPct}%` }}
                                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                                className={`h-full rounded-full ${
                                    ritualAllDone
                                        ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                        : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                                }`}
                            />
                        </div>
                        <span className="shrink-0 text-[11px] font-black text-stat text-[var(--color-text-secondary)]">
                            {ritualAllDone ? '✓' : `${ritualDone}/${ritualStats.total}`}
                        </span>
                    </motion.button>
                )}
            </div>

            {showShare && (
                <Suspense fallback={null}>
                    <StreakShareModal
                        isOpen={showShare}
                        onClose={() => setShowShare(false)}
                        currentStreak={streakCurrent}
                        bestStreak={streakLongest}
                        username={displayName || 'Hero'}
                        rank={getLevelTitle(level)}
                        level={level}
                        xp={xp}
                        totalTasks={totalTasksCompleted}
                        handle={slugifyHandle(displayName || 'hero')}
                        avatarColor={getAvatarHex(equippedAvatar)}
                        {...computeShareStats(tasks, completions)}
                    />
                </Suspense>
            )}
        </>
    );
}
