import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';
import Card from '../ui/Card';

export default function MonthlyOverviewCard({ rows = [], trendPercent = 0 }) {
  const { t } = useLocale();
  const trendValue = `${trendPercent >= 0 ? '+' : ''}${Math.round(trendPercent)}%`;

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">{t('stats.monthlyTrend')}</h3>
      <div className="mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows}>
            <defs>
              <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              formatter={(value) => [formatMinutesHuman(value), t('stats.focusLegend')]}
            />
            <Area type="monotone" dataKey="minutes" stroke="#10b981" fill="url(#focusGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className={`mt-2 text-sm ${trendPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t('stats.trendVsLastMonth', { value: trendValue })}</p>
    </Card>
  );
}
