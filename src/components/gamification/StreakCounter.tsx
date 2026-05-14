import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Shield, AlertTriangle, Share2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../stores/userStore';
import { useTaskStore, getCompletionsToday } from '../../stores/taskStore';
import { getLevelTitle } from '../../lib/gamification';
import { computeShareStats, getAvatarHex, slugifyHandle } from '../../lib/shareCard';

const StreakShareModal = lazy(() => import('./StreakShareModal').then((module) => ({ default: module.StreakShareModal })));

type StreakState = 'safe' | 'at-risk' | 'critical' | 'fresh';

function getStreakState(completionsToday: number, hour: number): StreakState {
    if (completionsToday > 0) return 'safe';
    // Empty day: state escalates as day progresses
    if (hour < 12) return 'fresh';
    if (hour < 19) return 'at-risk';
    return 'critical';
}

function formatTimeRemaining(now: Date): string {
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const ms = endOfDay.getTime() - now.getTime();
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h <= 0 && m <= 0) return 'soon';
    if (h <= 0) return `${m}m`;
    return `${h}h ${m}m`;
}

export function StreakCounter() {
    const { streakCurrent, streakLongest, streakFreezeTokens, displayName, level, xp, totalTasksCompleted, equippedAvatar } = useUserStore(
        useShallow((state) => ({
            streakCurrent: state.streakCurrent,
            streakLongest: state.streakLongest,
            streakFreezeTokens: state.streakFreezeTokens,
            displayName: state.displayName,
            level: state.level,
            xp: state.xp,
            totalTasksCompleted: state.totalTasksCompleted,
            equippedAvatar: state.equippedAvatar,
        }))
    );
    const { tasks, completions } = useTaskStore(
        useShallow((s) => ({ tasks: s.tasks, completions: s.completions }))
    );
    const handle = useMemo(() => slugifyHandle(displayName || 'hero'), [displayName]);
    const avatarHex = useMemo(() => getAvatarHex(equippedAvatar), [equippedAvatar]);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const completionsToday = useMemo(() => getCompletionsToday(completions, now).length, [completions, now]);
    const state: StreakState = useMemo(
        () => streakCurrent > 0 ? getStreakState(completionsToday, now.getHours()) : 'fresh',
        [completionsToday, now, streakCurrent]
    );
    const timeRemaining = useMemo(() => formatTimeRemaining(now), [now]);

    const flameClass =
        state === 'critical' ? 'streak-gradient-critical' :
        state === 'at-risk' ? 'streak-gradient-risk' :
        streakCurrent > 0 ? 'streak-gradient' :
        'bg-white/5 border border-white/10';

    const animClass =
        state === 'critical' ? 'animate-flame-flicker' :
        state === 'at-risk' ? 'animate-flame-flicker' :
        '';

    const showRiskBadge = streakCurrent > 0 && (state === 'at-risk' || state === 'critical');

    return (
        <>
            <motion.button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className="glass-hero w-full p-5 text-left group"
                aria-label="Open share streak card"
            >
                <div className="flex items-center gap-4">
                    {/* Flame */}
                    <div className="relative shrink-0">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${flameClass} ${animClass}`}
                             style={{
                                 boxShadow: streakCurrent > 0
                                     ? state === 'critical'
                                         ? '0 12px 32px -8px rgba(220, 38, 38, 0.55), inset 0 1px 0 rgba(255,255,255,0.18)'
                                         : '0 12px 32px -8px rgba(249, 115, 22, 0.45), inset 0 1px 0 rgba(255,255,255,0.18)'
                                     : 'none',
                             }}>
                            <Flame className="w-9 h-9 text-white drop-shadow-lg" strokeWidth={2.4} />
                        </div>
                        {/* Tiny sparkle for fire streaks */}
                        {streakCurrent >= 7 && state === 'safe' && (
                            <motion.span
                                className="absolute -top-1 -right-1 text-base"
                                animate={{ rotate: [0, 14, -10, 0], scale: [1, 1.15, 1] }}
                                transition={{ duration: 2.4, repeat: Infinity }}
                            >
                                ✨
                            </motion.span>
                        )}
                    </div>

                    {/* Numbers */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                            <motion.span
                                key={streakCurrent}
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                                className="text-display text-stat"
                            >
                                {streakCurrent}
                            </motion.span>
                            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                                day{streakCurrent === 1 ? '' : 's'}
                            </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-[var(--color-text-tertiary)]">
                            <span className="text-stat">Best · {streakLongest}</span>
                            {streakFreezeTokens > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                                    <Shield className="w-2.5 h-2.5" strokeWidth={2.5} />
                                    <span className="text-stat">{streakFreezeTokens}</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Share affordance */}
                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-9 h-9 rounded-xl bg-white/8 dark:bg-white/8 flex items-center justify-center">
                            <Share2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        </div>
                    </div>
                </div>

                {/* Risk banner */}
                {showRiskBadge && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                            state === 'critical'
                                ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                                : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                        }`}
                    >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                        <span className="flex-1 leading-tight">
                            {state === 'critical' ? 'Streak at risk' : 'Save your streak'} ·{' '}
                            <span className="text-stat font-bold">{timeRemaining}</span> left
                        </span>
                    </motion.div>
                )}
            </motion.button>

            {isShareModalOpen && (
                <Suspense fallback={null}>
                    <StreakShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        currentStreak={streakCurrent}
                        bestStreak={streakLongest}
                        username={displayName || 'Hero'}
                        rank={getLevelTitle(level)}
                        level={level}
                        xp={xp}
                        totalTasks={totalTasksCompleted}
                        handle={handle}
                        avatarColor={avatarHex}
                        {...computeShareStats(tasks, completions)}
                    />
                </Suspense>
            )}
        </>
    );
}
