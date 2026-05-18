import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Coins, Sparkles, Star, Zap } from 'lucide-react';
import { RandomReward } from '../../types';

interface RandomRewardModalProps {
    reward: RandomReward | null;
    onClose: () => void;
}

type Stage = 'closed' | 'shaking' | 'bursting' | 'revealed';

const RARITY = {
    CHEST: {
        label: 'EPIC',
        stars: 3,
        title: 'EPIC CHEST',
        tag: 'LEGENDARY DROP',
        // Wooden chest palette
        woodLight: '#c97a3a',
        woodMid: '#a85a23',
        woodDark: '#6b3712',
        woodDarker: '#3d1f08',
        bandLight: '#fde68a',
        bandMid: '#f59e0b',
        bandDark: '#92400e',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 35%, #ef4444 70%, #ec4899 100%)',
        glow: 'rgba(249, 115, 22, 0.65)',
        glowSoft: 'rgba(244, 114, 182, 0.45)',
        rayColor: '#fbbf24',
        particleColors: ['#fbbf24', '#f97316', '#ef4444', '#ec4899', '#fde68a'],
        conic: 'conic-gradient(from 0deg, #fbbf24, #f97316, #ef4444, #ec4899, #f59e0b, #fbbf24)',
    },
    POUCH: {
        label: 'RARE',
        stars: 2,
        title: 'LUCKY POUCH',
        tag: 'MYSTERY DROP',
        // Purple-magic chest palette
        woodLight: '#a78bfa',
        woodMid: '#8b5cf6',
        woodDark: '#5b21b6',
        woodDarker: '#2e1065',
        bandLight: '#f0abfc',
        bandMid: '#c084fc',
        bandDark: '#7e22ce',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 35%, #a855f7 70%, #ec4899 100%)',
        glow: 'rgba(139, 92, 246, 0.65)',
        glowSoft: 'rgba(99, 102, 241, 0.45)',
        rayColor: '#a78bfa',
        particleColors: ['#a78bfa', '#818cf8', '#c084fc', '#f0abfc', '#ddd6fe'],
        conic: 'conic-gradient(from 0deg, #a78bfa, #818cf8, #c084fc, #ec4899, #6366f1, #a78bfa)',
    },
} as const;

