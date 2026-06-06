import { NavLink } from 'react-router-dom';
import { Activity, BookOpen, CalendarDays, Dumbbell, LineChart, ListChecks } from 'lucide-react';

const ITEMS = [
  { to: '/gym', label: 'Today', icon: Activity, end: true },
  { to: '/gym/program', label: 'Program', icon: ListChecks },
  { to: '/gym/history', label: 'History', icon: CalendarDays },
  { to: '/gym/progress', label: 'Progress', icon: LineChart },
  { to: '/gym/exercises', label: 'Exercises', icon: BookOpen },
];

export default function GymNav() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-slate-700 bg-slate-900/45 text-slate-300 hover:text-slate-100'
              }`
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </NavLink>
        );
      })}
      <NavLink
        to="/gym/onboarding"
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/45 px-3 py-2 text-sm text-slate-300 transition-colors hover:text-slate-100"
      >
        <Dumbbell className="h-4 w-4" aria-hidden="true" />
        Setup
      </NavLink>
    </div>
  );
}
