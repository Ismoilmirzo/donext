import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';
import { getLocaleTag } from '../../lib/i18n';
import Card from '../ui/Card';

export default function ProjectFocusHistory({ sessions = [], loading = false }) {
  const { locale, t } = useLocale();

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{t('projects.focusHistoryTitle')}</h2>
          <p className="mt-1 text-sm text-slate-400">{t('projects.focusHistoryBody')}</p>
        </div>
        <span className="text-xs text-slate-500">{t('projects.focusHistoryCount', { count: sessions.length })}</span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">{t('projects.loadingFocusHistory')}</p>
      ) : sessions.length ? (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-100">{session.task?.title || t('projects.focusHistoryTaskFallback')}</p>
                <p className="text-xs text-slate-500">
                  {new Date(session.created_at || session.date).toLocaleDateString(getLocaleTag(locale), {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {t('projects.focusHistoryLine', {
                  focus: formatMinutesHuman(session.duration_minutes || 0),
                  total: formatMinutesHuman(session.total_duration_minutes ?? session.duration_minutes ?? 0),
                })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{t('projects.noFocusHistory')}</p>
      )}
    </Card>
  );
}
