import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';

export default function ProjectProgressChart({ projects = [] }) {
  const { t } = useLocale();
  const sortedProjects = [...projects].sort((a, b) => (b.focusMinutes || 0) - (a.focusMinutes || 0));

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">{t('stats.focusByProject')}</h3>
      <div className="mt-4 space-y-3">
        {sortedProjects.map((project) => (
          <div key={project.project_id || project.title} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color || '#64748b' }}></span>
                  {project.title}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {t('stats.projectBreakdown', {
                    focus: formatMinutesHuman(project.focusMinutes || 0),
                    total: formatMinutesHuman(project.totalMinutes || 0),
                    efficiency: project.efficiencyRate || 0,
                  })}
                </p>
              </div>
              <p className="text-sm font-semibold text-slate-200">{project.efficiencyRate || 0}%</p>
            </div>
            <div className="mt-3">
              <ProgressBar value={project.focusMinutes || 0} max={project.totalMinutes || 1} colorClass="bg-emerald-500" />
            </div>
          </div>
        ))}
        {!sortedProjects.length && (
          <p className="text-sm text-slate-400">{t('stats.noProjectFocus')}</p>
        )}
      </div>
    </Card>
  );
}
