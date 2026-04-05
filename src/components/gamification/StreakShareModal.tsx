import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Loader2, Sparkles } from 'lucide-react';

interface StreakShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentStreak: number;
    bestStreak: number;
    username?: string;
    rank?: string;
    level?: number;
    xp?: number;
    totalTasks?: number;
}

export function StreakShareModal({
    isOpen,
    onClose,
    currentStreak,
    bestStreak,
    username = 'Quester',
    rank = 'Novice Voyager',
    level = 1,
    xp = 0,
    totalTasks = 0,
}: StreakShareModalProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const { imageWidth, imageHeight } = useMemo(() => {
        return {
            imageWidth: 1080,
            imageHeight: 1920,
        };
    }, []);

    const imageUrl = `/api/og?username=${encodeURIComponent(username)}&streak=${currentStreak}&best=${bestStreak}&rank=${encodeURIComponent(rank)}&level=${level}&xp=${xp}&tasks=${totalTasks}&w=${imageWidth}&h=${imageHeight}`;

    const fetchImageBlob = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            return blob;
        } catch (error) {
            console.error('Error fetching image blob:', error);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        const blob = await fetchImageBlob();
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `questdo-streak-${currentStreak}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleShare = async () => {
        const blob = await fetchImageBlob();
        if (!blob) return;

        const file = new File([blob], `questdo-streak-${currentStreak}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({
                    title: 'QuestDo — My Streak',
                    text: `${currentStreak}-day streak in QuestDo! 🔥 Level ${level} • ${totalTasks} quests done.`,
                    files: [file],
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            handleDownload();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md sm:p-6 safe-top safe-bottom safe-x"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(event) => event.stopPropagation()}
                        className="flex w-full max-w-sm flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0d1117] shadow-2xl"
                        style={{ maxHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 3rem)' }}
                    >
                        {/* Header */}
                        <div className="flex w-full shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-400" />
                                <p className="text-sm font-bold text-white/80">Share Your Progress</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/40 transition-colors hover:bg-white/[0.1] hover:text-white/70"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Image Preview */}
                        <div className="relative flex min-h-[min(300px,45vh)] flex-1 shrink items-center justify-center overflow-hidden p-5 sm:p-6">
                            {/* Ambient glow behind card */}
                            <div
                                className="pointer-events-none absolute inset-0"
                                style={{
                                    background: 'radial-gradient(ellipse at center, rgba(124, 77, 255, 0.08) 0%, transparent 70%)',
                                }}
                            />
                            <div
                                className="relative flex overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                                style={{
                                    aspectRatio: `${imageWidth} / ${imageHeight}`,
                                    height: 'auto',
                                    width: '100%',
                                    maxHeight: '52vh',
                                    maxWidth: '70vw',
                                }}
                            >
                                <img
                                    src={imageUrl}
                                    alt="QuestDo Share Card"
                                    className="h-full w-full object-contain"
                                    loading="eager"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div
                            className="grid w-full shrink-0 grid-cols-2 gap-3 border-t border-white/[0.06] p-4"
                            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
                        >
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleDownload}
                                disabled={isGenerating}
                                className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-white/[0.06] px-4 text-sm font-semibold text-white/70 transition-all hover:bg-white/[0.1] hover:text-white disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                Save
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleShare}
                                disabled={isGenerating}
                                className="flex h-[52px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
                                style={{
                                    background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
                                }}
                            >
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                                Share to Stories
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
