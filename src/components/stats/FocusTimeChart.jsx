import Card from '../ui/Card';
import { formatMinutesHuman } from '../../lib/dates';

export default function FocusTimeChart({ totalMinutes = 0, deltaMinutes = 0, label = 'this period' }) {
  const positive = deltaMinutes >= 0;

  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate-500">Focus Time</p>
      <p className="mt-2 font-mono text-3xl font-bold text-slate-50">{formatMinutesHuman(totalMinutes)}</p>
      <p className="mt-1 text-sm text-slate-400">total focus {label}</p>
      <p className={`mt-2 text-sm ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {positive ? '+' : '-'}
        {formatMinutesHuman(Math.abs(deltaMinutes))} vs previous period
      </p>
    </Card>
  );
}
