import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import Button from '../ui/Button';
import ProjectStatusBadge from './ProjectStatusBadge';
import { formatMinutesHuman, formatRelativeTime } from '../../lib/dates';

export default function ProjectCard({ project, onReopen, onArchive }) {
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
          <p>Completed: {project.completed_at ? new Date(project.completed_at).toLocaleDateString() : '—'}</p>
          <p>Total focus: {formatMinutesHuman(project.focusMinutes || 0)}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => onReopen?.(project)}>
              Reopen
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onArchive?.(project)}>
              Archive
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>
              {completed}/{total} tasks
            </span>
            <span>{percent}%</span>
          </div>
          <ProgressBar value={percent} max={100} />
          <p className="text-xs text-slate-500">Last worked: {formatRelativeTime(project.lastWorkedAt)}</p>
        </div>
      )}
    </Card>
  );
}
