import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Calendar, Clock, Repeat, Zap, AlertTriangle, Flame, Shield, Check, X, Rocket } from 'lucide-react';
import { Task, Priority, Recurrence } from '../../types';
import { toDateTimeLocalInputValue } from '../../lib/dates';

type TaskFormData = Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'lastResetDate' | 'lastPenaltyAt'>;

interface TaskFormProps {
    onSubmit: (task: TaskFormData) => void;
    onClose: () => void;
    editTask?: Task | null;
}

const STEPS = [
    { id: 'name', title: "What's the quest?", subtitle: 'Name your mission', emoji: '🎯' },
    { id: 'priority', title: 'How urgent?', subtitle: 'Set the difficulty level', emoji: '⚡' },
    { id: 'details', title: 'When & how often?', subtitle: 'Time & schedule', emoji: '📋' },
    { id: 'tags', title: 'Almost there!', subtitle: 'Tag & review your quest', emoji: '🏷️' },
];

const priorityOptions: { value: Priority; label: string; icon: typeof Zap; color: string; bgColor: string; activeRing: string; description: string; emoji: string }[] = [
    { value: 'LOW', label: 'Chill', icon: Shield, color: 'text-sky-500', bgColor: 'bg-sky-500/10 dark:bg-sky-500/15', activeRing: 'ring-sky-500/40', description: 'No rush, take your time', emoji: '😌' },
    { value: 'MEDIUM', label: 'Normal', icon: Zap, color: 'text-amber-500', bgColor: 'bg-amber-500/10 dark:bg-amber-500/15', activeRing: 'ring-amber-500/40', description: 'Steady pace', emoji: '💪' },
    { value: 'HIGH', label: 'Important', icon: Flame, color: 'text-orange-500', bgColor: 'bg-orange-500/10 dark:bg-orange-500/15', activeRing: 'ring-orange-500/40', description: 'Get it done today!', emoji: '🔥' },
    { value: 'CRITICAL', label: 'Urgent!', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10 dark:bg-red-500/15', activeRing: 'ring-red-500/40', description: 'Drop everything!', emoji: '🚨' },
];

const recurrenceOptions: { value: Recurrence; label: string; emoji: string }[] = [
    { value: 'NONE', label: 'Once', emoji: '1️⃣' },
    { value: 'DAILY', label: 'Daily', emoji: '☀️' },
    { value: 'WEEKLY', label: 'Weekly', emoji: '📅' },
];

const QUICK_IDEAS = ['📚 Study', '🏃 Exercise', '🧹 Clean up', '💻 Code', '📧 Email', '🛒 Shopping'];
const POPULAR_TAGS = ['work', 'personal', 'health', 'learning', 'urgent', 'home'];

const toISOOrNull = (value: string): string | null => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
};

const slideVariants = {
    enter: { x: 80, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -80, opacity: 0 },
};

