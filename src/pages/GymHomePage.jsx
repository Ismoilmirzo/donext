import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CalendarDays, Clock3, Flame, Play, Repeat2, RotateCcw, Target } from 'lucide-react';
import GymEmptyState from '../components/gym/GymEmptyState';
import GymNav from '../components/gym/GymNav';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import { useLocale } from '../contexts/LocaleContext';
import { useToast } from '../contexts/ToastContext';
import { GYM_SPECIALIZATION_RULES } from '../gym/lib/gymProgramData';
import {
  formatGymDayLabel,
  formatGymMuscleLabel,
  formatGymRationale,
  formatGymReassessmentPrompt,
  formatGymStatusLabel,
  formatGymWeekdayLabel,
} from '../gym/lib/gymI18n';
import { getWeekStart, toDateKey } from '../gym/lib/gymMetrics';
import { useGym } from '../hooks/useGym';

function getNextTrainingDay(program) {
  const days = program?.days || [];
  if (!days.length) return null;
  const today = new Date().getDay();
  return [...days]
    .sort((left, right) => {
      const leftDistance = (Number(left.default_weekday ?? 1) - today + 7) % 7;
      const rightDistance = (Number(right.default_weekday ?? 1) - today + 7) % 7;
      return leftDistance - rightDistance || Number(left.day_order) - Number(right.day_order);
    })[0];
}

function getTrainingWeekRows(program, sessions, nowMs, t) {
  const start = getWeekStart(new Date(nowMs));
  const todayKey = toDateKey(new Date(nowMs));
  return [...(program?.days || [])].sort((left, right) => Number(left.day_order) - Number(right.day_order)).map((day) => {
    const date = new Date(start);
    const weekday = Number(day.default_weekday ?? 1);
    const offset = (weekday - 1 + 7) % 7;
    date.setDate(start.getDate() + offset);
    const key = toDateKey(date);
    const trained = sessions.some(
      (session) =>
        session.performed_at === key &&
        (session.program_day_id === day.id || session.program_day?.id === day.id || session.program_day?.day_order === day.day_order)
    );
    const status = trained ? 'done' : key === todayKey ? 'today' : key < todayKey ? 'missed' : 'upcoming';
    return {
      key,
      label: day.label,
      status,
      trained,
      weekday: formatGymWeekdayLabel(t, weekday),
    };
  });
}

function getBlockWeek(program, nowMs) {
  if (!program?.spec_started_on) return null;
  const started = new Date(program.spec_started_on);
  const diffMs = nowMs - started.getTime();
  return Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1);
}

function getCurrentWeekSessionCount(sessions, nowMs) {
  const start = getWeekStart(new Date(nowMs));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  return sessions.filter((session) => session.performed_at >= startKey && session.performed_at <= endKey).length;
}

function getWeekDotClass(status) {
  if (status === 'done') return 'bg-emerald-300';
  if (status === 'today') return 'bg-sky-300';
  if (status === 'missed') return 'bg-amber-300';
  return 'bg-slate-600';
}

function getWeekCardClass(status) {
  if (status === 'done') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100';
  if (status === 'today') return 'border-sky-500/40 bg-sky-500/10 text-sky-100';
  if (status === 'missed') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-slate-700 bg-slate-900/45 text-slate-400';
}

function getDaysAgoLabel(t, dateKey, nowMs) {
  if (!dateKey) return '';
  const date = new Date(`${dateKey}T00:00:00`);
  const today = new Date(nowMs);
  today.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((today.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)));
  if (days === 0) return t('gym.daysAgoToday');
  if (days === 1) return t('gym.daysAgoOne');
  return t('gym.daysAgoMany', { count: days });
}

function estimateOneRepMax(weightKg, reps) {
  const weight = Number(weightKg || 0);
  const repCount = Number(reps || 0);
  if (!weight || !repCount) return 0;
  return weight * (1 + repCount / 30);
}

function getTopSetLine(t, session) {
  const topSet = [...(session?.gym_set_logs || [])]
    .filter((set) => !set.is_warmup && set.weight_kg && set.reps)
    .sort((left, right) => estimateOneRepMax(right.weight_kg, right.reps) - estimateOneRepMax(left.weight_kg, left.reps))[0];
  if (!topSet) return '';
  return t('gym.topSetLine', {
    exercise: topSet.exercise?.name || t('gym.exerciseFallback'),
    weight: topSet.weight_kg,
    reps: topSet.reps,
  });
}

