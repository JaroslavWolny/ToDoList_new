import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X, Download, Share2, Crown, Calendar } from 'lucide-react';
import html2canvas from 'html2canvas';

interface StreakShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentStreak: number;
    bestStreak: number;
}

export function StreakShareModal({ isOpen, onClose, currentStreak, bestStreak }: StreakShareModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateImage = async () => {
        if (!cardRef.current) return null;

        setIsGenerating(true);
        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 3, // Higher resolution for Instagram
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

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'My Day Streak!',
                        text: `I'm on a ${currentStreak}-day streak! 🔥 #HabitTracker #Consistency`,
                        files: [file]
                    });
                } catch (error) {
                    console.error('Error sharing:', error);
                    // Fallback to download if user cancels or it fails
                    // handleDownload(); // Might be annoying if user just canceled
                }
            } else {
                // Fallback for desktop/browsers without share API
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
                            className="bg-[var(--color-bg-primary)] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md hover:bg-black/40 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* The Shareable Area */}
                            <div
                                ref={cardRef}
                                className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-8 flex flex-col items-center justify-center overflow-hidden"
                                style={{
                                    // Make sure dimensions are good for IG stories (9:16 approx)
                                    minHeight: '450px',
                                    borderRadius: isGenerating ? '0px' : '' // prevent rounded corners glitch in html2canvas if needed
                                }}
                            >
                                {/* Decorative elements - Using radial gradients instead of blur for html2canvas compatibility */}
                                <div
                                    className="absolute top-[-30%] left-[-30%] w-[100%] h-[100%] rounded-full pointer-events-none"
                                    style={{
                                        background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(236,72,153,0) 60%)',
                                        filter: isGenerating ? 'none' : 'blur(40px)'
                                    }}
                                />
                                <div
                                    className="absolute bottom-[-20%] right-[-20%] w-[100%] h-[100%] rounded-full pointer-events-none"
                                    style={{
                                        background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0) 60%)',
                                        filter: isGenerating ? 'none' : 'blur(40px)'
                                    }}
                                />

                                {/* Inner Card content */}
                                <div className="z-10 flex flex-col items-center text-center w-full relative">
                                    <h2 className="text-white/90 font-medium tracking-widest uppercase text-sm mb-8 flex items-center justify-center gap-2">
                                        <Calendar className="w-5 h-5" />
                                        Current Streak
                                    </h2>

                                    {/* Flame / Streak Number */}
                                    <div className="relative mb-10 mt-4 flex justify-center items-center w-full">
                                        {/* Orange glow behind the circle */}
                                        <div
                                            className="absolute w-[250px] h-[250px] rounded-full pointer-events-none z-0"
                                            style={{
                                                background: 'radial-gradient(circle, rgba(249,115,22,0.4) 0%, rgba(249,115,22,0) 65%)',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                filter: isGenerating ? 'none' : 'blur(20px)'
                                            }}
                                        />

                                        <div
                                            className="w-48 h-48 rounded-full flex flex-col items-center justify-center relative z-10"
                                            style={{
                                                background: isGenerating ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                backdropFilter: isGenerating ? 'none' : 'blur(16px)',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                boxShadow: isGenerating ? '0 8px 32px rgba(0,0,0,0.2)' : 'none'
                                            }}
                                        >
                                            <Flame
                                                className="w-14 h-14 text-orange-400 mb-2"
                                                style={{
                                                    filter: isGenerating ? 'none' : 'drop-shadow(0 0 15px rgba(251,146,60,0.8))'
                                                }}
                                            />
                                            <span
                                                className="text-7xl font-black text-white tracking-tighter"
                                                style={{ textShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
                                            >
                                                {currentStreak}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Best Streak Badge */}
                                    <div
                                        className="rounded-2xl px-6 py-4 flex items-center justify-start gap-4 mx-auto w-[90%] max-w-[260px] relative z-20"
                                        style={{
                                            background: isGenerating ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255,255,255,0.08)',
                                            backdropFilter: isGenerating ? 'none' : 'blur(12px)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            boxShadow: isGenerating ? '0 4px 20px rgba(0,0,0,0.15)' : 'none'
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                                            <Crown className="w-6 h-6 text-yellow-400" />
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className="text-yellow-400/90 text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ margin: 0 }}>All-Time Best</p>
                                            <p className="text-white font-bold text-base" style={{ margin: 0 }}>{bestStreak} Days</p>
                                        </div>
                                    </div>

                                    <div className="mt-8 opacity-50 text-[10px] text-white">
                                        Level Up Tracking App
                                    </div>
                                </div>
                            </div>

                            {/* Actions Area (Not included in screenshot) */}
                            <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleDownload}
                                        disabled={isGenerating}
                                        className="flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-100/80 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                    >
                                        <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Save Image</span>
                                    </button>

                                    <button
                                        onClick={handleShare}
                                        disabled={isGenerating}
                                        className="flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50"
                                    >
                                        <Share2 className="w-5 h-5" />
                                        <span className="text-xs font-semibold">Share to IG</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
