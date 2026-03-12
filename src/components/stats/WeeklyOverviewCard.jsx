import { useLocale } from '../../contexts/LocaleContext';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';

export default function WeeklyOverviewCard({ overallRate = 0, bestHabit = null, worstHabit = null, streak = 0 }) {
  const { t } = useLocale();
  const bestValue = bestHabit ? `${bestHabit.title} (${Math.round(bestHabit.completionRate)}%)` : t('stats.none');
  const worstValue = worstHabit ? `${worstHabit.title} (${Math.round(worstHabit.completionRate)}%)` : t('stats.none');

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">{t('stats.habitOverview')}</h3>
      <p className="mt-2 text-sm text-slate-400">{t('stats.weeklyCompletion', { value: Math.round(overallRate) })}</p>
      <div className="mt-2">
        <ProgressBar value={overallRate} max={100} />
      </div>
      <div className="mt-3 space-y-1 text-sm text-slate-400">
        <p>{t('stats.bestHabit', { value: bestValue })}</p>
        <p>{t('stats.needsWork', { value: worstValue })}</p>
        <p>{t('stats.streak', { count: streak })}</p>
      </div>
    </Card>
  );
}
