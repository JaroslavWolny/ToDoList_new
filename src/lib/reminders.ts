export const DEFAULT_NOTIFICATION_MORNING = '08:00';
export const DEFAULT_NOTIFICATION_EVENING = '21:00';

export type ReminderType = 'MORNING' | 'EVENING' | 'BOTH';

type ParsedReminderTime = {
    hour: number;
    minute: number;
};

type ReminderScheduleInput = {
    morningTime: string;
    eveningTime: string;
    timezone: string;
};

export type ReminderSchedule = {
    sendAtUtc: Date;
    reminderType: ReminderType;
};

const LEGACY_REMINDER_TIME_REGEX = /^(\d{1,2})(?::(\d{2}))?$/;
const SEARCH_WINDOW_STEPS = 96 * 4;
const SEARCH_STEP_MS = 15 * 60 * 1000;

const formatHourSlot = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

const getTimePartsInTimeZone = (date: Date, timeZone: string): {
    hour: string;
    minute: string;
} => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
    }).formatToParts(date);

    return {
        hour: parts.find((part) => part.type === 'hour')?.value ?? '',
        minute: parts.find((part) => part.type === 'minute')?.value ?? '',
    };
};

export const parseReminderTime = (value: string): ParsedReminderTime | null => {
    const match = LEGACY_REMINDER_TIME_REGEX.exec(value.trim());
    if (!match) return null;

    const hour = Number(match[1]);
    const minute = Number(match[2] ?? '0');

    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

    return { hour, minute };
};

export const normalizeReminderHour = (
    value: string,
    fallback: string = DEFAULT_NOTIFICATION_MORNING
): string => {
    const parsed = parseReminderTime(value) ?? parseReminderTime(fallback) ?? { hour: 8, minute: 0 };
    return formatHourSlot(parsed.hour);
};

export const isValidReminderSlot = (value: string): boolean => {
    const parsed = parseReminderTime(value);
    return parsed !== null && parsed.minute === 0;
};

export const normalizeReminderSettings = <
    T extends {
        notificationMorning: string;
        notificationEvening: string;
    },
>(
    settings: T
): T => ({
    ...settings,
    notificationMorning: normalizeReminderHour(
        settings.notificationMorning,
        DEFAULT_NOTIFICATION_MORNING
    ),
    notificationEvening: normalizeReminderHour(
        settings.notificationEvening,
        DEFAULT_NOTIFICATION_EVENING
    ),
});

export const isValidTimeZone = (timeZone: string): boolean => {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
        return true;
    } catch {
        return false;
    }
};

export const getNextReminderSchedule = (
    { morningTime, eveningTime, timezone }: ReminderScheduleInput,
    fromDate: Date = new Date()
): ReminderSchedule | null => {
    if (
        !isValidReminderSlot(morningTime)
        || !isValidReminderSlot(eveningTime)
        || !isValidTimeZone(timezone)
    ) {
        return null;
    }

    const alignedStart = new Date(fromDate.getTime());
    alignedStart.setUTCSeconds(0, 0);

    const initialTimestamp = alignedStart.getTime();

    for (let step = 1; step <= SEARCH_WINDOW_STEPS; step += 1) {
        const candidate = new Date(initialTimestamp + step * SEARCH_STEP_MS);
        const { hour, minute } = getTimePartsInTimeZone(candidate, timezone);
        const slot = `${hour}:${minute}`;

        const matchesMorning = slot === morningTime;
        const matchesEvening = slot === eveningTime;

        if (matchesMorning && matchesEvening) {
            return { sendAtUtc: candidate, reminderType: 'BOTH' };
        }
        if (matchesMorning) {
            return { sendAtUtc: candidate, reminderType: 'MORNING' };
        }
        if (matchesEvening) {
            return { sendAtUtc: candidate, reminderType: 'EVENING' };
        }
    }

    return null;
};
