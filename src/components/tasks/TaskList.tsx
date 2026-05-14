import { memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Task } from '../../types';
import { TaskCard } from './TaskCard';

interface TaskListProps {
    tasks: Task[];
    onComplete: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (task: Task) => void;
    onTagClick?: (tag: string) => void;
    emptyMessage?: string;
}

export const TaskList = memo(function TaskList({ tasks, onComplete, onDelete, onEdit, onTagClick, emptyMessage }: TaskListProps) {
    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-4xl mb-3">🎯</div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                    {emptyMessage || 'No tasks yet. Add one to get started!'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <AnimatePresence initial={false}>
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onComplete={onComplete}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onTagClick={onTagClick}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
});

