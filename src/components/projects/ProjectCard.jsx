import { Link } from 'react-router-dom';
import { useLocale } from '../../contexts/LocaleContext';
import { getLocaleTag } from '../../lib/i18n';
import { formatMinutesHuman, formatRelativeTime } from '../../lib/dates';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import ProjectPriorityBadge from './ProjectPriorityBadge';
import ProjectStatusBadge from './ProjectStatusBadge';

function formatDeadline(project, locale, t) {
  if (!project?.hasDeadline || !project?.deadline_date) return t('projects.noDeadline');
  const label = new Date(project.deadline_date).toLocaleDateString(getLocaleTag(locale));
  if (project.isOverdue) return t('projects.deadlineOverdue', { date: label });
  if (project.daysUntilDeadline === 0) return t('projects.deadlineToday', { date: label });
  if (project.isDueSoon) return t('projects.deadlineSoon', { count: project.daysUntilDeadline, date: label });
  return t('projects.deadlineOn', { date: label });
}

export default function ProjectCard({ project, onReopen, onArchive }) {
  const { locale, t } = useLocale();
  const total = project.totalTasks || 0;
  const completed = project.completedTasks || 0;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <Card className="border-l-4" style={{ borderLeftColor: project.color || '#6366F1' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/projects/${project.id}`} className="text-base font-semibold text-slate-100 hover:text-emerald-300">
            {project.title}
          </Link>
          {project.description && <p className="mt-1 text-sm text-slate-400">{project.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ProjectPriorityBadge priority={project.priority_tag} effectivePriority={project.effectivePriority} deadlineMeta={project} />
            {project.hasDeadline && <span className="text-xs text-slate-500">{formatDeadline(project, locale, t)}</span>}
            <span className="text-xs text-slate-500">
              {t('projects.preferredTimeSummary', { value: t(`projects.preferredTime.${project.preferred_time || 'any'}`) })}
            </span>
          </div>
        </div>
        <ProjectStatusBadge status={project.status} needsReview={project.hasAutoReviewPending} />
      </div>

      {project.status === 'completed' ? (
        <div className="mt-3 space-y-2 text-sm text-slate-400">
          <p>
            {t('projects.completedOn')}: {project.completed_at ? new Date(project.completed_at).toLocaleDateString(getLocaleTag(locale)) : t('projects.noDate')}
          </p>
          <p>
            {t('projects.totalFocus')}: {formatMinutesHuman(project.focusMinutes || 0)}
          </p>
          <p>
            {t('projects.totalTimeSpentShort')}: {formatMinutesHuman(project.totalMinutes || 0)}
          </p>
          <p>
            {t('projects.efficiencyRate', { value: project.efficiencyRate || 0 })}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => onReopen?.(project)}>
              {t('common.restore')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onArchive?.(project)}>
              {t('common.archive')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{t('projects.taskCount', { completed, total })}</span>
            <span>{percent}%</span>
          </div>
          <ProgressBar value={percent} max={100} />
          <div className="grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
            <p>{t('projects.totalFocusShort', { value: formatMinutesHuman(project.focusMinutes || 0) })}</p>
            <p>{t('projects.efficiencyRate', { value: project.efficiencyRate || 0 })}</p>
          </div>
          <p className="text-xs text-slate-500">{t('projects.lastWorked', { value: formatRelativeTime(project.lastWorkedAt) })}</p>
          {project.status === 'archived' ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => onReopen?.(project)}>
                {t('common.restore')}
              </Button>
            </div>
          ) : onArchive ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => onArchive?.(project)}>
                {t('common.archive')}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
