/**
 * Tiny shared Gemini (free-tier) client for the serverless API.
 * Used by the AI push cron and the Brain Dump endpoint. The AI Coach
 * (api/coach.ts) keeps its own handler for fine-grained status codes.
 */

const DEFAULT_MODEL = 'gemini-2.5-flash';

export const geminiConfigured = (): boolean => !!process.env.GEMINI_API_KEY;

interface GeminiOptions {
    system?: string;
    user: string;
    maxOutputTokens?: number;
    temperature?: number;
    /** Ask Gemini to return strict JSON (responseMimeType application/json). */
    json?: boolean;
    model?: string;
}

type GeminiPart = { text?: string };

/**
 * Returns the generated text, or null on any failure (missing key, network,
 * rate limit, empty) so callers can fall back gracefully.
 */
export async function geminiGenerate(opts: GeminiOptions): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const model = opts.model || process.env.COACH_MODEL || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const body: Record<string, unknown> = {
        contents: [{ role: 'user', parts: [{ text: opts.user }] }],
        generationConfig: {
            temperature: opts.temperature ?? 0.7,
            maxOutputTokens: opts.maxOutputTokens ?? 300,
            thinkingConfig: { thinkingBudget: 0 },
            ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        },
    };
    if (opts.system) {
        body.system_instruction = { parts: [{ text: opts.system }] };
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            console.warn('[gemini] non-ok', res.status);
            return null;
        }
        const data = (await res.json()) as {
            candidates?: { content?: { parts?: GeminiPart[] } }[];
        };
        const text = data.candidates?.[0]?.content?.parts
            ?.map((p) => p.text ?? '')
            .join('')
            .trim();
        return text || null;
    } catch (err) {
        console.warn('[gemini] fetch failed', err);
        return null;
    }
}
