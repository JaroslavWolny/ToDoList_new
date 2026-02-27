import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Loader2 } from 'lucide-react';

interface StreakShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentStreak: number;
    bestStreak: number;
    username?: string;
    rank?: string;
}

export function StreakShareModal({
    isOpen,
    onClose,
    currentStreak,
    bestStreak,
    username = 'Quester',
    rank = 'Novice Voyager'
}: StreakShareModalProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    // Build the dynamic URL
    const imageUrl = `/api/og?username=${encodeURIComponent(username)}&streak=${currentStreak}&best=${bestStreak}&rank=${encodeURIComponent(rank)}`;

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
                    title: 'QuestDo RPG Card',
                    text: `I'm on an unrelenting ${currentStreak}-day streak in QuestDo! 🔥 My all-time best is ${bestStreak} days.`,
                    files: [file],
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            // Fallback to download if Web Share API files are not supported
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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6 safe-top safe-bottom safe-x"
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: 20 }}
                        onClick={(event) => event.stopPropagation()}
                        className="flex w-full max-w-sm flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--color-surface)] shadow-2xl"
                        style={{ maxHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 3rem)' }}
                    >
                        <div className="flex w-full shrink-0 items-center justify-between border-b border-white/10 p-4">
                            <p className="text-sm font-bold">RPG Share Card</p>
                            <button
                                onClick={onClose}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* High-res Image Preview */}
                        <div className="relative flex min-h-0 flex-1 shrink items-center justify-center overflow-hidden p-4">
                            <div className="relative aspect-[9/16] h-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                                <img
                                    src={imageUrl}
                                    alt="QuestDo RPG Card"
                                    className="h-full w-full object-cover transition-opacity duration-300"
                                    loading="eager"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div
                            className="grid w-full shrink-0 grid-cols-2 gap-3 p-4"
                            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
                        >
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handleDownload}
                                disabled={isGenerating}
                                className="flex h-14 items-center justify-center gap-2 rounded-xl bg-[var(--color-surface-hover)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)] disabled:opacity-60"
                            >
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                Save PNG
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handleShare}
                                disabled={isGenerating}
                                className="flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-xp-from)] to-[var(--color-xp-to)] px-4 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60"
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
