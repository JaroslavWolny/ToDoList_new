import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Share2, X, Loader2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../stores/userStore';
import { getLevelTitle } from '../../lib/gamification';

const MILESTONES = [7, 14, 30, 60, 100, 200, 365, 500, 1000];

function getPassedMilestone(streak: number): number | null {
    let last: number | null = null;
    for (const m of MILESTONES) {
        if (streak >= m) last = m;
        else break;
    }
    return last;
}

const TIER_COPY: Record<number, { title: string; sub: string; tier: string }> = {
    7:    { title: 'One Week Strong',      sub: '7 days. Habit forming.',        tier: 'WOOD' },
    14:   { title: 'Two Weeks Locked In',  sub: '14 days. Discipline mode.',     tier: 'BRONZE' },
    30:   { title: 'Monthly Hero',         sub: '30 days. Unstoppable.',         tier: 'SILVER' },
    60:   { title: 'Two Months Pure',      sub: '60 days. Elite tier.',          tier: 'GOLD' },
    100:  { title: '100-Day Legend',       sub: '100 days. Iconic.',             tier: 'EPIC' },
    200:  { title: 'Bicentennial Streak',  sub: '200 days. Untouchable.',        tier: 'EPIC' },
    365:  { title: 'One Year Streak',      sub: '365 days. Hall of fame.',       tier: 'LEGENDARY' },
    500:  { title: '500-Day Mythic',       sub: '500 days. Beyond mortal.',      tier: 'LEGENDARY' },
    1000: { title: 'Thousand-Day God',     sub: '1000 days. Untouchable.',       tier: 'LEGENDARY' },
};

export function MilestoneShareOverlay() {
    const {
        streakCurrent,
        streakLongest,
        lastSharedStreakMilestone,
        displayName,
        level,
        xp,
        totalTasksCompleted,
        markStreakMilestoneShared,
    } = useUserStore(
        useShallow((s) => ({
            streakCurrent: s.streakCurrent,
            streakLongest: s.streakLongest,
            lastSharedStreakMilestone: s.lastSharedStreakMilestone,
            displayName: s.displayName,
            level: s.level,
            xp: s.xp,
            totalTasksCompleted: s.totalTasksCompleted,
            markStreakMilestoneShared: s.markStreakMilestoneShared,
        }))
    );

    const passed = getPassedMilestone(streakCurrent);
    const shouldShow = passed !== null && passed > lastSharedStreakMilestone;

    const copy = useMemo(() => (passed ? TIER_COPY[passed] : null), [passed]);

    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (shouldShow) {
            const delay = window.setTimeout(() => setIsOpen(true), 400);
            return () => window.clearTimeout(delay);
        }
        return undefined;
    }, [shouldShow]);

    const imageUrl = useMemo(() => {
        if (!passed) return '';
        const username = displayName || 'Quester';
        const rank = getLevelTitle(level);
        return `/api/og?username=${encodeURIComponent(username)}&streak=${streakCurrent}&best=${streakLongest}&rank=${encodeURIComponent(rank)}&level=${level}&xp=${xp}&tasks=${totalTasksCompleted}&w=1080&h=1920`;
    }, [passed, displayName, level, streakCurrent, streakLongest, xp, totalTasksCompleted]);

    if (!shouldShow || !passed || !copy) return null;

    const closeAndAck = () => {
        markStreakMilestoneShared(passed);
        setIsOpen(false);
    };

    const handleShare = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('Failed to generate card');
            const blob = await response.blob();
            const file = new File([blob], `questdo-streak-${streakCurrent}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: `QuestDo — ${streakCurrent}-day streak`,
                    text: `${streakCurrent}-day streak in QuestDo 🔥 Level ${level} • ${totalTasksCompleted} quests done.`,
                    files: [file],
                });
            } else {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `questdo-streak-${streakCurrent}.png`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
            }
            markStreakMilestoneShared(passed);
            setIsOpen(false);
        } catch (e) {
            console.error('Milestone share failed', e);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xl p-5"
                    onClick={closeAndAck}
                >
                    <motion.div
                        initial={{ scale: 0.7, y: 40, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.7, y: 40, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                        onClick={(e) => e.stopPropagation()}
                        className="reveal-card-shell w-full max-w-sm p-6"
                    >
                        <div className="relative z-10 flex items-center justify-between mb-4">
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
                                <span className="text-[10px] uppercase tracking-[0.22em] font-black text-fuchsia-200">
                                    {copy.tier} TIER UNLOCKED
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={closeAndAck}
                                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition"
                                aria-label="Close"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="relative z-10 text-center mb-5">
                            <motion.div
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.15 }}
                                className="inline-block mb-3"
                            >
                                <div className="text-[7rem] leading-none">🔥</div>
                            </motion.div>
                            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-fuchsia-200/80 mb-1">
                                {streakCurrent}-day streak
                            </p>
                            <h2 className="text-2xl font-black text-white tracking-tight">
                                {copy.title}
                            </h2>
                            <p className="text-sm text-white/70 mt-1">
                                {copy.sub}
                            </p>
                        </div>

                        <div className="relative z-10 space-y-2.5">
                            <motion.button
                                type="button"
                                onClick={handleShare}
                                disabled={isGenerating}
                                whileTap={{ scale: 0.97 }}
                                className="w-full h-13 py-3.5 rounded-2xl text-sm font-bold text-white shadow-xl flex items-center justify-center gap-2 disabled:opacity-60"
                                style={{
                                    background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
                                    boxShadow: '0 12px 32px -8px rgba(168, 85, 247, 0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
                                }}
                            >
                                {isGenerating
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Share2 className="w-4 h-4" />}
                                Share your milestone
                            </motion.button>
                            <button
                                type="button"
                                onClick={closeAndAck}
                                className="w-full py-3 rounded-2xl text-xs font-semibold text-white/60 hover:text-white/85 transition"
                            >
                                Maybe later
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
