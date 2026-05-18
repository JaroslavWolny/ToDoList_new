import { create } from 'zustand';
import {
    type User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut as fbSignOut,
    updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, getFirebaseAuthConfigError } from '../lib/firebase';

export type AuthUser = {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
};

type AuthStatus = 'initializing' | 'signed-in' | 'signed-out' | 'unavailable';

interface AuthStore {
    user: AuthUser | null;
    status: AuthStatus;
    error: string | null;
    configError: string | null;
    init: () => void;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
    signOut: () => Promise<void>;
    clearError: () => void;
    getIdToken: () => Promise<string | null>;
}

const toAuthUser = (user: User | null): AuthUser | null => {
    if (!user) return null;
    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
    };
};

const toErrorMessage = (err: unknown): string => {
    if (err && typeof err === 'object' && 'code' in err) {
        const code = String((err as { code?: unknown }).code ?? '');
        switch (code) {
            case 'auth/invalid-email':
                return 'Neplatný email.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Špatný email nebo heslo.';
            case 'auth/email-already-in-use':
                return 'Tento email je už registrovaný.';
            case 'auth/weak-password':
                return 'Heslo musí mít aspoň 6 znaků.';
            case 'auth/popup-closed-by-user':
                return 'Přihlášení zrušeno.';
            case 'auth/popup-blocked':
                return 'Prohlížeč zablokoval popup. Povolte ho a zkuste to znovu.';
            case 'auth/network-request-failed':
                return 'Síťová chyba. Zkontrolujte připojení.';
            default:
                return code || 'Neznámá chyba.';
        }
    }
    return err instanceof Error ? err.message : 'Neznámá chyba.';
};

let unsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
    user: null,
    status: 'initializing',
    error: null,
    configError: null,

    init: () => {
        if (unsubscribe) return;

        const configError = getFirebaseAuthConfigError();
        if (configError || !auth) {
            set({ status: 'unavailable', configError });
            return;
        }

        // Handle return from signInWithRedirect (mobile / standalone PWA flow)
        getRedirectResult(auth).catch((err) => {
            const msg = toErrorMessage(err);
            if (msg) set({ error: msg });
        });

        unsubscribe = onAuthStateChanged(auth, (fbUser) => {
            set({
                user: toAuthUser(fbUser),
                status: fbUser ? 'signed-in' : 'signed-out',
                error: null,
            });
        });
    },

    signInWithGoogle: async () => {
        if (!auth) {
            set({ error: getFirebaseAuthConfigError() ?? 'Auth nedostupný' });
            return;
        }
        set({ error: null });

        // On touch devices / standalone PWAs, popup-based OAuth fails because Safari
        // blocks cross-origin popups. Use the redirect flow instead.
        const isStandalone = typeof window !== 'undefined' && (
            window.matchMedia?.('(display-mode: standalone)').matches
            || (window.navigator as { standalone?: boolean }).standalone === true
        );
        const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);

        if (isStandalone || isMobile) {
            try {
                await signInWithRedirect(auth, googleProvider);
            } catch (err) {
                set({ error: toErrorMessage(err) });
                throw err;
            }
            return;
        }

        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            // Fall back to redirect if popup is blocked
            const code = (err as { code?: string })?.code;
            if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
                try {
                    await signInWithRedirect(auth, googleProvider);
                    return;
                } catch (redirectErr) {
                    set({ error: toErrorMessage(redirectErr) });
                    throw redirectErr;
                }
            }
            set({ error: toErrorMessage(err) });
            throw err;
        }
    },

    signInWithEmail: async (email, password) => {
        if (!auth) {
            set({ error: getFirebaseAuthConfigError() ?? 'Auth nedostupný' });
            return;
        }
        try {
            set({ error: null });
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            set({ error: toErrorMessage(err) });
            throw err;
        }
    },

    signUpWithEmail: async (email, password, displayName) => {
        if (!auth) {
            set({ error: getFirebaseAuthConfigError() ?? 'Auth nedostupný' });
            return;
        }
        try {
            set({ error: null });
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            if (displayName && cred.user) {
                await updateProfile(cred.user, { displayName });
                set((state) => ({
                    user: state.user ? { ...state.user, displayName } : state.user,
                }));
            }
        } catch (err) {
            set({ error: toErrorMessage(err) });
            throw err;
        }
    },

    signOut: async () => {
        if (!auth) return;
        try {
            await fbSignOut(auth);
        } catch (err) {
            set({ error: toErrorMessage(err) });
            throw err;
        }
    },

    clearError: () => set({ error: null }),

    getIdToken: async () => {
        if (!auth?.currentUser) return null;
        try {
            return await auth.currentUser.getIdToken();
        } catch {
            return null;
        }
    },
}));

export const authFetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
    const token = await useAuthStore.getState().getIdToken();
    const headers = new Headers(init.headers ?? {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    return fetch(input, { ...init, headers });
};
