import React, { useMemo } from 'react';
import { CheckCircle2, Coffee, PauseCircle, PlayCircle, Timer } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';
import { formatSessionTimer, getTaskFocusMinutes } from '../../lib/taskSessions';
import Button from '../ui/Button';
import Card from '../ui/Card';

export default function ActiveTaskScreen({ project, task, session, timer, onDone, onPause, onToggleMode, actionLoading = false }) {
  const { t } = useLocale();
  const workMotivations = t('focus.motivations');
  const breakMotivations = t('focus.breakMotivations');
  const priorFocusMinutes = getTaskFocusMinutes(task);
  const sessionNumber = Math.max(1, Number(session?.session_number) || Number(task?.sessions_count) || 1);
  const isWorking = Boolean(timer?.isWorking);
  const motivation = isWorking ? workMotivations : breakMotivations;
  const quote = useMemo(
    () => motivation[Math.abs((task?.id || '').split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)) % motivation.length],
    [motivation, task?.id]
  );
  const panelTone = isWorking ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10';

  return (
    <Card className="dn-active-focus-card space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
          isWorking ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/20 bg-amber-500/10 text-amber-200'
        }`}>
          {isWorking ? <Timer className="h-3.5 w-3.5" /> : <Coffee className="h-3.5 w-3.5" />}
          {isWorking ? t('focus.workingNow') : t('focus.breakNow')}
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
          {t('focus.sessionBadge', { count: sessionNumber })}
        </span>
      </div>

      <div className="space-y-2 text-center">
        <p className="text-sm text-slate-400">{project?.title}</p>
        <h2 className="text-2xl font-semibold text-slate-50 sm:text-3xl">{task?.title}</h2>
      </div>
      {task?.description ? <p className="mx-auto max-w-xl text-sm leading-6 text-slate-400">{task.description}</p> : null}

      <div className={`rounded-[1.75rem] border px-4 py-5 ${panelTone}`}>
        <div className="grid gap-5 md:grid-cols-[1.25fr_1fr] md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('focus.totalElapsedLabel')}</p>
            <p className="mt-2 font-mono text-4xl font-bold text-slate-100 sm:text-5xl">{formatSessionTimer(timer?.totalElapsedSeconds)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 px-4 py-4">
            <p className={`text-xs uppercase tracking-[0.2em] ${isWorking ? 'text-emerald-300' : 'text-amber-300'}`}>
              {isWorking ? t('focus.focusLabel') : t('focus.breakLabel')}
            </p>
            <p className={`mt-2 font-mono text-3xl font-semibold ${isWorking ? 'text-emerald-200' : 'text-amber-200'}`}>
              {formatSessionTimer(isWorking ? timer?.focusSeconds : timer?.currentBreakSeconds)}
            </p>
            {isWorking ? (
              <p className="mt-2 text-sm text-slate-400">{t('focus.focusTimerHint')}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                {t('focus.focusPausedAt', { value: formatSessionTimer(timer?.focusSeconds) })}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <Button
            variant={isWorking ? 'secondary' : 'primary'}
            onClick={onToggleMode}
            disabled={actionLoading}
            className="w-full py-3 text-base"
          >
            {isWorking ? (
              <span className="inline-flex items-center gap-2">
                <Coffee className="h-4 w-4" />
                {t('focus.takeBreak')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                {t('focus.backToWork')}
              </span>
            )}
          </Button>
        </div>
      </div>

      {priorFocusMinutes > 0 ? (
        <p className="text-center text-sm text-slate-400">
          {t('focus.focusedSoFar', { value: formatMinutesHuman(priorFocusMinutes) })}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button onClick={onDone} disabled={actionLoading} className="w-full py-4 text-lg">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {t('focus.doneButton')}
          </span>
        </Button>
        <Button variant="secondary" onClick={onPause} disabled={actionLoading} className="w-full py-4 text-lg">
          <span className="inline-flex items-center gap-2">
            <PauseCircle className="h-4 w-4" />
            {t('focus.pauseTask')}
          </span>
        </Button>
      </div>

      <p className="text-center text-sm text-slate-400">{quote}</p>
    </Card>
  );
}
