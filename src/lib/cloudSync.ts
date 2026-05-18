import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore } from './firebase';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore } from '../stores/taskStore';
import { useUserStore } from '../stores/userStore';
import type { Completion, Task, UserState } from '../types';

type CloudState = {
    tasks: Task[];
    completions: Completion[];
    user: Partial<UserState>;
    updatedAt: unknown;
};

const DEBOUNCE_MS = 1500;
const PENDING_MIGRATION_KEY = 'todolist:pendingMigration';

let unsubscribeAuth: (() => void) | null = null;
let unsubscribeTask: (() => void) | null = null;
let unsubscribeUser: (() => void) | null = null;
let unsubscribeCloud: (() => void) | null = null;
let debounceTimer: number | null = null;
let activeUid: string | null = null;
let hydrating = false;
let suppressNextWrite = false;

const getDocRef = (uid: string) => {
    if (!firestore) return null;
    return doc(firestore, 'users', uid, 'state', 'main');
};

const writeNow = async () => {
    debounceTimer = null;
    if (!activeUid || !firestore) return;
    if (suppressNextWrite) {
        suppressNextWrite = false;
        return;
    }

    const ref = getDocRef(activeUid);
    if (!ref) return;

    const taskState = useTaskStore.getState();
    const userState = useUserStore.getState();

    const payload: CloudState = {
        tasks: taskState.tasks,
        completions: taskState.completions,
        user: extractUserSnapshot(userState),
        updatedAt: serverTimestamp(),
    };

    try {
        await setDoc(ref, payload, { merge: false });
    } catch (err) {
        console.warn('Cloud sync write failed:', err);
    }
};

const scheduleWrite = () => {
    if (!activeUid || hydrating) return;
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(writeNow, DEBOUNCE_MS);
};

const extractUserSnapshot = (state: UserState): Partial<UserState> => ({
    displayName: state.displayName,
    level: state.level,
    xp: state.xp,
    coins: state.coins,
    health: state.health,
    maxHealth: state.maxHealth,
    streakCurrent: state.streakCurrent,
    streakLongest: state.streakLongest,
    lastCompletedDate: state.lastCompletedDate,
    streakFreezeTokens: state.streakFreezeTokens,
    totalTasksCompleted: state.totalTasksCompleted,
    totalXPEarned: state.totalXPEarned,
    equippedAvatar: state.equippedAvatar,
    unlockedAvatars: state.unlockedAvatars,
    lastRevealDate: state.lastRevealDate,
    dailyThemeId: state.dailyThemeId,
    lastSharedStreakMilestone: state.lastSharedStreakMilestone,
});

const applyCloudSnapshot = (data: CloudState) => {
    hydrating = true;
    try {
        if (Array.isArray(data.tasks) || Array.isArray(data.completions)) {
            useTaskStore.setState((state) => ({
                ...state,
                tasks: Array.isArray(data.tasks) ? data.tasks : state.tasks,
                completions: Array.isArray(data.completions) ? data.completions : state.completions,
            }));
        }
        if (data.user && typeof data.user === 'object') {
            useUserStore.setState((state) => ({
                ...state,
                ...data.user,
            }));
        }
    } finally {
        hydrating = false;
    }
};

const startListening = () => {
    unsubscribeTask?.();
    unsubscribeUser?.();
    unsubscribeTask = useTaskStore.subscribe(scheduleWrite);
    unsubscribeUser = useUserStore.subscribe(scheduleWrite);
};

const stopListening = () => {
    unsubscribeTask?.();
    unsubscribeUser?.();
    unsubscribeTask = null;
    unsubscribeUser = null;
    unsubscribeCloud?.();
    unsubscribeCloud = null;
    if (debounceTimer) {
        window.clearTimeout(debounceTimer);
        debounceTimer = null;
    }
};

export type MigrationPrompt = {
    cloudHasData: boolean;
    localHasData: boolean;
    apply: (action: 'migrate-local' | 'use-cloud' | 'reset-local') => Promise<void>;
};

let migrationPromptListener: ((prompt: MigrationPrompt | null) => void) | null = null;

export const onMigrationPrompt = (listener: (prompt: MigrationPrompt | null) => void): (() => void) => {
    migrationPromptListener = listener;
    return () => {
        if (migrationPromptListener === listener) {
            migrationPromptListener = null;
        }
    };
};

const handleSignIn = async (uid: string) => {
    if (!firestore) return;
    activeUid = uid;
    const ref = getDocRef(uid);
    if (!ref) return;

    let cloud: CloudState | null = null;
    try {
        const snap = await getDoc(ref);
        if (snap.exists()) cloud = snap.data() as CloudState;
    } catch (err) {
        console.warn('Cloud sync read failed:', err);
    }

    const localTasks = useTaskStore.getState().tasks;
    const cloudHasData = !!cloud && ((cloud.tasks?.length ?? 0) > 0 || (cloud.completions?.length ?? 0) > 0);
    const localHasData = localTasks.length > 0;

    if (cloudHasData && localHasData) {
        // Conflict: ask the user
        await new Promise<void>((resolve) => {
            const prompt: MigrationPrompt = {
                cloudHasData,
                localHasData,
                apply: async (action) => {
                    migrationPromptListener?.(null);
                    if (action === 'migrate-local') {
                        suppressNextWrite = false;
                        await writeNow();
                    } else if (action === 'use-cloud' && cloud) {
                        applyCloudSnapshot(cloud);
                        suppressNextWrite = true;
                    } else if (action === 'reset-local' && cloud) {
                        applyCloudSnapshot(cloud);
                        suppressNextWrite = true;
                    }
                    resolve();
                },
            };
            migrationPromptListener?.(prompt);
            try { window.sessionStorage.setItem(PENDING_MIGRATION_KEY, '1'); } catch { /* noop */ }
        });
        try { window.sessionStorage.removeItem(PENDING_MIGRATION_KEY); } catch { /* noop */ }
    } else if (cloudHasData && cloud) {
        applyCloudSnapshot(cloud);
        suppressNextWrite = true;
    } else if (localHasData) {
        // First-time login with only local data — push to cloud silently
        await writeNow();
    }

    // Set up live cloud listener for cross-device sync
    unsubscribeCloud = onSnapshot(ref, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as CloudState;
        // Only apply if metadata says this came from server (not our own write)
        if (snap.metadata.hasPendingWrites) return;
        applyCloudSnapshot(data);
    });

    startListening();
};

const handleSignOut = () => {
    stopListening();
    activeUid = null;
    suppressNextWrite = false;
};

export const initCloudSync = (): void => {
    if (unsubscribeAuth) return;
    if (!firestore) return;

    let lastUid: string | null = useAuthStore.getState().user?.uid ?? null;
    if (lastUid) {
        void handleSignIn(lastUid);
    }

    unsubscribeAuth = useAuthStore.subscribe((state) => {
        const uid = state.user?.uid ?? null;
        if (uid === lastUid) return;
        lastUid = uid;
        if (uid) {
            void handleSignIn(uid);
        } else {
            handleSignOut();
        }
    });
};
