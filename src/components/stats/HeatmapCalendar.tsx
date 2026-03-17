import { useMemo } from 'react';
import { buildCompletionStatsByDate, useTaskStore } from '../../stores/taskStore';
import { toLocalDateKey } from '../../lib/dates';

interface HeatmapCalendarProps {
    months?: number;
}

export function HeatmapCalendar({ months = 5 }: HeatmapCalendarProps) {
    const completions = useTaskStore((state) => state.completions);

    const { cells, monthLabels, totalWeeks } = useMemo(() => {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - months);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const completionStatsByDate = buildCompletionStatsByDate(completions);

        const cells: Array<{ date: string; count: number; dayOfWeek: number; weekIndex: number }> = [];
        const monthLabels: Array<{ label: string; weekIndex: number }> = [];
        const currentDate = new Date(startDate);
        let weekIndex = 0;
        let lastMonth = -1;

        while (currentDate <= today) {
            const dateStr = toLocalDateKey(currentDate);
            const dayOfWeek = currentDate.getDay();

            if (dayOfWeek === 0 && cells.length > 0) weekIndex++;

            if (currentDate.getMonth() !== lastMonth) {
                lastMonth = currentDate.getMonth();

                const lastLabel = monthLabels[monthLabels.length - 1];
                if (lastLabel && weekIndex - lastLabel.weekIndex < 3) {
                    // If the new month starts too close to the previous label 
                    // (usually the first partial month), drop the previous label so they don't overlap
                    monthLabels.pop();
                }

                monthLabels.push({
                    label: currentDate.toLocaleDateString('en', { month: 'short' }),
                    weekIndex,
                });
            }

            cells.push({
                date: dateStr,
                count: completionStatsByDate.get(dateStr)?.count || 0,
                dayOfWeek,
                weekIndex,
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return { cells, monthLabels, totalWeeks: weekIndex + 1 };
    }, [completions, months]);

    const getFillColor = (count: number) => {
        if (count === 0) return 'fill-gray-100 dark:fill-[#2a2b36]';
        if (count <= 1) return 'fill-purple-200 dark:fill-purple-900/60';
        if (count <= 3) return 'fill-purple-400 dark:fill-purple-700';
        if (count <= 5) return 'fill-purple-500 dark:fill-purple-500';
        return 'fill-purple-600 dark:fill-purple-400';
    };

    const CELL_SIZE = 11;
    const CELL_GAP = 3;
    const PITCH = CELL_SIZE + CELL_GAP;

    const LABEL_OFFSET_X = 25;
    const LABEL_OFFSET_Y = 18;

    // total width covers all weeks + label area
    const svgWidth = LABEL_OFFSET_X + (totalWeeks * PITCH);
    // 7 days * pitch + top area
    const svgHeight = LABEL_OFFSET_Y + (7 * PITCH);

    return (
        <div className="card-surface rounded-2xl p-4 w-full">
            <div className="flex justify-between items-end mb-3">
                <div>
                    <h3 className="text-sm font-bold">Activity</h3>
                </div>
            </div>

            {/* SVG Heatmap */}
            <div className="w-full">
                <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-auto"
                >
                    {/* Month labels */}
                    {monthLabels.map((m, i) => (
                        <text
                            key={`month-${i}`}
                            x={LABEL_OFFSET_X + m.weekIndex * PITCH}
                            y={10}
                            className="text-[10px] fill-[var(--color-text-secondary)]"
                            fontSize="10"
                        >
                            {m.label}
                        </text>
                    ))}

                    {/* Day labels */}
                    {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => d && (
                        <text
                            key={`day-${i}`}
                            x={0}
                            y={LABEL_OFFSET_Y + i * PITCH + 9}
                            className="text-[9px] fill-[var(--color-text-secondary)]"
                            fontSize="9"
                        >
                            {d}
                        </text>
                    ))}

                    {/* Cells */}
                    {cells.map((cell) => (
                        <rect
                            key={`${cell.weekIndex}-${cell.dayOfWeek}`}
                            x={LABEL_OFFSET_X + cell.weekIndex * PITCH}
                            y={LABEL_OFFSET_Y + cell.dayOfWeek * PITCH}
                            width={CELL_SIZE}
                            height={CELL_SIZE}
                            rx={2}
                            ry={2}
                            className={getFillColor(cell.count)}
                        >
                            <title>{`${cell.date}: ${cell.count} tasks`}</title>
                        </rect>
                    ))}
                </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className="text-[10px] text-[var(--color-text-secondary)]">Less</span>
                {[0, 1, 3, 5, 7].map((count) => (
                    <svg key={count} width={10} height={10} className="rounded-[2px]">
                        <rect width={10} height={10} rx={2} ry={2} className={getFillColor(count)} />
                    </svg>
                ))}
                <span className="text-[10px] text-[var(--color-text-secondary)]">More</span>
            </div>
        </div>
    );
}
