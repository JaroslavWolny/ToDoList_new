import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Coins, Star, Zap } from 'lucide-react';
import { RandomReward } from '../../types';

interface RandomRewardModalProps {
    reward: RandomReward | null;
    onClose: () => void;
}

type Stage = 'closed' | 'shaking' | 'bursting' | 'revealed';

/**
 * Loot-drop visual language — restrained, premium "jewel case" presentation:
 * dark lacquered materials, one metallic accent per rarity, fine dust motes
 * instead of confetti. The two rarities are genuinely different objects:
 *   • EPIC  → a black-lacquer treasure CHEST with champagne-gold hardware
 *   • RARE  → an ink-velvet drawstring POUCH with platinum cords
 */
const RARITY = {
    CHEST: {
        label: 'EPIC',
        stars: 3,
        title: 'Epic Chest',
        tag: 'EPIC DROP',
        // Material palette — black lacquer + champagne gold
        woodLight: '#574f45',
        woodMid: '#332f29',
        woodDeep: '#1c1915',
        woodEdge: '#0e0c0a',
        clothLight: '#574f45',
        clothMid: '#332f29',
        clothDeep: '#1c1915',
        clothEdge: '#0e0c0a',
        metalLight: '#f6e7bd',
        metalMid: '#d3ae66',
        metalDeep: '#8c6f3c',
        metalEdge: '#4f3d20',
        interior: '#141009',
        // FX palette — single champagne accent, low saturation
        gradient: 'linear-gradient(135deg, #f6e7bd 0%, #d9b979 50%, #a9884e 100%)',
        glow: 'rgba(211, 174, 102, 0.32)',
        glowSoft: 'rgba(211, 174, 102, 0.14)',
        rayColor: '#e7cd8f',
        particleColors: ['#e7cd8f', '#d3ae66', '#f6e7bd'],
        border: 'linear-gradient(160deg, rgba(231,205,143,0.55) 0%, rgba(231,205,143,0.10) 30%, rgba(231,205,143,0.32) 55%, rgba(231,205,143,0.08) 80%, rgba(231,205,143,0.45) 100%)',
    },
    POUCH: {
        label: 'RARE',
        stars: 2,
        title: 'Lucky Pouch',
        tag: 'RARE DROP',
        // Material palette — ink velvet + platinum
        woodLight: '#5f6675',
        woodMid: '#3a404d',
        woodDeep: '#232833',
        woodEdge: '#141821',
        clothLight: '#5f6675',
        clothMid: '#3a404d',
        clothDeep: '#232833',
        clothEdge: '#141821',
        metalLight: '#f2f4f8',
        metalMid: '#c6cdd8',
        metalDeep: '#848d9b',
        metalEdge: '#4d5460',
        interior: '#0e1118',
        // FX palette — single platinum accent, low saturation
        gradient: 'linear-gradient(135deg, #f2f4f8 0%, #c6cdd8 50%, #98a2b1 100%)',
        glow: 'rgba(198, 205, 216, 0.28)',
        glowSoft: 'rgba(198, 205, 216, 0.12)',
        rayColor: '#dbe1ea',
        particleColors: ['#dbe1ea', '#c6cdd8', '#f2f4f8'],
        border: 'linear-gradient(160deg, rgba(219,225,234,0.50) 0%, rgba(219,225,234,0.08) 30%, rgba(219,225,234,0.28) 55%, rgba(219,225,234,0.06) 80%, rgba(219,225,234,0.40) 100%)',
    },
} as const;

// Fine dust motes drifting up from the opened loot — replaces confetti/rays.
const DUST = Array.from({ length: 14 }, (_, i) => ({
    x: (i - 6.5) * 11 + (Math.random() * 8 - 4),
    rise: 90 + Math.random() * 70,
    delay: Math.random() * 0.6,
    duration: 1.6 + Math.random() * 1.2,
    size: 2 + Math.random() * 2.5,
}));

function AnimatedCounter({ value }: { value: number }) {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
    useEffect(() => {
        const controls = animate(count, value, {
            duration: 1.1,
            ease: [0.16, 1, 0.3, 1],
        });
        return controls.stop;
    }, [count, value]);
    return <motion.span>{rounded}</motion.span>;
}