export default function GymHomePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useLocale();
  const [nowMs] = useState(() => Date.now());
  const [reassessAction, setReassessAction] = useState('');
  const { activeProgram, applyProgram, error, loading, outboxCount, retryGymSchema, schemaMissing, sessions, startSession } = useGym();
  const nextDay = getNextTrainingDay(activeProgram);
  const lastSession = sessions[0];
  const lastSessionTopLine = getTopSetLine(t, lastSession);
  const weekRows = getTrainingWeekRows(activeProgram, sessions, nowMs, t);
  const currentWeekSessionCount = getCurrentWeekSessionCount(sessions, nowMs);
  const blockWeek = getBlockWeek(activeProgram, nowMs);
  const displayBlockWeek = Math.min(8, blockWeek || 1);
  const shouldReassess = Boolean(activeProgram?.specialization_muscle && blockWeek >= 8);
  const deloadWeeks = Number(activeProgram?.deload_interval_weeks || 7);
  const started = activeProgram?.started_at ? new Date(activeProgram.started_at) : null;
  const weeksSinceStart = started ? Math.floor((nowMs - started.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1 : 1;
  const shouldDeload = deloadWeeks > 0 && weeksSinceStart > 0 && weeksSinceStart % deloadWeeks === 0;

  async function handleStart() {
    if (!nextDay) return;
    try {
      const session = await startSession(nextDay.id);
      navigate(`/gym/log/${session.id}`);
    } catch (startError) {
      toast.error(t('gym.workoutNotStarted'), startError.message || t('gym.checkMigrationTryAgain'));
    }
  }

  async function handleRepeatBlock() {
    if (!activeProgram?.specialization_muscle) return;
    setReassessAction('repeat');
    try {
      await applyProgram(activeProgram.specialization_muscle);
      toast.success(t('gym.blockRestarted', { muscle: formatGymMuscleLabel(t, activeProgram.specialization_muscle) }));
    } catch (applyError) {
      toast.error(t('gym.blockRestartFailed'), applyError.message || t('gym.openProgramTryAgain'));
    } finally {
      setReassessAction('');
    }
  }

  async function handleReturnBalanced() {
    setReassessAction('balanced');
    try {
      await applyProgram('');
      toast.success(t('gym.balancedProgramRestored'));
    } catch (applyError) {
      toast.error(t('gym.programUpdateFailed'), applyError.message || t('gym.openProgramTryAgain'));
    } finally {
      setReassessAction('');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <GymNav />
        <Card className="min-h-[14rem] animate-pulse" />
      </div>
    );
  }

  if (!activeProgram) {
    return (
      <div className="space-y-4">
        <GymNav />
        <GymEmptyState error={error} schemaMissing={schemaMissing} onRetry={retryGymSchema} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GymNav />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">{t('gym.nextWorkout')}</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-50">{formatGymDayLabel(t, nextDay?.label) || t('gym.trainingDay')}</h1>
              <p className="mt-2 text-sm text-slate-400">
                {t('gym.workoutLine', {
                  weekday: formatGymWeekdayLabel(t, nextDay?.default_weekday ?? 1),
                  count: nextDay?.slots?.length || 0,
                })}
              </p>
            </div>
            <Button onClick={handleStart} className="inline-flex items-center gap-2">
              <Play className="h-4 w-4" aria-hidden="true" />
              {t('gym.startWorkout')}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {t('gym.lastTime')}
              </div>
              <p className="mt-2 text-sm font-medium text-slate-100">
                {lastSession
                  ? `${formatGymDayLabel(t, lastSession.program_day?.label) || t('gym.workoutFallback')} - ${getDaysAgoLabel(t, lastSession.performed_at, nowMs)}${lastSessionTopLine ? `. ${lastSessionTopLine}` : ''}`
                  : t('gym.noSessionsYet')}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                <Activity className="h-4 w-4" aria-hidden="true" />
                {t('gym.thisWeek')}
              </div>
              <p className="mt-2 text-sm font-medium text-slate-100">
                {t('gym.sessionsCount', { count: currentWeekSessionCount })}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t('gym.outbox')}
              </div>
              <p className="mt-2 text-sm font-medium text-slate-100">{t('gym.pendingSets', { count: outboxCount })}</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {weekRows.map((row) => (
              <div
                key={row.key}
                className={`min-w-[5rem] rounded-xl border px-3 py-2 text-center text-xs ${getWeekCardClass(row.status)}`}
              >
                <p>{row.weekday}</p>
                <span className={`mt-2 inline-block h-2 w-2 rounded-full ${getWeekDotClass(row.status)}`} />
                <p className="mt-1 truncate text-[11px] opacity-80">{formatGymStatusLabel(t, row.status)}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
              <Flame className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              {t('gym.specializationTitle')}
            </div>
            <h2 className="text-lg font-semibold text-slate-50">
              {activeProgram.specialization_muscle ? formatGymMuscleLabel(t, activeProgram.specialization_muscle) : t('gym.balanced')}
            </h2>
            {activeProgram.specialization_muscle ? (
              <>
                <ProgressBar value={displayBlockWeek} max={8} colorClass="bg-emerald-500" />
                <p className="text-sm text-slate-400">{t('gym.weekOfEight', { week: displayBlockWeek })}</p>
                <p className="text-sm leading-6 text-slate-300">
                  {formatGymRationale(t, activeProgram.specialization_muscle, GYM_SPECIALIZATION_RULES.rules[activeProgram.specialization_muscle]?.rationale)}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400">{t('gym.baseProgramActive')}</p>
            )}
          </Card>

          {shouldDeload ? (
            <Card className="space-y-3 border-amber-500/30 bg-amber-500/10">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {t('gym.deloadNudge')}
              </div>
              <p className="text-sm leading-6 text-amber-100/90">
                {t('gym.deloadMessage', { week: weeksSinceStart })}
              </p>
            </Card>
          ) : null}

          {shouldReassess ? (
            <Card className="space-y-3 border-emerald-500/30 bg-emerald-500/10">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                <Repeat2 className="h-4 w-4" aria-hidden="true" />
                {t('gym.blockReassessment')}
              </div>
              <p className="text-sm leading-6 text-emerald-100/90">
                {formatGymReassessmentPrompt(t, GYM_SPECIALIZATION_RULES._meta?.reassess_prompt)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" loading={reassessAction === 'repeat'} onClick={handleRepeatBlock} className="inline-flex items-center gap-2">
                  <Repeat2 className="h-4 w-4" aria-hidden="true" />
                  {t('gym.repeatBlock')}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate('/gym/program')} className="inline-flex items-center gap-2">
                  <Target className="h-4 w-4" aria-hidden="true" />
                  {t('gym.switchFocus')}
                </Button>
                <Button size="sm" variant="secondary" loading={reassessAction === 'balanced'} onClick={handleReturnBalanced}>
                  {t('gym.returnBalanced')}
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
