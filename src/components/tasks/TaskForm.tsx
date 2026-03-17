import { useState, useCallback, useMemo, useEffect, useRef, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, Calendar, Clock, Tag, Repeat, Zap, AlertTriangle, Flame, Shield, Check } from 'lucide-react';
import { Task, Priority, Recurrence } from '../../types';
import { toDateTimeLocalInputValue } from '../../lib/dates';

interface TaskFormProps {
    onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'lastResetDate'>) => void;
    onClose: () => void;
    editTask?: Task | null;
}

const STEPS = [
    { id: 'name', title: 'What\'s the quest?', subtitle: 'Name your mission', emoji: '🎯' },
    { id: 'priority', title: 'How urgent?', subtitle: 'Set the difficulty level', emoji: '⚡' },
    { id: 'details', title: 'Add the details', subtitle: 'Time & schedule', emoji: '📋' },
    { id: 'tags', title: 'Tag it!', subtitle: 'Organize your quest', emoji: '🏷️' },
];

const priorityOptions: { value: Priority; label: string; icon: typeof Zap; color: string; bgColor: string; borderColor: string; description: string; emoji: string }[] = [
    { value: 'LOW', label: 'Chill', icon: Shield, color: 'text-sky-500', bgColor: 'bg-sky-500/10 dark:bg-sky-500/20', borderColor: 'border-sky-500/30 hover:border-sky-500', description: 'No rush', emoji: '😌' },
    { value: 'MEDIUM', label: 'Normal', icon: Zap, color: 'text-amber-500', bgColor: 'bg-amber-500/10 dark:bg-amber-500/20', borderColor: 'border-amber-500/30 hover:border-amber-500', description: 'Steady pace', emoji: '💪' },
    { value: 'HIGH', label: 'Important', icon: Flame, color: 'text-orange-500', bgColor: 'bg-orange-500/10 dark:bg-orange-500/20', borderColor: 'border-orange-500/30 hover:border-orange-500', description: 'Get it done!', emoji: '🔥' },
    { value: 'CRITICAL', label: 'Urgent!', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10 dark:bg-red-500/20', borderColor: 'border-red-500/30 hover:border-red-500', description: 'ASAP!', emoji: '🚨' },
];

const recurrenceOptions: { value: Recurrence; label: string; emoji: string; description: string }[] = [
    { value: 'NONE', label: 'Once', emoji: '1️⃣', description: 'One-time quest' },
    { value: 'DAILY', label: 'Daily', emoji: '☀️', description: 'Every day' },
    { value: 'WEEKLY', label: 'Weekly', emoji: '📅', description: 'Every week' },
];

const MOBILE_MEDIA_QUERY = '(max-width: 639px)';
const emptySubscribe = () => () => undefined;

const subscribeToMobileViewport = (onStoreChange: () => void) => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    mediaQuery.addEventListener('change', onStoreChange);
    return () => mediaQuery.removeEventListener('change', onStoreChange);
};

const getMobileViewportSnapshot = () =>
    window.matchMedia(MOBILE_MEDIA_QUERY).matches;

const subscribeToKeyboardInset = (onStoreChange: () => void) => {
    const viewport = window.visualViewport;
    if (!viewport) return emptySubscribe();

    viewport.addEventListener('resize', onStoreChange);
    viewport.addEventListener('scroll', onStoreChange);

    return () => {
        viewport.removeEventListener('resize', onStoreChange);
        viewport.removeEventListener('scroll', onStoreChange);
    };
};

const getKeyboardInsetSnapshot = () => {
    if (!getMobileViewportSnapshot()) return 0;

    const viewport = window.visualViewport;
    if (!viewport) return 0;

    const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    return inset > 80 ? inset : 0;
};

// Mascot reactions
const getMascotEmoji = (step: number, title: string, priority: Priority) => {
    if (step === 0 && !title) return '🤔';
    if (step === 0 && title.length > 0) return '😄';
    if (step === 1) {
        const map: Record<Priority, string> = { LOW: '😌', MEDIUM: '💪', HIGH: '🔥', CRITICAL: '😱' };
        return map[priority];
    }
    if (step === 2) return '⏰';
    if (step === 3) return '🏷️';
    return '✨';
};

