import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Sparkles, Star, Coins, Trophy, ShoppingBag } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../stores/userStore';
import { AVAILABLE_AVATARS, AVATAR_CATEGORIES, CategoryFilter } from '../../lib/avatars';
import { avatarIcons } from '../../lib/avatarIcons';
import { useIsMobile } from '../../lib/useIsMobile';
import { AvatarRarity } from '../../types';

interface AvatarShopModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RARITY_CONFIG: Record<AvatarRarity, { label: string; color: string; bg: string; border: string; glow: string; emoji: string }> = {
    STARTER: { label: 'Starter', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', glow: '', emoji: '⚪' },
    COMMON: { label: 'Common', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10', emoji: '🟢' },
    RARE: { label: 'Rare', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', glow: 'shadow-blue-500/10', emoji: '🔵' },
    EPIC: { label: 'Epic', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'shadow-cyan-500/20', emoji: '💎' },
    LEGENDARY: { label: 'Legendary', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', glow: 'shadow-yellow-500/20', emoji: '🌟' },
    MYTHIC: { label: 'Mythic', color: 'text-amber-300', bg: 'bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-500/20', border: 'border-amber-400/50', glow: 'shadow-amber-500/40', emoji: '🔱' },
};

type OwnershipFilter = 'all' | 'owned' | 'locked';

const selectShopState = (state: ReturnType<typeof useUserStore.getState>) => ({
    coins: state.coins,
    unlockedAvatars: state.unlockedAvatars,
    equippedAvatar: state.equippedAvatar,
    buyAvatar: state.buyAvatar,
    equipAvatar: state.equipAvatar,
});

const isAvatarUnlocked = (avatarId: string, cost: number, unlockedAvatars: string[]) =>
    cost === 0 || unlockedAvatars.includes(avatarId);

const CONFETTI_PARTICLES = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: Math.random() * 80 - 40,
    y: -(Math.random() * 100 + 30),
    rotation: Math.random() * 720 - 360,
    scale: Math.random() * 0.4 + 0.6,
    color: ['#f6e7bd', '#e7cd8f', '#d3ae66', '#f2f4f8', '#c6cdd8', '#ffffff'][Math.floor(Math.random() * 6)],
    delay: Math.random() * 0.2,
}));

// Confetti particle component
function PurchaseConfetti({ show }: { show: boolean }) {
    if (!show) return null;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {CONFETTI_PARTICLES.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{ x: '50%', y: '50%', scale: 0, rotate: 0, opacity: 1 }}
                    animate={{
                        x: `calc(50% + ${p.x}px)`,
                        y: `calc(50% + ${p.y}px)`,
                        scale: p.scale,
                        rotate: p.rotation,
                        opacity: 0,
                    }}
                    transition={{ duration: 0.7, delay: p.delay, ease: 'easeOut' }}
                    className="absolute rounded-full"
                    style={{ width: 6, height: 6, backgroundColor: p.color }}
                />
            ))}
        </div>
    );
}

