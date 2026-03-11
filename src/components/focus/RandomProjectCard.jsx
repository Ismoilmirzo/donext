import Button from '../ui/Button';
import Card from '../ui/Card';

export default function RandomProjectCard({ project, task, onStart }) {
  if (!project || !task) return null;

  return (
    <Card className="animate-[slideIn_250ms_ease-out]">
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color || '#6366F1' }}></span>
        <span>{project.title}</span>
      </div>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Task #{(project.completedTasks || 0) + 1} of {project.totalTasks || 0}
      </p>
      <h3 className="mt-2 text-xl font-semibold text-slate-50">{task.title}</h3>
      {task.description && <p className="mt-2 text-sm text-slate-400">{task.description}</p>}
      <div className="mt-4">
        <Button onClick={onStart} className="w-full">
          Let's Go ▶
        </Button>
      </div>
    </Card>
  );
}
