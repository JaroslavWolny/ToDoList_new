import { motion, AnimatePresence } from 'framer-motion';
import { getLevelTitle } from '../../lib/gamification';
import { Sparkles } from 'lucide-react';
import { useEffect } from 'react';

interface LevelUpOverlayProps {
    show: boolean;
    newLevel: number;
    onDismiss: () => void;
}

export function LevelUpOverlay({ show, newLevel, onDismiss }: LevelUpOverlayProps) {
    const title = getLevelTitle(newLevel);
    const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: (i * 37 + newLevel * 7) % 100,
        y: (i * 29 + newLevel * 11) % 100,
        delay: (i % 5) * 0.1,
        color: ['#06b6d4', '#22d3ee', '#67e8f9', '#f59e0b', '#fbbf24'][i % 5],
    }));

    useEffect(() => {
        if (show) {
            const timer = setTimeout(onDismiss, 4000);
            return () => clearTimeout(timer);
        }
    }, [onDismiss, show]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={onDismiss}
                >
                    {particles.map((p) => (
                        <motion.div
                            key={p.id}
                            initial={{ x: '50%', y: '50%', scale: 0 }}
                            animate={{
                                x: `${p.x}%`,
                                y: `${p.y}%`,
                                scale: [0, 1, 0],
                                opacity: [0, 1, 0],
                            }}
                            transition={{ duration: 2, delay: p.delay }}
                            className="absolute w-3 h-3 rounded-full"
                            style={{ backgroundColor: p.color }}
                        />
                    ))}

                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        className="relative text-center"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            className="absolute -inset-8 rounded-full border-2 border-dashed border-cyan-400/30"
                        />

                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                <Sparkles className="w-12 h-12 text-yellow-400" />
                            </motion.div>

                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-lg font-bold uppercase tracking-widest text-cyan-300"
                            >
                                Level Up!
                            </motion.h2>

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5, type: 'spring' }}
                                className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/50"
                            >
                                <span className="text-4xl font-black text-white">{newLevel}</span>
                            </motion.div>

                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="text-xl font-bold text-white"
                            >
                                {title}
                            </motion.p>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1 }}
                                className="text-sm text-gray-400"
                            >
                                Tap to continue
                            </motion.p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
