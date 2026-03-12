import { Link } from 'react-router-dom';
import { useLocale } from '../../contexts/LocaleContext';
import { getLocaleTag } from '../../lib/i18n';
import { formatMinutesHuman, formatRelativeTime } from '../../lib/dates';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import ProjectStatusBadge from './ProjectStatusBadge';

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
          <p className="text-xs text-slate-500">{t('projects.lastWorked', { value: formatRelativeTime(project.lastWorkedAt) })}</p>
        </div>
      )}
    </Card>
  );
}