export function RandomRewardModal({ reward, onClose }: RandomRewardModalProps) {
    const [stage, setStage] = useState<Stage>('closed');
    const cfg = useMemo(() => (reward ? RARITY[reward.type] : null), [reward]);

    useEffect(() => {
        if (!reward) return;
        setStage('closed');
    }, [reward]);

    if (!reward || !cfg) return null;

    const isCoins = reward.currency === 'COINS';

    const handleOpen = () => {
        if (stage !== 'closed') return;
        try { navigator.vibrate?.([6, 28, 10]); } catch { /* noop */ }
        setStage('shaking');
        window.setTimeout(() => setStage('bursting'), 420);
        window.setTimeout(() => setStage('revealed'), 840);
    };

    const isOpen = stage === 'bursting' || stage === 'revealed';

    return (
        <AnimatePresence>
            <motion.div
                key="reward-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={stage === 'revealed' ? onClose : undefined}
                className="fixed inset-0 z-[60] flex items-center justify-center p-5 safe-top safe-bottom safe-x"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.94) 70%)',
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                }}
            >
                {/* Backdrop ambient glow that pulses with stage */}
                <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: stage === 'revealed' ? 0.35 : stage === 'bursting' ? 0.3 : 0.12 }}
                    transition={{ duration: 0.5 }}
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${cfg.glow} 0%, transparent 55%)`,
                    }}
                />

                <motion.div
                    initial={{ scale: 0.7, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.8, y: 20, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                    className="relative w-full max-w-xs"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Hairline metallic border wrapper */}
                    <div
                        className="relative rounded-[2rem] p-px overflow-hidden"
                        style={{
                            background: cfg.border,
                            boxShadow: `0 30px 90px -20px rgba(0,0,0,0.8), 0 0 50px ${cfg.glowSoft}`,
                        }}
                    >
                        <div
                            className="relative rounded-[calc(2rem-1px)] overflow-hidden px-7 pt-9 pb-7 text-center"
                            style={{
                                background:
                                    'linear-gradient(170deg, #14161b 0%, #0e1014 55%, #101218 100%)',
                            }}
                        >
                            {/* Faint top sheen + grounded accent glow */}
                            <div
                                aria-hidden
                                className="absolute inset-0"
                                style={{
                                    background:
                                        `radial-gradient(120% 60% at 50% -10%, rgba(255,255,255,0.06) 0%, transparent 60%),` +
                                        `radial-gradient(80% 50% at 50% 105%, ${cfg.glowSoft} 0%, transparent 70%)`,
                                }}
                            />

                            {/* Rarity tag */}
                            <motion.div
                                initial={{ y: -8, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.10)',
                                }}
                            >
                                <span
                                    aria-hidden
                                    className="w-1 h-1 rounded-full"
                                    style={{ background: cfg.rayColor }}
                                />
                                <span
                                    className="text-[9px] font-semibold tracking-[0.28em]"
                                    style={{ color: cfg.rayColor }}
                                >
                                    {cfg.tag}
                                </span>
                            </motion.div>

                            {/* Loot stage area */}
                            <div className="relative z-10 mt-6 mb-2 flex items-end justify-center h-44">
                                {/* Vertical beam of light shooting up from the open loot */}
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            key="beam"
                                            initial={{ opacity: 0, scaleY: 0.2, scaleX: 0.4 }}
                                            animate={{ opacity: [0, 1, 0.85], scaleY: 1, scaleX: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                                            className="pointer-events-none absolute"
                                            style={{
                                                width: 54,
                                                height: 145,
                                                bottom: 30,
                                                left: '50%',
                                                marginLeft: -27,
                                                transformOrigin: 'bottom center',
                                                background: `linear-gradient(to top, ${cfg.rayColor}66 0%, ${cfg.rayColor}22 45%, transparent 100%)`,
                                                filter: 'blur(10px)',
                                                clipPath: 'polygon(38% 100%, 62% 100%, 92% 0%, 8% 0%)',
                                            }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Burst flash — brief, soft */}
                                <AnimatePresence>
                                    {stage === 'bursting' && (
                                        <motion.div
                                            key="flash"
                                            initial={{ scale: 0.3, opacity: 0.55 }}
                                            animate={{ scale: 2.4, opacity: 0 }}
                                            transition={{ duration: 0.55, ease: 'easeOut' }}
                                            className="absolute w-24 h-24 rounded-full"
                                            style={{
                                                background: `radial-gradient(circle, rgba(255,255,255,0.85) 0%, ${cfg.rayColor} 40%, transparent 70%)`,
                                                filter: 'blur(12px)',
                                            }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Fine dust motes drifting up from the opening */}
                                {isOpen && (
                                    <div aria-hidden className="absolute inset-0 flex items-end justify-center pointer-events-none">
                                        {DUST.map((d, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ x: d.x, y: 0, opacity: 0, scale: 0.6 }}
                                                animate={{
                                                    x: d.x,
                                                    y: -d.rise,
                                                    opacity: [0, 0.8, 0],
                                                    scale: [0.6, 1, 0.8],
                                                }}
                                                transition={{
                                                    duration: d.duration,
                                                    delay: d.delay,
                                                    ease: [0.16, 1, 0.3, 1],
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 70,
                                                    width: d.size,
                                                    height: d.size,
                                                    borderRadius: '50%',
                                                    background: cfg.particleColors[i % cfg.particleColors.length],
                                                    boxShadow: `0 0 6px ${cfg.glowSoft}`,
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* THE LOOT — chest or pouch, plus shared open FX.
                                    Art is authored at 180×170; scaled down here so the
                                    loot reads as an object, not a full-width poster. */}
                                <div
                                    className="relative z-10 flex items-end justify-center h-full w-full"
                                    style={{ transform: 'scale(0.72)', transformOrigin: 'bottom center' }}
                                >
                                    <motion.div
                                        key="loot-container"
                                        initial={{ scale: 0.5, y: 30, opacity: 0 }}
                                        animate={
                                            stage === 'closed'
                                                ? { scale: [1, 1.015, 1], y: [0, -2, 0], opacity: 1 }
                                                : stage === 'shaking'
                                                ? { x: [0, -2, 2, -2, 1, 0], y: 0, scale: 1.02, opacity: 1 }
                                                : { scale: 1, y: 0, opacity: 1 }
                                        }
                                        transition={
                                            stage === 'closed'
                                                ? {
                                                      scale: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
                                                      y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
                                                      opacity: { duration: 0.4 },
                                                  }
                                                : stage === 'shaking'
                                                ? { duration: 0.42, ease: 'easeInOut' }
                                                : { type: 'spring', stiffness: 240, damping: 20 }
                                        }
                                        className="relative"
                                        style={{ width: 180, height: 170 }}
                                    >
                                        {/* Tap target — invisible button overlay during closed stage */}
                                        {stage === 'closed' && (
                                            <button
                                                type="button"
                                                onClick={handleOpen}
                                                className="absolute inset-0 z-30 cursor-pointer outline-none rounded-3xl focus-visible:ring-4 focus-visible:ring-white/30"
                                                aria-label="Open reward"
                                            />
                                        )}

                                        {/* Soft contact shadow on the ground */}
                                        <div
                                            aria-hidden
                                            className="absolute"
                                            style={{
                                                bottom: -6,
                                                left: '50%',
                                                marginLeft: -70,
                                                width: 140,
                                                height: 20,
                                                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 70%)',
                                                filter: 'blur(5px)',
                                            }}
                                        />

                                        {/* The art itself */}
                                        {reward.type === 'CHEST' ? (
                                            <ChestArt cfg={cfg} isOpen={isOpen} />
                                        ) : (
                                            <PouchArt cfg={cfg} isOpen={isOpen} />
                                        )}

                                        {/* Inner glow rising from the opening */}
                                        <AnimatePresence>
                                            {isOpen && (
                                                <motion.div
                                                    key="inner-glow"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: [0, 1, 0.85] }}
                                                    transition={{ duration: 0.5 }}
                                                    className="absolute pointer-events-none"
                                                    style={{
                                                        bottom: 74,
                                                        left: '50%',
                                                        marginLeft: -48,
                                                        width: 96,
                                                        height: 28,
                                                        background: `radial-gradient(ellipse at center, ${cfg.rayColor} 0%, ${cfg.rayColor}88 40%, transparent 80%)`,
                                                        filter: 'blur(5px)',
                                                        borderRadius: '50%',
                                                        zIndex: 8,
                                                    }}
                                                />
                                            )}
                                        </AnimatePresence>

                                        {/* Reward icon emerging from inside */}
                                        <AnimatePresence>
                                            {stage === 'revealed' && (
                                                <motion.div
                                                    key="emerged-reward"
                                                    initial={{ y: 0, scale: 0.6, opacity: 0 }}
                                                    animate={{
                                                        y: [-6, -52, -44],
                                                        scale: [0.9, 1.08, 1],
                                                        opacity: 1,
                                                    }}
                                                    transition={{
                                                        duration: 0.9,
                                                        ease: [0.16, 1, 0.3, 1],
                                                        times: [0, 0.6, 1],
                                                    }}
                                                    className="absolute"
                                                    style={{
                                                        left: '50%',
                                                        marginLeft: -28,
                                                        bottom: 78,
                                                        width: 56,
                                                        height: 56,
                                                        zIndex: 20,
                                                    }}
                                                >
                                                    <motion.div
                                                        animate={{ y: [0, -3, 0] }}
                                                        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
                                                        className="w-full h-full flex items-center justify-center rounded-2xl"
                                                        style={{
                                                            background: 'linear-gradient(170deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                                                            border: '1px solid rgba(255,255,255,0.14)',
                                                            boxShadow: `0 0 24px ${cfg.glowSoft}, 0 8px 24px rgba(0,0,0,0.45)`,
                                                            backdropFilter: 'blur(4px)',
                                                            WebkitBackdropFilter: 'blur(4px)',
                                                        }}
                                                    >
                                                        {isCoins ? (
                                                            <Coins className="w-8 h-8" strokeWidth={2} style={{ color: cfg.rayColor }} />
                                                        ) : (
                                                            <Zap className="w-8 h-8" strokeWidth={2} style={{ color: cfg.rayColor }} fill={cfg.rayColor} />
                                                        )}
                                                    </motion.div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Bottom copy stack */}
                            <AnimatePresence mode="wait">
                                {stage === 'closed' || stage === 'shaking' ? (
                                    <motion.div
                                        key="prompt"
                                        initial={{ y: 8, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -8, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="relative z-10 mt-2"
                                    >
                                        <p className="text-lg font-semibold text-white/95 uppercase tracking-[0.14em] mb-2">
                                            {cfg.title}
                                        </p>
                                        <RarityStars count={cfg.stars} color={cfg.rayColor} />
                                        <motion.p
                                            animate={{ opacity: [0.45, 0.85, 0.45] }}
                                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                                            className="mt-4 text-[10px] uppercase tracking-[0.32em] font-medium text-white/60"
                                        >
                                            Tap to open
                                        </motion.p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="reward"
                                        initial={{ y: 16, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.55, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                        className="relative z-10 mt-2"
                                    >
                                        <RarityStars count={cfg.stars} color={cfg.rayColor} />
                                        <p
                                            className="mt-3 text-[10px] font-medium uppercase tracking-[0.28em] text-white/50"
                                        >
                                            You earned
                                        </p>

                                        {/* The massive number */}
                                        <div className="mt-1 flex items-baseline justify-center gap-2">
                                            <motion.div
                                                initial={{ scale: 0.85, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 220,
                                                    damping: 18,
                                                    delay: 0.65,
                                                }}
                                                className="text-6xl font-bold tracking-tight text-stat"
                                                style={{
                                                    background: cfg.gradient,
                                                    WebkitBackgroundClip: 'text',
                                                    backgroundClip: 'text',
                                                    color: 'transparent',
                                                    filter: `drop-shadow(0 2px 12px ${cfg.glowSoft})`,
                                                    lineHeight: 0.95,
                                                }}
                                            >
                                                <AnimatedCounter value={reward.amount} />
                                            </motion.div>
                                        </div>
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.8, duration: 0.3 }}
                                            className="mt-2 flex items-center justify-center gap-1.5"
                                        >
                                            {isCoins ? (
                                                <Coins className="w-3.5 h-3.5" style={{ color: cfg.rayColor }} />
                                            ) : (
                                                <Zap className="w-3.5 h-3.5" style={{ color: cfg.rayColor }} fill={cfg.rayColor} />
                                            )}
                                            <span
                                                className="text-xs font-semibold tracking-[0.22em]"
                                                style={{ color: cfg.rayColor }}
                                            >
                                                {reward.currency}
                                            </span>
                                        </motion.div>

                                        <motion.button
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 1, duration: 0.35 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={onClose}
                                            className="mt-6 w-full py-3.5 rounded-2xl font-semibold text-sm tracking-[0.14em] uppercase text-[#0d0f13]"
                                            style={{
                                                background: 'linear-gradient(180deg, #ffffff 0%, #eceef1 100%)',
                                                boxShadow: '0 10px 30px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.9)',
                                            }}
                                        >
                                            Claim Reward
                                        </motion.button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function RarityStars({ count, color }: { count: number; color: string }) {
    return (
        <div className="flex items-center justify-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
                >
                    <Star
                        className="w-3.5 h-3.5"
                        fill={i < count ? color : 'transparent'}
                        stroke={i < count ? color : 'rgba(255,255,255,0.2)'}
                        strokeWidth={1.5}
                    />
                </motion.div>
            ))}
        </div>
    );
}

type LootCfg = (typeof RARITY)[keyof typeof RARITY];

/* ----------------------------------------------------------------------------
 * EPIC CHEST — wooden treasure chest with gold straps, corner brackets and a
 * chunky lock. Body + lid are separate layers so the lid can hinge open.
 * -------------------------------------------------------------------------- */

function ChestArt({ cfg, isOpen }: { cfg: LootCfg; isOpen: boolean }) {
    return (
        <>
            {/* Chest BODY (lower half) */}
            <div
                className="absolute"
                style={{ left: '50%', marginLeft: -82, bottom: 0, width: 164, height: 104, zIndex: 2 }}
            >
                <ChestBodySvg cfg={cfg} />
            </div>

            {/* Chest LID (upper half) — hinges open from the back-left */}
            <motion.div
                className="absolute"
                style={{
                    left: '50%',
                    marginLeft: -82,
                    bottom: 90,
                    width: 164,
                    height: 74,
                    transformOrigin: 'bottom left',
                    zIndex: 6,
                }}
                initial={false}
                animate={isOpen ? { rotate: -116, y: -12, x: -4 } : { rotate: 0, y: 0, x: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 14, mass: 0.7 }}
            >
                <ChestLidSvg cfg={cfg} />
            </motion.div>
        </>
    );
}

function ChestBodySvg({ cfg }: { cfg: LootCfg }) {
    const id = cfg.label;
    return (
        <svg viewBox="0 0 164 104" className="w-full h-full block overflow-visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id={`wood-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cfg.woodLight} />
                    <stop offset="0.5" stopColor={cfg.woodMid} />
                    <stop offset="1" stopColor={cfg.woodDeep} />
                </linearGradient>
                <linearGradient id={`gold-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cfg.metalLight} />
                    <stop offset="0.5" stopColor={cfg.metalMid} />
                    <stop offset="1" stopColor={cfg.metalDeep} />
                </linearGradient>
                <linearGradient id={`inside-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#000000" stopOpacity="0.9" />
                    <stop offset="1" stopColor={cfg.interior} />
                </linearGradient>
                <radialGradient id={`lock-${id}`} cx="0.5" cy="0.3" r="0.85">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="0.4" stopColor={cfg.metalLight} />
                    <stop offset="1" stopColor={cfg.metalDeep} />
                </radialGradient>
                <clipPath id={`bodyClip-${id}`}>
                    <path d="M10 18 Q10 12 18 12 L146 12 Q154 12 154 18 L156 92 Q156 100 148 100 L16 100 Q8 100 8 92 Z" />
                </clipPath>
            </defs>

            {/* Open interior back wall — visible once the lid swings up */}
            <rect x="18" y="2" width="128" height="22" rx="8" fill={`url(#inside-${id})`} />

            {/* Body slab — slightly barrelled sides for a tactile, chunky feel */}
            <path
                d="M10 18 Q10 12 18 12 L146 12 Q154 12 154 18 L156 92 Q156 100 148 100 L16 100 Q8 100 8 92 Z"
                fill={`url(#wood-${id})`}
            />

            {/* Vertical plank seams */}
            <g clipPath={`url(#bodyClip-${id})`} stroke={cfg.woodEdge} strokeWidth="2" strokeLinecap="round">
                <line x1="44" y1="14" x2="44" y2="100" opacity="0.4" />
                <line x1="82" y1="14" x2="82" y2="100" opacity="0.4" />
                <line x1="120" y1="14" x2="120" y2="100" opacity="0.4" />
            </g>
            {/* Plank highlights (right of each seam) */}
            <g clipPath={`url(#bodyClip-${id})`} stroke={cfg.woodLight} strokeWidth="1" strokeLinecap="round" opacity="0.35">
                <line x1="46" y1="16" x2="46" y2="98" />
                <line x1="84" y1="16" x2="84" y2="98" />
                <line x1="122" y1="16" x2="122" y2="98" />
            </g>

            {/* Bottom cel-shadow to ground the form */}
            <g clipPath={`url(#bodyClip-${id})`}>
                <rect x="8" y="80" width="148" height="20" fill={cfg.woodEdge} opacity="0.35" />
            </g>

            {/* Crisp top rim light */}
            <path
                d="M10 18 Q10 12 18 12 L146 12 Q154 12 154 18"
                fill="none" stroke={cfg.woodLight} strokeWidth="2" strokeOpacity="0.7" strokeLinecap="round"
            />

            {/* Gold horizontal straps with rivets */}
            {[20, 78].map((y) => (
                <g key={y} clipPath={`url(#bodyClip-${id})`}>
                    <rect x="6" y={y} width="152" height="13" fill={`url(#gold-${id})`} />
                    <rect x="6" y={y} width="152" height="3" fill="#ffffff" opacity="0.5" />
                    <rect x="6" y={y + 11} width="152" height="2.5" fill={cfg.metalEdge} opacity="0.6" />
                    <circle cx="20" cy={y + 6.5} r="2.4" fill={cfg.metalEdge} opacity="0.7" />
                    <circle cx="144" cy={y + 6.5} r="2.4" fill={cfg.metalEdge} opacity="0.7" />
                </g>
            ))}

            {/* Gold corner brackets */}
            {[
                { x: 6, y: 12 },
                { x: 140, y: 12 },
                { x: 6, y: 82 },
                { x: 140, y: 82 },
            ].map((c, i) => (
                <g key={i} clipPath={`url(#bodyClip-${id})`}>
                    <rect x={c.x} y={c.y} width="18" height="18" rx="5" fill={`url(#gold-${id})`} stroke={cfg.metalEdge} strokeWidth="1" strokeOpacity="0.5" />
                    <rect x={c.x + 2} y={c.y + 2} width="14" height="5" rx="2.5" fill="#ffffff" opacity="0.4" />
                </g>
            ))}

            {/* Central lock plate */}
            <g transform="translate(82 52)">
                <rect x="-17" y="-18" width="34" height="38" rx="9" fill={cfg.metalEdge} opacity="0.45" />
                <rect x="-16" y="-19" width="32" height="38" rx="9" fill={`url(#lock-${id})`} stroke={cfg.metalEdge} strokeWidth="1.2" strokeOpacity="0.6" />
                <rect x="-13" y="-16" width="26" height="9" rx="4" fill="#ffffff" opacity="0.35" />
                {/* Keyhole */}
                <circle cx="0" cy="-2" r="4.5" fill={cfg.woodEdge} />
                <path d="M-2.6 -1 L2.6 -1 L1.6 11 L-1.6 11 Z" fill={cfg.woodEdge} />
            </g>
        </svg>
    );
}

