import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Coins, Star, Package } from 'lucide-react';
import { RandomReward } from '../../types';

interface RandomRewardModalProps {
    reward: RandomReward | null;
    onClose: () => void;
}

export function RandomRewardModal({ reward, onClose }: RandomRewardModalProps) {
    if (!reward) return null;

    const isChest = reward.type === 'CHEST';
    const isCoins = reward.currency === 'COINS';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm safe-top safe-bottom safe-x"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.8, y: 50, opacity: 0, rotate: -5 }}
                    animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.8, y: 50, opacity: 0, rotate: 5 }}
                    transition={{ type: 'spring', bounce: 0.5, duration: 0.6 }}
                    className="relative w-full max-w-sm overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={`relative p-8 rounded-3xl text-center shadow-2xl overflow-hidden ${isChest
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                            : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                        }`}>
                        {/* Shimmer effect */}
                        <motion.div
                            animate={{
                                x: ['-100%', '200%'],
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 2,
                                ease: "linear",
                            }}
                            className="absolute inset-0 z-0 w-1/2 h-full bg-white/20 skew-x-12"
                        />

                        <div className="relative z-10 flex flex-col items-center">
                            <motion.div
                                animate={{
                                    y: [0, -10, 0],
                                    scale: [1, 1.1, 1]
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 2,
                                    ease: "easeInOut"
                                }}
                                className="mb-6"
                            >
                                {isChest ? (
                                    <div className="relative w-24 h-24 flex items-center justify-center bg-white/20 rounded-2xl shadow-inner backdrop-blur-md border border-white/30">
                                        <Package className="w-14 h-14 text-white drop-shadow-lg" />
                                    </div>
                                ) : (
                                    <div className="relative w-20 h-20 flex items-center justify-center bg-white/20 rounded-full shadow-inner backdrop-blur-md border border-white/30">
                                        <Gift className="w-12 h-12 text-white drop-shadow-lg" />
                                    </div>
                                )}
                            </motion.div>

                            <h2 className="text-2xl font-black text-white mb-2 drop-shadow-md tracking-tight uppercase">
                                {isChest ? 'Rare Chest!' : 'Lucky Pouch!'}
                            </h2>
                            <p className="text-white/90 mb-6 text-sm font-medium">
                                You found hidden loot while working!
                            </p>

                            <div className="flex items-center justify-center gap-3 px-6 py-3 bg-black/20 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                                {isCoins ? (
                                    <Coins className="w-8 h-8 text-yellow-300 drop-shadow-md" />
                                ) : (
                                    <Star className="w-8 h-8 text-blue-300 drop-shadow-md" />
                                )}
                                <span className="text-3xl font-black text-white drop-shadow-md">
                                    +{reward.amount} {reward.currency}
                                </span>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="mt-8 px-8 py-3 bg-white text-gray-900 rounded-xl font-bold text-sm shadow-xl hover:bg-gray-50 flex items-center gap-2 transition-colors w-full justify-center"
                                onClick={onClose}
                            >
                                Nice!
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
