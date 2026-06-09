import type { Priority } from '../types';

/**
 * Pure helpers for the Gamified Focus Timer / Deep-Work mode.
 *
 * A "focus session" is a self-imposed deep-work block (25/50 min, or custom)
 * optionally tied to a quest. Finishing it earns XP, a few coins, and a new
 * "focus minutes" metric; bailing out early earns nothing (loss aversion).
 * Kept framework-free so the numbers stay testable and out of the components.
 */

/** Quick-pick durations (minutes). 25/50 mirror the classic Pomodoro/deep-work blocks. */
export const FOCUS_PRESETS = [25, 50] as const;

/** Bounds + granularity for the custom-duration stepper. */
export const FOCUS_MIN_MINUTES = 5;
export const FOCUS_MAX_MINUTES = 120;
export const FOCUS_STEP_MINUTES = 5;
export const FOCUS_DEFAULT_MINUTES = 25;

/** Daily target that unlocks the "2h in the zone" feeling (and achievement). */
export const FOCUS_DAILY_TARGET_MINUTES = 120;

/**
 * XP for finishing a session. Deep work is a big, deliberate effort, so it
 * sits between a HIGH (50 XP) and a CRITICAL (100 XP) task at the long end:
 * 25 min → ~38 XP, 50 min → 75 XP.
 */
export const focusXp = (minutes: number): number =>
    Math.max(1, Math.round(minutes * 1.5));

/** A small coin trickle so deep work also feeds the avatar-shop economy. */
export const focusCoins = (minutes: number): number => Math.round(minutes / 5);

/**
 * Map a session length to a raid-damage tier. Longer focus = heavier hit.
 * Focus damage always lands as a "quest" hit (×2 on the boss) — that's the
 * "bonus damage" payoff for grinding a deep-work block while in a raid.
 */
export const minutesToPriority = (minutes: number): Priority =>
    minutes >= 45 ? 'CRITICAL' : minutes >= 25 ? 'HIGH' : minutes >= 10 ? 'MEDIUM' : 'LOW';

export const clampFocusMinutes = (minutes: number): number => {
    if (!Number.isFinite(minutes)) return FOCUS_DEFAULT_MINUTES;
    const stepped = Math.round(minutes / FOCUS_STEP_MINUTES) * FOCUS_STEP_MINUTES;
    return Math.min(FOCUS_MAX_MINUTES, Math.max(FOCUS_MIN_MINUTES, stepped));
};

/** mm:ss for the running countdown. */
export const formatClock = (totalSeconds: number): string => {
    const s = Math.max(0, Math.round(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

/** Compact "1h 20m" / "45m" label for the focus-minutes metric. */
export const formatFocusMinutes = (minutes: number): string => {
    const m = Math.max(0, Math.round(minutes));
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
};
