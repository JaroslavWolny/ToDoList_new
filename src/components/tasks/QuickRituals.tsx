import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { Task } from '../../types';

/* ─── Emoji icons for common ritual keywords ─────────────────────── */
const RITUAL_ICONS: [RegExp, string][] = [
    [/kreatin/i, '💪'],
    [/creatine/i, '💪'],
    [/vitamin/i, '💊'],
    [/omega/i, '🐟'],
    [/magn[eé]z/i, '🧲'],
    [/zinc|zinek/i, '⚡'],
    [/iron|železo/i, '🔩'],
    [/protein/i, '🥤'],
    [/water|vod[ay]/i, '💧'],
    [/workout|cvičení|gym|trén/i, '🏋️'],
    [/meditat/i, '🧘'],
    [/journal|deník/i, '📓'],
    [/read|čt/i, '📖'],
    [/sleep|spá/i, '😴'],
    [/walk|procház/i, '🚶'],
    [/stretch/i, '🤸'],
    [/cold.*shower|studená.*sprcha/i, '🥶'],
    [/shower|sprcha/i, '🚿'],
    [/tea|čaj/i, '🍵'],
    [/coffee|káva/i, '☕'],
    [/brush|zub/i, '🪥'],
    [/skin|pleť/i, '✨'],
    [/supplement/i, '💊'],
    [/pill|prášek|lék/i, '💊'],
];

const getRitualIcon = (title: string): string => {
    for (const [pattern, icon] of RITUAL_ICONS) {
        if (pattern.test(title)) return icon;
    }
    return '⚡';
};

/* ─── Circular progress ring ─────────────────────────────────────── */
interface ProgressRingProps {
    completed: number;
    total: number;
}

function ProgressRing({ completed, total }: ProgressRingProps) {
    const radius = 38;
    const stroke = 5;
    const normalizedRadius = radius - stroke;
    const circumference = normalizedRadius * 2 * Math.PI;
    const progress = total > 0 ? completed / total : 0;
    const strokeDashoffset = circumference - progress * circumference;
    const allDone = total > 0 && completed === total;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative">
                <svg width={radius * 2} height={radius * 2} className="transform -rotate-90">
                    {/* Track */}
                    <circle
                        stroke="var(--color-border)"
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    {/* Progress */}
                    <motion.circle
                        stroke="url(#ritualGradient)"
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        strokeDasharray={`${circumference} ${circumference}`}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                    />
                    <defs>
                        <linearGradient id="ritualGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#7c3aed" />
                            <stop offset="50%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                        key={completed}
                        initial={{ scale: 1.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-sm font-black"
                    >
                        {allDone ? '✅' : `${completed}/${total}`}
                    </motion.span>
                </div>
            </div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                {allDone ? 'All rituals done! 🎉' : 'Daily Rituals'}
            </p>
        </div>
    );
}

/* ─── Single ritual pill ─────────────────────────────────────────── */
interface RitualPillProps {
    task: Task;
    onComplete: (id: string) => void;
    index: number;
}

const RitualPill = memo(function RitualPill({ task, onComplete, index }: RitualPillProps) {
    const [isCompleting, setIsCompleting] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const isDone = task.status === 'COMPLETED';
    const icon = getRitualIcon(task.title);

    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleTap = () => {
        if (isDone || isCompleting) return;
        setIsCompleting(true);

        timeoutRef.current = window.setTimeout(() => {
            onComplete(task.id);
        }, 400);
    };

    return (
        <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            onClick={handleTap}
            disabled={isDone}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                isDone || isCompleting
                    ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-primary-300 dark:hover:border-primary-700'
            }`}
        >
            {/* Icon */}
            <span className="text-xl flex-shrink-0 w-8 text-center">{icon}</span>

            {/* Title */}
            <span
                className={`flex-1 text-left text-sm font-semibold truncate transition-all ${
                    isDone || isCompleting
                        ? 'line-through text-green-600 dark:text-green-400 opacity-70'
                        : 'text-[var(--color-text)]'
                }`}
            >
                {task.title}
            </span>

            {/* Checkbox */}
            <div
                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isDone || isCompleting
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 dark:border-gray-600'
                }`}
            >
                <AnimatePresence>
                    {(isDone || isCompleting) && (
                        <motion.svg
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            className="text-white"
                        >
                            <motion.path
                                d="M2 7L5.5 10.5L12 3.5"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                            />
                        </motion.svg>
                    )}
                </AnimatePresence>
            </div>
        </motion.button>
    );
});

/* ─── Main drawer ────────────────────────────────────────────────── */
export const RITUAL_TAG = 'ritual';

interface QuickRitualsProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    onComplete: (id: string) => void;
}

export const QuickRituals = memo(function QuickRituals({
    isOpen,
    onClose,
    tasks,
    onComplete,
}: QuickRitualsProps) {
    const dragControls = useDragControls();
    const constraintsRef = useRef<HTMLDivElement>(null);

    // Filter ritual tasks: tasks with 'ritual' tag that are today's recurring
    const ritualTasks = tasks.filter(
        (t) => t.tags.includes(RITUAL_TAG)
    );

    // Sort: uncompleted first, then completed
    const sortedRituals = [...ritualTasks].sort((a, b) => {
        if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
        if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
        return 0;
    });

    const completedCount = ritualTasks.filter((t) => t.status === 'COMPLETED').length;
    const totalCount = ritualTasks.length;

    const handleDragEnd = useCallback(
        (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
            }
        },
        [onClose]
    );

    // Lock scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-scroll-lock');
        } else {
            document.body.classList.remove('modal-scroll-lock');
        }
        return () => document.body.classList.remove('modal-scroll-lock');
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        ref={constraintsRef}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        drag="y"
                        dragControls={dragControls}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.6 }}
                        onDragEnd={handleDragEnd}
                        className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-3xl overflow-hidden"
                        style={{
                            background: 'var(--color-bg)',
                            borderTop: '1px solid var(--color-border)',
                        }}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                            <div className="w-10 h-1.5 rounded-full bg-[var(--color-text-secondary)] opacity-30" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-500" />
                                <h2 className="text-lg font-bold">Quick Rituals</h2>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]"
                            >
                                <X className="w-5 h-5" />
                            </motion.button>
                        </div>

                        {/* Content */}
                        <div className="px-5 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 5rem)' }}>
                            {/* Progress Ring */}
                            <div className="flex justify-center py-4">
                                <ProgressRing completed={completedCount} total={totalCount} />
                            </div>

                            {/* Ritual List */}
                            {sortedRituals.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="text-4xl mb-3">💊</div>
                                    <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                                        No rituals yet
                                    </p>
                                    <p className="text-xs text-[var(--color-text-secondary)] opacity-70">
                                        Add the tag <span className="font-semibold text-purple-500">#{RITUAL_TAG}</span> to any recurring task
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {sortedRituals.map((task, i) => (
                                        <RitualPill
                                            key={task.id}
                                            task={task}
                                            onComplete={onComplete}
                                            index={i}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Motivational footer when all done */}
                            <AnimatePresence>
                                {totalCount > 0 && completedCount === totalCount && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="mt-6 text-center"
                                    >
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40">
                                            <span className="text-sm">🏆</span>
                                            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                                All rituals completed!
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Safe area padding */}
                            <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});
