import TaskRow from './TaskRow';

export default function ReorderableTasks({ tasks, onMove, onTaskClick, onStartTask }) {
  const pendingTasks = tasks.filter((task) => task.status !== 'completed');
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const firstPendingId = pendingTasks[0]?.id;

  return (
    <div className="space-y-2">
      {pendingTasks.map((task, index) => (
        <TaskRow
          key={task.id}
          task={task}
          isNext={task.id === firstPendingId}
          onClick={() => onTaskClick?.(task)}
          onMove={onMove}
          canMoveUp={index > 0}
          canMoveDown={index < pendingTasks.length - 1}
          onStart={task.id === firstPendingId ? () => onStartTask?.(task) : undefined}
        />
      ))}

      {completedTasks.map((task) => (
        <TaskRow key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
      ))}
    </div>
  );
}
