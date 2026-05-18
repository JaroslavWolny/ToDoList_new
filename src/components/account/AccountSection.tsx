import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, LogOut, User, Swords, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export function AccountSection() {
    const { user, status, configError, signOut } = useAuthStore();
    const [busy, setBusy] = useState(false);

    if (status === 'initializing') {
        return (
            <div className="card-surface rounded-2xl p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-secondary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Načítám...</span>
            </div>
        );
    }

    if (status === 'unavailable') {
        return (
            <div className="card-surface rounded-2xl p-4">
                <p className="text-sm text-[var(--color-text-secondary)]">
                    Účty a co-op raidy nejsou nakonfigurovány.
                </p>
                {configError && (
                    <p className="text-xs text-red-400 mt-1">{configError}</p>
                )}
            </div>
        );
    }

    if (!user) {
        return (
            <div className="card-surface rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--color-surface)' }}
                    >
                        <User className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">Host</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            Přihlas se a ničte se přáteli bosse
                        </p>
                    </div>
                </div>
                <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-semibold transition"
                    style={{
                        background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                        color: 'white',
                    }}
                >
                    <LogIn className="w-4 h-4" />
                    Přihlásit / Registrovat
                </Link>
            </div>
        );
    }

    const handleSignOut = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await signOut();
        } finally {
            setBusy(false);
        }
    };

    const initials = (user.displayName || user.email || '?')
        .split(/[\s@]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() ?? '')
        .join('') || '?';

    return (
        <div className="card-surface rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
                {user.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt={user.displayName ?? user.email ?? 'user'}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                ) : (
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
                    >
                        {initials}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                        {user.displayName || user.email || 'Hero'}
                    </p>
                    {user.displayName && user.email && (
                        <p className="text-xs text-[var(--color-text-secondary)] truncate">
                            {user.email}
                        </p>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <Link
                    to="/raids"
                    className="flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-sm font-semibold transition card-surface hover:opacity-80"
                >
                    <Swords className="w-4 h-4" />
                    Raidy
                </Link>
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSignOut}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-sm font-semibold transition card-surface hover:opacity-80 disabled:opacity-50"
                >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Odhlásit
                </motion.button>
            </div>
        </div>
    );
}
