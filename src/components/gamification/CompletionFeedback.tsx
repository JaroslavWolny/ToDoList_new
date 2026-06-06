import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { DailyThemeId } from '../../types';
import { getTheme } from '../../lib/dailyThemes';

export type CompletionFeedbackData = {
    /** Unique per completion so re-completing retriggers the animation. */
    id: number;
    xpEarned: number;
    comboMultiplier: number;
    appliedBuff: DailyThemeId | null;
};

interface CompletionFeedbackProps {
    feedback: CompletionFeedbackData | null;
    onDone: () => void;
}

function formatMultiplier(multiplier: number): string {
    return `×${multiplier
        .toFixed(multiplier % 1 === 0 ? 0 : 2)
        .replace(/0+$/, '')
        .replace(/\.$/, '')}`;
}

export function CompletionFeedback({ feedback, onDone }: CompletionFeedbackProps) {
    useEffect(() => {
        if (!feedback) return;
        const timer = setTimeout(onDone, 1800);
        return () => clearTimeout(timer);
    }, [feedback, onDone]);

    const buff = feedback ? getTheme(feedback.appliedBuff) : null;
    const showCombo = !!feedback && feedback.comboMultiplier > 1;

    return (
        <AnimatePresence>
            {feedback && (
                <motion.div
                    key={feedback.id}
                    initial={{ y: 24, opacity: 0, scale: 0.85 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -24, opacity: 0, scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                    className="fixed left-0 right-0 z-40 flex flex-col items-center gap-2 pointer-events-none"
                    style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
                >
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full shadow-xl xp-gradient text-white">
                        <Zap className="w-4 h-4" strokeWidth={3} />
                        <span className="text-sm font-black tracking-wide">
                            +{feedback.xpEarned} XP
                        </span>
                        {showCombo && (
                            <span className="text-xs font-black text-stat pl-2 ml-1 border-l border-white/30">
                                {formatMultiplier(feedback.comboMultiplier)} combo
                            </span>
                        )}
                    </div>
                    {buff && (
                        <div
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-white shadow-lg bg-gradient-to-r ${buff.accent}`}
                        >
                            <span className="text-sm leading-none">{buff.emoji}</span>
                            <span className="text-[11px] font-black tracking-wide leading-none">
                                {buff.title} applied
                            </span>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
