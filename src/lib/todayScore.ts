import { Task } from '../types';
import { getTasksForToday, getOverdueTasks } from '../stores/taskStore';

/**
 * "Today's Focus" — a single 0–100 readiness/momentum number for the dashboard.
 *
 * Inspired by Bevel's "Energy Bank": instead of scattering HP, streak, and goal
 * progress across the screen, we synthesise them into one hero number AND we
 * always explain *why* it is what it is (the `reasons` array). The same snapshot
 * feeds the AI Quest Coach so its advice lines up with what the card shows.
 */

export type FocusTierId = 'DEPLETED' | 'WARMING' | 'FLOW' | 'PEAK';

export interface FocusTier {
    id: FocusTierId;
    label: string;
    /** Tailwind text color class for the number/accents */
    text: string;
    /** Hex stops for the progress ring gradient */
    from: string;
    to: string;
    emoji: string;
}

export interface FocusReason {
    label: string;
    tone: 'good' | 'bad' | 'neutral';
}

export interface TodayScore {
    score: number;
    tier: FocusTier;
    headline: string;
    reasons: FocusReason[];
    /** Raw inputs — handy for the coach context */
    completedToday: number;
    dailyGoal: number;
    overdueCount: number;
    streakCurrent: number;
    health: number;
    maxHealth: number;
}

export interface FocusInputs {
    health: number;
    maxHealth: number;
    streakCurrent: number;
    completedToday: number;
    dailyGoal: number;
    overdueCount: number;
    todayTaskCount: number;
}

const FOCUS_TIERS: Record<FocusTierId, FocusTier> = {
    DEPLETED: { id: 'DEPLETED', label: 'Depleted', text: 'text-red-400', from: '#f87171', to: '#ef4444', emoji: '🪫' },
    WARMING: { id: 'WARMING', label: 'Warming Up', text: 'text-amber-400', from: '#fbbf24', to: '#f59e0b', emoji: '🌅' },
    FLOW: { id: 'FLOW', label: 'In Flow', text: 'text-cyan-400', from: '#22d3ee', to: '#3b82f6', emoji: '⚡' },
    PEAK: { id: 'PEAK', label: 'Peak Focus', text: 'text-emerald-400', from: '#34d399', to: '#10b981', emoji: '🔥' },
};

const tierForScore = (score: number): FocusTier => {
    if (score >= 75) return FOCUS_TIERS.PEAK;
    if (score >= 50) return FOCUS_TIERS.FLOW;
    if (score >= 25) return FOCUS_TIERS.WARMING;
    return FOCUS_TIERS.DEPLETED;
};

// Weightings (sum of positives = 100): goal progress dominates, then HP, then streak.
const GOAL_WEIGHT = 45;
const HP_WEIGHT = 25;
const STREAK_WEIGHT = 20;
const STREAK_CAP_DAYS = 10; // a 10-day streak maxes the streak contribution
const BASELINE = 10; // small floor so an untouched day still reads as "warming", not dead
const OVERDUE_PENALTY = 8;
const OVERDUE_PENALTY_CAP = 24;

export const computeTodayScore = (inputs: FocusInputs): TodayScore => {
    const { health, maxHealth, streakCurrent, completedToday, dailyGoal, overdueCount } = inputs;

    const goalRatio = dailyGoal > 0
        ? Math.min(1, completedToday / dailyGoal)
        : (completedToday > 0 ? 1 : 0);
    const hpRatio = maxHealth > 0 ? Math.min(1, Math.max(0, health / maxHealth)) : 0;
    const streakRatio = Math.min(1, streakCurrent / STREAK_CAP_DAYS);

    const goalPts = goalRatio * GOAL_WEIGHT;
    const hpPts = hpRatio * HP_WEIGHT;
    const streakPts = streakRatio * STREAK_WEIGHT;
    const overduePenalty = Math.min(overdueCount * OVERDUE_PENALTY, OVERDUE_PENALTY_CAP);

    const raw = BASELINE + goalPts + hpPts + streakPts - overduePenalty;
    const score = Math.round(Math.min(100, Math.max(0, raw)));
    const tier = tierForScore(score);

    // ─── Reasons: always explain WHY the number is what it is ───
    const reasons: FocusReason[] = [];

    if (dailyGoal > 0) {
        reasons.push({
            label: completedToday >= dailyGoal
                ? `Daily goal done (${completedToday}/${dailyGoal})`
                : `${completedToday}/${dailyGoal} quests today`,
            tone: completedToday >= dailyGoal ? 'good' : (completedToday > 0 ? 'neutral' : 'bad'),
        });
    } else if (completedToday > 0) {
        reasons.push({ label: `${completedToday} done today`, tone: 'good' });
    }

    if (streakCurrent > 0) {
        reasons.push({ label: `${streakCurrent}-day streak`, tone: 'good' });
    }

    if (health < maxHealth) {
        reasons.push({ label: `HP ${health}/${maxHealth}`, tone: health <= 1 ? 'bad' : 'neutral' });
    }

    if (overdueCount > 0) {
        reasons.push({ label: `${overdueCount} overdue`, tone: 'bad' });
    }

    // ─── Headline: one actionable "why" sentence, dominant factor first ───
    let headline: string;
    if (overdueCount > 0) {
        headline = `Clear ${overdueCount} overdue ${overdueCount === 1 ? 'quest' : 'quests'} to recover your focus.`;
    } else if (health <= 1 && health < maxHealth) {
        headline = 'HP is low — finish a quest on time to start healing.';
    } else if (dailyGoal > 0 && completedToday >= dailyGoal) {
        headline = streakCurrent > 0
            ? `Goal smashed and a ${streakCurrent}-day streak alive. You're at your peak.`
            : 'Daily goal smashed — peak focus reached.';
    } else if (completedToday === 0) {
        headline = inputs.todayTaskCount > 0
            ? 'Fresh start. Knock out one quest to build momentum.'
            : 'No quests yet today — add one to get rolling.';
    } else if (dailyGoal > 0) {
        const left = dailyGoal - completedToday;
        headline = `${left} more ${left === 1 ? 'quest' : 'quests'} to hit today's goal.`;
    } else {
        headline = 'Keep the momentum going.';
    }

    return {
        score,
        tier,
        headline,
        reasons: reasons.slice(0, 4),
        completedToday,
        dailyGoal,
        overdueCount,
        streakCurrent,
        health,
        maxHealth,
    };
};

/** Convenience: derive the inputs straight from the task list + user snapshot. */
export const buildFocusInputs = (
    tasks: Task[],
    completedToday: number,
    user: { health: number; maxHealth: number; streakCurrent: number; dailyGoal: number },
    now = new Date()
): FocusInputs => ({
    health: user.health,
    maxHealth: user.maxHealth,
    streakCurrent: user.streakCurrent,
    completedToday,
    dailyGoal: user.dailyGoal,
    overdueCount: getOverdueTasks(tasks, now).length,
    todayTaskCount: getTasksForToday(tasks, now).length,
});
