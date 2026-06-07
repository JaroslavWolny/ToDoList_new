import { VercelRequest, VercelResponse } from '@vercel/node';
import { geminiGenerate } from './lib/gemini';

/**
 * Brain Dump → structured quests (free Gemini tier).
 *
 * POST { text }                  → parse a free-form brain dump into quests
 * POST { generate: 'next-week' } → invent 3 quests for next week from context
 *
 * Returns { quests: [...] }. 503 when no GEMINI_API_KEY so the client can fall
 * back to local line-by-line parsing.
 */

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type Recurrence = 'NONE' | 'DAILY' | 'WEEKLY';

interface ParsedQuest {
    title: string;
    priority: Priority;
    deadline: string | null;
    startDate: string | null;
    recurrence: Recurrence;
    tags: string[];
}

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const RECURRENCES: Recurrence[] = ['NONE', 'DAILY', 'WEEKLY'];

const SYSTEM = `You convert a person's brain-dump or planning request into structured QuestDo quests.
Output ONLY valid JSON of the exact form: {"quests":[{"title":"...","priority":"...","deadline":"...","recurrence":"...","tags":[...]}]}
Rules per quest:
- title: short, action-first (e.g. "Call the dentist"). Keep the user's language.
- priority: one of LOW | MEDIUM | HIGH | CRITICAL — infer from urgency/importance words.
- deadline: absolute ISO 8601 datetime resolved against the provided "now", or null if none implied. Default time 09:00 local if only a date is given.
- recurrence: NONE, or DAILY/WEEKLY for habits ("every day", "each week", "daily", "každý den").
- tags: 0-3 short lowercase tags, no "#".
Split distinct items into separate quests. Max 20. Output nothing but the JSON.`;

const sanitizeQuest = (raw: unknown): ParsedQuest | null => {
    if (typeof raw !== 'object' || raw === null) return null;
    const q = raw as Record<string, unknown>;
    const title = (typeof q.title === 'string' ? q.title.trim() : '').slice(0, 140);
    if (!title) return null;

    const priority: Priority =
        typeof q.priority === 'string' && PRIORITIES.includes(q.priority.toUpperCase() as Priority)
            ? (q.priority.toUpperCase() as Priority)
            : 'MEDIUM';
    const recurrence: Recurrence =
        typeof q.recurrence === 'string' && RECURRENCES.includes(q.recurrence.toUpperCase() as Recurrence)
            ? (q.recurrence.toUpperCase() as Recurrence)
            : 'NONE';

    let deadline: string | null = null;
    if (typeof q.deadline === 'string' && q.deadline.trim()) {
        const t = Date.parse(q.deadline);
        if (!Number.isNaN(t)) deadline = new Date(t).toISOString();
    }

    const tags = Array.isArray(q.tags)
        ? q.tags
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.replace(/^#/, '').trim().toLowerCase().slice(0, 24))
            .filter(Boolean)
            .slice(0, 3)
        : [];

    return { title, priority, deadline, startDate: null, recurrence, tags };
};

const extractQuests = (text: string): ParsedQuest[] => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        // Best-effort: pull the first {...} block out of any wrapper.
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return [];
        try {
            parsed = JSON.parse(match[0]);
        } catch {
            return [];
        }
    }
    const arr = Array.isArray(parsed)
        ? parsed
        : (parsed as { quests?: unknown })?.quests;
    if (!Array.isArray(arr)) return [];
    return arr.map(sanitizeQuest).filter((q): q is ParsedQuest => q !== null).slice(0, 20);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'Brain Dump needs a free GEMINI_API_KEY (Google AI Studio).' });
    }

    const body = (req.body ?? {}) as { text?: unknown; generate?: unknown; context?: unknown; nowIso?: unknown };
    const nowIso = typeof body.nowIso === 'string' ? body.nowIso : new Date().toISOString();
    const contextStr = (() => {
        try {
            return body.context ? JSON.stringify(body.context).slice(0, 4000) : 'none';
        } catch {
            return 'none';
        }
    })();

    let user: string;
    if (body.generate === 'next-week') {
        user = `now=${nowIso}\nPlayer context (their recent QuestDo state): ${contextStr}\n\nInvent exactly THREE concrete, high-value quests for the player's NEXT WEEK based on this context. Spread deadlines across next week. Return the JSON.`;
    } else {
        const text = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : '';
        if (!text) return res.status(400).json({ error: 'Missing text' });
        user = `now=${nowIso}\nPlayer context (optional): ${contextStr}\n\nBrain dump to convert into quests:\n"""\n${text}\n"""`;
    }

    const out = await geminiGenerate({ system: SYSTEM, user, json: true, maxOutputTokens: 1200, temperature: 0.4 });
    if (out === null) {
        return res.status(502).json({ error: 'The AI is busy right now. Try again in a moment.' });
    }

    const quests = extractQuests(out);
    return res.status(200).json({ quests });
}
