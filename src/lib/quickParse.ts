import { Priority, Recurrence } from '../types';

export interface ParsedQuickInput {
    title: string;
    priority: Priority | null;
    deadline: string | null;
    recurrence: Recurrence;
    tags: string[];
}

const PRIORITY_MAP: Record<string, Priority> = {
    low: 'LOW',
    lo: 'LOW',
    med: 'MEDIUM',
    medium: 'MEDIUM',
    high: 'HIGH',
    hi: 'HIGH',
    crit: 'CRITICAL',
    critical: 'CRITICAL',
};

const WEEKDAYS: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
    neděle: 0, nedele: 0,
    pondělí: 1, pondeli: 1,
    úterý: 2, utery: 2,
    středa: 3, streda: 3,
    čtvrtek: 4, ctvrtek: 4,
    pátek: 5, patek: 5,
    sobota: 6,
};

const setEodIfNoTime = (d: Date, hours: number | null, minutes: number | null): Date => {
    if (hours !== null) d.setHours(hours, minutes ?? 0, 0, 0);
    else d.setHours(23, 59, 0, 0);
    return d;
};

export const parseQuickInput = (raw: string, now: Date = new Date()): ParsedQuickInput => {
    let working = ` ${raw} `;

    const tags: string[] = [];
    working = working.replace(/(^|\s)#([a-zA-Z0-9_\-]{1,32})/g, (_, lead, tag) => {
        tags.push(tag.toLowerCase());
        return lead;
    });

    let priority: Priority | null = null;
    working = working.replace(
        /(^|\s)!(critical|crit|high|hi|medium|med|low|lo)\b/gi,
        (_, lead, p) => {
            priority = PRIORITY_MAP[p.toLowerCase()];
            return lead;
        }
    );

    let recurrence: Recurrence = 'NONE';
    let recurrenceWeekday: number | null = null;

    const everyWeekdayMatch = working.match(
        /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i
    );
    if (everyWeekdayMatch) {
        recurrence = 'WEEKLY';
        recurrenceWeekday = WEEKDAYS[everyWeekdayMatch[1].toLowerCase()];
        working = working.replace(everyWeekdayMatch[0], ' ');
    }

    if (recurrence === 'NONE') {
        const dailyRegex = /\b(every\s+day|daily|každ[ýé]\s+den|kazd[ye]\s+den)\b/i;
        if (dailyRegex.test(working)) {
            recurrence = 'DAILY';
            working = working.replace(dailyRegex, ' ');
        }
    }

    if (recurrence === 'NONE') {
        const weeklyRegex = /\b(every\s+week|weekly|každ[ýé]\s+týden|kazd[ye]\s+tyden)\b/i;
        if (weeklyRegex.test(working)) {
            recurrence = 'WEEKLY';
            working = working.replace(weeklyRegex, ' ');
        }
    }

    let timeHours: number | null = null;
    let timeMinutes: number | null = null;

    const hhmm = working.match(/\b(?:at\s+|v\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i);
    if (hhmm) {
        timeHours = parseInt(hhmm[1], 10);
        timeMinutes = parseInt(hhmm[2], 10);
        working = working.replace(hhmm[0], ' ');
    }

    if (timeHours === null) {
        const ampm = working.match(/\b(?:at\s+)?(\d{1,2})\s*(am|pm)\b/i);
        if (ampm) {
            let h = parseInt(ampm[1], 10);
            const meridiem = ampm[2].toLowerCase();
            if (meridiem === 'pm' && h < 12) h += 12;
            if (meridiem === 'am' && h === 12) h = 0;
            timeHours = h;
            timeMinutes = 0;
            working = working.replace(ampm[0], ' ');
        }
    }

    let deadline: Date | null = null;

    const todayRegex = /\b(today|dnes)\b/i;
    if (todayRegex.test(working)) {
        deadline = setEodIfNoTime(new Date(now), timeHours, timeMinutes);
        working = working.replace(todayRegex, ' ');
    }

    if (!deadline) {
        const tomorrowRegex = /\b(tomorrow|tmrw|zítra|zitra)\b/i;
        if (tomorrowRegex.test(working)) {
            const d = new Date(now);
            d.setDate(d.getDate() + 1);
            deadline = setEodIfNoTime(d, timeHours, timeMinutes);
            working = working.replace(tomorrowRegex, ' ');
        }
    }

    if (!deadline) {
        const inMatch = working.match(
            /\b(?:in|za)\s+(\d{1,3})\s*(days?|day|d|dn[íy]|den|hours?|hour|hrs?|h|hodin[ay]?|hod)\b/i
        );
        if (inMatch) {
            const n = parseInt(inMatch[1], 10);
            const unit = inMatch[2].toLowerCase();
            const isHours = /^(h|hr|hrs|hour|hours|hod|hodin|hodina|hodiny)$/.test(unit);
            const d = new Date(now);
            if (isHours) {
                d.setHours(d.getHours() + n);
                deadline = d;
            } else {
                d.setDate(d.getDate() + n);
                deadline = setEodIfNoTime(d, timeHours, timeMinutes);
            }
            working = working.replace(inMatch[0], ' ');
        }
    }

    if (!deadline) {
        const nextWeekRegex = /\b(next\s+week|příští\s+týden|pristi\s+tyden)\b/i;
        if (nextWeekRegex.test(working)) {
            const d = new Date(now);
            d.setDate(d.getDate() + 7);
            deadline = setEodIfNoTime(d, timeHours, timeMinutes);
            working = working.replace(nextWeekRegex, ' ');
        }
    }

    if (!deadline) {
        const weekdayKeys = Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length).join('|');
        const wkRegex = new RegExp(`\\b(?:on\\s+|next\\s+)?(${weekdayKeys})\\b`, 'i');
        const wk = working.match(wkRegex);
        if (wk) {
            const target = WEEKDAYS[wk[1].toLowerCase()];
            const d = new Date(now);
            const diff = ((target - d.getDay()) + 7) % 7 || 7;
            d.setDate(d.getDate() + diff);
            deadline = setEodIfNoTime(d, timeHours, timeMinutes);
            working = working.replace(wk[0], ' ');
        }
    }

    if (!deadline && recurrenceWeekday !== null) {
        const d = new Date(now);
        const diff = ((recurrenceWeekday - d.getDay()) + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        deadline = setEodIfNoTime(d, timeHours, timeMinutes);
    }

    if (!deadline) {
        const ddmm = working.match(/\b(\d{1,2})\.(\d{1,2})\.(?:(\d{2,4})\b)?/);
        if (ddmm) {
            const day = parseInt(ddmm[1], 10);
            const month = parseInt(ddmm[2], 10) - 1;
            let year = ddmm[3] ? parseInt(ddmm[3], 10) : now.getFullYear();
            if (year < 100) year += 2000;
            const d = new Date(year, month, day);
            if (!Number.isNaN(d.getTime()) && d.getMonth() === month) {
                if (!ddmm[3] && d.getTime() < now.getTime() - 60_000) {
                    d.setFullYear(d.getFullYear() + 1);
                }
                deadline = setEodIfNoTime(d, timeHours, timeMinutes);
                working = working.replace(ddmm[0], ' ');
            }
        }
    }

    if (!deadline && timeHours !== null) {
        const d = new Date(now);
        d.setHours(timeHours, timeMinutes ?? 0, 0, 0);
        if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
        deadline = d;
    }

    const title = working.replace(/\s+/g, ' ').trim();

    return {
        title,
        priority,
        deadline: deadline ? deadline.toISOString() : null,
        recurrence,
        tags,
    };
};

export const formatDeadlineChip = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';

    const now = new Date();
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayDiff = Math.round((dStart - nowStart) / 86_400_000);

    const hh = d.getHours();
    const mm = d.getMinutes();
    const hasExplicitTime = !(hh === 23 && mm === 59);
    const timeStr = hasExplicitTime
        ? `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
        : '';

    let dayStr: string;
    if (dayDiff === 0) dayStr = 'today';
    else if (dayDiff === 1) dayStr = 'tomorrow';
    else if (dayDiff > 1 && dayDiff < 7) {
        dayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
    } else {
        dayStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    return timeStr ? `${dayStr} ${timeStr}` : dayStr;
};
