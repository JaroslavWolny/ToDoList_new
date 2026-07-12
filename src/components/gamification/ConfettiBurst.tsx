import { useMemo } from 'react';
import { motion } from 'framer-motion';

// Champagne gold + platinum — matches the loot-drop visual language.
const COLORS = ['#f6e7bd', '#e7cd8f', '#d3ae66', '#f2f4f8', '#c6cdd8'];

interface ConfettiBurstProps {
    /** Increment to fire a new burst. 0 = nothing rendered. */
    fireKey: number;
}

/**
 * Dependency-free celebration — fine metallic flakes drifting down instead of
 * rainbow confetti. Bump `fireKey` to fire (e.g. on hitting the daily goal or
 * levelling up). Re-keying replaces the previous burst's DOM, so pieces never
 * accumulate; spent pieces fade to opacity 0 (pointer-events none) and get
 * cleared on the next fire.
 */
export function ConfettiBurst({ fireKey }: ConfettiBurstProps) {
    const pieces = useMemo(() => {
        return Array.from({ length: 28 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            color: COLORS[i % COLORS.length],
            size: 3 + Math.random() * 3.5,
            round: i % 3 === 0,
            xDrift: (Math.random() - 0.5) * 90,
            delay: Math.random() * 0.35,
            rotate: Math.random() * 360 - 180,
            duration: 2 + Math.random() * 1.1,
            peakOpacity: 0.55 + Math.random() * 0.35,
        }));
        // fireKey is the intentional re-roll trigger (not read inside the body).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fireKey]);

    if (fireKey === 0) return null;

    return (
        <div key={fireKey} className="fixed inset-0 z-[70] pointer-events-none overflow-hidden">
            {pieces.map((p) => (
                <motion.span
                    key={p.id}
                    initial={{ top: '30%', opacity: 0, rotate: 0 }}
                    animate={{
                        top: '104%',
                        opacity: [0, p.peakOpacity, p.peakOpacity, 0],
                        rotate: p.rotate,
                        x: p.xDrift,
                    }}
                    transition={{ duration: p.duration, delay: p.delay, ease: [0.25, 0.4, 0.6, 1] }}
                    style={{
                        position: 'absolute',
                        left: `${p.left}%`,
                        width: p.size,
                        height: p.round ? p.size : p.size * 0.45,
                        background: p.color,
                        borderRadius: p.round ? '50%' : 1,
                        boxShadow: `0 0 6px ${p.color}55`,
                    }}
                />
            ))}
        </div>
    );
}
