import { DEVICE_ID_KEY } from './storage';

/**
 * Push-notification plumbing that does NOT need the Firebase SDK.
 *
 * Everything here is plain env checks + fetch calls to our own backend, so it
 * stays out of the (heavy) `lib/firebase` chunk. Pages can import this module
 * freely without dragging ~500 kB of Firebase into their bundle — the SDK is
 * only loaded lazily, behind `requestFirebaseNotificationPermission()`.
 */

const FIREBASE_CONFIG_KEYS = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
] as const;

const missingFirebaseConfigKeys = FIREBASE_CONFIG_KEYS.filter((key) => !import.meta.env[key]);
const missingMessagingConfigKeys = [
    ...missingFirebaseConfigKeys,
    ...(!import.meta.env.VITE_FIREBASE_VAPID_KEY ? ['VITE_FIREBASE_VAPID_KEY'] : []),
];

export const hasFirebaseConfig = missingFirebaseConfigKeys.length === 0;

export const getFirebaseAuthConfigError = (): string | null => {
    if (missingFirebaseConfigKeys.length === 0) return null;
    return `Missing Firebase config: ${missingFirebaseConfigKeys.join(', ')}`;
};

export const getFirebaseMessagingConfigError = (): string | null => {
    if (missingMessagingConfigKeys.length === 0) return null;
    return `Missing notification config: ${missingMessagingConfigKeys.join(', ')}`;
};

/**
 * Ask for push permission + an FCM token. The only operation in this module
 * that genuinely needs the Firebase SDK, so it loads it on demand — the user
 * is already inside a settings flow and won't notice the one-time fetch.
 */
export const requestFirebaseNotificationPermission = async (): Promise<string | null> => {
    if (getFirebaseMessagingConfigError()) {
        console.error(getFirebaseMessagingConfigError());
        return null;
    }
    const { requestNotificationToken } = await import('./firebase');
    return requestNotificationToken();
};

const getNotificationsApiUrl = (): string => '/api/notifications/token';

const getOrCreateDeviceId = (): string => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
};

const syncNotificationToken = async (
    method: 'POST' | 'DELETE',
    payload?: Record<string, unknown>
) => {
    const response = await fetch(getNotificationsApiUrl(), {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!response.ok) {
        let errorMessage = `Notification sync failed with status ${response.status}`;

        try {
            const data = await response.json() as { error?: string };
            if (typeof data.error === 'string' && data.error) {
                errorMessage = data.error;
            }
        } catch {
            // Ignore JSON parsing failures and keep the generic message.
        }

        throw new Error(errorMessage);
    }
};

export const saveTokenToFirestore = async (token: string, morningTime: string, eveningTime: string) => {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        await syncNotificationToken('POST', {
            deviceId: getOrCreateDeviceId(),
            token,
            morningTime,
            eveningTime,
            timezone,
        });
    } catch (error) {
        console.error('Failed to save token to backend:', error);
        throw error;
    }
};

export type ReminderStats = {
    tasksDueSoon: number;
    dailyGoalProgress: number;
    dailyGoalTarget: number;
    streakCurrent: number;
    missionsCompleted: number;
    missionsTotal: number;
};

export const updateNotificationStats = async (stats: ReminderStats): Promise<void> => {
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) return; // no token registered yet — nothing to personalize

    try {
        const response = await fetch(getNotificationsApiUrl(), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, stats }),
        });
        if (!response.ok) {
            console.warn(`Failed to sync notification stats: ${response.status}`);
        }
    } catch (error) {
        console.warn('Failed to sync notification stats:', error);
    }
};

export type TaskReminderInput = {
    taskId: string;
    title: string;
    deadline: string;
};

const getTaskRemindersApiUrl = (): string => '/api/notifications/task-reminders';

// Pushes the device's upcoming task deadlines to the backend so the hourly cron
// can fire a per-quest reminder as each deadline approaches. Replaces the full
// set every call — the backend reconciles, so completed/deleted quests drop out.
export const syncTaskReminders = async (reminders: TaskReminderInput[]): Promise<void> => {
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) return; // no token registered yet — nothing to schedule

    try {
        const response = await fetch(getTaskRemindersApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, reminders }),
        });
        if (!response.ok) {
            console.warn(`Failed to sync task reminders: ${response.status}`);
        }
    } catch (error) {
        console.warn('Failed to sync task reminders:', error);
    }
};

export const removeTokenFromFirestore = async () => {
    try {
        const deviceId = localStorage.getItem(DEVICE_ID_KEY);
        if (!deviceId) return;

        await syncNotificationToken('DELETE', { deviceId });
        localStorage.removeItem(DEVICE_ID_KEY);
    } catch (error) {
        console.error('Failed to remove token from backend:', error);
        throw error;
    }
};
