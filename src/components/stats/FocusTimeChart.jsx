import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';
import Card from '../ui/Card';

export default function FocusTimeChart({
  focusMinutes = 0,
  totalMinutes = 0,
  overheadMinutes = 0,
  efficiencyRate = 0,
  deltaMinutes = 0,
  label = 'this period',
}) {
  const { t } = useLocale();
  const positive = deltaMinutes >= 0;
  const delta = `${positive ? '+' : '-'}${formatMinutesHuman(Math.abs(deltaMinutes))}`;

  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate-500">{t('stats.focusTime')}</p>
      <p className="mt-2 font-mono text-3xl font-bold text-slate-50">{formatMinutesHuman(focusMinutes)}</p>
      <p className="mt-1 text-sm text-slate-400">{t('stats.totalFocus', { label })}</p>
      <p className={`mt-2 text-sm ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {t('stats.vsPrevious', { delta })}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{t('stats.totalTimeSpent')}</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">{formatMinutesHuman(totalMinutes)}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{t('stats.overheadTime')}</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">{formatMinutesHuman(overheadMinutes)}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{t('stats.efficiency')}</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">{Math.round(efficiencyRate)}%</p>
        </div>
      </div>
    </Card>
  );
}
