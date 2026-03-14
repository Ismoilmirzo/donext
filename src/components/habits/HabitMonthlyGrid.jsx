import { useMemo } from 'react';
import { eachDayOfInterval, endOfMonth, isAfter, startOfMonth } from 'date-fns';
import { useLocale } from '../../contexts/LocaleContext';
import { toISODate } from '../../lib/dates';
import { getLocaleTag } from '../../lib/i18n';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';

function intensityClass(rate) {
  if (rate <= 0) return 'bg-slate-800';
  if (rate < 50) return 'bg-emerald-900/60';
  if (rate < 80) return 'bg-emerald-700/70';
  if (rate < 100) return 'bg-emerald-500/80';
  return 'bg-emerald-400';
}

export default function HabitMonthlyGrid({ habits = [], logs = [], streak = null, freezeDates = [] }) {
  const { locale, t } = useLocale();
  const hasHabitData = habits.length > 0 && logs.some((log) => log.completed);
  const today = useMemo(() => new Date(), []);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const freezeSet = useMemo(() => new Set(freezeDates), [freezeDates]);
  const rows = useMemo(() => {
    return days.map((day) => {
      const date = toISODate(day);
      const completed = logs.filter((log) => log.date === date && log.completed).length;
      const rate = habits.length ? Math.round((completed / habits.length) * 100) : 0;
      return { date, rate, isFuture: isAfter(day, today), isFrozen: freezeSet.has(date) };
    });
  }, [days, freezeSet, habits.length, logs, today]);

  const doneDays = rows.filter((row) => row.rate >= 80 && !row.isFuture).length;
  const totalDays = rows.filter((row) => !row.isFuture).length;
  const monthlyRate = totalDays ? Math.round((doneDays / totalDays) * 100) : 0;
  const frozenDays = rows.filter((row) => row.isFrozen && !row.isFuture).length;
  const monthLabel = new Intl.DateTimeFormat(getLocaleTag(locale), { month: 'long' }).format(today);

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">{t('habits.monthlyHeatmap')}</h3>
      {!hasHabitData ? (
        <div className="mt-4">
          <EmptyState title="The monthly heatmap appears after your first habit streak starts" message="Come back tomorrow after a few check-ins to see stronger patterns here." />
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {rows.map((row) => (
              <div
                key={row.date}
                className={`h-8 rounded-md border ${
                  row.isFuture
                    ? 'border-dashed border-slate-700 bg-slate-800'
                    : row.isFrozen
                      ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                      : `border-slate-700 ${intensityClass(row.rate)}`
                }`}
                title={row.isFrozen ? `${row.date}: ${t('habits.freezeDayTitle')}` : `${row.date}: ${row.rate}%`}
              >
                {row.isFrozen && !row.isFuture ? <span className="flex h-full items-center justify-center text-sm">*</span> : null}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-400">
            {t('habits.monthlySummary', { month: monthLabel, rate: monthlyRate, done: doneDays, total: totalDays })}
          </p>
          <p className="mt-1 text-xs text-slate-500">{t('habits.freezeSummary', { count: frozenDays })}</p>
          <p className="mt-1 text-xs text-slate-500">{t('habits.freezeLegend')}</p>
          <p className="mt-1 text-sm text-emerald-300">{t('habits.streakDays', { count: streak?.current || 0 })}</p>
        </>
      )}
    </Card>
  );
}
