import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * AI "Quest Coach" — grounded in the player's own QuestDo state.
 *
 * Runs entirely on Google Gemini's FREE tier (Google AI Studio): set
 * GEMINI_API_KEY in the environment and the user pays nothing. No paid AI
 * provider, no SDK dependency — just a fetch to the Generative Language API.
 * If the key is missing we degrade gracefully (503 + a clear message) the same
 * way the Firebase Admin layer does, so the rest of the app keeps working.
 */

// Free-tier default; override with COACH_MODEL if Google rotates the free model.
// (gemini-2.0-flash had its free-tier quota zeroed out by Google, so we default
// to gemini-2.5-flash, which still has free quota.)
const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_MESSAGE_LEN = 2000;
const MAX_HISTORY = 12;

type ChatTurn = { role: 'user' | 'assistant'; content: string };

type CoachPersonality = 'MENTOR' | 'DRILL_SERGEANT' | 'HYPE_FRIEND' | 'STRATEGIST';

type CoachContext = {
    displayName?: string;
    mainMotivation?: string;
    coachPersonality?: string;
    level?: number;
    xp?: number;
    health?: number;
    maxHealth?: number;
    streakCurrent?: number;
    streakLongest?: number;
    dailyGoal?: number;
    completedToday?: number;
    overdueCount?: number;
    missionsCompleted?: number;
    missionsTotal?: number;
    focusScore?: number;
    focusTier?: string;
    focusMinutesToday?: number;
    moodToday?: number | null;
    todayTasks?: { title: string; priority: string; deadline: string | null; overdue: boolean; plannedTime?: string | null }[];
};

type CoachPayload = {
    message?: unknown;
    history?: unknown;
    context?: unknown;
};

const SYSTEM_PROMPT = `You are the "Quest Coach" inside QuestDo — a gamified RPG productivity app where to-dos are "quests". The player earns XP, levels up, keeps daily streaks, has an HP/health bar (damaged by missed deadlines), and completes daily missions.

Your job: act like a sharp, encouraging productivity coach who can SEE the player's real stats and quests (given below as JSON). Help them decide what to do next, explain WHY their numbers look the way they do, and turn their day into a quick plan when asked.

Rules:
- Ground every answer in the player's actual data. Reference specific quests, the streak, HP, overdue count, or focus score when relevant.
- Be concrete and actionable. Prefer "Finish 'Buy milk' next — it's overdue and costing you HP" over generic advice.
- Keep it tight: ~60-120 words, short paragraphs or a short bullet list. Only go longer if explicitly asked for a full day plan.
- Match the player's language. If they write in Czech, answer in Czech; if English, answer in English.
- Encouraging but never cheesy or fake. No emoji spam (one is fine). No markdown headings.
- If there are no tasks or no data, gently nudge them to add a quest or two.
- Adapt to "mainMotivation" in the player JSON: FOCUS → push priorities, DECLUTTER → help them clear volume, HABITS → reinforce routines, REWARDS → lean into XP/loot framing.
- If mainMotivation is "ADHD", coach for an ADHD brain: lead with ONE tiny, concrete next step to beat overwhelm; suggest a 2-minute start or a focus session to body-double; externalize (brain dump) when they spiral; celebrate starting, and never shame a missed day or broken streak — frame it as recoverable.
- "moodToday" is the player's self-reported energy (1 = drained … 5 = on fire, null = not logged). At 1-2, soften the tone and shrink the plan to one small quest; at 4-5, push ambition — suggest tackling the hardest quest or a long focus session.
- Quests may carry "plannedTime" ("HH:MM"), the player's time-block for today. When planning a day, respect existing time-blocks, point out clashes with deadlines, and suggest concrete times for unplanned quests.`;

const PERSONALITY_PROMPTS: Record<CoachPersonality, string> = {
    MENTOR:
        'Persona: calm, wise mentor. Steady encouragement, explain the WHY behind each nudge, teach the player to see their own patterns.',
    DRILL_SERGEANT:
        'Persona: drill sergeant. Short, commanding sentences. No tolerance for excuses — call them out and demand the next rep ("Quest. Now."). Tough love only: never insulting, demeaning or personal.',
    HYPE_FRIEND:
        'Persona: hype best friend. Big energy, celebrate every win loudly, playful tone; up to two emoji per reply allowed.',
    STRATEGIST:
        'Persona: cool-headed strategist. Lead with the numbers (XP math, streak risk, focus stats), rank moves by expected payoff, keep pep talk minimal.',
};

