import { useUserStore } from '../stores/userStore';
import {
    useTaskStore,
    getTasksForToday,
    getOverdueTasks,
    getCompletionsToday,
} from '../stores/taskStore';
import { useMissionStore } from '../stores/missionStore';
import { computeTodayScore, buildFocusInputs } from './todayScore';
import { toLocalDateKey } from './dates';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export interface CoachContext {
    displayName: string;
    level: number;
    xp: number;
    health: number;
    maxHealth: number;
    streakCurrent: number;
    streakLongest: number;
    dailyGoal: number;
    completedToday: number;
    overdueCount: number;
    missionsCompleted: number;
    missionsTotal: number;
    focusScore: number;
    focusTier: string;
    todayTasks: { title: string; priority: string; deadline: string | null; overdue: boolean }[];
}

/**
 * Snapshot the player's current state for the coach. Reads the stores
 * directly (no hooks) so it can be called from event handlers.
 */
export const buildCoachContext = (now = new Date()): CoachContext => {
    const user = useUserStore.getState();
    const { tasks, completions } = useTaskStore.getState();
    const mission = useMissionStore.getState();

    const todayTasks = getTasksForToday(tasks, now);
    const overdue = getOverdueTasks(tasks, now);
    const overdueIds = new Set(overdue.map((t) => t.id));
    const completedToday = getCompletionsToday(completions, now).length;

    const todayKey = toLocalDateKey(now);
    const missionsForToday = mission.lastGeneratedDate === todayKey ? mission.missions : [];
    const missionsCompleted = missionsForToday.filter((m) => m.completed).length;

    const focus = computeTodayScore(
        buildFocusInputs(tasks, completedToday, {
            health: user.health,
            maxHealth: user.maxHealth,
            streakCurrent: user.streakCurrent,
            dailyGoal: user.settings.dailyGoal,
        }, now)
    );

    return {
        displayName: user.displayName || 'Hero',
        level: user.level,
        xp: user.xp,
        health: user.health,
        maxHealth: user.maxHealth,
        streakCurrent: user.streakCurrent,
        streakLongest: user.streakLongest,
        dailyGoal: user.settings.dailyGoal,
        completedToday,
        overdueCount: overdue.length,
        missionsCompleted,
        missionsTotal: missionsForToday.length,
        focusScore: focus.score,
        focusTier: focus.tier.label,
        todayTasks: todayTasks.map((t) => ({
            title: t.title,
            priority: t.priority,
            deadline: t.deadline,
            overdue: overdueIds.has(t.id),
        })),
    };
};

export class CoachError extends Error {}

/**
 * Ask the Quest Coach. Throws CoachError with a user-friendly message on failure
 * (missing key, rate limit, network) so the UI can show it inline.
 */
export const askCoach = async (message: string, history: ChatTurn[] = []): Promise<string> => {
    let res: Response;
    try {
        res = await fetch('/api/coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                history: history.slice(-12),
                context: buildCoachContext(),
            }),
        });
    } catch {
        throw new CoachError('Could not reach the AI coach. Check your connection.');
    }

    let data: { reply?: string; error?: string } = {};
    try {
        data = await res.json();
    } catch { /* fall through to status handling */ }

    if (!res.ok) {
        throw new CoachError(data.error || `The AI coach is unavailable (${res.status}).`);
    }
    if (!data.reply) {
        throw new CoachError('The AI coach returned an empty answer. Try again.');
    }
    return data.reply;
};
