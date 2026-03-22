import { ArrowDown, ArrowUp, CheckCircle2, Circle, Clock, Play } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';
import { getLocaleTag } from '../../lib/i18n';
import { getTaskFocusMinutes } from '../../lib/taskSessions';
import { formatEstimate } from '../../lib/timeEstimates';
import TaskAIActions from './TaskAIActions';

export default function TaskRow({
  task,
  isNext = false,
  onClick,
  onMove,
  canMoveUp = false,
  canMoveDown = false,
  onStart,
  onSplit,
  onClarify,
  aiLoading = false,
  projectTitle = '',
  estimatedMinutes = null,
}) {
  const { locale, t } = useLocale();
  const isCompleted = task.status === 'completed';
  const totalFocusMinutes = getTaskFocusMinutes(task);
  const sessionCount = Math.max(0, Number(task.sessions_count) || 0);

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isCompleted
          ? 'border-slate-700 bg-slate-800/50'
          : isNext
            ? 'border-emerald-500/60 bg-emerald-500/10'
            : 'border-slate-700 bg-slate-800'
      }`}
    >
      <div className="flex items-start gap-3">
        {isCompleted ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
        ) : (
          <Circle className="mt-0.5 h-4 w-4 text-slate-500" />
        )}
        <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left" title={!isCompleted ? t('taskRow.startHint') : undefined}>
          <p className={`text-sm ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{task.title}</p>
          {task.description ? (
            <p className="mt-1 truncate text-xs text-slate-400">{task.description}</p>
          ) : null}
          {isCompleted ? (
            <p className="mt-1 text-xs text-slate-500">
              {formatMinutesHuman(totalFocusMinutes)}
              {sessionCount > 1 ? ` | ${t('stats.sessionsLabel', { count: sessionCount })}` : ''}
              {task.completed_at ? ` | ${new Date(task.completed_at).toLocaleDateString(getLocaleTag(locale))}` : ''}
            </p>
          ) : sessionCount > 0 ? (
            <p className="mt-1 text-xs text-slate-400">
              {t('focus.sessionFocusedSoFar', {
                count: sessionCount + 1,
                value: formatMinutesHuman(totalFocusMinutes),
              })}
            </p>
          ) : null}
        </button>
        {!isCompleted ? (
          <div className="ml-auto flex shrink-0 items-center gap-1 self-start">
            {estimatedMinutes ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-400" title={t('ai.timeEstimate')}>
                <Clock className="h-3 w-3" />
                {formatEstimate(estimatedMinutes)}
              </span>
            ) : null}
            {onSplit ? (
              <TaskAIActions
                task={task}
                projectTitle={projectTitle}
                onSplit={onSplit}
                onClarify={onClarify}
                loading={aiLoading}
              />
            ) : null}
            {isNext && onStart ? (
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/15"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{t('taskRow.start')}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onMove?.(task, 'up')}
              disabled={!canMoveUp}
              className="rounded-md border border-slate-700 bg-slate-900/70 p-2 text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label={t('taskRow.moveUp')}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMove?.(task, 'down')}
              disabled={!canMoveDown}
              className="rounded-md border border-slate-700 bg-slate-900/70 p-2 text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label={t('taskRow.moveDown')}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