function ChestLidSvg({ cfg }: { cfg: LootCfg }) {
    const id = cfg.label;
    return (
        <svg viewBox="0 0 164 74" className="w-full h-full block overflow-visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id={`lidWood-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cfg.woodLight} />
                    <stop offset="0.55" stopColor={cfg.woodMid} />
                    <stop offset="1" stopColor={cfg.woodDeep} />
                </linearGradient>
                <linearGradient id={`lidGold-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cfg.metalLight} />
                    <stop offset="0.5" stopColor={cfg.metalMid} />
                    <stop offset="1" stopColor={cfg.metalDeep} />
                </linearGradient>
                <linearGradient id={`lidGloss-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <clipPath id={`lidClip-${id}`}>
                    <path d="M8 70 L8 36 Q8 8 82 8 Q156 8 156 36 L156 70 Z" />
                </clipPath>
            </defs>

            {/* Domed plank lid */}
            <path d="M8 70 L8 36 Q8 8 82 8 Q156 8 156 36 L156 70 Z" fill={`url(#lidWood-${id})`} />

            {/* Plank seams following the dome */}
            <g clipPath={`url(#lidClip-${id})`} stroke={cfg.woodEdge} strokeWidth="2" opacity="0.4" strokeLinecap="round">
                <line x1="44" y1="12" x2="44" y2="70" />
                <line x1="120" y1="12" x2="120" y2="70" />
            </g>

            {/* Top gloss band along the curve */}
            <path
                d="M18 34 Q18 16 82 16 Q146 16 146 34 L146 42 Q146 26 82 26 Q18 26 18 42 Z"
                fill={`url(#lidGloss-${id})`}
            />

            {/* Crisp rim outline */}
            <path
                d="M8 70 L8 36 Q8 8 82 8 Q156 8 156 36 L156 70 Z"
                fill="none" stroke={cfg.woodLight} strokeWidth="2" strokeOpacity="0.6"
            />

            {/* Gold center strap + rivets, running over the dome to the hasp */}
            <g clipPath={`url(#lidClip-${id})`}>
                <rect x="73" y="8" width="18" height="62" fill={`url(#lidGold-${id})`} />
                <rect x="73" y="8" width="4" height="62" fill="#ffffff" opacity="0.4" />
                <rect x="87" y="8" width="2.5" height="62" fill={cfg.metalEdge} opacity="0.6" />
                <circle cx="82" cy="22" r="2.4" fill={cfg.metalEdge} opacity="0.7" />
            </g>

            {/* Gold bottom band of the lid */}
            <g clipPath={`url(#lidClip-${id})`}>
                <rect x="6" y="56" width="152" height="13" fill={`url(#lidGold-${id})`} />
                <rect x="6" y="56" width="152" height="3" fill="#ffffff" opacity="0.5" />
                <rect x="6" y="67" width="152" height="2" fill={cfg.metalEdge} opacity="0.6" />
            </g>

            {/* Hasp tongue at bottom-center — meets the body lock when closed */}
            <rect x="72" y="62" width="20" height="14" rx="4" fill={`url(#lidGold-${id})`} stroke={cfg.metalEdge} strokeWidth="1" strokeOpacity="0.5" />
        </svg>
    );
}

/* ----------------------------------------------------------------------------
 * LUCKY POUCH — plump cloth drawstring sack with a cinched neck, cord loops and
 * a gold coin emblem. On open the neck flares into a glowing mouth.
 * -------------------------------------------------------------------------- */

function PouchArt({ cfg, isOpen }: { cfg: LootCfg; isOpen: boolean }) {
    return (
        <motion.div
            className="absolute"
            style={{ left: '50%', marginLeft: -78, bottom: -2, width: 156, height: 156, zIndex: 3 }}
            animate={isOpen ? { scaleY: 0.97, scaleX: 1.05 } : { scaleY: 1, scaleX: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16 }}
        >
            <PouchSvg cfg={cfg} isOpen={isOpen} />
        </motion.div>
    );
}

function PouchSvg({ cfg, isOpen }: { cfg: LootCfg; isOpen: boolean }) {
    const id = cfg.label;
    return (
        <svg viewBox="0 0 156 156" className="w-full h-full block overflow-visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id={`cloth-${id}`} cx="0.4" cy="0.32" r="0.85">
                    <stop offset="0" stopColor={cfg.clothLight} />
                    <stop offset="0.55" stopColor={cfg.clothMid} />
                    <stop offset="1" stopColor={cfg.clothDeep} />
                </radialGradient>
                <linearGradient id={`neck-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cfg.clothMid} />
                    <stop offset="1" stopColor={cfg.clothDeep} />
                </linearGradient>
                <linearGradient id={`cord-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cfg.metalLight} />
                    <stop offset="1" stopColor={cfg.metalDeep} />
                </linearGradient>
                <radialGradient id={`coin-${id}`} cx="0.38" cy="0.34" r="0.8">
                    <stop offset="0" stopColor="#fffbe6" />
                    <stop offset="0.5" stopColor={cfg.metalMid} />
                    <stop offset="1" stopColor={cfg.metalDeep} />
                </radialGradient>
                <radialGradient id={`mouth-${id}`} cx="0.5" cy="0.4" r="0.7">
                    <stop offset="0" stopColor={cfg.rayColor} />
                    <stop offset="0.45" stopColor={cfg.interior} />
                    <stop offset="1" stopColor="#000000" />
                </radialGradient>
                <clipPath id={`bagClip-${id}`}>
                    <path d="M78 150 C40 150 20 124 24 92 C27 66 40 56 54 50 L102 50 C116 56 129 66 132 92 C136 124 116 150 78 150 Z" />
                </clipPath>
            </defs>

            {/* Bag body */}
            <path
                d="M78 150 C40 150 20 124 24 92 C27 66 40 56 54 50 L102 50 C116 56 129 66 132 92 C136 124 116 150 78 150 Z"
                fill={`url(#cloth-${id})`}
            />

            {/* Cloth folds fanning down from the neck */}
            <g clipPath={`url(#bagClip-${id})`} stroke={cfg.clothEdge} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.3">
                <path d="M62 54 C56 80 50 110 56 140" />
                <path d="M94 54 C100 80 106 110 100 140" />
                <path d="M78 54 C78 90 78 120 78 146" opacity="0.6" />
            </g>
            {/* Soft left-side rim highlight */}
            <g clipPath={`url(#bagClip-${id})`}>
                <path d="M52 56 C36 66 26 84 30 108" stroke={cfg.clothLight} strokeWidth="5" fill="none" opacity="0.4" strokeLinecap="round" />
                <ellipse cx="78" cy="138" rx="42" ry="14" fill={cfg.clothEdge} opacity="0.3" />
            </g>

            {/* Cinch band where the drawstring gathers the cloth */}
            <rect x="48" y="44" width="60" height="16" rx="8" fill={`url(#neck-${id})`} stroke={cfg.clothEdge} strokeWidth="1.5" strokeOpacity="0.5" />
            <rect x="50" y="46" width="56" height="4" rx="2" fill={cfg.clothLight} opacity="0.35" />

            {/* Cord loops poking out either side */}
            <path d="M48 50 C36 44 34 34 42 30" fill="none" stroke={`url(#cord-${id})`} strokeWidth="4" strokeLinecap="round" />
            <path d="M108 50 C120 44 122 34 114 30" fill="none" stroke={`url(#cord-${id})`} strokeWidth="4" strokeLinecap="round" />
            <circle cx="42" cy="30" r="3.5" fill={`url(#cord-${id})`} />
            <circle cx="114" cy="30" r="3.5" fill={`url(#cord-${id})`} />

            {isOpen ? (
                /* OPEN — neck flares into a glowing mouth */
                <g>
                    <ellipse cx="78" cy="42" rx="34" ry="13" fill={cfg.clothDeep} />
                    <ellipse cx="78" cy="40" rx="29" ry="10" fill={`url(#mouth-${id})`} />
                    <ellipse cx="78" cy="38" rx="22" ry="6" fill={cfg.rayColor} opacity="0.7" />
                    {/* gathered cloth tips around the rim */}
                    {[-30, -16, 0, 16, 30].map((dx, i) => (
                        <path
                            key={i}
                            d={`M${78 + dx} 44 l-5 -12 l10 0 Z`}
                            fill={`url(#neck-${id})`}
                            opacity="0.9"
                        />
                    ))}
                </g>
            ) : (
                /* CLOSED — puckered, knotted top */
                <g>
                    {[-22, -11, 0, 11, 22].map((dx, i) => (
                        <path
                            key={i}
                            d={`M${78 + dx} 46 C${78 + dx * 0.7} 32 ${78 + dx * 0.5} 26 78 24`}
                            fill="none"
                            stroke={i === 2 ? cfg.clothLight : cfg.clothEdge}
                            strokeWidth={i === 2 ? 3 : 4}
                            strokeLinecap="round"
                            opacity={i === 2 ? 0.5 : 0.65}
                        />
                    ))}
                    {/* Top knot */}
                    <ellipse cx="78" cy="24" rx="10" ry="7" fill={`url(#neck-${id})`} stroke={cfg.clothEdge} strokeWidth="1.5" strokeOpacity="0.5" />
                    <ellipse cx="76" cy="22" rx="4" ry="2.5" fill={cfg.clothLight} opacity="0.45" />
                </g>
            )}

            {/* Gold coin emblem on the belly */}
            <g transform="translate(78 96)">
                <circle r="22" fill={cfg.metalEdge} opacity="0.4" />
                <circle r="20" fill={`url(#coin-${id})`} stroke={cfg.metalEdge} strokeWidth="1.5" />
                <circle r="15" fill="none" stroke="#fffbe6" strokeWidth="1.2" opacity="0.6" />
                {/* coin star */}
                <path
                    d="M0 -11 L3.2 -3.4 L11 -3.4 L4.8 1.6 L7.2 9.4 L0 4.8 L-7.2 9.4 L-4.8 1.6 L-11 -3.4 L-3.2 -3.4 Z"
                    fill={cfg.metalDeep}
                    opacity="0.75"
                />
                <ellipse cx="-6" cy="-7" rx="5" ry="3" fill="#ffffff" opacity="0.5" />
            </g>
        </svg>
    );
}
