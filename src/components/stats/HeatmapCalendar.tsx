import { useMemo } from 'react';
import { useTaskStore } from '../../stores/taskStore';

interface HeatmapCalendarProps {
    months?: number;
}

export function HeatmapCalendar({ months = 3 }: HeatmapCalendarProps) {
    const { completions } = useTaskStore();

    const { cells, monthLabels } = useMemo(() => {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - months);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const completionMap = new Map<string, number>();
        completions.forEach((c) => {
            const date = c.completedAt.split('T')[0];
            completionMap.set(date, (completionMap.get(date) || 0) + 1);
        });

        const cells: Array<{ date: string; count: number; dayOfWeek: number; weekIndex: number }> = [];
        const monthLabels: Array<{ label: string; weekIndex: number }> = [];
        let currentDate = new Date(startDate);
        let weekIndex = 0;
        let lastMonth = -1;

        while (currentDate <= today) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getDay();

            if (dayOfWeek === 0 && cells.length > 0) weekIndex++;

            if (currentDate.getMonth() !== lastMonth) {
                lastMonth = currentDate.getMonth();
                monthLabels.push({
                    label: currentDate.toLocaleDateString('en', { month: 'short' }),
                    weekIndex,
                });
            }

            cells.push({
                date: dateStr,
                count: completionMap.get(dateStr) || 0,
                dayOfWeek,
                weekIndex,
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return { cells, monthLabels };
    }, [completions, months]);

    const getColor = (count: number) => {
        if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
        if (count <= 1) return 'bg-purple-200 dark:bg-purple-900/60';
        if (count <= 3) return 'bg-purple-400 dark:bg-purple-700';
        if (count <= 5) return 'bg-purple-500 dark:bg-purple-500';
        return 'bg-purple-600 dark:bg-purple-400';
    };

    const totalWeeks = cells.length > 0 ? cells[cells.length - 1].weekIndex + 1 : 0;

    return (
        <div className="card-surface rounded-2xl p-4">
            <h3 className="text-sm font-bold mb-3">Activity</h3>

            {/* Month labels */}
            <div className="flex mb-1 ml-7">
                {monthLabels.map((m, i) => (
                    <div
                        key={i}
                        className="text-[10px] text-[var(--color-text-secondary)]"
                        style={{
                            position: 'relative',
                            left: `${(m.weekIndex / totalWeeks) * 100}%`,
                            transform: 'translateX(-50%)',
                        }}
                    >
                        {m.label}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="flex gap-0.5">
                {/* Day labels */}
                <div className="flex flex-col gap-0.5 mr-1">
                    {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                        <div key={i} className="text-[9px] text-[var(--color-text-secondary)] h-[11px] flex items-center">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Cells grouped by week */}
                <div className="flex gap-0.5 flex-1 overflow-x-auto">
                    {Array.from({ length: totalWeeks }).map((_, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-0.5">
                            {Array.from({ length: 7 }).map((_, dayIdx) => {
                                const cell = cells.find(
                                    (c) => c.weekIndex === weekIdx && c.dayOfWeek === dayIdx
                                );
                                return (
                                    <div
                                        key={dayIdx}
                                        className={`w-[11px] h-[11px] rounded-sm ${cell ? getColor(cell.count) : 'bg-transparent'
                                            }`}
                                        title={cell ? `${cell.date}: ${cell.count} tasks` : ''}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1 mt-2 justify-end">
                <span className="text-[10px] text-[var(--color-text-secondary)]">Less</span>
                {[0, 1, 3, 5, 7].map((count) => (
                    <div key={count} className={`w-[11px] h-[11px] rounded-sm ${getColor(count)}`} />
                ))}
                <span className="text-[10px] text-[var(--color-text-secondary)]">More</span>
            </div>
        </div>
    );
}
