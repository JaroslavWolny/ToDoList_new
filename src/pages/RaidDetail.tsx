import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Skull, Heart, Copy, Check, Users, Crown, Loader2, Swords, Trophy, Trash2, Coins } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { deleteRaid, getRaid } from '../lib/raidApi';
import { computeLoot, invalidateRaidCache } from '../lib/raidDamage';
import type { DamageEvent, Raid, RaidMember } from '../types/raids';

export function RaidDetail() {
    const { raidId } = useParams<{ raidId: string }>();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const status = useAuthStore((s) => s.status);

    const [raid, setRaid] = useState<Raid | null>(null);
    const [events, setEvents] = useState<DamageEvent[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchRaid = useCallback(async () => {
        if (!raidId) return;
        try {
            const data = await getRaid(raidId);
            setRaid(data.raid);
            setEvents(data.events);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [raidId]);

    useEffect(() => {
        if (status !== 'signed-in') return;
        fetchRaid();
        const id = window.setInterval(fetchRaid, 8000);
        return () => window.clearInterval(id);
    }, [fetchRaid, status]);

    if (!user && status !== 'initializing') {
        return (
            <div className="page-container">
                <BackLink />
                <div className="card-surface rounded-2xl p-5 text-center">
                    <p className="text-sm mb-3">Sign in to view this raid.</p>
                    <Link to="/login" className="text-sm font-semibold underline">Sign in</Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center pt-20">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-secondary)]" />
            </div>
        );
    }

    if (error || !raid) {
        return (
            <div className="page-container">
                <BackLink />
                <div className="rounded-xl p-4 text-sm bg-red-500/10 text-red-300 border border-red-500/20">
                    {error ?? 'Raid not found'}
                </div>
            </div>
        );
    }

    const boss = raid.activeBoss;
    const members = Object.values(raid.members ?? {}) as RaidMember[];
    const sortedMembers = [...members].sort((a, b) => (b.totalDamage ?? 0) - (a.totalDamage ?? 0));
    const isOwner = raid.ownerUid === user?.uid;
    const hpPercent = boss ? Math.max(0, Math.min(100, (boss.currentHp / boss.maxHp) * 100)) : 0;

    const handleCopy = async () => {
        const url = `${window.location.origin}/join/${raid.inviteCode}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            // fallback - just select the code
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this raid for everyone? The boss and all damage history will be permanently removed. This cannot be undone.')) return;
        setDeleting(true);
        try {
            await deleteRaid(raid.id);
            invalidateRaidCache();
            navigate('/raids');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
            setDeleting(false);
        }
    };

    return (
        <div className="page-container">
            <BackLink />

            <div className="card-surface rounded-2xl p-4 mb-4">
                <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold truncate">{raid.name}</h1>
                        {raid.description && (
                            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                {raid.description}
                            </p>
                        )}
                    </div>
                    {isOwner && (
                        <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-amber-500/15 text-amber-300 flex items-center gap-1">
                            <Crown className="w-3 h-3" /> Owner
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="w-full mt-2 flex items-center justify-between rounded-xl px-3 py-2 text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)]"
                >
                    <span className="text-[var(--color-text-secondary)] normal-case">
                        Invite: <span className="font-bold tracking-widest">{raid.inviteCode}</span>
                    </span>
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            </div>

            {boss ? (
                <div className="card-surface rounded-2xl p-5 mb-4 text-center space-y-3">
                    <div className="flex items-center justify-center gap-2">
                        <Skull className="w-6 h-6 text-red-400" />
                        <h2 className="text-xl font-bold">{boss.name}</h2>
                    </div>
                    <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider">
                        Tier {boss.tier}
                    </p>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-center gap-1.5 text-sm font-bold">
                            <Heart className="w-4 h-4 text-red-400" />
                            {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()} HP
                        </div>
                        <div className="w-full h-3 rounded-full overflow-hidden bg-[var(--color-surface)]">
                            <motion.div
                                animate={{ width: `${hpPercent}%` }}
                                transition={{ type: 'spring', damping: 25 }}
                                className="h-full"
                                style={{ background: 'linear-gradient(90deg, #ef4444, #f97316)' }}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                        Damage: LOW=1, MEDIUM=3, HIGH=5, CRITICAL=8 · Quest x2
                    </p>
                    <div className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 bg-amber-500/10 border border-amber-500/20">
                        <Coins className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                        <span className="text-xs font-semibold text-amber-200">
                            Killing blow drops ~{computeLoot(boss.tier).coins} coins + {computeLoot(boss.tier).xp} XP — land the last hit to claim it
                        </span>
                    </div>
                </div>
            ) : (
                <div className="card-surface rounded-2xl p-5 mb-4 text-center">
                    <Trophy className="w-10 h-10 mx-auto mb-2 text-amber-400" />
                    <p className="text-sm font-semibold">No active boss</p>
                </div>
            )}

            <Section title={`Members (${members.length})`}>
                <div className="space-y-1.5">
                    {sortedMembers.map((m, idx) => (
                        <div key={m.uid} className="card-surface rounded-xl p-2.5 flex items-center gap-3">
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                style={{
                                    background: idx === 0
                                        ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                                        : 'var(--color-surface)',
                                    color: idx === 0 ? '#000' : undefined,
                                }}
                            >
                                {idx + 1}
                            </div>
                            {m.photoURL ? (
                                <img src={m.photoURL} alt={m.displayName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                                    {m.displayName}
                                    {m.uid === raid.ownerUid && <Crown className="w-3 h-3 text-amber-400" />}
                                    {m.uid === user?.uid && <span className="text-[10px] text-[var(--color-text-tertiary)]">(you)</span>}
                                </p>
                            </div>
                            <div className="text-sm font-bold flex items-center gap-1 text-[var(--color-accent)] flex-shrink-0">
                                <Swords className="w-3.5 h-3.5" /> {m.totalDamage ?? 0}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Last 50 hits">
                {events.length === 0 ? (
                    <div className="card-surface rounded-xl p-4 text-center text-xs text-[var(--color-text-secondary)]">
                        No damage yet. Complete a task and you'll see it here.
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {events.map((ev) => (
                            <div key={ev.id} className="card-surface rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs">
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold truncate">
                                        {ev.actorName} · <span className="text-[var(--color-text-secondary)]">{ev.taskTitle}</span>
                                    </p>
                                    <p className="text-[10px] text-[var(--color-text-tertiary)]">
                                        {new Date(ev.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <span className="font-bold text-red-400 flex items-center gap-1 flex-shrink-0">
                                    -{ev.amount}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {isOwner && (
                <Section title="Management">
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="w-full rounded-xl py-2.5 px-4 text-sm font-semibold bg-red-500/10 text-red-300 border border-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {deleting ? 'Deleting...' : 'Delete raid'}
                    </button>
                    <p className="text-[11px] text-[var(--color-text-tertiary)] mt-2 text-center">
                        Permanently removes the boss and damage history for all members.
                    </p>
                </Section>
            )}
        </div>
    );
}

function BackLink() {
    return (
        <Link to="/raids" className="inline-flex items-center gap-1 mb-3 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
            <ArrowLeft className="w-4 h-4" /> Back
        </Link>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                {title}
            </h3>
            {children}
        </div>
    );
}

void Users;
