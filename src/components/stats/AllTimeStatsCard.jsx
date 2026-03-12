import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';
import Card from '../ui/Card';

export default function AllTimeStatsCard({ stats }) {
  const { t } = useLocale();

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">{t('stats.projectsOverview')}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
        <p>{t('stats.active', { count: stats.activeCount })}</p>
        <p>{t('stats.completedThisMonth', { count: stats.completedThisMonth })}</p>
        <p>{t('stats.tasksCompleted', { count: stats.tasksCompleted })}</p>
        <p>{t('stats.avgTimePerTask', { value: formatMinutesHuman(Math.round(stats.avgTimePerTask || 0)) })}</p>
      </div>
    </Card>
  );
}
