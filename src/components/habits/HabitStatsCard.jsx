import { useMemo } from 'react';
import Card from '../ui/Card';

export default function HabitStatsCard({ habits = [], logs = [] }) {
  const rows = useMemo(() => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const monthDates = new Set();
    logs.forEach((log) => {
      const date = new Date(log.date);
      if (date.getFullYear() === year && date.getMonth() === month) {
        monthDates.add(log.date);
      }
    });
    const totalDays = Math.max(1, monthDates.size || new Date().getDate());

    return habits
      .map((habit) => {
        const completed = logs.filter((log) => log.habit_id === habit.id && log.completed).length;
        const rate = Math.min(100, Math.round((completed / totalDays) * 100));
        return { ...habit, rate };
      })
      .sort((a, b) => b.rate - a.rate);
  }, [habits, logs]);

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">Per-Habit Completion</h3>
      <div className="mt-3 space-y-3">
        {rows.map((habit) => (
          <div key={habit.id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-200">
                {habit.icon || '✓'} {habit.title}
              </span>
              <span className="text-slate-400">{habit.rate}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ backgroundColor: `${habit.color || '#10B981'}22` }}>
              <div
                className="h-2 rounded-full"
                style={{ width: `${habit.rate}%`, backgroundColor: habit.color || '#10B981' }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
