import { ChevronDown, ChevronUp, MoonStar } from 'lucide-react';
import { useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';

export default function DailySummaryBanner({ summary }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);

  if (!summary.shouldShowEveningSummary) return null;

  return (
    <div className="dn-banner-info mb-4 rounded-xl border px-4 py-3 text-sm">
      <button type="button" onClick={() => setExpanded((prev) => !prev)} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <MoonStar className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">
              {t('app.dailySummaryCompact', {
                habits: `${summary.completedHabits}/${summary.totalHabits}`,
                focus: formatMinutesHuman(summary.focusMinutes),
                tasks: summary.tasksCompleted,
              })}
            </p>
            <p className="mt-1 text-xs opacity-80">
              {expanded ? t('app.dailySummaryHide') : t('app.dailySummaryExpand')}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="mt-1 h-4 w-4 shrink-0" /> : <ChevronDown className="mt-1 h-4 w-4 shrink-0" />}
      </button>

      {expanded && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-70">{t('app.dailySummaryMissedHabits')}</p>
            {summary.missedHabits.length ? (
              <ul className="mt-2 space-y-1 text-sm">
                {summary.missedHabits.map((habit) => (
                  <li key={habit}>- {habit}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm">{t('app.dailySummaryAllHabitsDone')}</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide opacity-70">{t('app.dailySummaryWorkedProjects')}</p>
            {summary.workedProjects.length ? (
              <ul className="mt-2 space-y-2 text-sm">
                {summary.workedProjects.map((project) => (
                  <li key={`${project.id || project.title}`}>
                    <span className="font-medium">{project.title}</span>
                    <span className="opacity-80">
                      {' '}
                      - {t('app.dailySummaryWorkedProjectsLine', {
                        focus: formatMinutesHuman(project.focusMinutes),
                        tasks: project.tasksCompleted,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm">{t('app.dailySummaryNoProjects')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
