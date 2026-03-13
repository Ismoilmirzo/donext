import { useMemo, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import Card from '../ui/Card';
import HabitTrendChart from './HabitTrendChart';

export default function HabitStatsCard({ habits = [], logs = [] }) {
  const { t } = useLocale();
  const [mode, setMode] = useState('bars');

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">{t('habits.perHabitCompletion')}</h3>
          <p className="mt-1 text-sm text-slate-500">{t('habits.perHabitTabs')}</p>
        </div>

        <div className="rounded-xl bg-slate-900/60 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode('bars')}
            className={`rounded-lg px-3 py-1.5 ${mode === 'bars' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
          >
            {t('habits.completionBars')}
          </button>
          <button
            type="button"
            onClick={() => setMode('trends')}
            className={`rounded-lg px-3 py-1.5 ${mode === 'trends' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
          >
            {t('habits.trendsTab')}
          </button>
        </div>
      </div>

      {mode === 'bars' ? (
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
      ) : (
        <HabitTrendChart t={t} />
      )}
    </Card>
  );
}
