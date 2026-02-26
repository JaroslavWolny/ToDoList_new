import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X, Download, Share2, Crown, Sparkles, TrendingUp, Target } from 'lucide-react';
import html2canvas from 'html2canvas';

interface StreakShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentStreak: number;
    bestStreak: number;
}

function getNextMilestone(streak: number): number {
    const milestones = [7, 14, 30, 60, 100, 180, 365];
    return milestones.find((m) => m > streak) ?? milestones[milestones.length - 1];
}

export function StreakShareModal({ isOpen, onClose, currentStreak, bestStreak }: StreakShareModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const nextMilestone = getNextMilestone(currentStreak);
    const milestoneProgress = Math.min(100, Math.max(0, (currentStreak / nextMilestone) * 100));

    const generateImage = async () => {
        if (!cardRef.current) return null;

        setIsGenerating(true);

        // Wait one paint so capture mode styles apply before screenshot.
        await new Promise(resolve => setTimeout(resolve, 150));

        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 3,
                backgroundColor: null,
                logging: false,
                useCORS: true,
                allowTaint: true,
                windowWidth: cardRef.current.scrollWidth,
                windowHeight: cardRef.current.scrollHeight
            });
            return canvas;
        } catch (error) {
            console.error('Error generating image:', error);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        const canvas = await generateImage();
        if (!canvas) return;

        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `streak-${currentStreak}-days.png`;
        link.href = url;
        link.click();
    };

    const handleShare = async () => {
        const canvas = await generateImage();
        if (!canvas) return;

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `streak-${currentStreak}-days.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                try {
                    await navigator.share({
                        title: 'QuestDo Streak',
                        text: `I am on a ${currentStreak}-day streak. Staying consistent.`,
                        files: [file]
                    });
                } catch (error) {
                    console.error('Error sharing:', error);
                }
            } else {
                handleDownload();
            }
        }, 'image/png');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[var(--color-surface)] shadow-2xl"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 p-4">
                                <p className="text-sm font-bold">Share Streak</p>
                                <button
                                    onClick={onClose}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div
                                ref={cardRef}
                                className="relative mx-4 mt-4 aspect-[9/16] overflow-hidden rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)] shadow-xl"
                                style={{
                                    width: isGenerating ? 1080 : undefined,
                                    maxWidth: isGenerating ? 1080 : undefined,
                                    borderRadius: isGenerating ? 0 : undefined,
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-red-500/10 dark:from-orange-500/15 dark:to-red-500/15" />

                                <div className="relative z-10 grid h-full grid-rows-[auto_auto_1fr_auto_auto] text-[var(--color-text)]">
                                    <div className="flex items-center justify-between px-7 pt-6">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-sm">
                                            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                                            QuestDo
                                        </div>
                                        <span className="text-xs font-medium text-[var(--color-text-secondary)]">{today}</span>
                                    </div>

                                    <div className="px-7 pt-4">
                                        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">Streak Report</p>
                                        <p className="mt-1 text-sm font-medium">You are building real momentum.</p>
                                    </div>

                                    <div className="flex items-center justify-center px-7 py-3 text-center">
                                        <div className="relative">
                                            <div className="absolute -inset-7 rounded-full bg-orange-400/20 blur-3xl" />
                                            <div className="relative flex h-48 w-48 flex-col items-center justify-center rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg backdrop-blur-sm">
                                                <Flame className="mb-2 h-14 w-14 text-orange-500" strokeWidth={2.8} />
                                                <span className="text-8xl font-black leading-[0.92] tracking-tighter gradient-text streak-gradient" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>{currentStreak}</span>
                                                <span className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">Day Streak</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-7">
                                        <div className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 text-left shadow-sm">
                                            <div className="mb-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                                                    <Target className="h-3.5 w-3.5" />
                                                    Next milestone
                                                </div>
                                                <p className="text-xs font-bold text-orange-500">{nextMilestone} {nextMilestone === 1 ? 'day' : 'days'}</p>
                                            </div>
                                            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-hover)]">
                                                <div className="h-full rounded-full streak-gradient" style={{ width: `${milestoneProgress}%` }} />
                                            </div>
                                            <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">All-time best</p>
                                                        <p className="text-lg font-bold">{bestStreak} {bestStreak === 1 ? 'Day' : 'Days'}</p>
                                                    </div>
                                                </div>
                                                <TrendingUp className="h-5 w-5 text-green-500" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-7 pb-6 pt-3 text-center">
                                        <p className="text-base font-semibold leading-tight">Consistency compounds. Keep shipping small wins.</p>
                                        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Made with QuestDo</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 p-4 pb-5">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleDownload}
                                    disabled={isGenerating}
                                    className="flex h-14 items-center justify-center gap-2 rounded-xl bg-[var(--color-surface-hover)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)] disabled:opacity-60"
                                >
                                    <Download className="h-4 w-4" />
                                    Save PNG
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleShare}
                                    disabled={isGenerating}
                                    className="flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 px-4 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-opacity disabled:opacity-60"
                                >
                                    <Share2 className="h-4 w-4" />
                                    Share to IG
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
