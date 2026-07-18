import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useUserStore } from '../../stores/userStore';
import { toLocalDateKey } from '../../lib/dates';

const formatShortDate = (date: Date): string =>
    new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);

const MOOD_LABELS: Record<number, string> = {
    1: '😫 Drained',
    2: '😕 Meh',
    3: '😐 Okay',
    4: '🙂 Good',
    5: '🔥 On fire',
};

interface MoodTrendChartProps {
    days?: number;
}

/** Vibe trend from daily check-ins. Renders nothing until at least two moods are logged. */
export function MoodTrendChart({ days = 14 }: MoodTrendChartProps) {
    const moodLog = useUserStore((state) => state.moodLog);

    const { data, loggedCount } = useMemo(() => {
        const today = new Date();
        const result = [];
        let logged = 0;

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const mood = moodLog[toLocalDateKey(date)] ?? null;
            if (mood !== null) logged += 1;
            result.push({
                date: formatShortDate(date),
                mood,
            });
        }
        return { data: result, loggedCount: logged };
    }, [moodLog, days]);

    if (loggedCount < 2) return null;

    return (
        <div className="card-surface rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">Vibe Trend</h3>
                <span className="text-xs text-[var(--color-text-secondary)]">Last {days} days</span>
            </div>
            <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                            interval="preserveStartEnd"
                        />
                        <YAxis hide domain={[1, 5]} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                fontSize: '12px',
                            }}
                            formatter={(value: number | undefined) => [
                                value ? MOOD_LABELS[value] : 'Not logged',
                                'Vibe',
                            ]}
                        />
                        <Area
                            type="monotone"
                            dataKey="mood"
                            stroke="#a78bfa"
                            strokeWidth={2}
                            fill="url(#moodGradient)"
                            connectNulls
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
