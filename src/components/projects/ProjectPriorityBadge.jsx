import { useLocale } from '../../contexts/LocaleContext';

const priorityStyles = {
  urgent: 'border-red-500/40 bg-red-500/10 text-red-200',
  normal: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  someday: 'border-slate-600 bg-slate-800 text-slate-300',
};

export default function ProjectPriorityBadge({ priority = 'normal', effectivePriority = 'normal', deadlineMeta = null }) {
  const { t } = useLocale();
  const tone = priorityStyles[effectivePriority] || priorityStyles.normal;
  const label = effectivePriority !== priority ? effectivePriority : priority;

  if (deadlineMeta?.isOverdue) {
    return <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">{t('projects.deadlineOverdueBadge')}</span>;
  }

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${tone}`}>
      {t(`projects.priority.${label}`)}
    </span>
  );
}
