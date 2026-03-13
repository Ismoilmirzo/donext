import { useLocale } from '../../contexts/LocaleContext';
import { getLocaleTag } from '../../lib/i18n';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ProjectPriorityBadge from '../projects/ProjectPriorityBadge';

export default function RandomProjectCard({ project, task, onStart }) {
  const { locale, t } = useLocale();
  if (!project || !task) return null;

  return (
    <Card className="animate-[slideIn_250ms_ease-out]">
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color || '#6366F1' }}></span>
        <span>{project.title}</span>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ProjectPriorityBadge priority={project.priority_tag} effectivePriority={project.effectivePriority} deadlineMeta={project} />
        <span className="text-xs text-slate-500">
          {t('projects.preferredTimeSummary', { value: t(`projects.preferredTime.${project.preferred_time || 'any'}`) })}
        </span>
        {project.hasDeadline && (
          <span className="text-xs text-slate-500">
            {project.isOverdue
              ? t('projects.deadlineOverdueCompact')
              : project.daysUntilDeadline === 0
                ? t('projects.deadlineTodayCompact')
              : project.isDueSoon
                ? t('projects.deadlineSoonCompact', { count: project.daysUntilDeadline })
                : t('projects.deadlineDateCompact', {
                    date: new Date(project.deadline_date).toLocaleDateString(getLocaleTag(locale)),
                  })}
          </span>
        )}
      </div>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {t('focus.randomTaskOf', { current: (project.completedTasks || 0) + 1, total: project.totalTasks || 0 })}
      </p>
      <h3 className="mt-2 text-xl font-semibold text-slate-50">{task.title}</h3>
      {task.description && <p className="mt-2 text-sm text-slate-400">{task.description}</p>}
      <div className="mt-4">
        <Button onClick={onStart} className="w-full">
          {t('focus.letsGo')}
        </Button>
      </div>
    </Card>
  );
}
