import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Loader2, Sparkles } from 'lucide-react';
import { SHARE_BASE_URL } from '../../lib/shareCard';

interface DayRecapShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    quests: number;
    goal: number;
    xpToday: number;
    focusMin: number;
    streak: number;
    /** Today's mood 1-5, null when not logged */
    mood: number | null;
    username?: string;
    handle?: string;
}

const IMAGE_WIDTH = 1080;
const IMAGE_HEIGHT = 1920;

const formatDateLabel = (d = new Date()): string =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        .replace(',', ' ·');

/** End-of-day recap share card (IG-story format), rendered by /api/og?variant=daily. */
export function DayRecapShareModal({
    isOpen,
    onClose,
    quests,
    goal,
    xpToday,
    focusMin,
    streak,
    mood,
    username = 'Quester',
    handle = 'hero',
}: DayRecapShareModalProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const imageUrl = `/api/og?variant=daily&username=${encodeURIComponent(username)}&handle=${encodeURIComponent(handle)}&quests=${quests}&goal=${goal}&xpToday=${xpToday}&focusMin=${focusMin}&streak=${streak}${mood ? `&mood=${mood}` : ''}&date=${encodeURIComponent(formatDateLabel())}&w=${IMAGE_WIDTH}&h=${IMAGE_HEIGHT}`;
    const shareUrl = `${SHARE_BASE_URL}/${handle}`;

    const fetchImageBlob = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.blob();
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
        link.download = `questdo-day-${quests}-quests.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleShare = async () => {
        const blob = await fetchImageBlob();
        if (!blob) return;

        const file = new File([blob], `questdo-day-${quests}-quests.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({
                    title: 'QuestDo — My Day',
                    text: `${quests} quests crushed today in QuestDo ⚔️ +${xpToday} XP · ${streak}-day streak. Join me → ${shareUrl}`,
                    url: shareUrl,
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
                                <Sparkles className="h-4 w-4 text-cyan-400" />
                                <p className="text-sm font-bold text-white/80">Share Your Day</p>
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
                            <div
                                className="pointer-events-none absolute inset-0"
                                style={{
                                    background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.08) 0%, transparent 70%)',
                                }}
                            />
                            <div
                                className="relative flex overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                                style={{
                                    aspectRatio: `${IMAGE_WIDTH} / ${IMAGE_HEIGHT}`,
                                    height: 'auto',
                                    width: '100%',
                                    maxHeight: '52vh',
                                    maxWidth: '70vw',
                                }}
                            >
                                <img
                                    src={imageUrl}
                                    alt="QuestDo Day Recap Card"
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
                                    background: 'linear-gradient(135deg, #06b6d4, #22d3ee, #fbbf24)',
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
