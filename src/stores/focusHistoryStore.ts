import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toLocalDateKey } from '../lib/dates';

export interface FocusEntry {
    date: string; // YYYY-MM-DD
    score: number;
}

const MAX_DAYS = 30;

interface FocusHistoryStore {
    history: FocusEntry[];
    /** Upsert today's focus score (called as the score changes through the day). */
    recordToday: (score: number) => void;
}

export const useFocusHistoryStore = create<FocusHistoryStore>()(
    persist(
        (set) => ({
            history: [],
            recordToday: (score: number) => {
                const today = toLocalDateKey(new Date());
                set((state) => {
                    const last = state.history[state.history.length - 1];
                    // No-op if today's entry already holds this exact score (avoids churn).
                    if (last && last.date === today && last.score === score) return state;
                    const others = state.history.filter((e) => e.date !== today);
                    const next = [...others, { date: today, score }]
                        .sort((a, b) => (a.date < b.date ? -1 : 1))
                        .slice(-MAX_DAYS);
                    return { history: next };
                });
            },
        }),
        { name: 'todolist-focus-history' }
    )
);
