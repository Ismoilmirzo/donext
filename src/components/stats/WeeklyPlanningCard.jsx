import { differenceInCalendarDays } from 'date-fns';
import { TrendingUp, Calendar, Target } from 'lucide-react';

const DEFAULT_SESSION_MIN = 30;

export default function WeeklyPlanningCard({ activeProjects, weeklyGoal, focusStats, t }) {
  const avgSession = focusStats?.avgSessionLength || DEFAULT_SESSION_MIN;

  const suggestions = getSuggestions(activeProjects, t);

  const remaining = weeklyGoal?.remainingMinutes ?? 0;
  const sessionsNeeded = Math.max(1, Math.ceil(remaining / avgSession));

  const daysLeft = weeklyGoal?.daysLeft ?? 7;
  const sessionsPerDay = (sessionsNeeded / Math.max(1, daysLeft)).toFixed(1);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-indigo-400" />
        <h3 className="text-base font-semibold text-slate-100">
          {t('planning.title')}
        </h3>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-800/50 px-3 py-2">
        <Target className="h-4 w-4 text-emerald-400" />
        <span className="text-sm text-slate-300">
          {t('planning.estimatedSessions')}: {sessionsNeeded}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-800/50 px-3 py-2">
        <TrendingUp className="h-4 w-4 text-amber-400" />
        <span className="text-sm text-slate-300">
          {t('planning.paceMessage', { sessions: sessionsPerDay })}
        </span>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2"
            >
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="truncate text-sm font-medium text-slate-100">
                {s.title}
              </span>
              <span className="ml-auto whitespace-nowrap text-xs text-slate-400">
                {s.reason}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getSuggestions(activeProjects, t) {
  if (!activeProjects?.length) return [];
  const now = new Date();

  const scored = activeProjects.map((p) => {
    const daysUntilDeadline = p.deadline_date
      ? differenceInCalendarDays(new Date(p.deadline_date), now)
      : Infinity;
    const isUrgent = p.effectivePriority === 'urgent' || p.priority_tag === 'urgent' || daysUntilDeadline <= 3;
    const reason = isUrgent || daysUntilDeadline <= 7
      ? t('planning.deadlineReason')
      : p.priority_tag === 'urgent'
        ? t('planning.priorityReason')
        : t('planning.momentumReason');

    return {
      id: p.id,
      title: p.title,
      color: p.color || '#6366f1',
      reason,
      score:
        (isUrgent ? 1000 : 0) +
        (daysUntilDeadline < Infinity ? 500 - daysUntilDeadline : 0) +
        (p.priority_tag === 'urgent' ? 200 : p.priority_tag === 'normal' ? 100 : 0) +
        (p.updated_at ? (now - new Date(p.updated_at)) / 86400000 : 0),
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
