import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toLocalDateKey } from '../lib/dates';

/**
 * State for the Gamified Focus Timer / Deep-Work mode.
 *
 * Two concerns live here:
 *  1. The *running* session (`active`) — persisted so a reload mid-session
 *     resumes by wall-clock instead of losing the block. `hiddenAt` is part of
 *     it so backgrounding the app can't dodge the away-forfeit, even by
 *     killing the app entirely.
 *  2. The *focus-minutes metric* — lifetime totals plus a per-day history that
 *     feeds Today's Focus, the Weekly Review and the focus achievements.
 */

export type FocusPhase = 'idle' | 'setup' | 'running' | 'done' | 'forfeited';

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
    /** Epoch ms when the app went to background mid-session; null while in-app. */
    hiddenAt?: number | null;
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

/** What you lost by bailing on a session early. */
export interface FocusForfeitSummary {
    minutes: number;
    xpLost: number;
    hpLost: number;
    taskTitle: string | null;
    /** Manual hold-to-forfeit vs. staying out of the app past the grace window. */
    reason?: 'gave-up' | 'left-app';
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
    lastForfeit: FocusForfeitSummary | null;

    // Lifetime metric
    totalFocusMinutes: number;
    totalSessions: number;
    longestSessionMin: number;
    history: FocusDayEntry[];

    // UI flow
    openSetup: () => void;
    start: (durationMin: number, taskId: string | null, taskTitle: string | null) => void;
    /** Bail out — surface the forfeit screen with the penalty that was applied. */
    showForfeit: (result: FocusForfeitSummary) => void;
    showResult: (result: FocusResultSummary) => void;
    close: () => void;
    /** Re-enter the running phase if a persisted session is still in flight (after reload). */
    resume: () => void;
    /** Stamp the moment the app goes to background mid-session (kept across relaunches). */
    markHidden: () => void;
    /** Pardon a quick peek away — clears the background stamp. */
    clearHidden: () => void;

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
            lastForfeit: null,
            totalFocusMinutes: 0,
            totalSessions: 0,
            longestSessionMin: 0,
            history: [],

            openSetup: () => set({ phase: 'setup', lastResult: null, lastForfeit: null }),

            start: (durationMin, taskId, taskTitle) => {
                const minutes = Math.max(1, Math.round(durationMin));
                set({
                    phase: 'running',
                    lastResult: null,
                    lastForfeit: null,
                    active: {
                        startedAt: Date.now(),
                        durationSec: minutes * 60,
                        durationMin: minutes,
                        taskId,
                        taskTitle,
                        hiddenAt: null,
                    },
                });
            },

            showForfeit: (result) => set({ phase: 'forfeited', active: null, lastForfeit: result }),

            showResult: (result) => set({ phase: 'done', active: null, lastResult: result }),

            close: () => set({ phase: 'idle', lastResult: null, lastForfeit: null }),

            resume: () => {
                const { active, phase } = get();
                if (active && phase === 'idle') set({ phase: 'running' });
            },

            markHidden: () =>
                set((state) =>
                    state.phase === 'running' && state.active && !state.active.hiddenAt
                        ? { active: { ...state.active, hiddenAt: Date.now() } }
                        : {}
                ),

            clearHidden: () =>
                set((state) =>
                    state.active?.hiddenAt ? { active: { ...state.active, hiddenAt: null } } : {}
                ),

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
