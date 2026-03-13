import { parseISO } from 'date-fns';
import { useLocale } from '../../contexts/LocaleContext';
import { getLocaleTag } from '../../lib/i18n';
import Card from '../ui/Card';

export default function HabitStreakCard({
  current = 0,
  longest = 0,
  availableFreezes = 0,
  usedThisWeek = 0,
  storageCap = 2,
  nextGrantDate = null,
}) {
  const { locale, t } = useLocale();
  const refillLabel = nextGrantDate
    ? new Intl.DateTimeFormat(getLocaleTag(locale), { weekday: 'short', month: 'short', day: 'numeric' }).format(parseISO(nextGrantDate))
    : '-';

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">{t('habits.streaks')}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{t('common.current')}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{current}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{t('common.longest')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{t('habits.longestDays', { count: longest })}</p>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/10 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-sky-200">{t('habits.freezeInventoryTitle')}</p>
            <p className="mt-1 text-2xl font-bold text-sky-100">{t('habits.freezeInventoryValue', { available: availableFreezes, total: storageCap })}</p>
            <p className="mt-1 text-sm text-sky-100/80">{t('habits.freezeInventoryUsed', { used: usedThisWeek, total: storageCap })}</p>
          </div>
          <div className="flex gap-2 pt-1">
            {Array.from({ length: storageCap }).map((_, index) => (
              <span
                key={index}
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-lg ${
                  index < availableFreezes
                    ? 'border-sky-400/50 bg-sky-400/20 text-sky-100'
                    : 'border-slate-700 bg-slate-900/40 text-slate-500'
                }`}
              >
                ❄️
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900/60">
          <div className="h-full rounded-full bg-sky-400/70" style={{ width: `${(availableFreezes / Math.max(1, storageCap)) * 100}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate-300">
          {availableFreezes === storageCap ? t('habits.freezeAtCapacity') : t('habits.freezeNextRefill', { total: storageCap, date: refillLabel })}
        </p>
      </div>
    </Card>
  );
}
