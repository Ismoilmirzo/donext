import BadgeProgressBar from './BadgeProgressBar';

export default function BadgeCard({ badge }) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        badge.unlocked
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : badge.progress.percentage > 0
            ? 'border-slate-600 bg-slate-800/90'
            : 'border-slate-700 bg-slate-900/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/60 text-2xl">
          {badge.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">{badge.title}</p>
              <p className="mt-1 text-sm text-slate-400">{badge.description}</p>
            </div>
            {badge.unlocked && <span className="text-xs font-medium uppercase tracking-wide text-emerald-300">Unlocked</span>}
          </div>

          {badge.unlocked ? (
            <p className="mt-3 text-xs text-emerald-200/90">
              {badge.unlocked_at ? `Unlocked ${new Date(badge.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Unlocked'}
            </p>
          ) : badge.progress.percentage > 0 ? (
            <>
              <p className="mt-3 text-xs text-slate-400">{badge.progress.detail}</p>
              <BadgeProgressBar percentage={badge.progress.percentage} />
            </>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Locked</p>
          )}
        </div>
      </div>
    </div>
  );
}