export function TaskForm({ onSubmit, onClose, editTask }: TaskFormProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [title, setTitle] = useState(editTask?.title || '');
    const [description, setDescription] = useState(editTask?.description || '');
    const [priority, setPriority] = useState<Priority>(editTask?.priority || 'MEDIUM');
    const [deadline, setDeadline] = useState(toDateTimeLocalInputValue(editTask?.deadline ?? null));
    const [startDate, setStartDate] = useState(toDateTimeLocalInputValue(editTask?.startDate ?? null));
    const [recurrence, setRecurrence] = useState<Recurrence>(editTask?.recurrence || 'NONE');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>(editTask?.tags || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitTimeoutRef = useRef<number | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    const canGoNext = useMemo(() => {
        if (currentStep === 0) return title.trim().length > 0;
        return true;
    }, [currentStep, title]);

    const goNext = useCallback(() => {
        if (currentStep < STEPS.length - 1 && canGoNext) {
            setCurrentStep(s => s + 1);
        }
    }, [currentStep, canGoNext]);

    const goBack = useCallback(() => {
        if (currentStep > 0) setCurrentStep(s => s - 1);
    }, [currentStep]);

    const handleSubmit = useCallback(() => {
        if (!title.trim()) return;
        setIsSubmitting(true);
        if (submitTimeoutRef.current !== null) window.clearTimeout(submitTimeoutRef.current);

        submitTimeoutRef.current = window.setTimeout(() => {
            if (!isMountedRef.current) return;
            onSubmit({
                title: title.trim(),
                description: description.trim(),
                priority,
                deadline: toISOOrNull(deadline),
                startDate: toISOOrNull(startDate),
                recurrence,
                tags,
            });
            onClose();
        }, 500);
    }, [title, description, priority, deadline, startDate, recurrence, tags, onSubmit, onClose]);

    const addTag = useCallback(() => {
        const trimmed = tagInput.trim();
        if (trimmed) {
            setTags(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
            setTagInput('');
        }
    }, [tagInput]);

    const removeTag = useCallback((tag: string) => {
        setTags(prev => prev.filter((t) => t !== tag));
    }, []);

    const isLastStep = currentStep === STEPS.length - 1;

    // Body scroll lock
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previousOverflow; };
    }, []);

    // Cleanup timeout
    useEffect(() => {
        return () => {
            if (submitTimeoutRef.current !== null) window.clearTimeout(submitTimeoutRef.current);
        };
    }, []);

    // Enter-to-next / submit
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            const active = document.activeElement;
            if (active?.tagName === 'TEXTAREA') return;
            if (isLastStep && active?.tagName === 'INPUT') return;
            e.preventDefault();
            if (isLastStep) {
                if (title.trim() && !isSubmitting) handleSubmit();
            } else if (canGoNext) {
                goNext();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isLastStep, title, isSubmitting, handleSubmit, canGoNext, goNext]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-[var(--color-bg)]"
                style={{
                    /* iPhone 15 Pro: top 59pt, bottom 34pt – we add generous padding */
                    paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
                    paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                    paddingLeft: 'calc(20px + env(safe-area-inset-left, 0px))',
                    paddingRight: 'calc(20px + env(safe-area-inset-right, 0px))',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* ═══ Header: Close + Step counter ═══ */}
                <div className="w-full max-w-md mx-auto flex-shrink-0">
                    <div className="flex items-center justify-between" style={{ minHeight: 44 }}>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="flex items-center justify-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] active:bg-[var(--color-surface-hover)] transition-colors"
                            style={{ width: 44, height: 44 }}
                        >
                            <X className="text-[var(--color-text-secondary)]" style={{ width: 20, height: 20 }} />
                        </motion.button>

                        {editTask && (
                            <span className="text-[13px] font-bold text-primary-400 bg-primary-500/10 rounded-full" style={{ padding: '6px 14px' }}>
                                ✏️ Editing
                            </span>
                        )}

                        <span className="text-[13px] font-semibold text-[var(--color-text-secondary)] tabular-nums">
                            {currentStep + 1}/{STEPS.length}
                        </span>
                    </div>

                    {/* Progress pills – 8pt gaps, 6pt height for visibility */}
                    <div className="flex mt-3" style={{ gap: 8 }}>
                        {STEPS.map((_, i) => (
                            <motion.div
                                key={i}
                                className={`flex-1 rounded-full transition-all duration-300 ${
                                    i <= currentStep ? 'xp-gradient' : 'bg-[var(--color-surface-hover)]'
                                }`}
                                style={{ height: 6 }}
                                animate={i === currentStep ? { scaleY: [1, 1.4, 1] } : {}}
                                transition={{ duration: 0.3 }}
                            />
                        ))}
                    </div>
                </div>

                {/* ═══ Main content – vertically centered, scrollable ═══ */}
                <div
                    className="flex-1 w-full max-w-md mx-auto flex flex-col justify-center overflow-y-auto overscroll-contain scrollbar-hide"
                    style={{ WebkitOverflowScrolling: 'touch', paddingTop: 24, paddingBottom: 24 }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.25 }}
                        >
                            {/* ═══ STEP 0: Quest Title ═══ */}
                            {currentStep === 0 && (
                                <div className="flex flex-col items-center" style={{ gap: 20 }}>
                                    <motion.div
                                        initial={{ scale: 0, rotate: -20 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', damping: 10 }}
                                        className="select-none"
                                        style={{ fontSize: 56 }}
                                    >
                                        🎯
                                    </motion.div>

                                    <div className="text-center">
                                        <h2 className="font-extrabold" style={{ fontSize: 24, lineHeight: '30px' }}>
                                            {editTask ? '✏️ Edit your quest' : "What's the quest?"}
                                        </h2>
                                        <p className="text-[var(--color-text-secondary)] mt-1" style={{ fontSize: 15 }}>
                                            Name your mission
                                        </p>
                                    </div>

                                    {/* Title input – 52pt height for easy thumb tap */}
                                    <div className="relative w-full">
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g. Learn React hooks 🚀"
                                            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-center font-semibold placeholder:text-[var(--color-text-secondary)]/40 placeholder:font-normal"
                                            style={{ height: 52, fontSize: 17, paddingLeft: 20, paddingRight: 44 }}
                                            autoFocus
                                            enterKeyHint="next"
                                        />
                                        {title.length > 0 && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute top-1/2 -translate-y-1/2"
                                                style={{ right: 14 }}
                                            >
                                                <div className="rounded-full bg-green-500 flex items-center justify-center" style={{ width: 24, height: 24 }}>
                                                    <Check className="text-white" style={{ width: 14, height: 14 }} strokeWidth={3} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Description – 44pt min height */}
                                    <div className="w-full">
                                        <label className="block font-medium text-[var(--color-text-secondary)]" style={{ fontSize: 13, marginBottom: 8 }}>
                                            Description (optional)
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Add more details..."
                                            rows={2}
                                            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none placeholder:text-[var(--color-text-secondary)]/40"
                                            style={{ fontSize: 15, padding: '14px 16px' }}
                                        />
                                    </div>

                                    {/* Quick ideas – min 44pt touch targets */}
                                    <div className="w-full">
                                        <p className="font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-center"
                                            style={{ fontSize: 11, marginBottom: 10 }}>
                                            Quick ideas ✨
                                        </p>
                                        <div className="flex flex-wrap justify-center" style={{ gap: 8 }}>
                                            {QUICK_IDEAS.map((idea) => (
                                                <motion.button
                                                    key={idea}
                                                    type="button"
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setTitle(idea)}
                                                    className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] font-medium active:bg-[var(--color-surface-hover)] transition-colors"
                                                    style={{ fontSize: 13, height: 40, paddingLeft: 14, paddingRight: 14 }}
                                                >
                                                    {idea}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ═══ STEP 1: Priority ═══ */}
                            {currentStep === 1 && (
                                <div className="flex flex-col items-center" style={{ gap: 20 }}>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', damping: 10 }}
                                        className="select-none"
                                        style={{ fontSize: 56 }}
                                    >
                                        ⚡
                                    </motion.div>

                                    <div className="text-center">
                                        <h2 className="font-extrabold" style={{ fontSize: 24, lineHeight: '30px' }}>How urgent?</h2>
                                        <p className="text-[var(--color-text-secondary)] mt-1" style={{ fontSize: 15 }}>Set the difficulty level</p>
                                    </div>

                                    <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {priorityOptions.map((p) => {
                                            const Icon = p.icon;
                                            const isSelected = priority === p.value;
                                            return (
                                                <motion.button
                                                    key={p.value}
                                                    type="button"
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => setPriority(p.value)}
                                                    className={`w-full text-left rounded-2xl transition-all flex items-center ${
                                                        isSelected
                                                            ? `${p.bgColor} ring-2 ${p.activeRing}`
                                                            : 'card-surface active:bg-[var(--color-surface-hover)]'
                                                    }`}
                                                    /* 64pt height = comfortable thumb target */
                                                    style={{ padding: '14px 16px', minHeight: 64, gap: 14 }}
                                                >
                                                    {/* Icon container 44x44 */}
                                                    <div className={`flex-shrink-0 rounded-xl ${p.bgColor} flex items-center justify-center`}
                                                        style={{ width: 44, height: 44 }}>
                                                        <Icon className={p.color} style={{ width: 22, height: 22 }} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center" style={{ gap: 6 }}>
                                                            <span className="font-bold" style={{ fontSize: 16 }}>{p.label}</span>
                                                            <span style={{ fontSize: 18 }}>{p.emoji}</span>
                                                        </div>
                                                        <span className="text-[var(--color-text-secondary)]" style={{ fontSize: 13 }}>{p.description}</span>
                                                    </div>

                                                    {isSelected && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            transition={{ type: 'spring', damping: 12 }}
                                                        >
                                                            <div className={`rounded-full ${p.bgColor} flex items-center justify-center`}
                                                                style={{ width: 28, height: 28 }}>
                                                                <Check className={p.color} style={{ width: 16, height: 16 }} strokeWidth={3} />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ═══ STEP 2: Deadline, Reminder, Recurrence ═══ */}
                            {currentStep === 2 && (
                                <div className="flex flex-col items-center" style={{ gap: 20 }}>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', damping: 10 }}
                                        className="select-none"
                                        style={{ fontSize: 56 }}
                                    >
                                        📋
                                    </motion.div>

                                    <div className="text-center">
                                        <h2 className="font-extrabold" style={{ fontSize: 24, lineHeight: '30px' }}>When & how often?</h2>
                                        <p className="text-[var(--color-text-secondary)] mt-1" style={{ fontSize: 15 }}>All fields are optional</p>
                                    </div>

                                    {/* Deadline */}
                                    <div className="w-full">
                                        <label className="flex items-center font-semibold" style={{ gap: 8, fontSize: 15, marginBottom: 8 }}>
                                            <Calendar className="text-primary-500" style={{ width: 18, height: 18 }} />
                                            Deadline
                                        </label>
                                        <div className="card-surface rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/50 transition-all">
                                            <input
                                                type="datetime-local"
                                                value={deadline}
                                                onChange={(e) => setDeadline(e.target.value)}
                                                className="w-full box-border bg-transparent border-none outline-none appearance-none font-medium"
                                                style={{ fontSize: 15, height: 50, paddingLeft: 16, paddingRight: 16 }}
                                            />
                                        </div>
                                    </div>

                                    {/* Reminder */}
                                    <div className="w-full">
                                        <label className="flex items-center font-semibold" style={{ gap: 8, fontSize: 15, marginBottom: 8 }}>
                                            <Clock className="text-violet-500" style={{ width: 18, height: 18 }} />
                                            Reminder
                                        </label>
                                        <div className="card-surface rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/50 transition-all">
                                            <input
                                                type="datetime-local"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full box-border bg-transparent border-none outline-none appearance-none font-medium"
                                                style={{ fontSize: 15, height: 50, paddingLeft: 16, paddingRight: 16 }}
                                            />
                                        </div>
                                    </div>

                                    {/* Recurrence */}
                                    <div className="w-full">
                                        <label className="flex items-center font-semibold" style={{ gap: 8, fontSize: 15, marginBottom: 10 }}>
                                            <Repeat className="text-emerald-500" style={{ width: 18, height: 18 }} />
                                            Repeat
                                        </label>
                                        <div className="grid grid-cols-3" style={{ gap: 10 }}>
                                            {recurrenceOptions.map((r) => (
                                                <motion.button
                                                    key={r.value}
                                                    type="button"
                                                    whileTap={{ scale: 0.96 }}
                                                    onClick={() => setRecurrence(r.value)}
                                                    className={`flex flex-col items-center rounded-2xl transition-all ${
                                                        recurrence === r.value
                                                            ? 'bg-emerald-500/10 dark:bg-emerald-500/15 ring-2 ring-emerald-500/40'
                                                            : 'card-surface active:bg-[var(--color-surface-hover)]'
                                                    }`}
                                                    /* 72pt height – easy to tap */
                                                    style={{ height: 72, gap: 4, justifyContent: 'center' }}
                                                >
                                                    <span style={{ fontSize: 24 }}>{r.emoji}</span>
                                                    <span className="font-bold" style={{ fontSize: 13 }}>{r.label}</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ═══ STEP 3: Tags + Summary ═══ */}
                            {currentStep === 3 && (
                                <div className="flex flex-col items-center" style={{ gap: 20 }}>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', damping: 10 }}
                                        className="select-none"
                                        style={{ fontSize: 56 }}
                                    >
                                        🏷️
                                    </motion.div>

                                    <div className="text-center">
                                        <h2 className="font-extrabold" style={{ fontSize: 24, lineHeight: '30px' }}>Almost there!</h2>
                                        <p className="text-[var(--color-text-secondary)] mt-1" style={{ fontSize: 15 }}>Tag & review your quest</p>
                                    </div>

                                    {/* Tag input row – 48pt height */}
                                    <div className="w-full flex" style={{ gap: 8 }}>
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                            placeholder="Type a tag..."
                                            className="flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-medium transition-all placeholder:text-[var(--color-text-secondary)]/40"
                                            style={{ height: 48, fontSize: 15, paddingLeft: 16, paddingRight: 16 }}
                                        />
                                        <motion.button
                                            type="button"
                                            whileTap={{ scale: 0.95 }}
                                            onClick={addTag}
                                            className="rounded-2xl bg-primary-500 text-white font-bold shadow-lg shadow-primary-500/25"
                                            style={{ height: 48, paddingLeft: 20, paddingRight: 20, fontSize: 15 }}
                                        >
                                            Add
                                        </motion.button>
                                    </div>

                                    {/* Active tags */}
                                    {tags.length > 0 && (
                                        <div className="w-full flex flex-wrap" style={{ gap: 8 }}>
                                            {tags.map((tag, i) => (
                                                <motion.span
                                                    key={tag}
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: i * 0.04, type: 'spring', damping: 15 }}
                                                    className="inline-flex items-center font-bold bg-gradient-to-r from-pink-500/10 to-violet-500/10 dark:from-pink-500/20 dark:to-violet-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/20 rounded-xl"
                                                    style={{ height: 36, paddingLeft: 12, paddingRight: 6, fontSize: 13, gap: 6 }}
                                                >
                                                    #{tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTag(tag)}
                                                        className="rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                                                        style={{ width: 22, height: 22 }}
                                                    >
                                                        <X className="text-red-500" style={{ width: 11, height: 11 }} />
                                                    </button>
                                                </motion.span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Popular tag suggestions – 40pt height each */}
                                    <div className="w-full">
                                        <p className="font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-center"
                                            style={{ fontSize: 11, marginBottom: 8 }}>
                                            Popular tags 🔖
                                        </p>
                                        <div className="flex flex-wrap justify-center" style={{ gap: 8 }}>
                                            {POPULAR_TAGS.filter(t => !tags.includes(t)).map((s) => (
                                                <motion.button
                                                    key={s}
                                                    type="button"
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setTags(prev => [...prev, s])}
                                                    className="rounded-xl border border-dashed border-[var(--color-border)] text-[var(--color-text-secondary)] active:border-primary-500/50 active:text-primary-500 transition-all"
                                                    style={{ height: 36, paddingLeft: 14, paddingRight: 14, fontSize: 13 }}
                                                >
                                                    + {s}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quest Summary Card */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 }}
                                        className="w-full rounded-2xl bg-gradient-to-br from-primary-500/5 via-violet-500/5 to-pink-500/5 dark:from-primary-500/10 dark:via-violet-500/10 dark:to-pink-500/10 border border-primary-500/10"
                                        style={{ padding: 16 }}
                                    >
                                        <p className="font-bold text-[var(--color-text-secondary)] uppercase tracking-wider"
                                            style={{ fontSize: 11, marginBottom: 8 }}>
                                            Quest Summary ✨
                                        </p>
                                        <p className="font-bold" style={{ fontSize: 16 }}>{title || 'Untitled quest'}</p>
                                        {description && <p className="text-[var(--color-text-secondary)] mt-1" style={{ fontSize: 13 }}>{description}</p>}
                                        <div className="flex flex-wrap mt-2" style={{ gap: 6 }}>
                                            {(() => {
                                                const po = priorityOptions.find(opt => opt.value === priority);
                                                return (
                                                    <span className={`font-bold rounded-full ${po?.bgColor} ${po?.color}`}
                                                        style={{ fontSize: 11, paddingLeft: 10, paddingRight: 10, paddingTop: 3, paddingBottom: 3 }}>
                                                        {po?.emoji} {priority}
                                                    </span>
                                                );
                                            })()}
                                            {recurrence !== 'NONE' && (
                                                <span className="font-bold rounded-full bg-emerald-500/10 text-emerald-500"
                                                    style={{ fontSize: 11, paddingLeft: 10, paddingRight: 10, paddingTop: 3, paddingBottom: 3 }}>
                                                    🔄 {recurrence}
                                                </span>
                                            )}
                                            {deadline && (
                                                <span className="font-bold rounded-full bg-blue-500/10 text-blue-500"
                                                    style={{ fontSize: 11, paddingLeft: 10, paddingRight: 10, paddingTop: 3, paddingBottom: 3 }}>
                                                    📅 Deadline set
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* ═══ Bottom nav: Back / Next / Create ═══ */}
                <div className="w-full max-w-md mx-auto flex-shrink-0 flex items-center justify-between" style={{ paddingTop: 12 }}>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={goBack}
                        className={`flex items-center rounded-2xl font-semibold transition-all ${
                            currentStep === 0 ? 'opacity-0 pointer-events-none' : 'card-surface active:bg-[var(--color-surface-hover)]'
                        }`}
                        /* 48pt height, 44pt+ width */
                        style={{ height: 48, paddingLeft: 16, paddingRight: 20, fontSize: 15, gap: 4 }}
                    >
                        <ChevronLeft style={{ width: 18, height: 18 }} />
                        Back
                    </motion.button>

                    {!isLastStep ? (
                        <motion.button
                            whileHover={{ scale: canGoNext ? 1.02 : 1 }}
                            whileTap={{ scale: canGoNext ? 0.97 : 1 }}
                            onClick={goNext}
                            disabled={!canGoNext}
                            className={`flex items-center rounded-2xl font-bold transition-all ${
                                canGoNext
                                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                                    : 'bg-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed'
                            }`}
                            style={{ height: 48, paddingLeft: 24, paddingRight: 20, fontSize: 16, gap: 4 }}
                        >
                            Next
                            <ChevronRight style={{ width: 18, height: 18 }} />
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`flex items-center rounded-2xl font-bold transition-all ${
                                isSubmitting
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                            }`}
                            style={{ height: 48, paddingLeft: 24, paddingRight: 24, fontSize: 16, gap: 8 }}
                        >
                            {isSubmitting ? (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 10 }}
                                    className="flex items-center" style={{ gap: 8 }}
                                >
                                    <Check style={{ width: 18, height: 18 }} />
                                    {editTask ? 'Saved!' : 'Created!'}
                                </motion.div>
                            ) : (
                                <>
                                    <Rocket style={{ width: 18, height: 18 }} />
                                    {editTask ? 'Save' : 'Create Quest!'}
                                </>
                            )}
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
