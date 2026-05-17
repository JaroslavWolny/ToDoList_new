import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Coins, Sparkles, Star, Zap } from 'lucide-react';
import { RandomReward } from '../../types';

interface RandomRewardModalProps {
    reward: RandomReward | null;
    onClose: () => void;
}

type Stage = 'closed' | 'bursting' | 'revealed';

const RARITY = {
    CHEST: {
        label: 'EPIC',
        stars: 3,
        title: 'EPIC CHEST',
        tag: 'LEGENDARY DROP',
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
// 28 particles flying outward
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
    angle: (i * 360) / 28 + (i % 2 ? 6 : -6),
    distance: 130 + Math.random() * 70,
    delay: Math.random() * 0.15,
    size: 5 + Math.random() * 7,
}));
// 18 confetti pieces
const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
    x: (i / 18) * 100 + (Math.random() * 6 - 3),
    delay: Math.random() * 0.4,
    duration: 1.6 + Math.random() * 1.2,
    rotation: Math.random() * 720 - 360,
    size: 6 + Math.random() * 6,
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
        try { navigator.vibrate?.([12, 30, 18, 20, 30]); } catch { /* noop */ }
        setStage('bursting');
        window.setTimeout(() => setStage('revealed'), 520);
    };

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
                    animate={{ opacity: stage === 'revealed' ? 0.55 : 0.25 }}
                    transition={{ duration: 0.6 }}
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${cfg.glow} 0%, transparent 55%)`,
                    }}
                />

                {/* Confetti rain after burst */}
                {stage === 'revealed' && (
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

                            {/* Chest / Pouch stage area */}
                            <div className="relative z-10 mt-6 mb-2 flex items-center justify-center h-48">
                                {/* Rotating light rays — appear during burst */}
                                <AnimatePresence>
                                    {stage !== 'closed' && (
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
                                                        height: 180,
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
                                            initial={{ scale: 0, opacity: 0.9 }}
                                            animate={{ scale: 3.5, opacity: 0 }}
                                            transition={{ duration: 0.55, ease: 'easeOut' }}
                                            className="absolute w-32 h-32 rounded-full"
                                            style={{
                                                background: `radial-gradient(circle, white 0%, ${cfg.rayColor} 30%, transparent 70%)`,
                                                filter: 'blur(8px)',
                                            }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Particles burst */}
                                {stage !== 'closed' && (
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
                                                        duration: 1.4,
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

                                {/* The chest/pouch icon */}
                                <AnimatePresence mode="wait">
                                    {stage === 'closed' ? (
                                        <motion.button
                                            key="closed"
                                            type="button"
                                            onClick={handleOpen}
                                            initial={{ scale: 0.5, rotate: -8, opacity: 0 }}
                                            animate={{
                                                scale: [1, 1.06, 1],
                                                rotate: [0, -3, 3, -3, 0],
                                                opacity: 1,
                                            }}
                                            exit={{ scale: 1.4, opacity: 0, transition: { duration: 0.25 } }}
                                            transition={{
                                                scale: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
                                                rotate: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
                                                opacity: { duration: 0.4 },
                                            }}
                                            whileTap={{ scale: 0.92 }}
                                            className="relative z-10 w-32 h-32 rounded-3xl flex items-center justify-center cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/30"
                                            style={{
                                                background: cfg.gradient,
                                                boxShadow: `
                                                    0 20px 50px -10px ${cfg.glow},
                                                    0 0 40px ${cfg.glowSoft},
                                                    inset 0 2px 0 rgba(255,255,255,0.35),
                                                    inset 0 -8px 16px rgba(0,0,0,0.25)
                                                `,
                                            }}
                                            aria-label="Open reward"
                                        >
                                            {/* Sheen */}
                                            <div
                                                aria-hidden
                                                className="absolute inset-0 rounded-3xl overflow-hidden"
                                                style={{
                                                    background:
                                                        'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.15) 100%)',
                                                }}
                                            />
                                            <ChestSvg className="w-20 h-20 relative z-10 drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]" />
                                            {/* Pulse halo */}
                                            <motion.div
                                                aria-hidden
                                                animate={{ scale: [1, 1.25, 1.4], opacity: [0.6, 0.3, 0] }}
                                                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                                                className="absolute inset-0 rounded-3xl"
                                                style={{
                                                    border: `2px solid ${cfg.rayColor}`,
                                                }}
                                            />
                                        </motion.button>
                                    ) : (
                                        <motion.div
                                            key="open"
                                            initial={{ scale: 0, rotate: -180, opacity: 0 }}
                                            animate={{
                                                scale: 1,
                                                rotate: 0,
                                                opacity: 1,
                                            }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 200,
                                                damping: 14,
                                                delay: stage === 'bursting' ? 0 : 0.1,
                                            }}
                                            className="relative z-10 w-32 h-32 rounded-3xl flex items-center justify-center"
                                            style={{
                                                background: cfg.gradient,
                                                boxShadow: `
                                                    0 20px 60px -10px ${cfg.glow},
                                                    0 0 80px ${cfg.glow},
                                                    inset 0 2px 0 rgba(255,255,255,0.45)
                                                `,
                                            }}
                                        >
                                            <motion.div
                                                animate={{ y: [0, -5, 0] }}
                                                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                                            >
                                                {isCoins ? (
                                                    <Coins className="w-16 h-16 text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]" strokeWidth={2.2} />
                                                ) : (
                                                    <Zap className="w-16 h-16 text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]" strokeWidth={2.4} fill="white" />
                                                )}
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Bottom copy stack */}
                            <AnimatePresence mode="wait">
                                {stage === 'closed' ? (
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
                                        transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
                                                    delay: 0.45,
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
                                            transition={{ delay: 0.6, duration: 0.3 }}
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
                                            transition={{ delay: 0.8, duration: 0.35 }}
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

function ChestSvg({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Lid */}
            <path
                d="M10 26 C10 18, 16 14, 32 14 C48 14, 54 18, 54 26 L54 30 L10 30 Z"
                fill="rgba(255,255,255,0.95)"
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="1.5"
            />
            {/* Body */}
            <rect x="10" y="30" width="44" height="22" rx="2" fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />
            {/* Bands */}
            <rect x="10" y="28" width="44" height="3" fill="rgba(0,0,0,0.18)" />
            {/* Lock */}
            <rect x="28" y="32" width="8" height="10" rx="1.5" fill="rgba(0,0,0,0.25)" />
            <circle cx="32" cy="36" r="1.6" fill="rgba(255,255,255,0.9)" />
            {/* Highlights */}
            <path d="M14 20 C18 17, 24 16, 32 16" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
    );
}
