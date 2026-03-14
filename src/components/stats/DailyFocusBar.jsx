import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';

export default function DailyFocusBar({ rows = [] }) {
  const { t } = useLocale();
  const hasFocusData = rows.some((row) => (row.focusMinutes || 0) > 0 || (row.totalMinutes || 0) > 0);
  const avgFocusMinutes = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + (row.focusMinutes || 0), 0) / rows.length)
    : 0;
  const avgTotalMinutes = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + (row.totalMinutes || 0), 0) / rows.length)
    : 0;

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">{t('stats.dailyFocusTitle')}</h3>
      {!hasFocusData ? (
        <div className="mt-4">
          <EmptyState title="Your daily focus chart will show up after the first session" message="Finish one task in Focus and this chart will start tracking both focused time and overhead." />
        </div>
      ) : (
        <>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(value, name) => [formatMinutesHuman(value), name === 'focusMinutes' ? t('stats.focusLegend') : t('stats.overheadLegend')]}
                />
                <Legend formatter={(value) => (value === 'focusMinutes' ? t('stats.focusLegend') : t('stats.overheadLegend'))} />
                <Bar dataKey="focusMinutes" stackId="time" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="overheadMinutes" stackId="time" fill="#334155" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid gap-1 text-sm text-slate-400 sm:grid-cols-2">
            <p>{t('stats.avgPerDay', { value: formatMinutesHuman(avgFocusMinutes) })}</p>
            <p>{t('stats.avgTotalPerDay', { value: formatMinutesHuman(avgTotalMinutes) })}</p>
          </div>
        </>
      )}
    </Card>
  );
}
