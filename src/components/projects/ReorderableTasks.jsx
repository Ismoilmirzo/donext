import { ArrowDown, ArrowUp } from 'lucide-react';
import TaskRow from './TaskRow';

export default function ReorderableTasks({ tasks, onMove, onTaskClick }) {
  const pendingTasks = tasks.filter((task) => task.status !== 'completed');
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const firstPendingId = pendingTasks[0]?.id;

  return (
    <div className="space-y-2">
      {pendingTasks.map((task) => (
        <div key={task.id} className="flex items-stretch gap-2">
          <div className="w-full">
            <TaskRow task={task} isNext={task.id === firstPendingId} onClick={() => onTaskClick?.(task)} />
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onMove?.(task, 'up')}
              className="rounded-md border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onMove?.(task, 'down')}
              className="rounded-md border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {completedTasks.map((task) => (
        <TaskRow key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
      ))}
    </div>
  );
}
