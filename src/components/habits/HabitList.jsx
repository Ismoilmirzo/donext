import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
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
  const { t } = useLocale();
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuHabitId) return undefined;

    function handlePointerDown(event) {
      if (menuRef.current?.contains(event.target)) return;
      setMenuHabitId(null);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [menuHabitId, setMenuHabitId]);

  function renderMenu(habit, open) {
    if (!open) return null;

    const actionItems = [
      {
        label: t('habits.edit'),
        icon: <Pencil className="h-3.5 w-3.5" />,
        className: 'text-slate-200',
        onClick: () => {
          setMenuHabitId(null);
          onEdit(habit);
        },
      },
      {
        label: t('habits.up'),
        icon: <ArrowUp className="h-3.5 w-3.5" />,
        className: 'text-slate-200',
        onClick: () => {
          setMenuHabitId(null);
          onReorder(habit, 'up');
        },
      },
      {
        label: t('habits.down'),
        icon: <ArrowDown className="h-3.5 w-3.5" />,
        className: 'text-slate-200',
        onClick: () => {
          setMenuHabitId(null);
          onReorder(habit, 'down');
        },
      },
      {
        label: t('habits.archive'),
        className: 'text-slate-200',
        onClick: () => {
          setMenuHabitId(null);
          onArchive(habit);
        },
      },
      {
        label: t('habits.delete'),
        icon: <Trash2 className="h-3.5 w-3.5" />,
        className: 'text-red-300',
        onClick: () => {
          setMenuHabitId(null);
          onDelete(habit);
        },
      },
    ];

    return (
      <div ref={menuRef}>
        <div className="hidden sm:block">
          <div className="absolute right-0 top-2 z-20 w-56 rounded-2xl border border-slate-700 bg-slate-900/95 p-2 shadow-2xl">
            {actionItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-800 ${item.className}`}
              >
                {item.icon || <span className="h-3.5 w-3.5" aria-hidden="true" />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="sm:hidden">
          <div className="fixed inset-0 z-40 bg-slate-950/60" aria-hidden="true" />
          <div className="fixed inset-x-4 bottom-24 z-50 rounded-[1.5rem] border border-slate-700 bg-slate-900 p-3 shadow-2xl">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{habit.title}</p>
            <div className="space-y-1">
              {actionItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm hover:bg-slate-800 ${item.className}`}
                >
                  {item.icon || <span className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {habits.map((habit) => {
        const open = menuHabitId === habit.id;
        return (
          <div key={habit.id} className="relative">
            <HabitCheckbox
              habit={habit}
              checked={Boolean(checkedMap[habit.id])}
              onToggle={() => onToggle(habit)}
              onMenu={() => setMenuHabitId(open ? null : habit.id)}
            />
            {renderMenu(habit, open)}
          </div>
        );
      })}
    </div>
  );
}
