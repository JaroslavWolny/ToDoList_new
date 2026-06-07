import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { X, Brain, Sparkles, Mic, ArrowLeft } from 'lucide-react';
import { parseBrainDump, addQuests, type ParsedQuest } from '../../lib/brainDumpApi';
import { QuestPreviewList } from './QuestPreviewList';

/* ── Minimal Web Speech typing (feature-detected; absent on iOS Safari) ── */
type SREvent = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognitionLike = {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    start: () => void;
    stop: () => void;
    onresult: ((e: SREvent) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
};
const getSpeechRecognition = (): (new () => SpeechRecognitionLike) | null => {
    const w = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

interface BrainDumpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BrainDumpModal = memo(function BrainDumpModal({ isOpen, onClose }: BrainDumpModalProps) {
    const dragControls = useDragControls();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [quests, setQuests] = useState<ParsedQuest[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [addedCount, setAddedCount] = useState(0);
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const voiceSupported = useRef(!!getSpeechRecognition()).current;

    // Start each open from a clean preview/success state (render-time reset).
    const [wasOpen, setWasOpen] = useState(isOpen);
    if (isOpen !== wasOpen) {
        setWasOpen(isOpen);
        if (isOpen) {
            setQuests(null);
            setError(null);
            setAddedCount(0);
        }
    }

    useEffect(() => {
        if (isOpen) document.body.classList.add('modal-scroll-lock');
        else document.body.classList.remove('modal-scroll-lock');
        return () => document.body.classList.remove('modal-scroll-lock');
    }, [isOpen]);

    const stopListening = useCallback(() => {
        try { recognitionRef.current?.stop(); } catch { /* noop */ }
        recognitionRef.current = null;
        setListening(false);
    }, []);

    const toggleVoice = useCallback(() => {
        if (listening) {
            stopListening();
            return;
        }
        const SR = getSpeechRecognition();
        if (!SR) return;
        try {
            const rec = new SR();
            rec.lang = navigator.language || 'en-US';
            rec.interimResults = false;
            rec.continuous = false;
            rec.onresult = (e: SREvent) => {
                let chunk = '';
                for (let i = e.resultIndex; i < e.results.length; i += 1) {
                    chunk += e.results[i][0].transcript;
                }
                const clean = chunk.trim();
                if (clean) setText((prev) => (prev ? `${prev}\n${clean}` : clean));
            };
            rec.onend = () => setListening(false);
            rec.onerror = () => setListening(false);
            recognitionRef.current = rec;
            rec.start();
            setListening(true);
        } catch {
            setListening(false);
        }
    }, [listening, stopListening]);

    useEffect(() => () => stopListening(), [stopListening]);

    const handleParse = useCallback(async () => {
        const raw = text.trim();
        if (!raw || loading) return;
        stopListening();
        setError(null);
        setLoading(true);
        try {
            const result = await parseBrainDump(raw);
            if (result.length === 0) {
                setError("Couldn't find any quests in that. Try adding a bit more detail.");
            } else {
                setQuests(result);
            }
        } catch {
            setError('Something went wrong. Try again.');
        } finally {
            setLoading(false);
        }
    }, [text, loading, stopListening]);

    const handleAdd = useCallback((selected: ParsedQuest[]) => {
        const n = addQuests(selected);
        setAddedCount(n);
        try { navigator.vibrate?.(12); } catch { /* noop */ }
        window.setTimeout(() => {
            setText('');
            onClose();
        }, 850);
    }, [onClose]);

    const handleDragEnd = useCallback(
        (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (info.offset.y > 120 || info.velocity.y > 500) onClose();
        },
        [onClose]
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        drag="y"
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.6 }}
                        onDragEnd={handleDragEnd}
                        className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] flex flex-col rounded-t-3xl overflow-hidden"
                        style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}
                    >
                        <div
                            onPointerDown={(e) => dragControls.start(e)}
                            className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0 touch-none"
                        >
                            <div className="w-10 h-1.5 rounded-full bg-[var(--color-text-secondary)] opacity-30" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
                            <div className="flex items-center gap-2">
                                {quests && (
                                    <button onClick={() => setQuests(null)} className="p-1.5 -ml-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-white/5" aria-label="Back to edit">
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                )}
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30">
                                    <Brain className="w-4 h-4 text-violet-400" strokeWidth={2.4} />
                                </div>
                                <div className="leading-tight">
                                    <h2 className="text-base font-bold">Brain Dump</h2>
                                    <p className="text-[10px] text-[var(--color-text-tertiary)]">
                                        {quests ? `${quests.length} quest${quests.length === 1 ? '' : 's'} found` : 'Dump it all — AI turns it into quests'}
                                    </p>
                                </div>
                            </div>
                            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-[var(--color-text-secondary)]" aria-label="Close">
                                <X className="w-5 h-5" />
                            </motion.button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 pb-6">
                            {/* Success flash */}
                            {addedCount > 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="text-4xl mb-2">✅</div>
                                    <p className="text-sm font-bold">Added {addedCount} quest{addedCount === 1 ? '' : 's'}!</p>
                                </div>
                            ) : quests ? (
                                /* Preview phase */
                                <QuestPreviewList quests={quests} onAdd={handleAdd} addLabel="Add to quests" />
                            ) : (
                                /* Input phase */
                                <>
                                    <div className="relative">
                                        <textarea
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            placeholder={"buy milk tomorrow 5pm !high #shopping\ncall the dentist friday\ngym every day…"}
                                            rows={6}
                                            maxLength={4000}
                                            autoFocus
                                            className="w-full resize-none rounded-2xl glass-card px-4 py-3 text-sm leading-relaxed bg-transparent outline-none placeholder:text-[var(--color-text-tertiary)]"
                                        />
                                        {voiceSupported && (
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={toggleVoice}
                                                className={`absolute bottom-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center border ${
                                                    listening
                                                        ? 'bg-red-500 border-red-500 text-white animate-pulse'
                                                        : 'bg-white/5 border-[var(--color-border)] text-[var(--color-text-secondary)]'
                                                }`}
                                                aria-label={listening ? 'Stop dictation' : 'Dictate'}
                                            >
                                                <Mic className="w-4 h-4" strokeWidth={2.4} />
                                            </motion.button>
                                        )}
                                    </div>

                                    {error && (
                                        <p className="mt-2 text-xs text-red-400">{error}</p>
                                    )}

                                    <p className="mt-2 text-[11px] text-[var(--color-text-tertiary)] leading-snug">
                                        One thought per line works best. The AI sets priority, deadlines, recurrence & tags — you confirm before adding.
                                    </p>

                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        disabled={!text.trim() || loading}
                                        onClick={handleParse}
                                        className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white fab-primary disabled:opacity-40"
                                    >
                                        <Sparkles className="w-4 h-4" strokeWidth={2.6} />
                                        {loading ? 'Turning into quests…' : 'Turn into quests'}
                                    </motion.button>
                                </>
                            )}
                            <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});
