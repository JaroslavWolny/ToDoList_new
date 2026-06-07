import type { Priority, Recurrence } from '../types';
import { parseQuickInput } from './quickParse';
import { buildCoachContext } from './coachApi';
import { useTaskStore } from '../stores/taskStore';

export interface ParsedQuest {
    title: string;
    priority: Priority;
    deadline: string | null;
    startDate: string | null;
    recurrence: Recurrence;
    tags: string[];
}

/** Offline / no-AI fallback: split into lines and run the local NL parser. */
const localParse = (text: string): ParsedQuest[] =>
    text
        .split('\n')
        .map((l) => l.replace(/^[\s\-*•\d.)]+/, '').trim())
        .filter(Boolean)
        .map((line): ParsedQuest | null => {
            const p = parseQuickInput(line);
            if (!p.title) return null;
            return {
                title: p.title,
                priority: (p.priority ?? 'MEDIUM') as Priority,
                deadline: p.deadline,
                startDate: null,
                recurrence: p.recurrence,
                tags: p.tags,
            };
        })
        .filter((q): q is ParsedQuest => q !== null)
        .slice(0, 20);

/** Turn a free-form brain dump into structured quests (AI, local fallback). */
export const parseBrainDump = async (text: string): Promise<ParsedQuest[]> => {
    const trimmed = text.trim();
    if (!trimmed) return [];
    try {
        const res = await fetch('/api/braindump', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: trimmed, context: buildCoachContext(), nowIso: new Date().toISOString() }),
        });
        if (!res.ok) return localParse(trimmed);
        const data = (await res.json()) as { quests?: ParsedQuest[] };
        const quests = Array.isArray(data.quests) ? data.quests : [];
        return quests.length ? quests : localParse(trimmed);
    } catch {
        return localParse(trimmed);
    }
};

/** Ask the AI to invent 3 quests for next week from the player's context. */
export const suggestNextWeek = async (): Promise<ParsedQuest[]> => {
    try {
        const res = await fetch('/api/braindump', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generate: 'next-week', context: buildCoachContext(), nowIso: new Date().toISOString() }),
        });
        if (!res.ok) return [];
        const data = (await res.json()) as { quests?: ParsedQuest[] };
        return Array.isArray(data.quests) ? data.quests : [];
    } catch {
        return [];
    }
};

/** Add the given quests to the task store. Returns how many were added. */
export const addQuests = (quests: ParsedQuest[]): number => {
    const add = useTaskStore.getState().addTask;
    quests.forEach((q) =>
        add({
            title: q.title,
            description: '',
            priority: q.priority,
            deadline: q.deadline,
            startDate: q.startDate,
            recurrence: q.recurrence,
            tags: q.tags,
        })
    );
    return quests.length;
};
