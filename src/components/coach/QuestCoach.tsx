import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { X, Sparkles, Send, Loader2 } from 'lucide-react';
import { askCoach, type ChatTurn } from '../../lib/coachApi';

interface QuestCoachProps {
    isOpen: boolean;
    onClose: () => void;
}

const SUGGESTIONS = [
    'What should I tackle first?',
    'Why is my focus where it is?',
    'Plan my day',
    'How do I protect my streak?',
];

export const QuestCoach = memo(function QuestCoach({ isOpen, onClose }: QuestCoachProps) {
    const dragControls = useDragControls();
    const [messages, setMessages] = useState<ChatTurn[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const send = useCallback(
        async (text: string) => {
            const msg = text.trim();
            if (!msg || loading) return;
            setError(null);
            const history = messages;
            setMessages((prev) => [...prev, { role: 'user', content: msg }]);
            setInput('');
            setLoading(true);
            try {
                const reply = await askCoach(msg, history);
                setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
            } finally {
                setLoading(false);
            }
        },
        [messages, loading]
    );

    // Auto-scroll to the newest message / loader.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, loading, error]);

    // Lock background scroll while open (same pattern as QuickRituals).
    useEffect(() => {
        if (isOpen) document.body.classList.add('modal-scroll-lock');
        else document.body.classList.remove('modal-scroll-lock');
        return () => document.body.classList.remove('modal-scroll-lock');
    }, [isOpen]);

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
                        className="fixed bottom-0 left-0 right-0 z-50 h-[85vh] flex flex-col rounded-t-3xl overflow-hidden"
                        style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}
                    >
                        {/* Handle (drag) */}
                        <div
                            onPointerDown={(e) => dragControls.start(e)}
                            className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0 touch-none"
                        >
                            <div className="w-10 h-1.5 rounded-full bg-[var(--color-text-secondary)] opacity-30" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                                    <Sparkles className="w-4 h-4 text-cyan-400" strokeWidth={2.4} />
                                </div>
                                <div className="leading-tight">
                                    <h2 className="text-base font-bold">Quest Coach</h2>
                                    <p className="text-[10px] text-[var(--color-text-tertiary)]">Sees your quests · free AI</p>
                                </div>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-white/5 text-[var(--color-text-secondary)]"
                                aria-label="Close coach"
                            >
                                <X className="w-5 h-5" />
                            </motion.button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center text-center pt-6 pb-4 px-4">
                                    <div className="text-3xl mb-2">🧭</div>
                                    <p className="text-sm font-semibold mb-1">Your personal productivity coach</p>
                                    <p className="text-xs text-[var(--color-text-tertiary)] max-w-[16rem]">
                                        I can see your streak, HP, focus score and today's quests. Ask me anything.
                                    </p>
                                </div>
                            )}

                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                                            m.role === 'user'
                                                ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-br-md'
                                                : 'glass-card rounded-bl-md text-[var(--color-text)]'
                                        }`}
                                    >
                                        {m.content}
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div className="flex justify-start">
                                    <div className="glass-card rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-2 text-[var(--color-text-tertiary)]">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-xs">Thinking…</span>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex justify-start">
                                    <div className="max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-bl-md text-sm bg-red-500/10 border border-red-500/30 text-red-400">
                                        {error}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Suggestion chips (only before first message) */}
                        {messages.length === 0 && !loading && (
                            <div className="px-4 pb-2 flex flex-wrap gap-2 shrink-0">
                                {SUGGESTIONS.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => send(s)}
                                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <div
                            className="shrink-0 px-4 pt-2 border-t border-[var(--color-border)]"
                            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
                        >
                            <div className="flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-2xl glass-card">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            send(input);
                                        }
                                    }}
                                    placeholder="Ask your coach…"
                                    enterKeyHint="send"
                                    maxLength={2000}
                                    aria-label="Message the coach"
                                    className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm font-medium placeholder:text-[var(--color-text-tertiary)]"
                                />
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => send(input)}
                                    disabled={!input.trim() || loading}
                                    className="shrink-0 w-9 h-9 rounded-xl fab-primary text-white flex items-center justify-center disabled:opacity-40"
                                    aria-label="Send"
                                >
                                    <Send className="w-4 h-4" strokeWidth={2.6} />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});
