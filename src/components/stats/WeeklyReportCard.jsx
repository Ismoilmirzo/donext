import { forwardRef } from 'react';
import { formatMinutesHuman } from '../../lib/dates';

function BreakdownRow({ item, totalMinutes }) {
  const width = totalMinutes > 0 ? Math.max(12, Math.round((item.minutes / totalMinutes) * 100)) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-slate-200">{item.name}</span>
        <span className="shrink-0 font-medium text-slate-400">{formatMinutesHuman(item.minutes)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: item.color || '#10B981' }} />
      </div>
    </div>
  );
}

const WeeklyReportCard = forwardRef(function WeeklyReportCard({ stats }, ref) {
  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-slate-900 to-[#1a1a3e] px-10 py-10 text-white"
      style={{ width: 540, height: 675, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.2),_transparent_35%)]" />
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-2xl text-slate-950">⚡</div>
          <div>
            <p className="text-lg font-semibold tracking-tight">DoNext · Weekly Report</p>
            <p className="text-sm text-slate-400">{stats.weekLabel}</p>
          </div>
        </div>

        <div className="mt-7 grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm text-slate-400">🔥 Streak</span>
            <p className="mt-1 text-2xl font-semibold">{stats.streak}-day streak</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-slate-400">⏱ Focused</span>
              <p className="mt-1 text-xl font-semibold">{formatMinutesHuman(stats.focusMinutes)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-slate-400">✅ Tasks</span>
              <p className="mt-1 text-xl font-semibold">{stats.tasksCompleted}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-slate-400">📋 Projects</span>
              <p className="mt-1 text-xl font-semibold">{stats.projectsWorked}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-slate-400">✓ Habits</span>
              <p className="mt-1 text-xl font-semibold">{Math.round(stats.habitRate)}%</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex-1 rounded-[28px] border border-white/10 bg-slate-950/20 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Focus Breakdown</p>
          <div className="mt-4 space-y-4">
            {stats.projectBreakdown.length ? (
              stats.projectBreakdown.slice(0, 3).map((item) => (
                <BreakdownRow key={item.name} item={item} totalMinutes={stats.focusMinutes} />
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
                No focus breakdown this week yet.
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm tracking-[0.18em] text-slate-500">donext.uz</p>
      </div>
    </div>
  );
});

export default WeeklyReportCard;
