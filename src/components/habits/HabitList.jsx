import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import HabitCheckbox from './HabitCheckbox';

export default function HabitList({
  habits,
  checkedMap,
  onToggle,
  onEdit,
  onArchive,
  onDelete,
  onReorder,
  menuHabitId,
  setMenuHabitId,
}) {
  return (
    <div className="space-y-2">
      {habits.map((habit) => {
        const open = menuHabitId === habit.id;
        return (
          <div key={habit.id} className="space-y-2">
            <HabitCheckbox
              habit={habit}
              checked={Boolean(checkedMap[habit.id])}
              onToggle={() => onToggle(habit)}
              onMenu={() => setMenuHabitId(open ? null : habit.id)}
            />
            {open && (
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2 sm:grid-cols-5">
                <button
                  onClick={() => onEdit(habit)}
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-700 px-2 py-1.5 text-xs text-slate-200"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => onArchive(habit)}
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-700 px-2 py-1.5 text-xs text-slate-200"
                >
                  Archive
                </button>
                <button
                  onClick={() => onDelete(habit)}
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-red-500/20 px-2 py-1.5 text-xs text-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <button
                  onClick={() => onReorder(habit, 'up')}
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-700 px-2 py-1.5 text-xs text-slate-200"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Up
                </button>
                <button
                  onClick={() => onReorder(habit, 'down')}
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-700 px-2 py-1.5 text-xs text-slate-200"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Down
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
