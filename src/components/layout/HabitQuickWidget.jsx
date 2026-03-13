import { CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../contexts/LocaleContext';

export default function HabitQuickWidget({ summary, hidden = false }) {
  const { t } = useLocale();

  if (hidden || !summary.totalHabits) return null;

  return (
    <Link
      to="/habits"
      className="fixed bottom-20 right-4 z-40 flex items-center gap-3 rounded-full border border-emerald-500/30 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-lg shadow-slate-950/30 backdrop-blur md:bottom-6 md:right-6"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
        <CheckSquare className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-slate-500">{t('app.habitsWidgetLabel')}</p>
        <p className="font-medium text-slate-100">
          {t('app.habitsWidgetValue', { completed: summary.completedHabits, total: summary.totalHabits })}
        </p>
      </div>
    </Link>
  );
}
