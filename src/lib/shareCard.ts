import { Task, Completion } from '../types';
import { AVAILABLE_AVATARS } from './avatars';

export const REFERRER_STORAGE_KEY = 'questdo:referrer';
export const SHARE_BASE_URL = 'https://questdo.app/from';

const TAILWIND_TEXT_COLORS: Record<string, string> = {
    'text-amber-300': '#fcd34d',
    'text-amber-400': '#fbbf24',
    'text-amber-500': '#f59e0b',
    'text-amber-600': '#d97706',
    'text-blue-400': '#60a5fa',
    'text-cyan-300': '#67e8f9',
    'text-cyan-400': '#22d3ee',
    'text-emerald-300': '#6ee7b7',
    'text-emerald-400': '#34d399',
    'text-emerald-500': '#10b981',
    'text-fuchsia-300': '#f0abfc',
    'text-fuchsia-400': '#e879f9',
    'text-gray-400': '#9ca3af',
    'text-indigo-400': '#818cf8',
    'text-orange-400': '#fb923c',
    'text-orange-500': '#f97316',
    'text-pink-400': '#f472b6',
    'text-purple-400': '#c084fc',
    'text-red-400': '#f87171',
    'text-red-500': '#ef4444',
    'text-rose-400': '#fb7185',
    'text-sky-300': '#7dd3fc',
    'text-sky-400': '#38bdf8',
    'text-slate-400': '#94a3b8',
    'text-teal-300': '#5eead4',
    'text-teal-400': '#2dd4bf',
    'text-violet-300': '#c4b5fd',
    'text-violet-400': '#a78bfa',
    'text-yellow-300': '#fde047',
    'text-yellow-400': '#facc15',
    'text-yellow-500': '#eab308',
};

export const tailwindTextToHex = (cls: string): string =>
    TAILWIND_TEXT_COLORS[cls] ?? '#a78bfa';

export const getAvatarHex = (avatarId: string | null): string => {
    if (!avatarId) return '#a78bfa';
    const found = AVAILABLE_AVATARS.find((a) => a.id === avatarId);
    return found ? tailwindTextToHex(found.color) : '#a78bfa';
};

export const slugifyHandle = (name: string): string => {
    const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24);
    return slug || 'hero';
};

export interface PersonalityStats {
    topTag: string;
    peakHour: string;
    topDay: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatHourLabel = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
};

const STATS_WINDOW_DAYS = 60;

export const computeShareStats = (
    tasks: Task[],
    completions: Completion[],
    now: Date = new Date()
): PersonalityStats => {
    const cutoff = now.getTime() - STATS_WINDOW_DAYS * 86_400_000;
    const recent = completions.filter((c) => {
        const t = Date.parse(c.completedAt);
        return Number.isFinite(t) && t >= cutoff;
    });

    const tagCounts = new Map<string, number>();
    const hourCounts = new Array<number>(24).fill(0);
    const dayCounts = new Array<number>(7).fill(0);
    const tasksById = new Map<string, Task>();
    tasks.forEach((t) => tasksById.set(t.id, t));

    recent.forEach((c) => {
        const d = new Date(c.completedAt);
        if (!Number.isNaN(d.getTime())) {
            hourCounts[d.getHours()] += 1;
            dayCounts[d.getDay()] += 1;
        }
        const task = tasksById.get(c.taskId);
        task?.tags.forEach((tag) => {
            tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        });
    });

    let topTag = '';
    let topTagCount = 0;
    tagCounts.forEach((count, tag) => {
        if (count > topTagCount) {
            topTagCount = count;
            topTag = tag;
        }
    });

    const peakHourIdx = hourCounts.reduce(
        (best, count, i) => (count > hourCounts[best] ? i : best),
        0
    );
    const topDayIdx = dayCounts.reduce(
        (best, count, i) => (count > dayCounts[best] ? i : best),
        0
    );

    const hasAnyHour = hourCounts.some((n) => n > 0);
    const hasAnyDay = dayCounts.some((n) => n > 0);

    return {
        topTag: topTag ? `#${topTag}` : '—',
        peakHour: hasAnyHour ? formatHourLabel(peakHourIdx) : '—',
        topDay: hasAnyDay ? DAY_LABELS[topDayIdx] : '—',
    };
};
