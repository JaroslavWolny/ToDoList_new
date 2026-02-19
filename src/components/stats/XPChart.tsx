import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTaskStore } from '../../stores/taskStore';
import { subDays, format } from 'date-fns';

interface XPChartProps {
    days?: number;
}

export function XPChart({ days = 14 }: XPChartProps) {
    const { completions } = useTaskStore();

    const data = useMemo(() => {
        const today = new Date();
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(today, i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayCompletions = completions.filter(
                (c) => c.completedAt.split('T')[0] === dateStr
            );
            const xp = dayCompletions.reduce((sum, c) => sum + c.xpEarned, 0);
            result.push({
                date: format(date, 'MMM d'),
                xp,
                tasks: dayCompletions.length,
            });
        }
        return result;
    }, [completions, days]);

    return (
        <div className="card-surface rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">XP Trend</h3>
                <span className="text-xs text-[var(--color-text-secondary)]">Last {days} days</span>
            </div>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                            interval="preserveStartEnd"
                        />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                fontSize: '12px',
                            }}
                            formatter={(value: number, name: string) => [
                                name === 'xp' ? `${value} XP` : `${value} tasks`,
                                name === 'xp' ? 'XP Earned' : 'Tasks',
                            ]}
                        />
                        <Area
                            type="monotone"
                            dataKey="xp"
                            stroke="#a855f7"
                            strokeWidth={2}
                            fill="url(#xpGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
