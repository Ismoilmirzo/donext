import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';
import Card from '../ui/Card';

export default function FocusTimeChart({ totalMinutes = 0, deltaMinutes = 0, label = 'this period' }) {
  const { t } = useLocale();
  const positive = deltaMinutes >= 0;
  const delta = `${positive ? '+' : '-'}${formatMinutesHuman(Math.abs(deltaMinutes))}`;

  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate-500">{t('stats.focusTime')}</p>
      <p className="mt-2 font-mono text-3xl font-bold text-slate-50">{formatMinutesHuman(totalMinutes)}</p>
      <p className="mt-1 text-sm text-slate-400">{t('stats.totalFocus', { label })}</p>
      <p className={`mt-2 text-sm ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {t('stats.vsPrevious', { delta })}
      </p>
    </Card>
  );
}
