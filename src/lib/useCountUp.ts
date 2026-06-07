import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly animates a number toward `target` whenever it changes (easeOutCubic).
 * Used for premium count-up feedback on the Focus score, XP, etc. Does not
 * animate on first mount (starts at the target) — only on subsequent changes.
 */
export function useCountUp(target: number, durationMs = 700): number {
    const [display, setDisplay] = useState(target);
    const displayRef = useRef(target);

    // Keep a live ref of what's currently shown so a new animation starts there.
    useEffect(() => {
        displayRef.current = display;
    }, [display]);

    useEffect(() => {
        const from = displayRef.current;
        const to = target;
        if (from === to) return;

        let raf = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            const eased = 1 - Math.pow(1 - t, 3);
            const value = Math.round(from + (to - from) * eased);
            displayRef.current = value;
            setDisplay(value);
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, durationMs]);

    return display;
}
