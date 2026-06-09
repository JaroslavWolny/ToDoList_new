import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toLocalDateKey } from '../lib/dates';

/**
 * State for the Gamified Focus Timer / Deep-Work mode.
 *
 * Two concerns live here:
 *  1. The *running* session (`active`) — persisted so a reload or tab switch
 *     mid-session resumes by wall-clock instead of losing the block. This is
 *     what makes "deep focus" survive leaving the app.
 *  2. The *focus-minutes metric* — lifetime totals plus a per-day history that
 *     feeds Today's Focus, the Weekly Review and the focus achievements.
 */

export type FocusPhase = 'idle' | 'setup' | 'running' | 'done';

export interface FocusDayEntry {
    date: string; // YYYY-MM-DD (local)
    minutes: number; // total focused minutes that day
    sessions: number; // completed sessions that day
}

export interface ActiveFocusSession {
    startedAt: number; // epoch ms
    durationSec: number; // planned length in seconds
    durationMin: number; // planned length in minutes (canonical reward basis)
    taskId: string | null; // linked quest, if any
    taskTitle: string | null;
}

export interface FocusResultSummary {
    minutes: number;
    xpEarned: number;
    coinsEarned: number;
    leveledUpTo: number | null;
    bossDamage: number; // 0 when not in a raid
    bossName: string | null;
    taskId: string | null;
    taskTitle: string | null;
}

const HISTORY_DAYS = 60;

const sumLastDays = (history: FocusDayEntry[], days: number, now = new Date()): number => {
    const keys = new Set<string>();
    for (let i = 0; i < days; i += 1) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        keys.add(toLocalDateKey(d));
    }
    return history.reduce((sum, e) => (keys.has(e.date) ? sum + e.minutes : sum), 0);
};

interface FocusSessionStore {
    phase: FocusPhase;
    active: ActiveFocusSession | null;
    lastResult: FocusResultSummary | null;

    // Lifetime metric
    totalFocusMinutes: number;
    totalSessions: number;
    longestSessionMin: number;
    history: FocusDayEntry[];

    // UI flow
    openSetup: () => void;
    start: (durationMin: number, taskId: string | null, taskTitle: string | null) => void;
    giveUp: () => void; // loss aversion — discard the session, no reward
    showResult: (result: FocusResultSummary) => void;
    close: () => void;
    /** Re-enter the running phase if a persisted session is still in flight (after reload). */
    resume: () => void;

    // Metric recording (called by the focus-completion orchestrator)
    recordSession: (minutes: number) => void;

    // Selectors
    getTodayMinutes: () => number;
    getMaxDayMinutes: () => number;
    getWeekMinutes: () => number;
}

export const useFocusSessionStore = create<FocusSessionStore>()(
    persist(
        (set, get) => ({
            phase: 'idle',
            active: null,
            lastResult: null,
            totalFocusMinutes: 0,
            totalSessions: 0,
            longestSessionMin: 0,
            history: [],

            openSetup: () => set({ phase: 'setup', lastResult: null }),

            start: (durationMin, taskId, taskTitle) => {
                const minutes = Math.max(1, Math.round(durationMin));
                set({
                    phase: 'running',
                    lastResult: null,
                    active: {
                        startedAt: Date.now(),
                        durationSec: minutes * 60,
                        durationMin: minutes,
                        taskId,
                        taskTitle,
                    },
                });
            },

            giveUp: () => set({ phase: 'idle', active: null, lastResult: null }),

            showResult: (result) => set({ phase: 'done', active: null, lastResult: result }),

            close: () => set({ phase: 'idle', lastResult: null }),

            resume: () => {
                const { active, phase } = get();
                if (active && phase === 'idle') set({ phase: 'running' });
            },

            recordSession: (minutes) => {
                const mins = Math.max(0, Math.round(minutes));
                const today = toLocalDateKey(new Date());
                set((state) => {
                    const existing = state.history.find((e) => e.date === today);
                    const others = state.history.filter((e) => e.date !== today);
                    const merged: FocusDayEntry = existing
                        ? { date: today, minutes: existing.minutes + mins, sessions: existing.sessions + 1 }
                        : { date: today, minutes: mins, sessions: 1 };
                    const history = [...others, merged]
                        .sort((a, b) => (a.date < b.date ? -1 : 1))
                        .slice(-HISTORY_DAYS);
                    return {
                        history,
                        totalFocusMinutes: state.totalFocusMinutes + mins,
                        totalSessions: state.totalSessions + 1,
                        longestSessionMin: Math.max(state.longestSessionMin, mins),
                    };
                });
            },

            getTodayMinutes: () => {
                const today = toLocalDateKey(new Date());
                return get().history.find((e) => e.date === today)?.minutes ?? 0;
            },

            getMaxDayMinutes: () =>
                get().history.reduce((max, e) => Math.max(max, e.minutes), 0),

            getWeekMinutes: () => sumLastDays(get().history, 7),
        }),
        {
            name: 'todolist-focus-session',
            partialize: (state) => ({
                active: state.active,
                totalFocusMinutes: state.totalFocusMinutes,
                totalSessions: state.totalSessions,
                longestSessionMin: state.longestSessionMin,
                history: state.history,
            }),
        }
    )
);
