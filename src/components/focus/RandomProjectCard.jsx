import { useLocale } from '../../contexts/LocaleContext';
import Button from '../ui/Button';
import Card from '../ui/Card';

export default function RandomProjectCard({ project, task, onStart }) {
  const { t } = useLocale();
  if (!project || !task) return null;

  return (
    <Card className="animate-[slideIn_250ms_ease-out]">
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color || '#6366F1' }}></span>
        <span>{project.title}</span>
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