// 24 light rays emanating from the chest
const RAYS = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);
// 32 particles flying outward — coins / sparks
const PARTICLES = Array.from({ length: 32 }, (_, i) => ({
    angle: (i * 360) / 32 + (i % 2 ? 6 : -6),
    distance: 130 + Math.random() * 80,
    delay: Math.random() * 0.18,
    size: 5 + Math.random() * 7,
}));
// 22 confetti pieces
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
    x: (i / 22) * 100 + (Math.random() * 6 - 3),
    delay: Math.random() * 0.5,
    duration: 1.8 + Math.random() * 1.4,
    rotation: Math.random() * 720 - 360,
    size: 6 + Math.random() * 6,
}));
// 6 coins that arc out of the chest when it opens
const ARC_COINS = Array.from({ length: 6 }, (_, i) => {
    const spread = (i - 2.5) * 22; // -55 to +55 deg
    return {
        dx: spread * 1.6,
        dy: -90 - Math.random() * 30,
        delay: 0.12 + i * 0.04,
        rotate: spread * 4 + (Math.random() * 180 - 90),
        size: 14 + Math.random() * 8,
    };
});

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
        try { navigator.vibrate?.([8, 30, 12, 30, 18, 20, 40]); } catch { /* noop */ }
        setStage('shaking');
        window.setTimeout(() => setStage('bursting'), 380);
        window.setTimeout(() => setStage('revealed'), 760);
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
                    animate={{ opacity: stage === 'revealed' ? 0.6 : stage === 'bursting' ? 0.5 : 0.22 }}
                    transition={{ duration: 0.5 }}
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${cfg.glow} 0%, transparent 55%)`,
                    }}
                />

                {/* Confetti rain after burst */}
                {isOpen && (
                    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                        {CONFETTI.map((c, i) => (
                            <motion.div
                                key={i}
                                initial={{ y: '-12vh', x: `${c.x}vw`, rotate: 0, opacity: 0 }}
                                animate={{ y: '112vh', rotate: c.rotation, opacity: [0, 1, 1, 0] }}
                                transition={{ duration: c.duration, delay: c.delay, ease: 'linear' }}
                                style={{
                                    position: 'absolute',
                                    width: c.size,
                                    height: c.size * 1.4,
                                    background: cfg.particleColors[i % cfg.particleColors.length],
                                    borderRadius: 2,
                                    boxShadow: `0 0 8px ${cfg.glow}`,
                                }}
                            />
                        ))}
                    </div>
                )}

                <motion.div
                    initial={{ scale: 0.7, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.8, y: 20, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                    className="relative w-full max-w-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Animated gradient border wrapper */}
                    <div
                        className="relative rounded-[2rem] p-[2px] overflow-hidden"
                        style={{
                            background: cfg.conic,
                            animation: 'rewardBorderSpin 6s linear infinite',
                            boxShadow: `0 30px 80px -10px ${cfg.glow}, 0 0 60px ${cfg.glowSoft}`,
                        }}
                    >
                        <div
                            className="relative rounded-[calc(2rem-2px)] overflow-hidden px-7 pt-9 pb-7 text-center"
                            style={{
                                background:
                                    'linear-gradient(160deg, #15102b 0%, #1b1442 40%, #2a1547 70%, #15102b 100%)',
                            }}
                        >
                            {/* Star-field background */}
                            <div aria-hidden className="absolute inset-0 opacity-60">
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background:
                                            'radial-gradient(1.5px 1.5px at 20% 30%, white, transparent 60%),' +
                                            'radial-gradient(1px 1px at 70% 20%, white, transparent 60%),' +
                                            'radial-gradient(1.5px 1.5px at 40% 70%, white, transparent 60%),' +
                                            'radial-gradient(1px 1px at 85% 60%, white, transparent 60%),' +
                                            'radial-gradient(1px 1px at 15% 85%, white, transparent 60%),' +
                                            'radial-gradient(1.5px 1.5px at 60% 90%, white, transparent 60%),' +
                                            'radial-gradient(1px 1px at 90% 35%, white, transparent 60%)',
                                    }}
                                />
                            </div>

                            {/* Rarity tag */}
                            <motion.div
                                initial={{ y: -8, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                                style={{
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    border: `1px solid ${cfg.glow}`,
                                    boxShadow: `0 0 16px ${cfg.glowSoft}`,
                                }}
                            >
                                <Sparkles className="w-3 h-3" style={{ color: cfg.rayColor }} />
                                <span
                                    className="text-[9px] font-black tracking-[0.24em]"
                                    style={{ color: cfg.rayColor }}
                                >
                                    {cfg.tag}
                                </span>
                            </motion.div>

                            {/* Chest stage area */}
                            <div className="relative z-10 mt-6 mb-2 flex items-end justify-center h-56">
                                {/* Vertical beam of light shooting up from the open chest */}
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
                                                width: 110,
                                                height: 200,
                                                bottom: 40,
                                                left: '50%',
                                                marginLeft: -55,
                                                transformOrigin: 'bottom center',
                                                background: `linear-gradient(to top, ${cfg.rayColor}cc 0%, ${cfg.rayColor}55 40%, transparent 100%)`,
                                                filter: 'blur(6px)',
                                                clipPath: 'polygon(35% 100%, 65% 100%, 100% 0%, 0% 0%)',
                                            }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Rotating light rays — appear during burst */}
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            key="rays"
                                            initial={{ opacity: 0, scale: 0.4 }}
                                            animate={{ opacity: 1, scale: 1, rotate: 360 }}
                                            exit={{ opacity: 0 }}
                                            transition={{
                                                opacity: { duration: 0.3 },
                                                scale: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                                                rotate: { duration: 18, repeat: Infinity, ease: 'linear' },
                                            }}
                                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                        >
                                            {RAYS.map((angle) => (
                                                <div
                                                    key={angle}
                                                    style={{
                                                        position: 'absolute',
                                                        width: 3,
                                                        height: 200,
                                                        background: `linear-gradient(to top, transparent, ${cfg.rayColor} 60%, transparent)`,
                                                        transform: `rotate(${angle}deg)`,
                                                        transformOrigin: 'center',
                                                        opacity: 0.55,
                                                        filter: 'blur(0.5px)',
                                                    }}
                                                />
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Burst flash */}
                                <AnimatePresence>
                                    {stage === 'bursting' && (
                                        <motion.div
                                            key="flash"
                                            initial={{ scale: 0, opacity: 0.95 }}
                                            animate={{ scale: 4, opacity: 0 }}
                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                            className="absolute w-32 h-32 rounded-full"
                                            style={{
                                                background: `radial-gradient(circle, white 0%, ${cfg.rayColor} 30%, transparent 70%)`,
                                                filter: 'blur(8px)',
                                            }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Particles burst */}
                                {isOpen && (
                                    <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        {PARTICLES.map((p, i) => {
                                            const rad = (p.angle * Math.PI) / 180;
                                            const dx = Math.cos(rad) * p.distance;
                                            const dy = Math.sin(rad) * p.distance;
                                            return (
                                                <motion.div
                                                    key={i}
                                                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                                    animate={{ x: dx, y: dy, scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
                                                    transition={{
                                                        duration: 1.5,
                                                        delay: p.delay,
                                                        ease: [0.16, 1, 0.3, 1],
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        width: p.size,
                                                        height: p.size,
                                                        borderRadius: '50%',
                                                        background: cfg.particleColors[i % cfg.particleColors.length],
                                                        boxShadow: `0 0 12px ${cfg.particleColors[i % cfg.particleColors.length]}`,
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Arc-tossed coins flying out and falling back */}
                                {isOpen && (
                                    <div aria-hidden className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none">
                                        {ARC_COINS.map((c, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
                                                animate={{
                                                    x: [0, c.dx * 0.6, c.dx],
                                                    y: [0, c.dy, c.dy + 70],
                                                    scale: [0.4, 1, 0.6],
                                                    opacity: [0, 1, 0],
                                                    rotate: [0, c.rotate, c.rotate * 1.4],
                                                }}
                                                transition={{
                                                    duration: 1.2,
                                                    delay: c.delay,
                                                    ease: [0.45, 0.05, 0.55, 0.95],
                                                    times: [0, 0.45, 1],
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 24,
                                                    width: c.size + 6,
                                                    height: c.size + 6,
                                                }}
                                            >
                                                <CoinSparkle size={c.size + 6} color={cfg.rayColor} />
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* THE CHEST — body + lid as separate animated layers */}
                                <div className="relative z-10 flex items-end justify-center h-full w-full">
                                    {/* Chest container — handles idle bounce / shake */}
                                    <motion.div
                                        key="chest-container"
                                        initial={{ scale: 0.5, y: 30, opacity: 0 }}
                                        animate={
                                            stage === 'closed'
                                                ? { scale: [1, 1.04, 1], y: [0, -3, 0], opacity: 1 }
                                                : stage === 'shaking'
                                                ? { x: [0, -6, 7, -8, 6, -4, 4, 0], y: 0, scale: 1.05, opacity: 1 }
                                                : { scale: 1, y: 0, opacity: 1 }
                                        }
                                        transition={
                                            stage === 'closed'
                                                ? {
                                                      scale: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
                                                      y: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
                                                      opacity: { duration: 0.4 },
                                                  }
                                                : stage === 'shaking'
                                                ? { duration: 0.38, ease: 'easeInOut' }
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

                                        {/* Soft shadow under chest */}
                                        <div
                                            aria-hidden
                                            className="absolute"
                                            style={{
                                                bottom: -8,
                                                left: '50%',
                                                marginLeft: -70,
                                                width: 140,
                                                height: 20,
                                                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 70%)',
                                                filter: 'blur(4px)',
                                            }}
                                        />

                                        {/* Chest BODY (bottom half) */}
                                        <div
                                            className="absolute"
                                            style={{
                                                left: '50%',
                                                marginLeft: -80,
                                                bottom: 0,
                                                width: 160,
                                                height: 100,
                                            }}
                                        >
                                            <ChestBodySvg cfg={cfg} />

                                            {/* Inner glow inside open chest */}
                                            <AnimatePresence>
                                                {isOpen && (
                                                    <motion.div
                                                        key="inner-glow"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: [0, 1, 0.85] }}
                                                        transition={{ duration: 0.5 }}
                                                        className="absolute"
                                                        style={{
                                                            top: 8,
                                                            left: 18,
                                                            right: 18,
                                                            height: 30,
                                                            background: `radial-gradient(ellipse at center, ${cfg.rayColor} 0%, ${cfg.rayColor}88 40%, transparent 80%)`,
                                                            filter: 'blur(4px)',
                                                            borderRadius: '50%',
                                                        }}
                                                    />
                                                )}
                                            </AnimatePresence>

                                            {/* Reward icon emerging from inside the open chest */}
                                            <AnimatePresence>
                                                {stage === 'revealed' && (
                                                    <motion.div
                                                        key="emerged-reward"
                                                        initial={{ y: 20, scale: 0.3, opacity: 0, rotate: -20 }}
                                                        animate={{
                                                            y: [-10, -55, -45],
                                                            scale: [1, 1.3, 1.15],
                                                            opacity: 1,
                                                            rotate: [0, 8, -4, 0],
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
                                                            top: -10,
                                                            width: 56,
                                                            height: 56,
                                                            zIndex: 20,
                                                        }}
                                                    >
                                                        <motion.div
                                                            animate={{ y: [0, -4, 0] }}
                                                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
                                                            className="w-full h-full flex items-center justify-center rounded-2xl"
                                                            style={{
                                                                background: cfg.gradient,
                                                                boxShadow: `0 0 30px ${cfg.glow}, 0 8px 24px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.4)`,
                                                            }}
                                                        >
                                                            {isCoins ? (
                                                                <Coins className="w-9 h-9 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]" strokeWidth={2.4} />
                                                            ) : (
                                                                <Zap className="w-9 h-9 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]" strokeWidth={2.6} fill="white" />
                                                            )}
                                                        </motion.div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Chest LID (top half) — animates open */}
                                        <motion.div
                                            className="absolute"
                                            style={{
                                                left: '50%',
                                                marginLeft: -80,
                                                bottom: 88,
                                                width: 160,
                                                height: 70,
                                                transformOrigin: 'bottom left',
                                                zIndex: 5,
                                            }}
                                            initial={false}
                                            animate={
                                                isOpen
                                                    ? { rotate: -118, y: -12, x: -4 }
                                                    : { rotate: 0, y: 0, x: 0 }
                                            }
                                            transition={{
                                                type: 'spring',
                                                stiffness: 180,
                                                damping: 14,
                                                mass: 0.7,
                                            }}
                                        >
                                            <ChestLidSvg cfg={cfg} />
                                        </motion.div>

                                        {/* Pulse halo around the closed chest */}
                                        {stage === 'closed' && (
                                            <motion.div
                                                aria-hidden
                                                animate={{ scale: [1, 1.2, 1.35], opacity: [0.55, 0.25, 0] }}
                                                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                                                className="absolute"
                                                style={{
                                                    left: '50%',
                                                    marginLeft: -80,
                                                    bottom: 0,
                                                    width: 160,
                                                    height: 160,
                                                    border: `2px solid ${cfg.rayColor}`,
                                                    borderRadius: 20,
                                                    pointerEvents: 'none',
                                                }}
                                            />
                                        )}
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
                                        <p
                                            className="text-2xl font-black text-white tracking-tight mb-1"
                                            style={{ textShadow: `0 2px 20px ${cfg.glow}` }}
                                        >
                                            {cfg.title}
                                        </p>
                                        <RarityStars count={cfg.stars} color={cfg.rayColor} />
                                        <motion.p
                                            animate={{ opacity: [0.7, 1, 0.7] }}
                                            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                                            className="mt-4 text-[11px] uppercase tracking-[0.3em] font-bold text-white/80"
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
                                            className="mt-3 text-xs font-bold uppercase tracking-[0.22em] text-white/70"
                                        >
                                            You earned
                                        </p>

                                        {/* The massive number */}
                                        <div className="mt-1 flex items-baseline justify-center gap-2">
                                            <motion.div
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 220,
                                                    damping: 14,
                                                    delay: 0.65,
                                                }}
                                                className="text-7xl font-black tracking-tighter text-stat"
                                                style={{
                                                    background: cfg.gradient,
                                                    WebkitBackgroundClip: 'text',
                                                    backgroundClip: 'text',
                                                    color: 'transparent',
                                                    filter: `drop-shadow(0 4px 18px ${cfg.glow})`,
                                                    lineHeight: 0.9,
                                                }}
                                            >
                                                <AnimatedCounter value={reward.amount} />
                                            </motion.div>
                                        </div>
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.8, duration: 0.3 }}
                                            className="mt-1 flex items-center justify-center gap-1.5"
                                        >
                                            {isCoins ? (
                                                <Coins className="w-4 h-4" style={{ color: cfg.rayColor }} />
                                            ) : (
                                                <Zap className="w-4 h-4" style={{ color: cfg.rayColor }} fill={cfg.rayColor} />
                                            )}
                                            <span
                                                className="text-sm font-black tracking-[0.18em]"
                                                style={{ color: cfg.rayColor }}
                                            >
                                                {reward.currency}
                                            </span>
                                        </motion.div>

                                        <motion.button
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 1, duration: 0.35 }}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={onClose}
                                            className="mt-6 w-full py-3.5 rounded-2xl font-black text-sm tracking-[0.18em] uppercase text-[#15102b] relative overflow-hidden"
                                            style={{
                                                background: 'linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)',
                                                boxShadow: `0 8px 24px -6px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.08)`,
                                            }}
                                        >
                                            <span className="relative z-10">Claim Reward</span>
                                            <motion.div
                                                aria-hidden
                                                animate={{ x: ['-120%', '220%'] }}
                                                transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                                                className="absolute top-0 left-0 h-full w-1/3 skew-x-12"
                                                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)' }}
                                            />
                                        </motion.button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                {/* Keyframes injected once */}
                <style>{`
                    @keyframes rewardBorderSpin {
                        to { filter: hue-rotate(360deg); }
                    }
                    @media (prefers-reduced-motion: reduce) {
                        [style*="rewardBorderSpin"] { animation: none !important; }
                    }
                `}</style>
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
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 260, damping: 16 }}
                >
                    <Star
                        className="w-4 h-4"
                        fill={i < count ? color : 'transparent'}
                        stroke={i < count ? color : 'rgba(255,255,255,0.25)'}
                        strokeWidth={2}
                        style={i < count ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
                    />
                </motion.div>
            ))}
        </div>
    );
}

type ChestCfg = (typeof RARITY)[keyof typeof RARITY];

function ChestBodySvg({ cfg }: { cfg: ChestCfg }) {
    return (
        <svg viewBox="0 0 160 100" className="w-full h-full block overflow-visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id={`bodyWood-${cfg.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cfg.woodLight} />
                    <stop offset="0.45" stopColor={cfg.woodMid} />
                    <stop offset="1" stopColor={cfg.woodDarker} />
                </linearGradient>
                <linearGradient id={`bodyGold-${cfg.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cfg.bandLight} />
                    <stop offset="0.5" stopColor={cfg.bandMid} />
                    <stop offset="1" stopColor={cfg.bandDark} />
                </linearGradient>
                <linearGradient id={`bodyInside-${cfg.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#1a0a04" />
                    <stop offset="1" stopColor={cfg.woodDarker} />
                </linearGradient>
            </defs>

            {/* Back wall of chest interior (shows when lid is open) */}
            <rect x="14" y="2" width="132" height="20" rx="3" fill={`url(#bodyInside-${cfg.label})`} />

            {/* Main body (front face) */}
            <path
                d="M6 14 L154 14 L150 92 Q150 96 146 96 L14 96 Q10 96 10 92 Z"
                fill={`url(#bodyWood-${cfg.label})`}
                stroke={cfg.woodDarker}
                strokeWidth="2"
                strokeLinejoin="round"
            />

            {/* Wood grain planks - subtle vertical lines */}
            <g opacity="0.35" stroke={cfg.woodDarker} strokeWidth="1.2" strokeLinecap="round">
                <line x1="42" y1="22" x2="42" y2="92" />
                <line x1="80" y1="22" x2="80" y2="92" />
                <line x1="118" y1="22" x2="118" y2="92" />
            </g>

            {/* Wood texture highlights */}
            <path
                d="M14 18 Q80 22 146 18"
                fill="none"
                stroke={cfg.woodLight}
                strokeWidth="1.4"
                opacity="0.55"
            />

            {/* Top edge highlight where lid sits */}
            <rect x="6" y="12" width="148" height="4" rx="1" fill={cfg.woodDark} />

            {/* Gold horizontal band */}
            <rect x="4" y="48" width="152" height="10" fill={`url(#bodyGold-${cfg.label})`} stroke={cfg.bandDark} strokeWidth="1" />
            {/* Studs on band */}
            {[20, 50, 80, 110, 140].map((x) => (
                <circle key={x} cx={x} cy={53} r={1.8} fill={cfg.bandLight} stroke={cfg.bandDark} strokeWidth="0.6" />
            ))}

            {/* Gold vertical bands (corners + center) */}
            <rect x="4" y="14" width="9" height="82" fill={`url(#bodyGold-${cfg.label})`} stroke={cfg.bandDark} strokeWidth="0.8" />
            <rect x="147" y="14" width="9" height="82" fill={`url(#bodyGold-${cfg.label})`} stroke={cfg.bandDark} strokeWidth="0.8" />
            <rect x="75" y="14" width="10" height="82" fill={`url(#bodyGold-${cfg.label})`} stroke={cfg.bandDark} strokeWidth="0.8" />

            {/* Lock plate */}
            <rect x="68" y="40" width="24" height="32" rx="3" fill={`url(#bodyGold-${cfg.label})`} stroke={cfg.bandDark} strokeWidth="1.2" />
            {/* Keyhole */}
            <circle cx="80" cy="54" r="3.4" fill={cfg.woodDarker} />
            <rect x="78.5" y="54" width="3" height="8" rx="0.6" fill={cfg.woodDarker} />
            {/* Lock highlight */}
            <rect x="70" y="42" width="20" height="2" rx="1" fill={cfg.bandLight} opacity="0.7" />

            {/* Bottom shadow */}
            <rect x="14" y="88" width="132" height="6" rx="1" fill={cfg.woodDarker} opacity="0.6" />
        </svg>
    );
}

