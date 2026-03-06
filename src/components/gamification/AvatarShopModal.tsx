import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { AVAILABLE_AVATARS } from '../../lib/avatars';
import { avatarIcons } from '../../lib/avatarIcons';

interface AvatarShopModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AvatarShopModal({ isOpen, onClose }: AvatarShopModalProps) {
    const { coins, unlockedAvatars, equippedAvatar, buyAvatar, equipAvatar } = useUserStore();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md card-surface rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[85vh]"
                >
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold">Avatar Shop</h2>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                                Customize your Level Badge
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-yellow-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-yellow-500/30">
                                <span>🪙</span>
                                <span className="font-bold text-yellow-500">{coins}</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div
                        className="p-6 overflow-y-auto space-y-4"
                        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
                    >
                        {AVAILABLE_AVATARS.map((avatar) => {
                            const isUnlocked = avatar.cost === 0 || unlockedAvatars.includes(avatar.id);
                            const isEquipped = equippedAvatar === avatar.id || (equippedAvatar === null && avatar.id === 'default');
                            const canAfford = coins >= avatar.cost;
                            const IconComponent = avatarIcons[avatar.icon as keyof typeof avatarIcons];

                            return (
                                <div
                                    key={avatar.id}
                                    className={`relative p-4 rounded-2xl border flex items-center justify-between transition-all ${isEquipped
                                        ? 'border-primary-500 bg-primary-500/10'
                                        : 'border-white/10 bg-black/20 hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center ${isEquipped ? 'shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'opacity-70 grayscale'}`}>
                                                {IconComponent && <IconComponent className={`w-6 h-6 ${avatar.color}`} />}
                                            </div>
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl backdrop-blur-[1px]">
                                                    <Lock className="w-5 h-5 text-white/70" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-md">{avatar.name}</h3>
                                            {!isUnlocked && (
                                                <p className={`text-sm font-semibold flex items-center gap-1 ${canAfford ? 'text-yellow-500' : 'text-red-400'}`}>
                                                    {avatar.cost} 🪙
                                                </p>
                                            )}
                                            {isUnlocked && !isEquipped && (
                                                <p className="text-sm text-[var(--color-text-secondary)]">Unlocked</p>
                                            )}
                                            {isEquipped && (
                                                <p className="text-sm text-primary-400 font-semibold flex items-center gap-1">
                                                    <Check className="w-4 h-4" /> Equipped
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="ml-4">
                                        {isEquipped ? (
                                            <button disabled className="px-4 py-2 rounded-xl bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] font-bold opacity-50 cursor-not-allowed">
                                                Equipped
                                            </button>
                                        ) : isUnlocked ? (
                                            <button
                                                onClick={() => equipAvatar(avatar.id)}
                                                className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold transition-colors"
                                            >
                                                Equip
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    if (canAfford) {
                                                        const success = buyAvatar(avatar.id, avatar.cost);
                                                        if (success) {
                                                            equipAvatar(avatar.id);
                                                        }
                                                    }
                                                }}
                                                disabled={!canAfford}
                                                className={`px-4 py-2 rounded-xl font-bold transition-colors shadow-lg ${canAfford
                                                    ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                                                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed'
                                                    }`}
                                            >
                                                {canAfford ? 'Buy' : 'Not Enough'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
