import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';
import Card from '../ui/Card';

export default function DailyFocusBar({ rows = [] }) {
  const { t } = useLocale();
  const avgMinutes = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + (row.minutes || 0), 0) / rows.length)
    : 0;

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">{t('stats.dailyFocusTitle')}</h3>
      <div className="mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              formatter={(value) => [formatMinutesHuman(value), t('stats.focusLegend')]}
            />
            <Bar dataKey="minutes" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-sm text-slate-400">{t('stats.avgPerDay', { value: formatMinutesHuman(avgMinutes) })}</p>
    </Card>
  );
}