export function AvatarShopModal({ isOpen, onClose }: AvatarShopModalProps) {
    const { coins, unlockedAvatars, equippedAvatar, buyAvatar, equipAvatar } = useUserStore(
        useShallow(selectShopState)
    );
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
    const [justBought, setJustBought] = useState<string | null>(null);
    const [justEquipped, setJustEquipped] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState<string | null>(null);
    const buyFeedbackTimeoutRef = useRef<number | null>(null);
    const equipFeedbackTimeoutRef = useRef<number | null>(null);
    const confettiTimeoutRef = useRef<number | null>(null);
    const isMobile = useIsMobile();

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previousOverflow; };
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (buyFeedbackTimeoutRef.current !== null) window.clearTimeout(buyFeedbackTimeoutRef.current);
            if (equipFeedbackTimeoutRef.current !== null) window.clearTimeout(equipFeedbackTimeoutRef.current);
            if (confettiTimeoutRef.current !== null) window.clearTimeout(confettiTimeoutRef.current);
        };
    }, []);

    const handleBuy = useCallback((avatarId: string, cost: number) => {
        const success = buyAvatar(avatarId, cost);
        if (success) {
            setJustBought(avatarId);
            setShowConfetti(avatarId);
            equipAvatar(avatarId);
            setJustEquipped(avatarId);
            if (buyFeedbackTimeoutRef.current !== null) window.clearTimeout(buyFeedbackTimeoutRef.current);
            buyFeedbackTimeoutRef.current = window.setTimeout(() => { setJustBought(null); setJustEquipped(null); }, 2500);
            if (confettiTimeoutRef.current !== null) window.clearTimeout(confettiTimeoutRef.current);
            confettiTimeoutRef.current = window.setTimeout(() => setShowConfetti(null), 1000);
        }
    }, [buyAvatar, equipAvatar]);

    const handleEquip = useCallback((avatarId: string) => {
        equipAvatar(avatarId);
        setJustEquipped(avatarId);
        if (equipFeedbackTimeoutRef.current !== null) window.clearTimeout(equipFeedbackTimeoutRef.current);
        equipFeedbackTimeoutRef.current = window.setTimeout(() => setJustEquipped(null), 1500);
    }, [equipAvatar]);

    const ownedCount = useMemo(() =>
        AVAILABLE_AVATARS.filter(a => isAvatarUnlocked(a.id, a.cost, unlockedAvatars)).length,
        [unlockedAvatars]
    );
    const collectionProgress = useMemo(() =>
        Math.round((ownedCount / AVAILABLE_AVATARS.length) * 100),
        [ownedCount]
    );

    const filteredAvatars = useMemo(() =>
        AVAILABLE_AVATARS.filter(avatar => {
            const unlocked = isAvatarUnlocked(avatar.id, avatar.cost, unlockedAvatars);
            if (ownershipFilter === 'owned' && !unlocked) return false;
            if (ownershipFilter === 'locked' && unlocked) return false;
            if (categoryFilter !== 'all' && avatar.category !== categoryFilter) return false;
            return true;
        }),
        [categoryFilter, ownershipFilter, unlockedAvatars]
    );

    const ownershipTabs = useMemo(() => [
        { id: 'all' as OwnershipFilter, label: 'All', count: AVAILABLE_AVATARS.length },
        { id: 'owned' as OwnershipFilter, label: 'Owned', count: ownedCount },
        { id: 'locked' as OwnershipFilter, label: 'Locked', count: AVAILABLE_AVATARS.length - ownedCount },
    ], [ownedCount]);

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    // Portal to <body> so the panel escapes any ancestor that establishes a
    // containing block for position:fixed — e.g. the dashboard's `.glass-hero`
    // card (backdrop-filter + overflow:hidden) that wraps the LevelBadge which
    // mounts this modal. Without the portal the panel gets pinned to that small
    // hero card and clipped, leaving the page showing through behind it.
    return createPortal(
        <AnimatePresence>
            {/* Backdrop – desktop only */}
            {!isMobile && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <motion.div
                initial={isMobile ? { y: '100%' } : { x: '100%' }}
                animate={isMobile ? { y: 0 } : { x: 0 }}
                exit={isMobile ? { y: '100%' } : { x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className={`fixed z-50 flex flex-col ${
                    isMobile ? 'inset-0 bg-[var(--color-bg)]' : 'right-0 top-0 bottom-0 w-[480px] max-w-[85vw]'
                }`}
                style={{
                    paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : undefined,
                    paddingLeft: 'env(safe-area-inset-left, 0px)',
                    paddingRight: 'env(safe-area-inset-right, 0px)',
                    overscrollBehavior: 'none',
                }}
            >
                <div className={`flex flex-col flex-1 overflow-hidden bg-[var(--color-bg)] shadow-2xl ${
                    isMobile ? 'h-full' : 'border border-[var(--color-border)] rounded-l-3xl border-r-0'
                }`}>

                    {/* ── HEADER ─────────────────────────────────── */}
                    <div style={{ padding: '16px 20px 12px' }}>
                        {/* Top bar: Close + Coins – 44pt touch targets */}
                        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="flex items-center justify-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] active:bg-[var(--color-surface-hover)] transition-colors"
                                style={{ width: 44, height: 44 }}
                            >
                                <X className="text-[var(--color-text-secondary)]" style={{ width: 20, height: 20 }} />
                            </motion.button>

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 15, delay: 0.15 }}
                                className="flex items-center bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-2xl"
                                style={{ height: 42, paddingLeft: 14, paddingRight: 16, gap: 8 }}
                            >
                                <motion.div
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                                    className="flex items-center justify-center"
                                >
                                    <Coins className="text-yellow-500" style={{ width: 20, height: 20 }} strokeWidth={2.5} />
                                </motion.div>
                                <span className="font-extrabold text-yellow-500 tabular-nums" style={{ fontSize: 16 }}>{coins}</span>
                            </motion.div>
                        </div>

                        {/* Title row */}
                        <div className="flex items-center" style={{ gap: 12, marginBottom: 16 }}>
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                                className="select-none flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-blue-500/20"
                                style={{ width: 48, height: 48 }}
                            >
                                <ShoppingBag className="text-primary-400" style={{ width: 26, height: 26 }} strokeWidth={2} />
                            </motion.div>
                            <div>
                                <h2 className="font-extrabold" style={{ fontSize: 20, lineHeight: '24px' }}>Avatar Shop</h2>
                                <p className="text-[var(--color-text-secondary)]" style={{ fontSize: 13 }}>
                                    Collect & equip your battle icons
                                </p>
                            </div>
                        </div>

                        {/* Collection Progress – 8pt height bar */}
                        <div style={{ marginBottom: 14 }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                                <span className="font-bold text-[var(--color-text-secondary)] uppercase tracking-wider" style={{ fontSize: 11 }}>
                                    Collection
                                </span>
                                <div className="flex items-center" style={{ gap: 4 }}>
                                    <Trophy className="text-primary-400" style={{ width: 12, height: 12 }} />
                                    <span className="font-bold text-primary-400 tabular-nums" style={{ fontSize: 12 }}>
                                        {ownedCount}/{AVAILABLE_AVATARS.length}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-[var(--color-border)] rounded-full overflow-hidden" style={{ height: 8 }}>
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-primary-400 via-blue-500 to-amber-400"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${collectionProgress}%` }}
                                    transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.3 }}
                                />
                            </div>
                        </div>

                        {/* Ownership Tabs – 44pt height each */}
                        <div className="flex bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]"
                            style={{ padding: 4, gap: 4, marginBottom: 12 }}>
                            {ownershipTabs.map((tab) => (
                                <motion.button
                                    key={tab.id}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setOwnershipFilter(tab.id)}
                                    className={`flex-1 flex items-center justify-center rounded-xl font-bold transition-all ${
                                        ownershipFilter === tab.id
                                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20'
                                            : 'text-[var(--color-text-secondary)] active:bg-[var(--color-surface-hover)]'
                                    }`}
                                    style={{ height: 40, fontSize: 13, gap: 6 }}
                                >
                                    {tab.label}
                                    <span className={`rounded-full tabular-nums ${
                                        ownershipFilter === tab.id ? 'bg-white/20' : 'bg-[var(--color-surface-hover)]'
                                    }`} style={{ fontSize: 11, paddingLeft: 7, paddingRight: 7, paddingTop: 2, paddingBottom: 2 }}>
                                        {tab.count}
                                    </span>
                                </motion.button>
                            ))}
                        </div>

                        {/* Category Filter – 40pt height, scrollable */}
                        <div className="flex overflow-x-auto scrollbar-hide" style={{ gap: 8, paddingBottom: 4 }}>
                            {AVATAR_CATEGORIES.map((cat) => (
                                <motion.button
                                    key={cat.id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setCategoryFilter(cat.id)}
                                    className={`flex-shrink-0 flex items-center rounded-xl font-bold transition-all ${
                                        categoryFilter === cat.id
                                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                            : 'text-[var(--color-text-secondary)] active:text-[var(--color-text)] border border-transparent'
                                    }`}
                                    style={{ height: 36, paddingLeft: 12, paddingRight: 14, fontSize: 12, gap: 5 }}
                                >
                                    <span style={{ fontSize: 15 }}>{cat.emoji}</span>
                                    {cat.label}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* ── AVATAR GRID (2-column) ──────────────────── */}
                    <div
                        className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
                        style={{ padding: '0 20px 20px', WebkitOverflowScrolling: 'touch' }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${categoryFilter}-${ownershipFilter}`}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.2 }}
                            >
                                {filteredAvatars.length === 0 && (
                                    <div className="text-center" style={{ paddingTop: 60, paddingBottom: 60 }}>
                                        <div style={{ fontSize: 48, marginBottom: 12 }}>
                                            {ownershipFilter === 'locked' ? '🎉' : '📦'}
                                        </div>
                                        <p className="font-bold text-[var(--color-text-secondary)]" style={{ fontSize: 15 }}>
                                            {ownershipFilter === 'locked' ? "You've unlocked everything!" : 'No avatars here'}
                                        </p>
                                        <p className="text-[var(--color-text-secondary)]" style={{ fontSize: 13, marginTop: 4 }}>
                                            Try changing your filters
                                        </p>
                                    </div>
                                )}

                                {/* 2-column grid – cards sized for iPhone 15 Pro (393pt - 40px padding = 353px / 2 cols - gap) */}
                                <div className="grid grid-cols-2" style={{ gap: 10 }}>
                                    {filteredAvatars.map((avatar, index) => {
                                        const unlocked = isAvatarUnlocked(avatar.id, avatar.cost, unlockedAvatars);
                                        const isEquipped = equippedAvatar === avatar.id || (equippedAvatar === null && avatar.id === 'default');
                                        const canAfford = coins >= avatar.cost;
                                        const IconComponent = avatarIcons[avatar.icon as keyof typeof avatarIcons];
                                        const rarity = RARITY_CONFIG[avatar.rarity];
                                        const wasJustBought = justBought === avatar.id;
                                        const wasJustEquipped = justEquipped === avatar.id;
                                        const hasConfetti = showConfetti === avatar.id;

                                        return (
                                            <motion.div
                                                key={avatar.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: Math.min(index * 0.03, 0.2), type: 'spring', damping: 18 }}
                                                className={`relative rounded-2xl border-2 overflow-hidden transition-all ${
                                                    isEquipped
                                                        ? 'border-primary-500 bg-primary-500/5 shadow-lg shadow-primary-500/10'
                                                        : wasJustBought
                                                        ? 'border-green-500 bg-green-500/5 shadow-lg shadow-green-500/10'
                                                        : `${rarity.border} bg-[var(--color-surface)]`
                                                }`}
                                            >
                                                <PurchaseConfetti show={hasConfetti} />

                                                {/* NEW badge */}
                                                {avatar.isNew && !unlocked && (
                                                    <div className="absolute z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black uppercase shadow-lg shadow-amber-500/25 rounded-bl-lg"
                                                        style={{ top: 0, right: 0, fontSize: 8, paddingLeft: 6, paddingRight: 6, paddingTop: 3, paddingBottom: 3 }}>
                                                        NEW
                                                    </div>
                                                )}

                                                {/* Card content */}
                                                <div className="flex flex-col items-center" style={{ padding: '16px 10px 14px' }}>
                                                    {/* Avatar icon – 56x56pt */}
                                                    <motion.div
                                                        whileTap={{ scale: 0.95, rotate: 5 }}
                                                        className="relative"
                                                        style={{ marginBottom: 10 }}
                                                    >
                                                        <div className={`flex items-center justify-center rounded-2xl transition-all ${
                                                            isEquipped
                                                                ? 'bg-gradient-to-br from-primary-500/20 to-blue-500/20 shadow-lg'
                                                                : unlocked
                                                                ? 'bg-gradient-to-br from-gray-700 to-gray-900'
                                                                : 'bg-gradient-to-br from-gray-800 to-gray-950'
                                                        }`} style={{ width: 56, height: 56 }}>
                                                            {IconComponent && (
                                                                <IconComponent
                                                                    className={unlocked ? avatar.color : 'text-gray-600'}
                                                                    style={{ width: 28, height: 28 }}
                                                                    strokeWidth={isEquipped ? 2.5 : 2}
                                                                />
                                                            )}
                                                            {!unlocked && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl backdrop-blur-[1px]">
                                                                    <Lock className="text-white/50" style={{ width: 18, height: 18 }} />
                                                                </div>
                                                            )}
                                                            {isEquipped && (
                                                                <div className="absolute -inset-0.5 rounded-2xl border-2 border-primary-500/40 animate-pulse pointer-events-none" />
                                                            )}
                                                        </div>

                                                        {wasJustBought && (
                                                            <motion.div
                                                                initial={{ scale: 0, rotate: -30 }}
                                                                animate={{ scale: 1, rotate: 0 }}
                                                                className="absolute bg-green-500 text-white font-black uppercase shadow-lg shadow-green-500/30 rounded-lg"
                                                                style={{ top: -6, right: -8, fontSize: 8, paddingLeft: 5, paddingRight: 5, paddingTop: 2, paddingBottom: 2 }}
                                                            >
                                                                NEW!
                                                            </motion.div>
                                                        )}
                                                    </motion.div>

                                                    {/* Name */}
                                                    <p className="font-bold text-center truncate w-full" style={{ fontSize: 13, lineHeight: '16px' }}>
                                                        {avatar.name}
                                                    </p>

                                                    {/* Rarity badge */}
                                                    <span className={`font-extrabold ${rarity.color}`} style={{ fontSize: 10, marginTop: 3 }}>
                                                        {rarity.emoji} {rarity.label}
                                                    </span>

                                                    {/* Status / Action – min 36pt touch target */}
                                                    <div style={{ marginTop: 10, width: '100%' }}>
                                                        {isEquipped ? (
                                                            <div className="flex items-center justify-center bg-primary-500/10 rounded-xl" style={{ height: 36, gap: 5 }}>
                                                                <Star className="text-primary-400 fill-primary-400" style={{ width: 14, height: 14 }} />
                                                                <span className="font-bold text-primary-400" style={{ fontSize: 12 }}>
                                                                    {wasJustEquipped ? '✨ Active!' : 'Active'}
                                                                </span>
                                                            </div>
                                                        ) : unlocked ? (
                                                            <motion.button
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => handleEquip(avatar.id)}
                                                                className="w-full flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-lg shadow-primary-500/20"
                                                                style={{ height: 36, fontSize: 13 }}
                                                            >
                                                                Equip
                                                            </motion.button>
                                                        ) : (
                                                            <motion.button
                                                                whileTap={{ scale: canAfford ? 0.95 : 1 }}
                                                                onClick={() => canAfford && handleBuy(avatar.id, avatar.cost)}
                                                                disabled={!canAfford}
                                                                className={`w-full flex items-center justify-center rounded-xl font-bold transition-all ${
                                                                    canAfford
                                                                        ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg shadow-yellow-500/20'
                                                                        : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] opacity-60 cursor-not-allowed'
                                                                }`}
                                                                style={{ height: 36, fontSize: 12, gap: 5 }}
                                                            >
                                                                <Coins style={{ width: 14, height: 14 }} strokeWidth={2.5} />
                                                                {avatar.cost}
                                                            </motion.button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* ── BOTTOM BAR ──────────────────────────────── */}
                    <div
                        className="relative flex-shrink-0"
                        style={{
                            paddingTop: 6,
                            paddingLeft: 20,
                            paddingRight: 20,
                            paddingBottom: isMobile ? 'calc(6px + env(safe-area-inset-bottom, 0px))' : 10,
                        }}
                    >
                        <div
                            className="pointer-events-none absolute inset-x-0 top-0"
                            style={{
                                height: 36,
                                background: 'linear-gradient(180deg, transparent 0%, var(--color-bg) 100%)',
                            }}
                        />
                        <div className="relative flex items-center justify-center" style={{ gap: 10 }}>
                            <div
                                className="h-px w-10 opacity-60"
                                style={{ background: 'linear-gradient(90deg, transparent 0%, var(--color-border) 100%)' }}
                            />
                            <div
                                className="glass inline-flex items-center rounded-full"
                                style={{ gap: 6, padding: '6px 10px' }}
                            >
                                <Sparkles className="text-primary-400" style={{ width: 11, height: 11, opacity: 0.65 }} />
                                <p className="font-medium text-[var(--color-text-secondary)]" style={{ fontSize: 11, lineHeight: '14px' }}>
                                    Pick your next flex. Scroll, unlock, equip.
                                </p>
                            </div>
                            <div
                                className="h-px w-10 opacity-60"
                                style={{ background: 'linear-gradient(90deg, var(--color-border) 0%, transparent 100%)' }}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
