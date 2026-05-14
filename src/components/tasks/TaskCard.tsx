import { memo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, AlertTriangle, Trash2, Edit3, Lock } from 'lucide-react';
import { Task } from '../../types';
import { getPriorityLabel, getPriorityColor } from '../../lib/gamification';

const formatDeadline = (isoString: string): string => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date);
};

const isDatePast = (isoString: string): boolean =>
    new Date(isoString).getTime() < Date.now();

const isDateFuture = (isoString: string): boolean =>
    new Date(isoString).getTime() > Date.now();

interface TaskCardProps {
    task: Task;
    onComplete: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (task: Task) => void;
    onTagClick?: (tag: string) => void;
}

export const TaskCard = memo(function TaskCard({ task, onComplete, onDelete, onEdit, onTagClick }: TaskCardProps) {
    const [showXP, setShowXP] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const completeTimeoutRef = useRef<number | null>(null);
    const isOverdue = task.deadline && isDatePast(task.deadline) && task.status === 'ACTIVE';
    const isLocked = task.startDate && isDateFuture(task.startDate) && task.status === 'ACTIVE';

    useEffect(() => {
        return () => {
            if (completeTimeoutRef.current !== null) {
                window.clearTimeout(completeTimeoutRef.current);
            }
        };
    }, []);

    const handleComplete = () => {
        if (task.status !== 'ACTIVE' || isLocked) return;
        setIsCompleting(true);
        setShowXP(true);

        if (completeTimeoutRef.current !== null) {
            window.clearTimeout(completeTimeoutRef.current);
        }

        completeTimeoutRef.current = window.setTimeout(() => {
            onComplete(task.id);
        }, 550);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -120, transition: { duration: 0.2 } }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`glass-card relative px-4 py-3.5 ${
                isOverdue ? 'border-red-500/50' : ''
            } ${task.status === 'COMPLETED' ? 'opacity-55' : ''}`}
        >
            <AnimatePresence>
                {showXP && (
                    <motion.div
                        initial={{ opacity: 1, y: 0, scale: 1 }}
                        animate={{ opacity: 0, y: -50, scale: 1.2 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7 }}
                        className="absolute top-2 right-4 text-base font-black gradient-text z-10 text-stat"
                    >
                        +XP ✨
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-start gap-3">
                {/* Checkbox */}
                <motion.button
                    whileHover={!isLocked ? { scale: 1.1 } : {}}
                    whileTap={!isLocked ? { scale: 0.9 } : {}}
                    onClick={handleComplete}
                    disabled={task.status !== 'ACTIVE' || !!isLocked}
                    className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all border-2 ${
                        isLocked
                            ? 'bg-white/5 border-white/10 cursor-not-allowed'
                            : task.status === 'COMPLETED' || isCompleting
                                ? 'bg-gradient-to-br from-emerald-400 to-green-500 border-transparent shadow-lg shadow-emerald-500/40'
                                : 'border-[var(--color-border-strong)] hover:border-purple-500 hover:bg-purple-500/10'
                    }`}
                >
                    {isLocked && <Lock className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />}
                    {(task.status === 'COMPLETED' || isCompleting) && !isLocked && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 12 }}>
                            <Check className="w-4 h-4 text-white" strokeWidth={3} />
                        </motion.div>
                    )}
                </motion.button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold text-sm truncate ${task.status === 'COMPLETED' ? 'line-through text-[var(--color-text-secondary)]' : ''}`}>
                            {task.title}
                        </h3>
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase shrink-0 ${getPriorityColor(task.priority)}`}>
                            {getPriorityLabel(task.priority)}
                        </span>
                    </div>

                    {task.description && (
                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-2 leading-snug">
                            {task.description}
                        </p>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                        {task.deadline && (
                            <div className={`inline-flex items-center gap-1 text-[11px] font-medium ${isOverdue ? 'text-red-500' : 'text-[var(--color-text-tertiary)]'}`}>
                                {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                <span className="text-stat">{formatDeadline(task.deadline)}</span>
                            </div>
                        )}
                        {isLocked && task.startDate && (
                            <div className="inline-flex items-center gap-1 text-[11px] text-blue-400">
                                <Lock className="w-3 h-3" />
                                <span className="text-stat">Starts {formatDeadline(task.startDate)}</span>
                            </div>
                        )}
                        {task.tags.length > 0 && (
                            <div className="flex gap-1">
                                {task.tags.slice(0, 2).map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={(e) => {
                                            if (onTagClick) {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                onTagClick(tag);
                                            }
                                        }}
                                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/12 text-purple-400 border border-purple-500/20 ${onTagClick ? 'hover:bg-purple-500/20 cursor-pointer' : 'cursor-default'}`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {task.status === 'ACTIVE' && (
                    <div className="flex flex-col gap-1">
                        <motion.button
                            whileHover={{ scale: 1.12 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onEdit(task)}
                            className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] hover:bg-white/5"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.12 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onDelete(task.id)}
                            className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-red-400 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                    </div>
                )}
            </div>
        </motion.div>
    );
});
