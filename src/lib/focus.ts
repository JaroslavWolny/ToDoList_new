import type { Priority, GamificationLevel } from '../types';

/**
 * Pure helpers for the Gamified Focus Timer / Deep-Work mode.
 *
 * A "focus session" is a self-imposed deep-work block (25/50 min, or custom)
 * optionally tied to a quest. Finishing it earns XP, a few coins, and a new
 * "focus minutes" metric; bailing out early earns nothing (loss aversion).
 * Kept framework-free so the numbers stay testable and out of the components.
 */

/**
 * Quick-pick durations (minutes): 15 = quick burst, 25 = Pomodoro,
 * 50 = deep-work block, 90 = full ultradian cycle.
 */
export const FOCUS_PRESETS = [15, 25, 50, 90] as const;

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
 * XP lost when you bail on a session early. Paired with a guaranteed −1 HP,
 * this gives "deep focus" real teeth (Forest kills your tree) instead of a
 * toothless "no reward". Scales with how much you committed (session length)
 * and the chosen difficulty, so quitting genuinely costs more than finishing.
 */
export const focusForfeitXp = (minutes: number, level: GamificationLevel): number => {
    const pct = level === 'CASUAL' ? 0.5 : level === 'HARDCORE' ? 1.5 : 1;
    return Math.max(5, Math.round(Math.max(1, minutes) * pct));
};

/** HP always lost on a forfeit — same sting as missing a quest deadline. */
export const FOCUS_FORFEIT_HP = 1;

/**
 * How long the app may be backgrounded mid-session before it counts as
 * bailing (app switch, swipe to home, lock screen). Long enough to survive
 * an accidental swipe or an incoming-call overlay, far too short to
 * actually use another app.
 */
export const FOCUS_AWAY_GRACE_SEC = 5;

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