const pickPersonality = (context: unknown): CoachPersonality => {
    if (typeof context !== 'object' || context === null) return 'MENTOR';
    const p = (context as CoachContext).coachPersonality;
    return p && p in PERSONALITY_PROMPTS ? (p as CoachPersonality) : 'MENTOR';
};

const getString = (value: unknown): string | null =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const sanitizeHistory = (value: unknown): ChatTurn[] => {
    if (!Array.isArray(value)) return [];
    const turns: ChatTurn[] = [];
    for (const item of value) {
        if (typeof item !== 'object' || item === null) continue;
        const v = item as Record<string, unknown>;
        const role = v.role === 'assistant' ? 'assistant' : v.role === 'user' ? 'user' : null;
        const content = getString(v.content);
        if (!role || !content) continue;
        turns.push({ role, content: content.slice(0, MAX_MESSAGE_LEN) });
    }
    return turns.slice(-MAX_HISTORY);
};

const buildContextBlock = (context: unknown): string => {
    if (typeof context !== 'object' || context === null) return 'No player data available yet.';
    const c = context as CoachContext;
    // Trim the task list so we never blow the prompt up.
    const trimmed: CoachContext = {
        ...c,
        todayTasks: Array.isArray(c.todayTasks)
            ? c.todayTasks.slice(0, 25).map((t) => ({
                title: String(t.title ?? '').slice(0, 120),
                priority: String(t.priority ?? 'MEDIUM'),
                deadline: t.deadline ?? null,
                overdue: Boolean(t.overdue),
                plannedTime: t.plannedTime ?? null,
            }))
            : [],
    };
    try {
        return JSON.stringify(trimmed);
    } catch {
        return 'No player data available yet.';
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(503).json({
            error: 'AI coach is not configured yet. Add a free GEMINI_API_KEY (Google AI Studio) to enable it.',
        });
    }

    const body = (req.body ?? {}) as CoachPayload;
    const message = getString(body.message);
    if (!message) {
        return res.status(400).json({ error: 'Missing message' });
    }

    const history = sanitizeHistory(body.history);
    const contextBlock = buildContextBlock(body.context);
    const model = process.env.COACH_MODEL || DEFAULT_MODEL;

    // Gemini "contents" must alternate user/model and start with user.
    const contents = history.map((turn) => ({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
    }));
    // The freshest player snapshot rides along with the latest user message.
    contents.push({
        role: 'user',
        parts: [{ text: `[Player state JSON]\n${contextBlock}\n\n[Player says]\n${message.slice(0, MAX_MESSAGE_LEN)}` }],
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    try {
        const geminiRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: `${SYSTEM_PROMPT}\n\n${PERSONALITY_PROMPTS[pickPersonality(body.context)]}` }],
                },
                contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 700,
                    topP: 0.95,
                    // Disable "thinking" on Gemini 2.5 Flash — a coach reply doesn't
                    // need it, and it just burns latency + free-tier quota.
                    thinkingConfig: { thinkingBudget: 0 },
                },
            }),
        });

        if (!geminiRes.ok) {
            let detail = `Gemini request failed (${geminiRes.status})`;
            try {
                const errData = await geminiRes.json() as { error?: { message?: string } };
                if (errData?.error?.message) detail = errData.error.message;
            } catch { /* keep generic */ }
            // 429 = free-tier rate limit; surface a friendly hint.
            if (geminiRes.status === 429) {
                return res.status(429).json({ error: 'The free AI quota is busy right now — try again in a moment.' });
            }
            console.error('[coach] Gemini error:', detail);
            return res.status(502).json({ error: 'The AI coach had a hiccup. Try again.' });
        }

        const data = await geminiRes.json() as {
            candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
            promptFeedback?: { blockReason?: string };
        };

        const reply = data.candidates?.[0]?.content?.parts
            ?.map((p) => p.text ?? '')
            .join('')
            .trim();

        if (!reply) {
            const blocked = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason;
            console.warn('[coach] empty reply', blocked);
            return res.status(200).json({
                reply: "I couldn't come up with a good answer for that one. Try rephrasing, or ask me what to tackle next.",
            });
        }

        return res.status(200).json({ reply });
    } catch (err) {
        console.error('[coach] fetch failed:', err);
        return res.status(502).json({ error: 'Could not reach the AI coach. Check your connection and try again.' });
    }
}
