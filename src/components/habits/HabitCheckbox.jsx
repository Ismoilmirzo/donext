import { useRef } from 'react';
import { Check } from 'lucide-react';

export default function HabitCheckbox({ habit, checked, onToggle, onMenu, moving }) {
  const touchStartRef = useRef(null);

  function handleTouchStart(event) {
    touchStartRef.current = event.changedTouches?.[0]?.clientX ?? null;
  }

  function handleTouchEnd(event) {
    const startX = touchStartRef.current;
    const endX = event.changedTouches?.[0]?.clientX ?? null;
    touchStartRef.current = null;
    if (startX == null || endX == null) return;
    if (endX - startX >= 64) {
      onToggle?.();
    }
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
        checked ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-700 bg-slate-800/50'
      }`}
    >
      <button type="button" onClick={onToggle} className="flex min-w-0 items-center gap-3 text-left" aria-pressed={checked}>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
            checked
              ? 'animate-habit-check border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-600 bg-slate-800 text-transparent'
          }`}
        >
          <Check className="h-4 w-4" />
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-base">{habit.icon || 'v'}</span>
          <span className="truncate text-sm font-medium text-slate-100">{habit.title}</span>
        </span>
      </button>

      <button
        type="button"
        onClick={onMenu}
        className={`rounded-md px-2 py-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200 ${
          moving ? 'opacity-60' : ''
        }`}
        aria-label={`Open actions for ${habit.title}`}
      >
        ...
      </button>
    </div>
  );
}
