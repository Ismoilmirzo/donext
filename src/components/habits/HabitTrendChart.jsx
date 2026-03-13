import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useHabitTrends } from '../../hooks/useHabitTrends';

export default function HabitTrendChart({ t }) {
  const { trends, chartData, loading, error } = useHabitTrends(8);
  const [showAll, setShowAll] = useState(false);

  const visibleTrends = useMemo(() => {
    if (showAll || trends.length <= 5) return trends;
    return [...trends].sort((a, b) => b.currentRate - a.currentRate).slice(0, 5);
  }, [showAll, trends]);

  if (loading) {
    return <p className="mt-4 text-sm text-slate-500">{t('habits.trendsLoading')}</p>;
  }

  if (error) {
    return <p className="mt-4 text-sm text-red-400">{error}</p>;
  }

  return (
    <div className="mt-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#475569' }} />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 12,
                color: '#f8fafc',
              }}
              formatter={(value, habitId) => {
                const habit = trends.find((row) => row.habitId === habitId);
                return [`${value ?? 0}%`, habit?.title || habitId];
              }}
            />
            {visibleTrends.map((habit) => (
              <Line
                key={habit.habitId}
                type="monotone"
                dataKey={habit.habitId}
                stroke={habit.color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: habit.color }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 space-y-2">
        {visibleTrends.map((habit) => (
          <div key={habit.habitId} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm">
            <div className="flex items-center gap-2 text-slate-200">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: habit.color }} />
              <span>{habit.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-100">{habit.currentRate}%</span>
              <span className={habit.delta > 0 ? 'text-emerald-300' : habit.delta < 0 ? 'text-rose-300' : 'text-slate-500'}>
                {habit.delta > 0 ? '+' : ''}
                {habit.delta}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {trends.length > 5 && (
        <button type="button" onClick={() => setShowAll((prev) => !prev)} className="mt-4 text-sm text-emerald-300 hover:text-emerald-200">
          {showAll ? t('habits.showTopTrends') : t('habits.showAllTrends')}
        </button>
      )}
    </div>
  );
}
