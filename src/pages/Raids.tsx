import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Plus, Skull, Heart, Users, Loader2, ChevronRight, Copy, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { createRaid, joinRaid, listRaids } from '../lib/raidApi';
import type { Raid } from '../types/raids';

const PENDING_INVITE_KEY = 'pendingRaidInvite';

export function Raids() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const user = useAuthStore((s) => s.user);
    const status = useAuthStore((s) => s.status);

    const [raids, setRaids] = useState<Raid[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);

    // Form state
    const [name, setName] = useState('Boss Raid');
    const [description, setDescription] = useState('');
    const [bossName, setBossName] = useState('Shadow Giant');
    const [bossHp, setBossHp] = useState(50);
    const [joinCode, setJoinCode] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        if (status !== 'signed-in') return;
        let alive = true;
        listRaids()
            .then((rs) => { if (alive) setRaids(rs); })
            .catch((err) => { if (alive) setLoadError(err instanceof Error ? err.message : 'Failed to load'); });
        return () => { alive = false; };
    }, [status]);

    // Auto-fill join code from URL or sessionStorage
    useEffect(() => {
        const fromParams = params.get('join');
        let pending: string | null = null;
        try { pending = window.sessionStorage.getItem(PENDING_INVITE_KEY); } catch { /* noop */ }
        const code = fromParams || pending;
        if (code) {
            setJoinCode(code.trim().toUpperCase());
            setShowJoin(true);
            try { window.sessionStorage.removeItem(PENDING_INVITE_KEY); } catch { /* noop */ }
            if (fromParams) {
                const next = new URLSearchParams(params);
                next.delete('join');
                setParams(next, { replace: true });
            }
        }
    }, [params, setParams]);

    const sortedRaids = useMemo(() => {
        if (!raids) return null;
        return [...raids].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    }, [raids]);

    if (status === 'unavailable') {
        return (
            <div className="page-container">
                <h1 className="text-2xl font-bold mb-4">Raids</h1>
                <div className="glass-card rounded-2xl p-4 text-sm text-[var(--color-text-secondary)]">
                    Accounts and co-op raids are not configured.
                </div>
            </div>
        );
    }

    if (status === 'initializing') {
        return (
            <div className="page-container flex items-center justify-center pt-20">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-secondary)]" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="page-container">
                <h1 className="text-2xl font-bold mb-4">Raids</h1>
                <div className="glass-card rounded-2xl p-5 text-center space-y-3">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        Sign in first to play co-op raids.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-semibold transition"
                        style={{
                            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                            color: 'white',
                        }}
                    >
                        Sign in
                    </Link>
                </div>
            </div>
        );
    }

    const handleCreate = async () => {
        if (creating) return;
        setCreating(true);
        setActionError(null);
        try {
            const raid = await createRaid({
                name: name.trim() || 'Boss Raid',
                description: description.trim(),
                bossName: bossName.trim() || 'Boss',
                bossHp: Math.max(5, Math.floor(bossHp)),
            });
            setRaids((prev) => prev ? [raid, ...prev] : [raid]);
            setShowCreate(false);
            navigate(`/raids/${raid.id}`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to create');
        } finally {
            setCreating(false);
        }
    };

    const handleJoin = async () => {
        if (joining) return;
        const code = joinCode.trim().toUpperCase();
        if (!code) return;
        setJoining(true);
        setActionError(null);
        try {
            const raid = await joinRaid(code);
            setRaids((prev) => {
                const others = (prev ?? []).filter((r) => r.id !== raid.id);
                return [raid, ...others];
            });
            setShowJoin(false);
            navigate(`/raids/${raid.id}`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to join');
        } finally {
            setJoining(false);
        }
    };

    return (
        <div className="page-container">
            <div className="flex items-start justify-between mb-5 animate-rise">
                <div>
                    <p className="section-label mb-1.5">Co-op</p>
                    <h1 className="text-3xl font-black tracking-tight gradient-text leading-none">Raids</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => { setShowJoin(true); setActionError(null); }}
                        className="glass-card rounded-xl px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5"
                    >
                        <Users className="w-4 h-4" /> Join
                    </button>
                    <button
                        type="button"
                        onClick={() => { setShowCreate(true); setActionError(null); }}
                        className="rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: 'white' }}
                    >
                        <Plus className="w-4 h-4" /> New
                    </button>
                </div>
            </div>

            {loadError && (
                <div className="rounded-xl p-3 mb-3 text-sm bg-red-500/10 text-red-300 border border-red-500/20">
                    {loadError}
                </div>
            )}

            {sortedRaids === null && !loadError && (
                <div className="glass-card rounded-2xl p-5 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-secondary)]" />
                    <span className="text-sm text-[var(--color-text-secondary)]">Loading raids...</span>
                </div>
            )}

            {sortedRaids && sortedRaids.length === 0 && (
                <div className="glass-card rounded-2xl p-5 text-center space-y-2">
                    <Swords className="w-10 h-10 mx-auto text-[var(--color-text-tertiary)]" />
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        No raids yet. Create your first one or join with a friend's invite code.
                    </p>
                </div>
            )}

            {sortedRaids && sortedRaids.length > 0 && (
                <div className="space-y-2.5">
                    {sortedRaids.map((raid) => (
                        <RaidCard key={raid.id} raid={raid} />
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showCreate && (
                    <Modal title="Create raid" onClose={() => setShowCreate(false)}>
                        <div className="space-y-3">
                            <FormField label="Raid name">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={60}
                                    className="form-input"
                                />
                            </FormField>
                            <FormField label="Description (optional)">
                                <textarea
                                    rows={2}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    maxLength={240}
                                    className="form-input resize-none"
                                />
                            </FormField>
                            <FormField label="Boss name">
                                <input
                                    type="text"
                                    value={bossName}
                                    onChange={(e) => setBossName(e.target.value)}
                                    maxLength={60}
                                    className="form-input"
                                />
                            </FormField>
                            <FormField label={`Boss HP (${bossHp})`}>
                                <input
                                    type="range"
                                    min={20}
                                    max={500}
                                    step={5}
                                    value={bossHp}
                                    onChange={(e) => setBossHp(Number(e.target.value))}
                                    className="w-full"
                                />
                            </FormField>
                            {actionError && (
                                <div className="rounded-xl p-2.5 text-xs bg-red-500/10 text-red-300 border border-red-500/20">
                                    {actionError}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={creating}
                                className="w-full rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: 'white' }}
                            >
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Create raid
                            </button>
                        </div>
                    </Modal>
                )}

                {showJoin && (
                    <Modal title="Join a raid" onClose={() => setShowJoin(false)}>
                        <div className="space-y-3">
                            <FormField label="Invite code">
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    maxLength={12}
                                    placeholder="ABC123"
                                    className="form-input font-mono tracking-widest text-center"
                                />
                            </FormField>
                            {actionError && (
                                <div className="rounded-xl p-2.5 text-xs bg-red-500/10 text-red-300 border border-red-500/20">
                                    {actionError}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleJoin}
                                disabled={joining || joinCode.length < 4}
                                className="w-full rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: 'white' }}
                            >
                                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                                Join
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
}

function RaidCard({ raid }: { raid: Raid }) {
    const boss = raid.activeBoss;
    const memberCount = raid.memberUids?.length ?? 0;
    const hpPercent = boss ? Math.max(0, Math.min(100, (boss.currentHp / boss.maxHp) * 100)) : 0;

    return (
        <Link
            to={`/raids/${raid.id}`}
            className="glass-card rounded-2xl p-4 block transition hover:opacity-90"
        >
            <div className="flex items-center justify-between mb-2">
                <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{raid.name}</p>
                    {raid.description && (
                        <p className="text-xs text-[var(--color-text-secondary)] truncate">
                            {raid.description}
                        </p>
                    )}
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0 ml-2" />
            </div>
            {boss && (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-semibold">
                            <Skull className="w-3.5 h-3.5" /> {boss.name}
                        </span>
                        <span className="text-[var(--color-text-secondary)] flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {boss.currentHp}/{boss.maxHp}
                        </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--color-surface)]">
                        <div
                            className="h-full transition-all"
                            style={{
                                width: `${hpPercent}%`,
                                background: 'linear-gradient(90deg, #ef4444, #f97316)',
                            }}
                        />
                    </div>
                </div>
            )}
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)]">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{memberCount}</span>
                <span>{raid.bossesDefeated} defeated</span>
                <span className="font-mono">{raid.inviteCode}</span>
            </div>
        </Link>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card w-full max-w-md rounded-3xl p-5 space-y-4"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                {children}
            </motion.div>
        </motion.div>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="section-label">
                {label}
            </label>
            {children}
        </div>
    );
}

// Helper class to keep CSS minimal in JSX
const _styleInject = typeof document !== 'undefined' ? (() => {
    if (document.getElementById('raid-form-styles')) return;
    const el = document.createElement('style');
    el.id = 'raid-form-styles';
    el.textContent = `.form-input { width: 100%; border-radius: 0.75rem; background: var(--color-surface); border: 1px solid var(--color-border); padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
.form-input:focus { border-color: var(--color-primary); }`;
    document.head.appendChild(el);
})() : null;

void _styleInject;
void Copy;
