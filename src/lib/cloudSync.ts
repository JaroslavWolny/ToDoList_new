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
// Records which account this device has already reconciled with. Once a device
// has bound to an account, reopening the app is a session *restore* (local data
// is the already-synced copy), not a fresh sign-in — so we must not re-prompt
// the migration conflict dialog on every launch.
const SYNCED_UID_KEY = 'todolist:syncedUid';

const getSyncedUid = (): string | null => {
    try { return window.localStorage.getItem(SYNCED_UID_KEY); } catch { return null; }
};

const setSyncedUid = (uid: string): void => {
    try { window.localStorage.setItem(SYNCED_UID_KEY, uid); } catch { /* noop */ }
};

let unsubscribeAuth: (() => void) | null = null;
let unsubscribeTask: (() => void) | null = null;
let unsubscribeUser: (() => void) | null = null;
let unsubscribeCloud: (() => void) | null = null;
let debounceTimer: number | null = null;
let activeUid: string | null = null;
let hydrating = false;
let suppressNextWrite = false;
// Server time (ms) of the most recent cloud snapshot we have applied or written.
// Used for last-write-wins: we never let an older snapshot overwrite state we
// already hold, and we never re-apply our own echoed write.
let lastSyncedAtMs = 0;

// Firestore stamps `updatedAt` with serverTimestamp(); read back it is a
// Timestamp. Returns null when the value isn't a resolved server timestamp yet.
const timestampToMillis = (value: unknown): number | null => {
    if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
        try {
            return (value as { toMillis: () => number }).toMillis();
        } catch {
            return null;
        }
    }
    return null;
};

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
    // Must round-trip via cloud so that signing in on a fresh device after
    // onboarding doesn't dump the user back into the onboarding wizard
    // (which previously masqueraded as "Google sign-in didn't work" since
    // the dashboard never appeared).
    onboardingComplete: state.onboardingComplete,
    settings: state.settings,
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
        // A cloud snapshot can carry recurring quests that were completed on an
        // earlier day or on another device. The app's one-shot daily maintenance
        // (App.tsx) already ran before this async snapshot landed, so without
        // re-running the reset here those quests stay COMPLETED and silently drop
        // off "Today's Quests" — which is exactly why daily quests never loaded.
        // Re-running it while `hydrating` is true reactivates them for today
        // without scheduling a redundant write back to the cloud.
        useTaskStore.getState().resetRecurringTasks();
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
        if (snap.exists()) {
            cloud = snap.data() as CloudState;
            // Seed the LWW baseline so the live listener can tell genuinely newer
            // remote writes apart from this initial copy / our own echoes.
            lastSyncedAtMs = timestampToMillis(cloud.updatedAt) ?? 0;
        }
    } catch (err) {
        console.warn('Cloud sync read failed:', err);
    }

    const localTasks = useTaskStore.getState().tasks;
    const cloudHasTaskData = !!cloud && ((cloud.tasks?.length ?? 0) > 0 || (cloud.completions?.length ?? 0) > 0);
    const cloudHasUserData = !!cloud && !!cloud.user && Object.keys(cloud.user).length > 0;
    const localHasData = localTasks.length > 0;
    // A device that has already reconciled with this account is just restoring a
    // session on relaunch — the live snapshot listener keeps both sides in sync,
    // so the conflict prompt would be a false alarm on every launch.
    const alreadyBoundToThisAccount = getSyncedUid() === uid;

    if (cloudHasTaskData && localHasData && !alreadyBoundToThisAccount) {
        // Genuine first-time conflict on this device: ask the user.
        await new Promise<void>((resolve) => {
            const prompt: MigrationPrompt = {
                cloudHasData: cloudHasTaskData,
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
                    setSyncedUid(uid);
                    resolve();
                },
            };
            migrationPromptListener?.(prompt);
            try { window.sessionStorage.setItem(PENDING_MIGRATION_KEY, '1'); } catch { /* noop */ }
        });
        try { window.sessionStorage.removeItem(PENDING_MIGRATION_KEY); } catch { /* noop */ }
    } else if (cloudHasTaskData && cloud) {
        // Either no local data, or a recognized device restoring its session:
        // adopt the canonical cloud copy silently (the live listener will keep
        // it fresh from here on).
        applyCloudSnapshot(cloud);
        suppressNextWrite = true;
        setSyncedUid(uid);
    } else if (cloudHasUserData && cloud) {
        // Returning user signing in on a fresh device: they may have no
        // tasks yet but already finished onboarding elsewhere. Pull the
        // user snapshot so onboardingComplete / settings / level carry over
        // and we don't dump them back into the onboarding wizard.
        applyCloudSnapshot({ ...cloud, tasks: [], completions: [] });
        suppressNextWrite = true;
        if (localHasData) {
            // We still need to push the local tasks up so they aren't lost.
            await writeNow();
        }
        setSyncedUid(uid);
    } else if (localHasData) {
        // First-time login with only local data — push to cloud silently
        await writeNow();
        setSyncedUid(uid);
    } else {
        // Empty on both sides (e.g. brand-new account): still bind the device so
        // the first real data on either side never triggers the conflict prompt.
        setSyncedUid(uid);
    }

    // Set up live cloud listener for cross-device sync
    unsubscribeCloud = onSnapshot(ref, (snap) => {
        if (!snap.exists()) return;
        // Skip our own optimistic write echo (still has a local pending write).
        if (snap.metadata.hasPendingWrites) return;

        const data = snap.data() as CloudState;
        const incomingMs = timestampToMillis(data.updatedAt);

        // Last-write-wins safety: a pending local edit (debounce armed) is the most
        // recent user action and is about to be written, so never let an incoming
        // snapshot clobber it — our write will go out and win as the later write.
        if (debounceTimer !== null) return;

        // Drop stale or duplicate snapshots: anything not strictly newer than what
        // we already hold would only roll state backwards (or re-apply our echo).
        if (incomingMs !== null && incomingMs <= lastSyncedAtMs) return;

        applyCloudSnapshot(data);
        if (incomingMs !== null) lastSyncedAtMs = incomingMs;
    });

    startListening();
};

const handleSignOut = () => {
    stopListening();
    activeUid = null;
    suppressNextWrite = false;
    lastSyncedAtMs = 0;
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
