export const USER_STORE_KEY = 'todolist-user-store';
export const TASK_STORE_KEY = 'todolist-task-store';
export const ACHIEVEMENT_STORE_KEY = 'todolist-achievement-store';
export const MISSION_STORE_KEY = 'todolist-mission-store';
export const DEVICE_ID_KEY = 'todolist_device_id';

export const APP_STORAGE_KEYS = [
    USER_STORE_KEY,
    TASK_STORE_KEY,
    ACHIEVEMENT_STORE_KEY,
    MISSION_STORE_KEY,
    DEVICE_ID_KEY,
] as const;

export const clearAppStorage = () => {
    APP_STORAGE_KEYS.forEach((key) => {
        localStorage.removeItem(key);
    });
};
