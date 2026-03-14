import { useEffect, useState } from 'react';
import { CheckSquare, Minimize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../contexts/LocaleContext';

const STORAGE_KEY = 'donext-habit-widget-hidden';

export default function HabitQuickWidget({ summary, hidden = false }) {
  const { t } = useLocale();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  if (hidden || !summary.totalHabits || dismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 hidden items-center gap-3 rounded-full border border-emerald-500/30 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-lg shadow-slate-950/30 backdrop-blur md:flex">
      <Link to="/habits" className="flex items-center gap-3">
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
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          window.localStorage.setItem(STORAGE_KEY, '1');
        }}
        className="dn-icon-button rounded-full p-2"
        aria-label="Dismiss habits widget"
      >
        <Minimize2 className="h-4 w-4" />
      </button>
    </div>
  );
}
