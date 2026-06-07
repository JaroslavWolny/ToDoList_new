import { useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#22d3ee', '#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#facc15'];

interface ConfettiBurstProps {
    /** Increment to fire a new burst. 0 = nothing rendered. */
    fireKey: number;
}

/**
 * Dependency-free confetti celebration. Bump `fireKey` to fire (e.g. on hitting
 * the daily goal or levelling up). Re-keying replaces the previous burst's DOM,
 * so pieces never accumulate; spent pieces fade to opacity 0 (pointer-events
 * none) and get cleared on the next fire.
 */
export function ConfettiBurst({ fireKey }: ConfettiBurstProps) {
    const pieces = useMemo(() => {
        /* eslint-disable react-hooks/purity -- decorative one-shot randomness per burst */
        return Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            color: COLORS[i % COLORS.length],
            size: 6 + Math.random() * 7,
            xDrift: (Math.random() - 0.5) * 180,
            delay: Math.random() * 0.18,
            rotate: Math.random() * 720 - 360,
            duration: 1.4 + Math.random() * 0.7,
        }));
        /* eslint-enable react-hooks/purity */
    }, [fireKey]);

    if (fireKey === 0) return null;

    return (
        <div key={fireKey} className="fixed inset-0 z-[70] pointer-events-none overflow-hidden">
            {pieces.map((p) => (
                <motion.span
                    key={p.id}
                    initial={{ top: '36%', opacity: 1, rotate: 0 }}
                    animate={{ top: '108%', opacity: [1, 1, 0], rotate: p.rotate, x: p.xDrift }}
                    transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
                    style={{
                        position: 'absolute',
                        left: `${p.left}%`,
                        width: p.size,
                        height: p.size * 0.55,
                        background: p.color,
                        borderRadius: 2,
                    }}
                />
            ))}
        </div>
    );
}
