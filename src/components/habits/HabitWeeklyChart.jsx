import { useMemo } from 'react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useLocale } from '../../contexts/LocaleContext';
import { getWeekDays } from '../../lib/dates';
import Card from '../ui/Card';

function getBarColor(rate) {
  if (rate < 50) return '#ef4444';
  if (rate < 80) return '#f59e0b';
  return '#10b981';
}

export default function HabitWeeklyChart({ habits = [], logs = [] }) {
  const { locale, t } = useLocale();
  const data = useMemo(() => {
    const days = getWeekDays(new Date(), locale);
    return days.map((day) => {
      const completed = logs.filter((log) => log.date === day.date && log.completed).length;
      const rate = habits.length ? Math.round((completed / habits.length) * 100) : 0;
      return {
        day: day.label,
        rate,
        isToday: day.date === new Date().toISOString().slice(0, 10),
      };
    });
  }, [habits.length, locale, logs]);

  const average = data.length ? Math.round(data.reduce((sum, row) => sum + row.rate, 0) / data.length) : 0;

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">{t('habits.weeklyCompletion')}</h3>
      <div className="mt-3 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} stroke="#94a3b8" />
            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} stroke="#94a3b8" />
            <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
              <LabelList dataKey="rate" position="top" fill="#94a3b8" fontSize={11} formatter={(value) => `${value}%`} />
              {data.map((entry) => (
                <Cell
                  key={entry.day}
                  fill={getBarColor(entry.rate)}
                  stroke={entry.isToday ? '#f8fafc' : undefined}
                  strokeWidth={entry.isToday ? 1 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-sm text-slate-400">{t('habits.weekAverage', { value: average })}</p>
    </Card>
  );
}