function ChestLidSvg({ cfg }: { cfg: ChestCfg }) {
    return (
        <svg viewBox="0 0 160 70" className="w-full h-full block overflow-visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id={`lidWood-${cfg.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cfg.woodLight} />
                    <stop offset="0.6" stopColor={cfg.woodMid} />
                    <stop offset="1" stopColor={cfg.woodDark} />
                </linearGradient>
                <linearGradient id={`lidGold-${cfg.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cfg.bandLight} />
                    <stop offset="0.55" stopColor={cfg.bandMid} />
                    <stop offset="1" stopColor={cfg.bandDark} />
                </linearGradient>
            </defs>

            {/* Curved lid dome */}
            <path
                d="M6 64 L6 36 Q6 6 80 6 Q154 6 154 36 L154 64 Z"
                fill={`url(#lidWood-${cfg.label})`}
                stroke={cfg.woodDarker}
                strokeWidth="2"
                strokeLinejoin="round"
            />

            {/* Wood grain on lid */}
            <g opacity="0.35" stroke={cfg.woodDarker} strokeWidth="1.2" strokeLinecap="round" fill="none">
                <path d="M42 16 Q42 40 42 62" />
                <path d="M80 10 Q80 36 80 62" />
                <path d="M118 16 Q118 40 118 62" />
            </g>

            {/* Top sheen / highlight */}
            <path
                d="M22 18 Q80 6 138 18"
                fill="none"
                stroke={cfg.woodLight}
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.7"
            />
            <path
                d="M30 12 Q80 0 130 12"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.6"
            />

            {/* Gold corner caps */}
            <path
                d="M6 64 L6 36 Q6 18 22 10 L22 64 Z"
                fill={`url(#lidGold-${cfg.label})`}
                stroke={cfg.bandDark}
                strokeWidth="1"
            />
            <path
                d="M154 64 L154 36 Q154 18 138 10 L138 64 Z"
                fill={`url(#lidGold-${cfg.label})`}
                stroke={cfg.bandDark}
                strokeWidth="1"
            />

            {/* Gold center vertical band */}
            <path
                d="M75 8 L85 8 L85 64 L75 64 Z"
                fill={`url(#lidGold-${cfg.label})`}
                stroke={cfg.bandDark}
                strokeWidth="0.8"
            />

            {/* Lock latch on the lid */}
            <rect x="71" y="50" width="18" height="18" rx="2.5" fill={`url(#lidGold-${cfg.label})`} stroke={cfg.bandDark} strokeWidth="1.2" />
            <rect x="73" y="52" width="14" height="2" rx="1" fill={cfg.bandLight} opacity="0.8" />

            {/* Studs around the lid */}
            {[14, 80, 146].map((x) => (
                <circle key={x} cx={x} cy={58} r={1.8} fill={cfg.bandLight} stroke={cfg.bandDark} strokeWidth="0.6" />
            ))}

            {/* Bottom edge dark line */}
            <rect x="6" y="62" width="148" height="4" rx="1" fill={cfg.woodDarker} opacity="0.7" />
        </svg>
    );
}

function CoinSparkle({ size, color }: { size: number; color: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
            <defs>
                <radialGradient id={`coinGrad-${color.replace('#', '')}`} cx="0.35" cy="0.35" r="0.8">
                    <stop offset="0" stopColor="#fffbe6" />
                    <stop offset="0.55" stopColor={color} />
                    <stop offset="1" stopColor="#7c4a0a" />
                </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="10" fill={`url(#coinGrad-${color.replace('#', '')})`} stroke="#7c4a0a" strokeWidth="1" />
            <circle cx="12" cy="12" r="7" fill="none" stroke="#fffbe6" strokeWidth="0.6" opacity="0.6" />
            <path d="M10 8 L10 16 M14 8 L14 16 M8 10 L16 10 M8 14 L16 14" stroke="#7c4a0a" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        </svg>
    );
}
