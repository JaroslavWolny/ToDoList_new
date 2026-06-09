import { focusXp, focusCoins, focusForfeitXp, FOCUS_FORFEIT_HP } from './focus';
import { dispatchFocusRaidDamage } from './raidDamage';
import { useUserStore } from '../stores/userStore';
import {
    useFocusSessionStore,
    type FocusResultSummary,
    type FocusForfeitSummary,
} from '../stores/focusSessionStore';
import { useAchievementStore } from '../stores/achievementStore';

export interface CompleteFocusInput {
    minutes: number;
    taskId: string | null;
    taskTitle: string | null;
}

/**
 * Settle a finished focus session: award XP + coins, record the focus-minutes
 * metric, unlock any focus achievements, and (if signed in to a raid) land
 * bonus boss damage. Mirrors `completeTaskTransaction` as the single place
 * where a session turns into rewards. Returns the summary for the done screen.
 *
 * Only called on a *completed* session — bailing early goes through
 * `giveUp()` and earns nothing (loss aversion).
 */
export const completeFocusSession = async (
    input: CompleteFocusInput
): Promise<FocusResultSummary> => {
    const minutes = Math.max(1, Math.round(input.minutes));
    const xpEarned = focusXp(minutes);
    const coinsEarned = focusCoins(minutes);

    const prevLevel = useUserStore.getState().level;

    // ── Rewards + metric ──
    useUserStore.getState().addXP(xpEarned);
    if (coinsEarned > 0) useUserStore.getState().addCoins(coinsEarned);
    useFocusSessionStore.getState().recordSession(minutes);

    // ── Achievements (Deep Work, 2h in the zone, …) ──
    useAchievementStore.getState().checkAndUnlock();

    const newLevel = useUserStore.getState().level;
    const leveledUpTo = newLevel > prevLevel ? newLevel : null;

    // ── Raid bonus damage (best-effort, non-blocking failures) ──
    let bossDamage = 0;
    let bossName: string | null = null;
    try {
        const raid = await dispatchFocusRaidDamage(minutes, input.taskTitle ?? 'Deep Work');
        if (raid) {
            bossDamage = raid.damage;
            bossName = raid.bossName;
        }
    } catch {
        /* never let raid sync break the reward flow */
    }

    return {
        minutes,
        xpEarned,
        coinsEarned,
        leveledUpTo,
        bossDamage,
        bossName,
        taskId: input.taskId,
        taskTitle: input.taskTitle,
    };
};

/**
 * Punish a bailed session. Strips XP (scaled by length + difficulty) and 1 HP,
 * records nothing toward the focus metric, and returns the loss so the overlay
 * can show the damage. This is the "real impact" that stops Deep-Work from
 * being a consequence-free toggle.
 */
export const forfeitFocusSession = (input: {
    minutes: number;
    taskTitle: string | null;
}): FocusForfeitSummary => {
    const minutes = Math.max(1, Math.round(input.minutes));
    const level = useUserStore.getState().settings.gamificationLevel;
    const xpLost = focusForfeitXp(minutes, level);

    useUserStore.getState().removeXP(xpLost);
    useUserStore.getState().loseHealth();

    return { minutes, xpLost, hpLost: FOCUS_FORFEIT_HP, taskTitle: input.taskTitle };
};
