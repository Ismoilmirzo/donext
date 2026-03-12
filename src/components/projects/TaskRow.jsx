import { CheckCircle2, Circle } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import { getLocaleTag } from '../../lib/i18n';
import { formatMinutesHuman } from '../../lib/dates';

export default function TaskRow({ task, isNext = false, onClick }) {
  const { locale, t } = useLocale();
  const isCompleted = task.status === 'completed';

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        isCompleted
          ? 'border-slate-700 bg-slate-800/50'
          : isNext
            ? 'border-emerald-500/60 bg-emerald-500/10'
            : 'border-slate-700 bg-slate-800 hover:bg-slate-700/60'
      }`}
      title={!isCompleted ? t('taskRow.startHint') : undefined}
    >
      <div className="flex items-start gap-2">
        {isCompleted ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
        ) : (
          <Circle className="mt-0.5 h-4 w-4 text-slate-500" />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{task.title}</p>
          {task.description && <p className="mt-1 text-xs text-slate-400">{task.description}</p>}
          {isCompleted && (
            <p className="mt-1 text-xs text-slate-500">
              {formatMinutesHuman(task.time_spent_minutes || 0)} · {task.completed_at ? new Date(task.completed_at).toLocaleDateString(getLocaleTag(locale)) : ''}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
