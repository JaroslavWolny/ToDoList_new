import { Completion, DailyMission, Priority, Task } from '../types';

type MissionType = DailyMission['type'];

const isHighPriority = (priority: Priority): boolean =>
    priority === 'HIGH' || priority === 'CRITICAL';

export function getMissionProgressUpdates(
    completedTask: Task | undefined,
    completionsToday: Completion[],
    allTasks: Task[],
    now = new Date()
): Partial<Record<MissionType, number>> {
    const updates: Partial<Record<MissionType, number>> = {
        complete_tasks: completionsToday.length,
        marathon: completionsToday.length,
    };

    if (completedTask?.priority === 'CRITICAL') {
        updates.complete_critical = 1;
    }

    if (completedTask?.priority === 'LOW') {
        updates.no_sweat = completionsToday.filter((completion) => {
            const task = allTasks.find((item) => item.id === completion.taskId);
            return task?.priority === 'LOW';
        }).length;
    }

    if (completedTask?.priority && isHighPriority(completedTask.priority)) {
        updates.complete_high = completionsToday.filter((completion) => {
            const task = allTasks.find((item) => item.id === completion.taskId);
            return task?.priority !== undefined && isHighPriority(task.priority);
        }).length;
    }

    const hour = now.getHours();
    if (hour < 10) {
        updates.early_bird = 1;
    }
    if (hour >= 20) {
        updates.night_owl = 1;
    }

    return updates;
}
