import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Tag, Clock } from 'lucide-react';
import { Task, Priority, Recurrence } from '../../types';
import { toDateTimeLocalInputValue } from '../../lib/dates';

interface TaskFormProps {
    onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'lastResetDate'>) => void;
    onClose: () => void;
    editTask?: Task | null;
}

const priorities: { value: Priority; label: string; color: string }[] = [
    { value: 'LOW', label: 'Low', color: 'bg-blue-500' },
    { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'HIGH', label: 'High', color: 'bg-orange-500' },
    { value: 'CRITICAL', label: 'Critical', color: 'bg-red-500' },
];

export function TaskForm({ onSubmit, onClose, editTask }: TaskFormProps) {
    const [title, setTitle] = useState(editTask?.title || '');
    const [description, setDescription] = useState(editTask?.description || '');
    const [priority, setPriority] = useState<Priority>(editTask?.priority || 'MEDIUM');
    const [deadline, setDeadline] = useState(toDateTimeLocalInputValue(editTask?.deadline ?? null));
    const [startDate, setStartDate] = useState(toDateTimeLocalInputValue(editTask?.startDate ?? null));
    const [recurrence, setRecurrence] = useState<Recurrence>(editTask?.recurrence || 'NONE');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>(editTask?.tags || []);

    const toISOOrNull = (value: string): string | null => {
        if (!value) return null;

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;

        return parsed.toISOString();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
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
    };

    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center safe-top safe-bottom safe-x"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg card-surface rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto"
                    style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold">
                            {editTask ? 'Edit Task' : 'New Task'}
                        </h2>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-[var(--color-surface-hover)]"
                        >
                            <X className="w-5 h-5" />
                        </motion.button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">
                                Task Name *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What needs to be done?"
                                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm"
                                autoFocus
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add details..."
                                rows={2}
                                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm resize-none"
                            />
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">
                                Priority
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {priorities.map((p) => (
                                    <motion.button
                                        key={p.value}
                                        type="button"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setPriority(p.value)}
                                        className={`py-2.5 rounded-xl text-xs font-bold transition-all ${priority === p.value
                                            ? `${p.color} text-white shadow-lg`
                                            : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                                            }`}
                                    >
                                        {p.label}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Deadline */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">
                                <Calendar className="w-4 h-4 inline mr-1.5" />
                                Deadline
                            </label>
                            <div className="w-full border border-[var(--color-border)] bg-[var(--color-surface-hover)] rounded-xl focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition-all overflow-hidden">
                                <input
                                    type="datetime-local"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full box-border bg-transparent border-none outline-none appearance-none text-sm px-4 py-3 m-0 block"
                                />
                            </div>
                        </div>

                        {/* Reminder */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">
                                <Clock className="w-4 h-4 inline mr-1.5" />
                                Reminder
                            </label>
                            <div className="w-full border border-[var(--color-border)] bg-[var(--color-surface-hover)] rounded-xl focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition-all overflow-hidden">
                                <input
                                    type="datetime-local"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full box-border bg-transparent border-none outline-none appearance-none text-sm px-4 py-3 m-0 block"
                                />
                            </div>
                        </div>

                        {/* Recurrence */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">
                                Repeat
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {(['NONE', 'DAILY', 'WEEKLY'] as Recurrence[]).map((r) => (
                                    <motion.button
                                        key={r}
                                        type="button"
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setRecurrence(r)}
                                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${recurrence === r
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                                            }`}
                                    >
                                        {r === 'NONE' ? 'Once' : r === 'DAILY' ? 'Daily' : 'Weekly'}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">
                                <Tag className="w-4 h-4 inline mr-1.5" />
                                Tags
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    placeholder="Add tag..."
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                                />
                                <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.95 }}
                                    onClick={addTag}
                                    className="px-4 py-2.5 rounded-xl bg-[var(--color-surface-hover)] text-sm font-medium hover:bg-[var(--color-border)]"
                                >
                                    Add
                                </motion.button>
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-primary-100/50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                                        >
                                            {tag}
                                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        <motion.button
                            type="submit"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-shadow"
                        >
                            {editTask ? 'Save Changes' : 'Create Task'}
                        </motion.button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
