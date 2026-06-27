import { useState, FormEvent, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { auth } from '../lib/firebase';
import { Loader2, LogIn, UserPlus } from 'lucide-react';

type Mode = 'sign-in' | 'sign-up';

// Google Identity Services library — loaded once per page.
declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: { credential: string }) => void;
                        ux_mode?: 'popup' | 'redirect';
                        auto_select?: boolean;
                        use_fedcm_for_prompt?: boolean;
                    }) => void;
                    renderButton: (
                        parent: HTMLElement,
                        options: Record<string, unknown>,
                    ) => void;
                    prompt: () => void;
                };
            };
        };
    }
}

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GIS_SCRIPT_ID = 'gsi-client-script';

const loadGisScript = (): Promise<void> => new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
        resolve();
        return;
    }
    const existing = document.getElementById(GIS_SCRIPT_ID);
    if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('GIS load failed')), { once: true });
        return;
    }
    const script = document.createElement('script');
    script.id = GIS_SCRIPT_ID;
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('GIS load failed'));
    document.head.appendChild(script);
});

export function Login() {
    const { user, status, error, configError, signInWithGoogle, signInWithGoogleIdToken, signInWithEmail, signUpWithEmail, clearError } =
        useAuthStore();

    const [mode, setMode] = useState<Mode>('sign-in');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [busy, setBusy] = useState(false);

    const gisButtonRef = useRef<HTMLDivElement | null>(null);
    const [gisReady, setGisReady] = useState(false);
    const gisClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined;

    const debug = typeof window !== 'undefined' && /[?&]auth-debug=1\b/.test(window.location.search);
    const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);

    // Boot Google Identity Services: ID-token-based sign-in avoids
    // signInWithRedirect entirely, which is the only flow that survives iOS
    // Safari ITP without an OAuth-redirect-URI registration. Falls back to
    // the legacy popup/redirect button if the script can't load or the env
    // var is missing.
    useEffect(() => {
        if (!gisClientId) return;
        if (configError) return;
        if (status === 'signed-in') return;
        let cancelled = false;
        loadGisScript()
            .then(() => {
                if (cancelled) return;
                if (!window.google?.accounts?.id) return;
                window.google.accounts.id.initialize({
                    client_id: gisClientId,
                    callback: async (response) => {
                        if (!response.credential) return;
                        try {
                            setBusy(true);
                            await signInWithGoogleIdToken(response.credential);
                        } catch {
                            // surfaced via store error state
                        } finally {
                            setBusy(false);
                        }
                    },
                    ux_mode: 'popup',
                    auto_select: false,
                    use_fedcm_for_prompt: true,
                });
                if (gisButtonRef.current) {
                    gisButtonRef.current.innerHTML = '';
                    window.google.accounts.id.renderButton(gisButtonRef.current, {
                        type: 'standard',
                        theme: 'outline',
                        size: 'large',
                        text: 'continue_with',
                        shape: 'pill',
                        logo_alignment: 'center',
                        width: gisButtonRef.current.clientWidth || 320,
                    });
                }
                setGisReady(true);
            })
            .catch((err) => {
                console.warn('[auth] GIS load failed, falling back to popup/redirect:', err);
            });
        return () => { cancelled = true; };
    }, [gisClientId, configError, status, signInWithGoogleIdToken]);

    useEffect(() => {
        if (!debug) return;
        const compute = () => {
            let pending: string | null = null;
            let persistedErr: string | null = null;
            try { pending = sessionStorage.getItem('questdo_auth_redirect_pending'); } catch { /* noop */ }
            try { persistedErr = sessionStorage.getItem('questdo_auth_redirect_error'); } catch { /* noop */ }
            setDebugInfo({
                status,
                hasUser: !!user,
                currentUserUid: auth?.currentUser?.uid ?? null,
                authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ?? null,
                origin: window.location.origin,
                pathname: window.location.pathname,
                hashLen: window.location.hash.length,
                hashHead: window.location.hash.slice(0, 60),
                redirectPending: pending,
                persistedErr,
                isStandalone: window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as { standalone?: boolean }).standalone === true,
                ua: window.navigator.userAgent.slice(0, 100),
            });
        };
        compute();
        const id = window.setInterval(compute, 1000);
        return () => window.clearInterval(id);
    }, [debug, status, user]);

    if (status === 'signed-in' && user) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
            if (mode === 'sign-in') {
                await signInWithEmail(email.trim(), password);
            } else {
                await signUpWithEmail(email.trim(), password, displayName.trim() || undefined);
            }
        } catch {
            // error handled by store
        } finally {
            setBusy(false);
        }
    };

    const handleGoogle = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await signInWithGoogle();
        } catch {
            // handled
        } finally {
            setBusy(false);
        }
    };

    const switchMode = (next: Mode) => {
        clearError();
        setMode(next);
    };

    return (
        <div className="page-container min-h-screen flex items-center justify-center px-4 py-8">
            <div className="glass-card w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-6 animate-rise">
                <div className="space-y-2 text-center">
                    <p className="text-[11px] uppercase tracking-[0.22em] font-black gradient-text">⚔️ QuestDo</p>
                    <h1 className="text-3xl font-black tracking-tight">
                        {mode === 'sign-in' ? 'Welcome back' : 'Create account'}
                    </h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        {mode === 'sign-in'
                            ? 'Sign in to take down bosses with your friends'
                            : 'Sign up and start playing with your friends'}
                    </p>
                </div>

                {configError && (
                    <div className="rounded-xl p-3 text-sm bg-red-500/10 text-red-300 border border-red-500/20">
                        {configError}
                    </div>
                )}

                {error && (
                    <div className="rounded-xl p-3 text-sm bg-red-500/10 text-red-300 border border-red-500/20 space-y-2">
                        <div className="font-semibold">Sign-in failed</div>
                        <div className="break-words">{error}</div>
                        <button
                            type="button"
                            onClick={clearError}
                            className="text-xs underline opacity-80"
                        >
                            Hide error
                        </button>
                    </div>
                )}

                {debug && debugInfo && (
                    <pre className="rounded-xl p-3 text-[10px] leading-tight bg-black/40 border border-white/10 text-white/80 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                )}

                {gisClientId ? (
                    <div className="space-y-2">
                        <div
                            ref={gisButtonRef}
                            className="w-full flex justify-center min-h-[44px] [&>div]:!w-full"
                            aria-busy={busy || !gisReady}
                        />
                        {!gisReady && (
                            <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading Google…
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleGoogle}
                        disabled={busy || !!configError}
                        className="w-full flex items-center justify-center gap-3 rounded-xl py-3 px-4 font-semibold transition disabled:opacity-50"
                        style={{
                            background: 'white',
                            color: '#1f1f1f',
                        }}
                    >
                        {busy ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.3 0-11.5-5.1-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.5 1.1 7.5 2.9l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
                                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.5 1.1 7.5 2.9l5.7-5.7C33.6 6.5 29 4.5 24 4.5 16.5 4.5 10 8.7 6.3 14.7z" />
                                <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-5.1c-1.9 1.3-4.3 2.1-6.9 2.1-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C9.5 39.2 16.2 43.5 24 43.5z" />
                                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6 5.1C40 35.9 43.5 30.4 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
                            </svg>
                        )}
                        Continue with Google
                    </button>
                )}

                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                    <span className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide">or</span>
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'sign-up' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                                Nickname
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                                placeholder="Hero"
                                autoComplete="nickname"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                            placeholder="you@example.com"
                            autoComplete="email"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                            placeholder="Min. 6 characters"
                            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                        />
                    </div>


                    <button
                        type="submit"
                        disabled={busy || !!configError}
                        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 font-semibold transition disabled:opacity-50"
                        style={{
                            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                            color: 'white',
                        }}
                    >
                        {busy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : mode === 'sign-in' ? (
                            <LogIn className="w-4 h-4" />
                        ) : (
                            <UserPlus className="w-4 h-4" />
                        )}
                        {mode === 'sign-in' ? 'Sign in' : 'Sign up'}
                    </button>
                </form>

                <div className="text-center text-sm text-[var(--color-text-secondary)]">
                    {mode === 'sign-in' ? (
                        <>
                            Don&apos;t have an account?{' '}
                            <button
                                type="button"
                                onClick={() => switchMode('sign-up')}
                                className="font-semibold text-[var(--color-primary)] hover:underline"
                            >
                                Create one
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <button
                                type="button"
                                onClick={() => switchMode('sign-in')}
                                className="font-semibold text-[var(--color-primary)] hover:underline"
                            >
                                Sign in
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
