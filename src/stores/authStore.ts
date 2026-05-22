import { create } from 'zustand';
import {
    type User,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithCredential,
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
    signInWithGoogleIdToken: (idToken: string) => Promise<void>;
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
                return 'Invalid email.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Wrong email or password.';
            case 'auth/email-already-in-use':
                return 'This email is already registered.';
            case 'auth/weak-password':
                return 'Password must be at least 6 characters.';
            case 'auth/popup-closed-by-user':
                return 'Sign-in cancelled.';
            case 'auth/popup-blocked':
                return 'Browser blocked the popup. Allow it and try again.';
            case 'auth/network-request-failed':
                return 'Network error. Check your connection.';
            case 'auth/unauthorized-domain':
                return 'This domain is not in Firebase Authorized domains. Add it in the console.';
            case 'auth/web-storage-unsupported':
                return 'Browser is blocking storage (cookies / localStorage). Enable it for this site.';
            case 'auth/operation-not-supported-in-this-environment':
                return 'This sign-in method is not supported in this environment.';
            case 'auth/missing-or-invalid-nonce':
            case 'auth/invalid-oauth-client-id':
            case 'auth/invalid-oauth-provider':
                return `OAuth error: ${code}`;
            case 'auth/credential-already-in-use':
                return 'This Google account is already linked to another user.';
            case 'auth/account-exists-with-different-credential':
                return 'An account with this email already exists with a different sign-in method.';
            default:
                return code || 'Unknown error.';
        }
    }
    return err instanceof Error ? err.message : 'Unknown error.';
};

const REDIRECT_ERROR_KEY = 'questdo_auth_redirect_error';
const REDIRECT_PENDING_KEY = 'questdo_auth_redirect_pending';

const persistError = (msg: string | null) => {
    try {
        if (msg) sessionStorage.setItem(REDIRECT_ERROR_KEY, msg);
        else sessionStorage.removeItem(REDIRECT_ERROR_KEY);
    } catch { /* noop */ }
};

const readPersistedError = (): string | null => {
    try {
        return sessionStorage.getItem(REDIRECT_ERROR_KEY);
    } catch {
        return null;
    }
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

        // Surface any error from the previous redirect attempt that survived the
        // page reload. Cleared once the user actually signs in or explicitly retries.
        const persistedErr = readPersistedError();
        if (persistedErr) {
            console.warn('[auth] surfacing persisted redirect error:', persistedErr);
            set({ error: persistedErr });
        }

        const wasRedirectPending = (() => {
            try { return sessionStorage.getItem(REDIRECT_PENDING_KEY) === '1'; }
            catch { return false; }
        })();

        // Safety net: if Firebase's auth state hydration hangs (known issue on
        // standalone iOS Safari), flip the UI off 'initializing' so the user can
        // at least retry. 6s is enough for a healthy round-trip and short enough
        // not to feel frozen.
        let resolved = false;
        const initTimeout = window.setTimeout(() => {
            if (resolved) return;
            console.warn('[auth] init timed out after 6s; falling back to signed-out');
            set({ status: 'signed-out' });
        }, 6000);

        const finalize = (fbUser: User | null, errMsg?: string | null) => {
            resolved = true;
            window.clearTimeout(initTimeout);
            // Clear the pending-redirect marker now that init has run to completion.
            try { sessionStorage.removeItem(REDIRECT_PENDING_KEY); } catch { /* noop */ }
            const next: Partial<AuthStore> = {
                user: toAuthUser(fbUser),
                status: fbUser ? 'signed-in' : 'signed-out',
            };
            if (errMsg) next.error = errMsg;
            else if (fbUser) {
                // Successful sign-in clears any stale error.
                next.error = null;
                persistError(null);
            }
            set(next);
        };

        console.log('[auth] init starting', {
            wasRedirectPending,
            hasUrlFragment: typeof window !== 'undefined' && window.location.hash.length > 0,
        });

        // Drive the auth flow off getRedirectResult so we know exactly when the
        // post-redirect work is done. onAuthStateChanged will keep firing for
        // subsequent state changes (sign-out, token refresh).
        getRedirectResult(auth)
            .then((cred) => {
                console.log('[auth] getRedirectResult →', cred ? `user ${cred.user.uid}` : 'null (no pending redirect)');
                if (cred) persistError(null);
            })
            .catch((err) => {
                const msg = toErrorMessage(err);
                console.error('[auth] getRedirectResult failed:', err, '→', msg);
                if (msg) {
                    persistError(msg);
                    set({ error: msg });
                }
            });

        unsubscribe = onAuthStateChanged(auth, (fbUser) => {
            console.log('[auth] onAuthStateChanged →', fbUser ? `signed-in (${fbUser.uid})` : 'signed-out');
            finalize(fbUser);
        }, (err) => {
            console.error('[auth] onAuthStateChanged error:', err);
            const msg = toErrorMessage(err);
            persistError(msg);
            finalize(null, msg);
        });
    },

    signInWithGoogle: async () => {
        if (!auth) {
            set({ error: getFirebaseAuthConfigError() ?? 'Auth unavailable' });
            return;
        }
        set({ error: null });
        persistError(null);

        // On touch devices / standalone PWAs, popup-based OAuth fails because Safari
        // blocks cross-origin popups. Use the redirect flow instead.
        const isStandalone = typeof window !== 'undefined' && (
            window.matchMedia?.('(display-mode: standalone)').matches
            || (window.navigator as { standalone?: boolean }).standalone === true
        );
        const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);

        const beginRedirect = () => {
            try { sessionStorage.setItem(REDIRECT_PENDING_KEY, '1'); } catch { /* noop */ }
        };

        if (isStandalone || isMobile) {
            try {
                beginRedirect();
                console.log('[auth] starting signInWithRedirect (mobile/PWA)');
                await signInWithRedirect(auth, googleProvider);
            } catch (err) {
                try { sessionStorage.removeItem(REDIRECT_PENDING_KEY); } catch { /* noop */ }
                const msg = toErrorMessage(err);
                console.error('[auth] signInWithRedirect failed:', err, '→', msg);
                set({ error: msg });
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
                    beginRedirect();
                    await signInWithRedirect(auth, googleProvider);
                    return;
                } catch (redirectErr) {
                    try { sessionStorage.removeItem(REDIRECT_PENDING_KEY); } catch { /* noop */ }
                    set({ error: toErrorMessage(redirectErr) });
                    throw redirectErr;
                }
            }
            set({ error: toErrorMessage(err) });
            throw err;
        }
    },

    // Google Identity Services path — caller passes the ID token returned from
    // accounts.google.com/gsi/client. signInWithCredential is a pure local API
    // call so the cross-origin redirect that breaks iOS Safari never happens.
    signInWithGoogleIdToken: async (idToken: string) => {
        if (!auth) {
            set({ error: getFirebaseAuthConfigError() ?? 'Auth unavailable' });
            return;
        }
        set({ error: null });
        persistError(null);
        try {
            const cred = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, cred);
        } catch (err) {
            const msg = toErrorMessage(err);
            console.error('[auth] signInWithCredential (GIS) failed:', err, '→', msg);
            set({ error: msg });
            throw err;
        }
    },

    signInWithEmail: async (email, password) => {
        if (!auth) {
            set({ error: getFirebaseAuthConfigError() ?? 'Auth unavailable' });
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
            set({ error: getFirebaseAuthConfigError() ?? 'Auth unavailable' });
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
            persistError(null);
        } catch (err) {
            set({ error: toErrorMessage(err) });
            throw err;
        }
    },

    clearError: () => {
        persistError(null);
        set({ error: null });
    },

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
