import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, Sparkles, ShoppingBag, Star, Coins } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { AVAILABLE_AVATARS } from '../../lib/avatars';
import { avatarIcons } from '../../lib/avatarIcons';

interface AvatarShopModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Rarity tiers based on cost
const getRarity = (cost: number) => {
    if (cost === 0) return { label: 'Starter', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', glow: '', emoji: '⚪' };
    if (cost <= 100) return { label: 'Common', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10', emoji: '🟢' };
    if (cost <= 300) return { label: 'Rare', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', glow: 'shadow-blue-500/10', emoji: '🔵' };
    if (cost <= 800) return { label: 'Epic', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', glow: 'shadow-purple-500/20', emoji: '🟣' };
    return { label: 'Legendary', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', glow: 'shadow-yellow-500/20', emoji: '🌟' };
};

type TabType = 'all' | 'owned' | 'locked';

export function AvatarShopModal({ isOpen, onClose }: AvatarShopModalProps) {
    const { coins, unlockedAvatars, equippedAvatar, buyAvatar, equipAvatar } = useUserStore();
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [justBought, setJustBought] = useState<string | null>(null);
    const [justEquipped, setJustEquipped] = useState<string | null>(null);

    const handleBuy = useCallback((avatarId: string, cost: number) => {
        const success = buyAvatar(avatarId, cost);
        if (success) {
            setJustBought(avatarId);
            equipAvatar(avatarId);
            setJustEquipped(avatarId);
            setTimeout(() => {
                setJustBought(null);
                setJustEquipped(null);
            }, 2000);
        }
    }, [buyAvatar, equipAvatar]);

    const handleEquip = useCallback((avatarId: string) => {
        equipAvatar(avatarId);
        setJustEquipped(avatarId);
        setTimeout(() => setJustEquipped(null), 1500);
    }, [equipAvatar]);

    if (!isOpen) return null;

    const filteredAvatars = AVAILABLE_AVATARS.filter(avatar => {
        const isUnlocked = avatar.cost === 0 || unlockedAvatars.includes(avatar.id);
        if (activeTab === 'owned') return isUnlocked;
        if (activeTab === 'locked') return !isUnlocked;
        return true;
    });

    const ownedCount = AVAILABLE_AVATARS.filter(a => a.cost === 0 || unlockedAvatars.includes(a.id)).length;

    const tabs: { id: TabType; label: string; emoji: string; count?: number }[] = [
        { id: 'all', label: 'All', emoji: '🏪', count: AVAILABLE_AVATARS.length },
        { id: 'owned', label: 'Owned', emoji: '✅', count: ownedCount },
        { id: 'locked', label: 'Locked', emoji: '🔒', count: AVAILABLE_AVATARS.length - ownedCount },
    ];

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Slide-in Panel from Right */}
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] sm:max-w-[85vw] flex flex-col"
                style={{
                    paddingTop: 'env(safe-area-inset-top, 0px)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    paddingRight: 'env(safe-area-inset-right, 0px)',
                }}
            >
                <div className="flex flex-col h-full bg-[var(--color-bg)] sm:rounded-l-3xl shadow-2xl overflow-hidden border-l border-[var(--color-border)]">

                    {/* Header */}
                    <div className="px-5 pt-5 pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors"
                            >
                                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                            </motion.button>

                            {/* Coin Balance */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 15, delay: 0.2 }}
                                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20"
                            >
                                <motion.span
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                                    className="text-lg"
                                >
                                    🪙
                                </motion.span>
                                <span className="font-extrabold text-yellow-500 tabular-nums">{coins}</span>
                            </motion.div>
                        </div>

                        {/* Title with mascot */}
                        <div className="flex items-center gap-3 mb-4">
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                                className="text-3xl select-none"
                            >
                                🛍️
                            </motion.div>
                            <div>
                                <h2 className="text-lg font-extrabold">Avatar Shop</h2>
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                    Collect & equip your battle icons
                                </p>
                            </div>
                        </div>

                        {/* Collection Progress */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                                    Collection Progress
                                </span>
                                <span className="text-[10px] font-bold text-primary-400 tabular-nums">
                                    {ownedCount}/{AVAILABLE_AVATARS.length}
                                </span>
                            </div>
                            <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-primary-500 via-violet-500 to-pink-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(ownedCount / AVAILABLE_AVATARS.length) * 100}%` }}
                                    transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.3 }}
                                />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1.5 p-1 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                            {tabs.map((tab) => (
                                <motion.button
                                    key={tab.id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20'
                                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                                    }`}
                                >
                                    <span className="text-sm">{tab.emoji}</span>
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                            activeTab === tab.id
                                                ? 'bg-white/20'
                                                : 'bg-[var(--color-surface-hover)]'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Avatar Grid */}
                    <div
                        className="flex-1 overflow-y-auto px-5 pb-5 space-y-3"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                            >
                                {filteredAvatars.length === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center py-12"
                                    >
                                        <div className="text-4xl mb-3">
                                            {activeTab === 'locked' ? '🎉' : '📦'}
                                        </div>
                                        <p className="text-sm font-bold text-[var(--color-text-secondary)]">
                                            {activeTab === 'locked'
                                                ? 'You\'ve unlocked everything!'
                                                : 'No avatars here yet'}
                                        </p>
                                    </motion.div>
                                )}

                                {filteredAvatars.map((avatar, index) => {
                                    const isUnlocked = avatar.cost === 0 || unlockedAvatars.includes(avatar.id);
                                    const isEquipped = equippedAvatar === avatar.id || (equippedAvatar === null && avatar.id === 'default');
                                    const canAfford = coins >= avatar.cost;
                                    const IconComponent = avatarIcons[avatar.icon as keyof typeof avatarIcons];
                                    const rarity = getRarity(avatar.cost);
                                    const wasJustBought = justBought === avatar.id;
                                    const wasJustEquipped = justEquipped === avatar.id;

                                    return (
                                        <motion.div
                                            key={avatar.id}
                                            initial={{ opacity: 0, x: 40 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.06, type: 'spring', damping: 20 }}
                                            className={`relative rounded-2xl border-2 overflow-hidden transition-all ${
                                                isEquipped
                                                    ? 'border-primary-500 bg-primary-500/5 shadow-lg shadow-primary-500/10'
                                                    : wasJustBought
                                                    ? 'border-green-500 bg-green-500/5 shadow-lg shadow-green-500/10'
                                                    : `${rarity.border} bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]`
                                            }`}
                                        >
                                            {/* Rarity Banner */}
                                            <div className={`px-4 py-1.5 flex items-center justify-between ${rarity.bg}`}>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs">{rarity.emoji}</span>
                                                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${rarity.color}`}>
                                                        {rarity.label}
                                                    </span>
                                                </div>
                                                {!isUnlocked && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs">🪙</span>
                                                        <span className={`text-xs font-extrabold ${canAfford ? 'text-yellow-500' : 'text-red-400'}`}>
                                                            {avatar.cost}
                                                        </span>
                                                    </div>
                                                )}
                                                {isEquipped && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                        <span className="text-[10px] font-extrabold text-green-400 uppercase tracking-wider">Active</span>
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* Avatar Content */}
                                            <div className="p-4 flex items-center gap-4">
                                                {/* Avatar Icon */}
                                                <motion.div
                                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                                    className="relative flex-shrink-0"
                                                >
                                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                                                        isEquipped
                                                            ? 'bg-gradient-to-br from-primary-500/20 to-violet-500/20 shadow-lg'
                                                            : isUnlocked
                                                            ? 'bg-gradient-to-br from-gray-700 to-gray-900'
                                                            : 'bg-gradient-to-br from-gray-800 to-gray-950'
                                                    }`}>
                                                        {IconComponent && (
                                                            <IconComponent
                                                                className={`w-8 h-8 ${isUnlocked ? avatar.color : 'text-gray-600'}`}
                                                                strokeWidth={isEquipped ? 2.5 : 2}
                                                            />
                                                        )}

                                                        {/* Lock overlay */}
                                                        {!isUnlocked && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl backdrop-blur-[2px]">
                                                                <Lock className="w-5 h-5 text-white/50" />
                                                            </div>
                                                        )}

                                                        {/* Equipped glow ring */}
                                                        {isEquipped && (
                                                            <div className="absolute -inset-0.5 rounded-2xl border-2 border-primary-500/50 animate-pulse pointer-events-none" />
                                                        )}
                                                    </div>

                                                    {/* "NEW" badge for just bought */}
                                                    {wasJustBought && (
                                                        <motion.div
                                                            initial={{ scale: 0, rotate: -30 }}
                                                            animate={{ scale: 1, rotate: 0 }}
                                                            className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-lg bg-green-500 text-white text-[8px] font-black uppercase shadow-lg shadow-green-500/30"
                                                        >
                                                            NEW!
                                                        </motion.div>
                                                    )}
                                                </motion.div>

                                                {/* Avatar Info */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-extrabold text-sm truncate">{avatar.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {isEquipped && (
                                                            <motion.span
                                                                initial={{ opacity: 0, scale: 0 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full"
                                                            >
                                                                <Check className="w-3 h-3" /> Equipped
                                                            </motion.span>
                                                        )}
                                                        {isUnlocked && !isEquipped && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                                ✅ Owned
                                                            </span>
                                                        )}
                                                        {wasJustEquipped && (
                                                            <motion.span
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0 }}
                                                                className="text-[10px] font-bold text-green-400"
                                                            >
                                                                ✨ Equipped!
                                                            </motion.span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Button */}
                                                <div className="flex-shrink-0">
                                                    {isEquipped ? (
                                                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                                            <Star className="w-5 h-5 text-primary-400 fill-primary-400" />
                                                        </div>
                                                    ) : isUnlocked ? (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleEquip(avatar.id)}
                                                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-extrabold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow"
                                                        >
                                                            Equip
                                                        </motion.button>
                                                    ) : (
                                                        <motion.button
                                                            whileHover={{ scale: canAfford ? 1.05 : 1 }}
                                                            whileTap={{ scale: canAfford ? 0.95 : 1 }}
                                                            onClick={() => canAfford && handleBuy(avatar.id, avatar.cost)}
                                                            disabled={!canAfford}
                                                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                                                                canAfford
                                                                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40'
                                                                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed'
                                                            }`}
                                                        >
                                                            {canAfford ? (
                                                                <>
                                                                    <ShoppingBag className="w-3.5 h-3.5" />
                                                                    Buy
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Coins className="w-3.5 h-3.5" />
                                                                    Need {avatar.cost - coins}
                                                                </>
                                                            )}
                                                        </motion.button>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Bottom Info Bar */}
                    <div className="px-5 pb-5 pt-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-violet-500/5 via-primary-500/5 to-pink-500/5 dark:from-violet-500/10 dark:via-primary-500/10 dark:to-pink-500/10 border border-primary-500/10"
                        >
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary-400" />
                                <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                                    Complete quests to earn coins!
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-extrabold text-yellow-500">
                                🪙 {coins}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