export function TaskForm({ onSubmit, onClose, editTask }: TaskFormProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
    const [title, setTitle] = useState(editTask?.title || '');
    const [description, setDescription] = useState(editTask?.description || '');
    const [priority, setPriority] = useState<Priority>(editTask?.priority || 'MEDIUM');
    const [deadline, setDeadline] = useState(toDateTimeLocalInputValue(editTask?.deadline ?? null));
    const [startDate, setStartDate] = useState(toDateTimeLocalInputValue(editTask?.startDate ?? null));
    const [recurrence, setRecurrence] = useState<Recurrence>(editTask?.recurrence || 'NONE');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>(editTask?.tags || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isMobile = useSyncExternalStore(
        subscribeToMobileViewport,
        getMobileViewportSnapshot,
        () => false
    );
    const keyboardInset = useSyncExternalStore(
        subscribeToKeyboardInset,
        getKeyboardInsetSnapshot,
        () => 0
    );
    const contentRef = useRef<HTMLDivElement | null>(null);
    const submitTimeoutRef = useRef<number | null>(null);

    const toISOOrNull = (value: string): string | null => {
        if (!value) return null;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed.toISOString();
    };

    const canGoNext = useMemo(() => {
        if (currentStep === 0) return title.trim().length > 0;
        return true;
    }, [currentStep, title]);

    const goNext = useCallback(() => {
        if (currentStep < STEPS.length - 1 && canGoNext) {
            setDirection(1);
            setCurrentStep(s => s + 1);
        }
    }, [currentStep, canGoNext]);

    const goBack = useCallback(() => {
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep(s => s - 1);
        }
    }, [currentStep]);

    const handleSubmit = useCallback(() => {
        if (!title.trim()) return;
        setIsSubmitting(true);

        // Small delay for the satisfying animation
        if (submitTimeoutRef.current !== null) {
            window.clearTimeout(submitTimeoutRef.current);
        }

        submitTimeoutRef.current = window.setTimeout(() => {
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
        }, 400);
    }, [title, description, priority, deadline, startDate, recurrence, tags, onSubmit, onClose]);

    const addTag = useCallback(() => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    }, [tagInput, tags]);

    const removeTag = useCallback((tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    }, [tags]);

    const progress = ((currentStep + 1) / STEPS.length) * 100;
    const mascot = getMascotEmoji(currentStep, title, priority);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (submitTimeoutRef.current !== null) {
                window.clearTimeout(submitTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentStep]);

    const slideVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? 80 : -80,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (dir: number) => ({
            x: dir > 0 ? -80 : 80,
            opacity: 0,
        }),
    };

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Mobile-first sheet with desktop side panel */}
            <motion.div
                initial={isMobile ? { y: '100%' } : { x: '100%' }}
                animate={isMobile ? { y: 0 } : { x: 0 }}
                exit={isMobile ? { y: '100%' } : { x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed inset-x-0 bottom-0 z-50 flex flex-col pt-3 sm:inset-y-0 sm:left-auto sm:w-[420px] sm:max-w-[85vw] sm:pt-0"
                style={{
                    paddingLeft: 'env(safe-area-inset-left, 0px)',
                    paddingRight: 'env(safe-area-inset-right, 0px)',
                    paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)`,
                }}
            >
                <div className="flex max-h-[min(46rem,calc(100dvh-var(--safe-top)-0.75rem))] flex-col overflow-hidden rounded-t-[2rem] border border-b-0 border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl sm:h-full sm:max-h-none sm:rounded-none sm:rounded-l-3xl sm:border-b sm:border-r-0">
                    <div className="flex justify-center pt-2 sm:hidden">
                        <div className="h-1.5 w-12 rounded-full bg-[var(--color-border)]" />
                    </div>
                    
                    {/* Header */}
                    <div className="relative shrink-0 px-5 pt-4 pb-3 sm:pt-5">
                        {/* Close Button */}
                        <div className="flex items-center justify-between mb-4">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors"
                            >
                                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                            </motion.button>

                            {/* Step indicator pills */}
                            <div className="flex gap-1.5">
                                {STEPS.map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            i <= currentStep
                                                ? 'bg-gradient-to-r from-primary-500 to-primary-400 w-6'
                                                : 'bg-[var(--color-border)] w-3'
                                        }`}
                                        layout
                                    />
                                ))}
                            </div>

                            {/* Step counter */}
                            <span className="text-xs font-bold text-[var(--color-text-secondary)] tabular-nums">
                                {currentStep + 1}/{STEPS.length}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-primary-500 via-violet-500 to-pink-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                            />
                        </div>
                    </div>

                    {/* Mascot + Title */}
                    <div className="shrink-0 px-5 py-3">
                        <div className="flex items-center gap-3">
                            <motion.div
                                key={mascot}
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                                className="text-3xl select-none"
                            >
                                {mascot}
                            </motion.div>
                            <div>
                                <motion.h2
                                    key={STEPS[currentStep].title}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-lg font-extrabold"
                                >
                                    {editTask && currentStep === 0 ? 'Edit your quest' : STEPS[currentStep].title}
                                </motion.h2>
                                <motion.p
                                    key={STEPS[currentStep].subtitle}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-xs text-[var(--color-text-secondary)]"
                                >
                                    {STEPS[currentStep].subtitle}
                                </motion.p>
                            </div>
                        </div>
                    </div>

                    {/* Step Content */}
                    <div
                        ref={contentRef}
                        className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={currentStep}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: 'spring', damping: 25, stiffness: 250, duration: 0.3 }}
                                className="space-y-4"
                            >
                                {/* Step 1: Name */}
                                {currentStep === 0 && (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="e.g. Learn React hooks 🚀"
                                                className="w-full px-5 py-4 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all text-base font-semibold placeholder:text-[var(--color-text-secondary)]/40 placeholder:font-normal"
                                                autoFocus={!isMobile}
                                                enterKeyHint="next"
                                                onKeyDown={(e) => e.key === 'Enter' && canGoNext && goNext()}
                                            />
                                            {title.length > 0 && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                                                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                                                Description (optional)
                                            </label>
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Add more details about your quest..."
                                                rows={3}
                                                className="w-full px-5 py-3.5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all text-base sm:text-sm resize-none placeholder:text-[var(--color-text-secondary)]/40"
                                            />
                                        </div>

                                        {/* Quick suggestion chips */}
                                        <div>
                                            <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                                                Quick ideas ✨
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {['📚 Study', '🏃 Exercise', '🧹 Clean up', '💻 Code', '📧 Email', '🛒 Shopping'].map((idea) => (
                                                    <motion.button
                                                        key={idea}
                                                        type="button"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => setTitle(idea)}
                                                        className="px-3.5 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-surface-hover)] hover:border-primary-500/30 transition-all"
                                                    >
                                                        {idea}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Priority */}
                                {currentStep === 1 && (
                                    <div className="space-y-3">
                                        {priorityOptions.map((p, index) => {
                                            const Icon = p.icon;
                                            const isSelected = priority === p.value;
                                            return (
                                                <motion.button
                                                    key={p.value}
                                                    type="button"
                                                    initial={{ opacity: 0, x: 30 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.08, type: 'spring', damping: 20 }}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setPriority(p.value)}
                                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                                                        isSelected
                                                            ? `${p.bgColor} ${p.borderColor.split(' ')[0].replace('/30', '')} shadow-lg`
                                                            : `bg-[var(--color-surface)] ${p.borderColor}`
                                                    }`}
                                                >
                                                    <div className={`w-12 h-12 rounded-xl ${p.bgColor} flex items-center justify-center ${isSelected ? 'animate-bounce-in' : ''}`}>
                                                        <Icon className={`w-6 h-6 ${p.color}`} />
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm">{p.label}</span>
                                                            <span className="text-base">{p.emoji}</span>
                                                        </div>
                                                        <span className="text-xs text-[var(--color-text-secondary)]">{p.description}</span>
                                                    </div>
                                                    {isSelected && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            transition={{ type: 'spring', damping: 12 }}
                                                        >
                                                            <div className={`w-7 h-7 rounded-full ${p.bgColor} flex items-center justify-center`}>
                                                                <Check className={`w-4 h-4 ${p.color}`} strokeWidth={3} />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Step 3: Details (Deadline, Reminder, Recurrence) */}
                                {currentStep === 2 && (
                                    <div className="space-y-5">
                                        {/* Deadline */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0 }}
                                        >
                                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                                                <Calendar className="w-4 h-4 text-primary-500" />
                                                Deadline
                                            </label>
                                            <div className="w-full border-2 border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:border-primary-500 transition-all overflow-hidden">
                                                <input
                                                    type="datetime-local"
                                                    value={deadline}
                                                    onChange={(e) => setDeadline(e.target.value)}
                                                    className="w-full box-border bg-transparent border-none outline-none appearance-none text-base sm:text-sm px-5 py-3.5 m-0 block font-medium"
                                                />
                                            </div>
                                            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                                                Optional. Leave empty if this quest has no deadline.
                                            </p>
                                        </motion.div>

                                        {/* Reminder */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                                                <Clock className="w-4 h-4 text-violet-500" />
                                                Reminder
                                            </label>
                                            <div className="w-full border-2 border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:border-primary-500 transition-all overflow-hidden">
                                                <input
                                                    type="datetime-local"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="w-full box-border bg-transparent border-none outline-none appearance-none text-base sm:text-sm px-5 py-3.5 m-0 block font-medium"
                                                />
                                            </div>
                                            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                                                Optional reminder date and time.
                                            </p>
                                        </motion.div>

                                        {/* Recurrence */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                        >
                                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                                                <Repeat className="w-4 h-4 text-emerald-500" />
                                                Repeat
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {recurrenceOptions.map((r) => (
                                                    <motion.button
                                                        key={r.value}
                                                        type="button"
                                                        whileHover={{ scale: 1.03 }}
                                                        whileTap={{ scale: 0.97 }}
                                                        onClick={() => setRecurrence(r.value)}
                                                        className={`flex flex-col items-center gap-1 p-3.5 rounded-2xl border-2 transition-all ${
                                                            recurrence === r.value
                                                                ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/10'
                                                                : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-emerald-500/30'
                                                        }`}
                                                    >
                                                        <span className="text-xl">{r.emoji}</span>
                                                        <span className="text-xs font-bold">{r.label}</span>
                                                        <span className="text-[10px] text-[var(--color-text-secondary)]">{r.description}</span>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </div>
                                )}

                                {/* Step 4: Tags */}
                                {currentStep === 3 && (
                                    <div className="space-y-5">
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                                                <Tag className="w-4 h-4 text-pink-500" />
                                                Add Tags
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={tagInput}
                                                    onChange={(e) => setTagInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                                    placeholder="Type a tag..."
                                                    className="flex-1 px-5 py-3.5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-base sm:text-sm font-medium transition-all placeholder:text-[var(--color-text-secondary)]/40"
                                                    autoFocus={!isMobile}
                                                />
                                                <motion.button
                                                    type="button"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={addTag}
                                                    className="px-5 py-3.5 rounded-2xl bg-primary-500 text-white text-sm font-bold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow"
                                                >
                                                    Add
                                                </motion.button>
                                            </div>
                                        </motion.div>

                                        {tags.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="flex flex-wrap gap-2"
                                            >
                                                {tags.map((tag, i) => (
                                                    <motion.span
                                                        key={tag}
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ delay: i * 0.05, type: 'spring', damping: 15 }}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-500/10 to-violet-500/10 dark:from-pink-500/20 dark:to-violet-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/20"
                                                    >
                                                        #{tag}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTag(tag)}
                                                            className="ml-0.5 w-4 h-4 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                                                        >
                                                            <X className="w-2.5 h-2.5 text-red-500" />
                                                        </button>
                                                    </motion.span>
                                                ))}
                                            </motion.div>
                                        )}

                                        {/* Quick tag suggestions */}
                                        <div>
                                            <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                                                Popular tags 🔖
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {['work', 'personal', 'health', 'learning', 'urgent', 'home'].filter(t => !tags.includes(t)).map((suggestion) => (
                                                    <motion.button
                                                        key={suggestion}
                                                        type="button"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => setTags([...tags, suggestion])}
                                                        className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:border-primary-500/50 hover:text-primary-500 transition-all"
                                                    >
                                                        + {suggestion}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Summary Preview */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="p-4 rounded-2xl bg-gradient-to-br from-primary-500/5 via-violet-500/5 to-pink-500/5 dark:from-primary-500/10 dark:via-violet-500/10 dark:to-pink-500/10 border border-primary-500/10"
                                        >
                                            <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                                                Quest Summary ✨
                                            </p>
                                            <div className="space-y-1.5">
                                                <p className="text-sm font-bold">{title || 'Untitled quest'}</p>
                                                {description && <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>}
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        priorityOptions.find(p => p.value === priority)?.bgColor
                                                    } ${priorityOptions.find(p => p.value === priority)?.color}`}>
                                                        {priorityOptions.find(p => p.value === priority)?.emoji} {priority}
                                                    </span>
                                                    {recurrence !== 'NONE' && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                                                            🔄 {recurrence}
                                                        </span>
                                                    )}
                                                    {deadline && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                                                            📅 Deadline set
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-5 pb-5 pt-3">
                        <div className="flex gap-3">
                            {currentStep > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    type="button"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={goBack}
                                    className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-bold hover:bg-[var(--color-surface-hover)] transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back
                                </motion.button>
                            )}

                            {currentStep < STEPS.length - 1 ? (
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: canGoNext ? 1.03 : 1 }}
                                    whileTap={{ scale: canGoNext ? 0.97 : 1 }}
                                    onClick={goNext}
                                    disabled={!canGoNext}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-extrabold transition-all ${
                                        canGoNext
                                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50'
                                            : 'bg-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed'
                                    }`}
                                >
                                    Continue
                                    <ChevronRight className="w-4 h-4" />
                                </motion.button>
                            ) : (
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-extrabold transition-all ${
                                        isSubmitting
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', damping: 10 }}
                                            className="flex items-center gap-2"
                                        >
                                            <Check className="w-5 h-5" />
                                            Quest Created!
                                        </motion.div>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            {editTask ? 'Save Changes' : 'Create Quest!'}
                                        </>
                                    )}
                                </motion.button>
                            )}
                        </div>

                        {/* Skip hint on optional steps */}
                        {currentStep > 0 && currentStep < STEPS.length - 1 && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-center text-[10px] text-[var(--color-text-secondary)] mt-2"
                            >
                                This step is optional – feel free to skip!
                            </motion.p>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
