import { useState } from 'react';
import { Check, Clock, Zap, Repeat, Hash } from 'lucide-react';
import type { ParsedQuest } from '../../lib/brainDumpApi';
import { formatDeadlineChip } from '../../lib/quickParse';

const priorityChipClass = (p: ParsedQuest['priority']): string =>
    p === 'CRITICAL'
        ? 'bg-red-500/12 border-red-500/30 text-red-400'
        : p === 'HIGH'
        ? 'bg-orange-500/12 border-orange-500/30 text-orange-400'
        : p === 'LOW'
        ? 'bg-slate-500/12 border-slate-500/30 text-slate-400'
        : 'bg-amber-500/12 border-amber-500/30 text-amber-400';

interface QuestPreviewListProps {
    quests: ParsedQuest[];
    onAdd: (selected: ParsedQuest[]) => void;
    addLabel?: string;
    busy?: boolean;
}

export function QuestPreviewList({ quests, onAdd, addLabel = 'Add quests', busy }: QuestPreviewListProps) {
    const [excluded, setExcluded] = useState<Set<number>>(new Set());

    // Reset selection whenever a fresh set of quests arrives (render-time
    // adjustment — the React-recommended alternative to a reset effect).
    const [prevQuests, setPrevQuests] = useState(quests);
    if (prevQuests !== quests) {
        setPrevQuests(quests);
        setExcluded(new Set());
    }

    const toggle = (i: number) =>
        setExcluded((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });

    const selected = quests.filter((_, i) => !excluded.has(i));

    return (
        <div>
            <div className="space-y-2">
                {quests.map((q, i) => {
                    const on = !excluded.has(i);
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => toggle(i)}
                            className={`w-full text-left glass-card px-3 py-2.5 flex items-start gap-2.5 transition-opacity ${on ? '' : 'opacity-45'}`}
                        >
                            <span
                                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                    on ? 'bg-cyan-500 border-cyan-500' : 'border-[var(--color-border)]'
                                }`}
                            >
                                {on && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold leading-tight break-words">{q.title}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {q.priority !== 'MEDIUM' && (
                                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${priorityChipClass(q.priority)}`}>
                                            <Zap className="w-2.5 h-2.5" strokeWidth={3} />
                                            {q.priority.toLowerCase()}
                                        </span>
                                    )}
                                    {q.deadline && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-cyan-500/12 border-cyan-500/30 text-cyan-400">
                                            <Clock className="w-2.5 h-2.5" strokeWidth={3} />
                                            {formatDeadlineChip(q.deadline)}
                                        </span>
                                    )}
                                    {q.recurrence !== 'NONE' && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-blue-500/12 border-blue-500/30 text-blue-400">
                                            <Repeat className="w-2.5 h-2.5" strokeWidth={3} />
                                            {q.recurrence.toLowerCase()}
                                        </span>
                                    )}
                                    {q.tags.map((t) => (
                                        <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-white/5 border-[var(--color-border)] text-[var(--color-text-secondary)]">
                                            <Hash className="w-2.5 h-2.5" strokeWidth={3} />
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                disabled={selected.length === 0 || busy}
                onClick={() => onAdd(selected)}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold text-white fab-primary disabled:opacity-40"
            >
                {busy ? 'Adding…' : `${addLabel} (${selected.length})`}
            </button>
        </div>
    );
}
