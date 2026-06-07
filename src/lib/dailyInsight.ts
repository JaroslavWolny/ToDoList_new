import { askCoach } from './coachApi';
import { toLocalDateKey } from './dates';

/**
 * One short AI coach insight per day, shown on the Today's Focus card.
 *
 * Cached in localStorage keyed by date → exactly ONE Gemini call per day, so it
 * stays comfortably inside the free tier. Fails silently (returns null) when the
 * coach isn't configured / is rate-limited / offline, so the card never breaks.
 */

const CACHE_KEY = 'questdo:daily-insight';
const INSIGHT_PROMPT =
    'Give me ONE punchy coaching insight or nudge for today based on my current state. ' +
    'Max 16 words. No greeting, no quotes, no emoji — just the single line.';

// In-memory guards so rapid dashboard re-mounts don't spam the API on a miss.
let inFlight: Promise<string | null> | null = null;
let lastFailAt = 0;
const FAIL_BACKOFF_MS = 60_000;

type Cached = { date: string; text: string };

export const getCachedInsight = (): string | null => {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const c = JSON.parse(raw) as Cached;
        return c.date === toLocalDateKey(new Date()) ? c.text : null;
    } catch {
        return null;
    }
};

export const fetchDailyInsight = async (): Promise<string | null> => {
    const cached = getCachedInsight();
    if (cached) return cached;

    if (Date.now() - lastFailAt < FAIL_BACKOFF_MS) return null;
    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            const raw = (await askCoach(INSIGHT_PROMPT)).trim();
            const text = raw.replace(/^["'\s]+|["'\s]+$/g, '');
            if (!text) {
                lastFailAt = Date.now();
                return null;
            }
            try {
                localStorage.setItem(
                    CACHE_KEY,
                    JSON.stringify({ date: toLocalDateKey(new Date()), text } satisfies Cached)
                );
            } catch { /* ignore quota errors */ }
            return text;
        } catch {
            lastFailAt = Date.now();
            return null; // coach unavailable — skip silently
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
};
