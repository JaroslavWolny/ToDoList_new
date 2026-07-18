import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../stores/userStore';
import type { MoodLevel } from '../../types';

const toDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const MOODS: { level: MoodLevel; emoji: string; label: string }[] = [
    { level: 1, emoji: '😫', label: 'Drained' },
    { level: 2, emoji: '😕', label: 'Meh' },
    { level: 3, emoji: '😐', label: 'Okay' },
    { level: 4, emoji: '🙂', label: 'Good' },
    { level: 5, emoji: '🔥', label: 'On fire' },
];

/**
 * One-tap daily vibe check. Feeds the coach context so plans match the
 * player's real energy (gentle day vs. push day). Collapses to a slim
 * banner once logged; tap the banner to change today's mood.
 */
export function MoodCheckIn() {
    const { moodLog, logMood } = useUserStore(
        useShallow((s) => ({ moodLog: s.moodLog, logMood: s.logMood }))
    );
    const today = useMemo(() => toDateKey(new Date()), []);
    const todayMood = moodLog[today];
    const [editing, setEditing] = useState(false);

    const handlePick = (level: MoodLevel) => {
        logMood(level);
        setEditing(false);
        try { navigator.vibrate?.(10); } catch { /* noop */ }
    };

    if (todayMood && !editing) {
        const mood = MOODS.find((m) => m.level === todayMood)!;
        return (
            <motion.button
                type="button"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setEditing(true)}
                className="glass-card w-full px-4 py-2.5 flex items-center gap-3 text-left"
                aria-label="Change today's mood"
            >
                <span className="text-2xl leading-none">{mood.emoji}</span>
                <div className="flex-1 min-w-0">
                    <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                        Today's Vibe
                    </span>
                    <p className="text-sm font-bold leading-tight">{mood.label}</p>
                </div>
                <span className="text-[11px] text-[var(--color-text-secondary)]">Tap to change</span>
            </motion.button>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card w-full px-4 py-3"
        >
            <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-tertiary)]">
                Vibe Check
            </span>
            <p className="text-sm font-bold leading-tight mb-2.5">How are you feeling today?</p>
            <div className="flex items-center justify-between gap-1.5">
                {MOODS.map((mood) => (
                    <motion.button
                        key={mood.level}
                        type="button"
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handlePick(mood.level)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition ${
                            todayMood === mood.level
                                ? 'bg-white/15 border-white/30'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                        aria-label={mood.label}
                    >
                        <span className="text-xl leading-none">{mood.emoji}</span>
                        <span className="text-[9px] font-semibold text-[var(--color-text-secondary)]">
                            {mood.label}
                        </span>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
}
