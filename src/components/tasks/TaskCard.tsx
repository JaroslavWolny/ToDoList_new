import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, AlertTriangle, Trash2, Edit3, Lock } from 'lucide-react';
import { Task } from '../../types';
import { getPriorityLabel, getPriorityColor } from '../../lib/gamification';
import { format, isPast, parseISO, isFuture } from 'date-fns';

interface TaskCardProps {
    task: Task;
    onComplete: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (task: Task) => void;
}

export function TaskCard({ task, onComplete, onDelete, onEdit }: TaskCardProps) {
    const [showXP, setShowXP] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && task.status === 'ACTIVE';
    const isLocked = task.startDate && isFuture(parseISO(task.startDate)) && task.status === 'ACTIVE';

    const handleComplete = () => {
        if (task.status !== 'ACTIVE' || isLocked) return;
        setIsCompleting(true);
        setShowXP(true);
        setTimeout(() => {
            onComplete(task.id);
        }, 600);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -200 }}
            transition={{ duration: 0.3 }}
            className={`relative card-surface rounded-2xl p-4 ${isOverdue ? 'border-red-500/40 dark:border-red-500/30' : ''
                } ${task.status === 'COMPLETED' ? 'opacity-60' : ''}`}
        >
            {/* XP particle animation */}
            <AnimatePresence>
                {showXP && (
                    <motion.div
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 0, y: -40 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="absolute top-2 right-4 text-lg font-bold gradient-text z-10"
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
                    className={`mt-0.5 w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${isLocked
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 cursor-not-allowed opacity-60'
                        : task.status === 'COMPLETED'
                            ? 'bg-green-500 border-green-500'
                            : isCompleting
                                ? 'bg-green-500 border-green-500 animate-bounce-in'
                                : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
                        }`}
                >
                    {isLocked && <Lock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />}
                    {(task.status === 'COMPLETED' || isCompleting) && !isLocked && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <Check className="w-4 h-4 text-white" />
                        </motion.div>
                    )}
                </motion.button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold text-sm truncate ${task.status === 'COMPLETED' ? 'line-through text-[var(--color-text-secondary)]' : ''
                            }`}>
                            {task.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getPriorityColor(task.priority)}`}>
                            {getPriorityLabel(task.priority)}
                        </span>
                    </div>

                    {task.description && (
                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-2">
                            {task.description}
                        </p>
                    )}

                    <div className="flex items-center gap-3">
                        {task.deadline && (
                            <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500' : 'text-[var(--color-text-secondary)]'
                                }`}>
                                {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                <span>{format(parseISO(task.deadline), 'MMM d, HH:mm')}</span>
                            </div>
                        )}
                        {isLocked && task.startDate && (
                            <div className="flex items-center gap-1 text-xs text-blue-500 opacity-80">
                                <Lock className="w-3 h-3" />
                                <span>Reminder for {format(parseISO(task.startDate), 'MMM d, HH:mm')}</span>
                            </div>
                        )}
                        {task.tags.length > 0 && (
                            <div className="flex gap-1">
                                {task.tags.slice(0, 2).map((tag) => (
                                    <span key={tag} className="px-1.5 py-0.5 rounded-md text-[10px] bg-primary-100/50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                {task.status === 'ACTIVE' && (
                    <div className="flex flex-col gap-1">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onEdit(task)}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onDelete(task.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-secondary)] hover:text-red-500"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
