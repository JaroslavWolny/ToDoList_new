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
        // Modern vault surface (warm gold) — clean gradient faces, no skeuomorphism
        faceLight: '#fef3c7',
        faceMid: '#fbbf24',
        faceDeep: '#d97706',
        side: '#b45309',
        rim: '#fffbeb',
        interior: '#3a2406',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 35%, #ef4444 70%, #fbbf24 100%)',
        glow: 'rgba(249, 115, 22, 0.65)',
        glowSoft: 'rgba(244, 114, 182, 0.45)',
        rayColor: '#fbbf24',
        particleColors: ['#fbbf24', '#f97316', '#ef4444', '#fbbf24', '#fde68a'],
        conic: 'conic-gradient(from 0deg, #fbbf24, #f97316, #ef4444, #fbbf24, #f59e0b, #fbbf24)',
    },
    POUCH: {
        label: 'RARE',
        stars: 2,
        title: 'LUCKY POUCH',
        tag: 'MYSTERY DROP',
        // Modern vault surface (electric cyan) — clean gradient faces
        faceLight: '#cffafe',
        faceMid: '#22d3ee',
        faceDeep: '#0891b2',
        side: '#1d4ed8',
        rim: '#ecfeff',
        interior: '#0a1c3a',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 35%, #22d3ee 70%, #fbbf24 100%)',
        glow: 'rgba(139, 92, 246, 0.65)',
        glowSoft: 'rgba(99, 102, 241, 0.45)',
        rayColor: '#67e8f9',
        particleColors: ['#67e8f9', '#818cf8', '#67e8f9', '#f0abfc', '#ddd6fe'],
        conic: 'conic-gradient(from 0deg, #67e8f9, #818cf8, #67e8f9, #fbbf24, #06b6d4, #67e8f9)',
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
                                    'linear-gradient(160deg, #0a1626 0%, #0f2138 42%, #122a45 70%, #0a1626 100%)',
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
                                            className="mt-6 w-full py-3.5 rounded-2xl font-black text-sm tracking-[0.18em] uppercase text-[#0a1626] relative overflow-hidden"
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
    const id = cfg.label;
    return (
        <svg viewBox="0 0 160 100" className="w-full h-full block overflow-visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
                {/* Front face — soft top-lit gradient */}
                <linearGradient id={`face-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cfg.faceLight} />
                    <stop offset="0.5" stopColor={cfg.faceMid} />
                    <stop offset="1" stopColor={cfg.faceDeep} />
                </linearGradient>
                {/* Dark interior gradient (revealed when the lid swings open) */}
                <linearGradient id={`inside-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#000000" stopOpacity="0.85" />
                    <stop offset="1" stopColor={cfg.interior} />
                </linearGradient>
                {/* Glossy left-to-right sheen */}
                <linearGradient id={`sheen-${id}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
                    <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.08" />
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <radialGradient id={`emblem-${id}`} cx="0.5" cy="0.35" r="0.75">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="0.55" stopColor={cfg.rim} />
                    <stop offset="1" stopColor={cfg.faceMid} />
                </radialGradient>
                <clipPath id={`faceClip-${id}`}>
                    <rect x="8" y="14" width="144" height="82" rx="18" />
                </clipPath>
            </defs>

            {/* Open interior back wall — sits behind the front face */}
            <rect x="16" y="2" width="128" height="22" rx="8" fill={`url(#inside-${id})`} />

            {/* Front face — single clean rounded slab */}
            <rect x="8" y="14" width="144" height="82" rx="18" fill={`url(#face-${id})`} />

            {/* Crisp rim highlight along the top + sides */}
            <rect
                x="8" y="14" width="144" height="82" rx="18"
                fill="none" stroke={cfg.rim} strokeWidth="1.6" strokeOpacity="0.7"
            />
            {/* Inner contact shadow at the very bottom for depth */}
            <rect x="18" y="80" width="124" height="14" rx="7" fill={cfg.side} opacity="0.45" />

            {/* Diagonal glossy sheen clipped to the face */}
            <g clipPath={`url(#faceClip-${id})`}>
                <path d="M8 14 L70 14 L34 96 L8 96 Z" fill={`url(#sheen-${id})`} />
            </g>

            {/* Seam where lid meets body */}
            <rect x="8" y="14" width="144" height="3" rx="1.5" fill="#ffffff" opacity="0.35" />

            {/* Centered emblem — clean rounded diamond, no keyhole clutter */}
            <g transform="translate(80 56)">
                <rect x="-15" y="-15" width="30" height="30" rx="9" transform="rotate(45)" fill={cfg.side} opacity="0.35" />
                <rect x="-12" y="-12" width="24" height="24" rx="7" transform="rotate(45)" fill={`url(#emblem-${id})`} />
                <rect x="-12" y="-12" width="24" height="24" rx="7" transform="rotate(45)" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.6" />
            </g>
        </svg>
    );
}

function ChestLidSvg({ cfg }: { cfg: ChestCfg }) {
    const id = cfg.label;
    return (
        <svg viewBox="0 0 160 70" className="w-full h-full block overflow-visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id={`lid-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cfg.faceLight} />
                    <stop offset="0.55" stopColor={cfg.faceMid} />
                    <stop offset="1" stopColor={cfg.faceDeep} />
                </linearGradient>
                <linearGradient id={`lidGloss-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Smooth rounded dome — no studs, no grain */}
            <path
                d="M8 66 L8 34 Q8 8 80 8 Q152 8 152 34 L152 66 Z"
                fill={`url(#lid-${id})`}
            />
            {/* Crisp rim outline */}
            <path
                d="M8 66 L8 34 Q8 8 80 8 Q152 8 152 34 L152 66 Z"
                fill="none" stroke={cfg.rim} strokeWidth="1.6" strokeOpacity="0.7"
            />

            {/* Soft top gloss band following the dome curve */}
            <path
                d="M16 32 Q16 16 80 16 Q144 16 144 32 L144 40 Q144 26 80 26 Q16 26 16 40 Z"
                fill={`url(#lidGloss-${id})`}
            />

            {/* Bottom seam shadow */}
            <rect x="8" y="60" width="144" height="6" rx="3" fill={cfg.side} opacity="0.4" />
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
