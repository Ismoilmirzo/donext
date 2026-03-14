import { addDays, parseISO } from 'date-fns';
import Card from '../ui/Card';

export default function WeeklyGoalHistoryTable({ rows = [], formatMinutes, localeTag = 'en-US', t }) {
  if (!rows.length) return null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-100">{t('weeklyGoals.historyTitle')}</h3>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('weeklyGoals.historySubtitle')}</p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-3 pr-4 font-medium">{t('weeklyGoals.tableWeek')}</th>
              <th className="pb-3 pr-4 font-medium">{t('weeklyGoals.tableGoal')}</th>
              <th className="pb-3 pr-4 font-medium">{t('weeklyGoals.tableActual')}</th>
              <th className="pb-3 font-medium">{t('weeklyGoals.tableHit')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {rows.map((row) => {
              const weekStart = parseISO(row.week_start);
              const weekEnd = addDays(weekStart, 6);
              return (
                <tr key={row.id}>
                  <td className="py-3 pr-4">{`${weekStart.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' })}`}</td>
                  <td className="py-3 pr-4">{formatMinutes(row.target_minutes)}</td>
                  <td className="py-3 pr-4">{formatMinutes(row.actual_minutes)}</td>
                  <td className={`py-3 ${row.hit ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {row.hit ? '✓' : '✗'} {row.percentage}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
