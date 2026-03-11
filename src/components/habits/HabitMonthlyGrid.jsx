import { useMemo } from 'react';
import { eachDayOfInterval, endOfMonth, format, isAfter, startOfMonth } from 'date-fns';
import Card from '../ui/Card';
import { calculateStreak } from '../../hooks/useHabits';
import { toISODate } from '../../lib/dates';

function intensityClass(rate) {
  if (rate <= 0) return 'bg-slate-800';
  if (rate < 50) return 'bg-emerald-900/60';
  if (rate < 80) return 'bg-emerald-700/70';
  if (rate < 100) return 'bg-emerald-500/80';
  return 'bg-emerald-400';
}

export default function HabitMonthlyGrid({ habits = [], logs = [] }) {
  const today = useMemo(() => new Date(), []);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const rows = useMemo(() => {
    return days.map((day) => {
      const date = toISODate(day);
      const completed = logs.filter((log) => log.date === date && log.completed).length;
      const rate = habits.length ? Math.round((completed / habits.length) * 100) : 0;
      return { date, rate, isFuture: isAfter(day, today) };
    });
  }, [days, habits.length, logs, today]);

  const doneDays = rows.filter((row) => row.rate >= 80 && !row.isFuture).length;
  const totalDays = rows.filter((row) => !row.isFuture).length;
  const monthlyRate = totalDays ? Math.round((doneDays / totalDays) * 100) : 0;
  const streak = calculateStreak(logs, habits.length, today);

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">Monthly Heatmap</h3>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {rows.map((row) => (
          <div
            key={row.date}
            className={`h-8 rounded-md border ${
              row.isFuture ? 'border-dashed border-slate-700 bg-slate-800' : `border-slate-700 ${intensityClass(row.rate)}`
            }`}
            title={`${row.date}: ${row.rate}%`}
          />
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-400">
        {format(today, 'MMMM')}: {monthlyRate}% · {doneDays}/{totalDays} days
      </p>
      <p className="mt-1 text-sm text-emerald-300">🔥 {streak.current} days</p>
    </Card>
  );
}
