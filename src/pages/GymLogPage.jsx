import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bell, ChevronDown, ChevronRight, Minus, Plus, RotateCcw, Save, Timer, Trophy } from 'lucide-react';
import GymNav from '../components/gym/GymNav';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useToast } from '../contexts/ToastContext';
import { convertWeight, calculateSessionVolume, toKg } from '../gym/lib/gymMetrics';
import { useGym } from '../hooks/useGym';

const RIR_OPTIONS = [0, 1, 2, 3];

function sortSlots(slots) {
  return [...(slots || [])].sort((left, right) => Number(left.slot_order || 0) - Number(right.slot_order || 0));
}

function getSetKey(exerciseId, setNumber) {
  return `${exerciseId}:${setNumber}`;
}

function findLastLogs(sessions, currentSessionId, exerciseId) {
  const previous = sessions.find(
    (session) => session.id !== currentSessionId && (session.gym_set_logs || []).some((set) => set.exercise_id === exerciseId)
  );
  return previous?.gym_set_logs?.filter((set) => set.exercise_id === exerciseId) || [];
}

function getLastLogForSet(sessions, currentSessionId, exerciseId, setNumber) {
  const previousLogs = findLastLogs(sessions, currentSessionId, exerciseId);
  return previousLogs.find((set) => Number(set.set_number) === Number(setNumber)) || previousLogs[Number(setNumber) - 1] || null;
}

function draftFromLog(set, unit) {
  if (!set) return null;
  return {
    weight: set.weight_kg == null ? '' : String(convertWeight(set.weight_kg, unit)),
    reps: set.reps == null ? '' : String(set.reps),
    rir: set.rir == null ? '' : String(set.rir),
    isWarmup: Boolean(set.is_warmup),
  };
}

function getWeightStep(slot, unit) {
  const equipment = slot.exercise?.equipment;
  const kgStep = equipment === 'dumbbell' ? 1 : 2.5;
  return unit === 'lb' ? Math.round(kgStep * 2.20462 * 10) / 10 : kgStep;
}

function sortSetLogs(setLogs = []) {
  return [...setLogs].sort((left, right) => {
    const exerciseOrder = String(left.exercise_id || '').localeCompare(String(right.exercise_id || ''));
    if (exerciseOrder !== 0) return exerciseOrder;
    return Number(left.set_number || 0) - Number(right.set_number || 0);
  });
}

function getLastBodyweightDisplay(sessions, unit) {
  const previous = sessions.find((candidate) => candidate.bodyweight_kg);
  if (!previous) return '';
  return String(convertWeight(previous.bodyweight_kg, unit));
}

function getPreviousMatchingSession(sessions, currentSession) {
  return sessions.find(
    (candidate) =>
      candidate.id !== currentSession?.id &&
      candidate.program_day_id === currentSession?.program_day_id &&
      (candidate.gym_set_logs || []).length
  );
}

function isWorkSetLogged(set) {
  return Boolean(set && !set.is_warmup && Number(set.reps || 0) > 0);
}

function getSavedSet(session, exerciseId, setNumber) {
  return (session?.gym_set_logs || []).find(
    (set) => set.exercise_id === exerciseId && Number(set.set_number) === Number(setNumber)
  );
}

function getExerciseSetProgress(session, exerciseId, targetSets) {
  const logged = (session?.gym_set_logs || []).filter((set) => set.exercise_id === exerciseId && isWorkSetLogged(set)).length;
  return {
    logged,
    target: Math.max(1, Number(targetSets || 0)),
  };
}

export default function GymLogPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    activeProgram,
    deleteSetLog,
    finishSession,
    getSession,
    loading,
    logSet,
    outboxCount,
    sessions,
    updateSessionBodyweight,
  } = useGym();
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [extraSets, setExtraSets] = useState({});
  const [openExerciseIds, setOpenExerciseIds] = useState(new Set());
  const [savingKey, setSavingKey] = useState('');
  const [restSeconds, setRestSeconds] = useState(0);
  const [restAlertsEnabled, setRestAlertsEnabled] = useState(false);
  const [restWasRunning, setRestWasRunning] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [summary, setSummary] = useState(null);
  const [bodyweightDisplay, setBodyweightDisplay] = useState('');
  const unit = activeProgram?.unit_preference || session?.program?.unit_preference || 'kg';

  const slots = useMemo(
    () =>
      sortSlots(session?.program_day?.gym_program_exercises).map((slot) => ({
        ...slot,
        sets: Number(slot.target_sets || 0),
        rep_low: Number(slot.target_rep_low || 0),
        rep_high: Number(slot.target_rep_high || 0),
      })),
    [session?.program_day?.gym_program_exercises]
  );
  const workoutProgress = useMemo(() => {
    const target = slots.reduce((sum, slot) => sum + Number(slot.sets || 0) + Number(extraSets[slot.exercise_id] || 0), 0);
    const logged = (session?.gym_set_logs || []).filter(isWorkSetLogged).length;
    return { logged, target: Math.max(1, target) };
  }, [extraSets, session?.gym_set_logs, slots]);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      setSessionLoading(true);
      try {
        const data = await getSession(sessionId);
        if (cancelled) return;
        setSession(data);
        setBodyweightDisplay(data?.bodyweight_kg ? String(convertWeight(data.bodyweight_kg, unit)) : getLastBodyweightDisplay(sessions, unit));
      } catch (error) {
        toast.error('Session could not be loaded', error.message || 'Try again.');
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }
    loadSession();
    return () => {
      cancelled = true;
    };
  }, [getSession, sessionId, sessions, toast, unit]);

  useEffect(() => {
    if (!session) return;
    const nextDrafts = {};
    (session.gym_set_logs || []).forEach((set) => {
      nextDrafts[getSetKey(set.exercise_id, set.set_number)] = {
        weight: set.weight_kg == null ? '' : String(convertWeight(set.weight_kg, unit)),
        reps: set.reps == null ? '' : String(set.reps),
        rir: set.rir == null ? '' : String(set.rir),
        isWarmup: Boolean(set.is_warmup),
      };
    });
    setDrafts(nextDrafts);
    setOpenExerciseIds(new Set(slots.map((slot) => slot.exercise_id)));
  }, [session, slots, unit]);

  useEffect(() => {
    if (restSeconds <= 0) return undefined;
    setRestWasRunning(true);
    const timer = window.setInterval(() => {
      setRestSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [restSeconds]);

  useEffect(() => {
    if (restSeconds > 0 || !restWasRunning) return;
    if (restAlertsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Rest complete', { body: 'Start the next set.' });
    } else {
      toast.info('Rest complete');
    }
    setRestWasRunning(false);
  }, [restAlertsEnabled, restSeconds, restWasRunning, toast]);

  function updateDraft(exerciseId, setNumber, patch) {
    const key = getSetKey(exerciseId, setNumber);
    setDrafts((prev) => ({ ...prev, [key]: { weight: '', reps: '', rir: '', isWarmup: false, ...prev[key], ...patch } }));
  }

  function adjustDraft(exerciseId, setNumber, field, delta) {
    const key = getSetKey(exerciseId, setNumber);
    const current = Number(drafts[key]?.[field] || 0);
    updateDraft(exerciseId, setNumber, { [field]: String(Math.max(0, current + delta)) });
  }

  async function reloadSession() {
    const data = await getSession(sessionId);
    setSession(data);
    return data;
  }

  function upsertOptimisticSetLog(setLog) {
    setSession((prev) => {
      if (!prev) return prev;
      const nextLogs = (prev.gym_set_logs || []).filter(
        (existing) =>
          existing.exercise_id !== setLog.exercise_id ||
          Number(existing.set_number) !== Number(setLog.set_number)
      );
      return { ...prev, gym_set_logs: sortSetLogs([...nextLogs, setLog]) };
    });
  }

  async function saveSet(slot, setNumber, overrideDraft = null) {
    const key = getSetKey(slot.exercise_id, setNumber);
    const draft = overrideDraft || drafts[key] || {};
    const payload = {
      session_id: sessionId,
      exercise_id: slot.exercise_id,
      set_number: setNumber,
      weight_kg: draft.weight === '' ? null : toKg(draft.weight, unit),
      reps: draft.reps,
      rir: draft.rir,
      is_warmup: draft.isWarmup,
    };
    setSavingKey(key);
    upsertOptimisticSetLog({
      ...payload,
      id: `local-${sessionId}-${slot.exercise_id}-${setNumber}`,
      reps: payload.reps === '' || payload.reps == null ? null : Number(payload.reps),
      rir: payload.rir === '' || payload.rir == null ? null : Number(payload.rir),
      logged_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      exercise: slot.exercise,
    });
    setRestSeconds(Number(slot.exercise?.rest_seconds || 90));
    try {
      const result = await logSet(payload);
      if (result?.queued) {
        toast.info('Set queued offline');
      } else {
        await reloadSession();
      }
    } catch (error) {
      void reloadSession().catch(() => undefined);
      toast.error('Set was not saved', error.message || 'Try again.');
    } finally {
      setSavingKey('');
    }
  }

  function shouldAutosaveSet(exerciseId, setNumber) {
    const draft = drafts[getSetKey(exerciseId, setNumber)];
    return Boolean(draft && (draft.weight !== '' || draft.reps !== '' || draft.rir !== '' || draft.isWarmup));
  }

  function autosaveSet(slot, setNumber) {
    if (!shouldAutosaveSet(slot.exercise_id, setNumber)) return;
    void saveSet(slot, setNumber);
  }

  async function acceptLastSet(slot, setNumber, lastLog) {
    const nextDraft = draftFromLog(lastLog, unit);
    if (!nextDraft) return;
    updateDraft(slot.exercise_id, setNumber, nextDraft);
    await saveSet(slot, setNumber, nextDraft);
  }

  async function enableRestAlerts() {
    if (typeof Notification === 'undefined') {
      toast.info('Browser notifications are not available');
      return;
    }
    if (Notification.permission === 'granted') {
      setRestAlertsEnabled(true);
      toast.success('Rest alerts enabled');
      return;
    }
    if (Notification.permission === 'denied') {
      toast.info('Notifications are blocked in this browser');
      return;
    }
    const permission = await Notification.requestPermission();
    const enabled = permission === 'granted';
    setRestAlertsEnabled(enabled);
    if (enabled) toast.success('Rest alerts enabled');
  }

  function adjustRestTimer(deltaSeconds) {
    setRestSeconds((prev) => Math.max(0, prev + deltaSeconds));
  }

  async function dropSet(slot, setNumber) {
    try {
      await deleteSetLog({ session_id: sessionId, exercise_id: slot.exercise_id, set_number: setNumber });
      if (setNumber > Number(slot.sets || 0)) {
        setExtraSets((prev) => ({ ...prev, [slot.exercise_id]: Math.max(0, Number(prev[slot.exercise_id] || 0) - 1) }));
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[getSetKey(slot.exercise_id, setNumber)];
        return next;
      });
      await reloadSession();
    } catch (error) {
      toast.error('Set was not dropped', error.message || 'Try again.');
    }
  }

  function prefillLast(slot) {
    const previousLogs = findLastLogs(sessions, sessionId, slot.exercise_id);
    if (!previousLogs.length) {
      toast.info('No previous sets for this exercise');
      return;
    }
    previousLogs.slice(0, slot.sets).forEach((set, index) => {
      updateDraft(slot.exercise_id, index + 1, {
        weight: set.weight_kg == null ? '' : String(convertWeight(set.weight_kg, unit)),
        reps: set.reps == null ? '' : String(set.reps),
        rir: set.rir == null ? '' : String(set.rir),
        isWarmup: Boolean(set.is_warmup),
      });
    });
  }

  async function saveBodyweight() {
    try {
      await updateSessionBodyweight(sessionId, bodyweightDisplay === '' ? null : toKg(bodyweightDisplay, unit));
      await reloadSession();
    } catch (error) {
      toast.error('Bodyweight was not saved', error.message || 'Try again.');
    }
  }

  async function handleFinish() {
    const durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    try {
      const finishResult = await finishSession(sessionId, durationMin);
      const refreshed = await reloadSession();
      const volume = calculateSessionVolume(refreshed?.gym_set_logs || []);
      const previousSession = getPreviousMatchingSession(sessions, refreshed);
      const previousVolume = calculateSessionVolume(previousSession?.gym_set_logs || []);
      const exerciseNameById = new Map(slots.map((slot) => [slot.exercise_id, slot.exercise?.name || 'Exercise']));
      setSummary({
        durationMin,
        volume,
        volumeDelta: previousSession ? volume - previousVolume : null,
        prDeltas: (finishResult?.prDeltas || []).map((record) => ({
          ...record,
          exerciseName: exerciseNameById.get(record.exerciseId) || 'Exercise',
        })),
        sets: (refreshed?.gym_set_logs || []).filter((set) => !set.is_warmup && set.reps).length,
      });
    } catch (error) {
      toast.error('Workout was not finished', error.message || 'Try again.');
    }
  }

  if (loading || sessionLoading) {
    return (
      <div className="space-y-4">
        <GymNav />
        <Card className="min-h-[16rem] animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <GymNav />
        <Card className="space-y-4">
          <h1 className="text-xl font-semibold text-slate-50">Session not found</h1>
          <Button onClick={() => navigate('/gym')}>Back to Gym</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GymNav />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Workout Log</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-50">{session.program_day?.label || 'Workout'}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {session.performed_at} - {outboxCount} queued sets
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/45 px-3 py-2 text-sm text-slate-300">
              Bodyweight
              <input
                value={bodyweightDisplay}
                onBlur={saveBodyweight}
                onChange={(event) => setBodyweightDisplay(event.target.value)}
                inputMode="decimal"
                className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
              />
              {unit}
            </label>
            <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/45 px-2 py-1 text-sm text-slate-300">
              <button
                type="button"
                aria-label="Reduce rest timer by 15 seconds"
                onClick={() => adjustRestTimer(-15)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <Minus className="h-3 w-3" aria-hidden="true" />
              </button>
              <Timer className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              {Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, '0')}
              <button
                type="button"
                aria-label="Add 15 seconds to rest timer"
                onClick={() => adjustRestTimer(15)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
            {restSeconds > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setRestSeconds(0)}>
                Skip
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={enableRestAlerts} className="inline-flex items-center gap-2">
              <Bell className="h-4 w-4" aria-hidden="true" />
              {restAlertsEnabled ? 'Alerts On' : 'Alerts'}
            </Button>
            <Button onClick={handleFinish}>Finish</Button>
          </div>
        </div>
      </Card>

      {summary ? (
        <Card className="space-y-3 border-emerald-500/30 bg-emerald-500/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            Workout Summary
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-slate-950/40 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-200/70">Duration</p>
              <p className="mt-1 text-lg font-semibold text-emerald-50">{summary.durationMin} min</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-slate-950/40 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-200/70">Work Sets</p>
              <p className="mt-1 text-lg font-semibold text-emerald-50">{summary.sets}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-slate-950/40 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-200/70">Volume</p>
              <p className="mt-1 text-lg font-semibold text-emerald-50">{Math.round(summary.volume)} kg</p>
              {summary.volumeDelta != null ? (
                <p className={`mt-1 text-xs ${summary.volumeDelta >= 0 ? 'text-emerald-200' : 'text-amber-200'}`}>
                  {summary.volumeDelta >= 0 ? '+' : ''}
                  {Math.round(summary.volumeDelta)} kg vs last time
                </p>
              ) : null}
            </div>
          </div>
          {summary.prDeltas?.length ? (
            <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-slate-950/40 px-3 py-2 text-sm text-emerald-100">
              <p className="font-semibold">{summary.prDeltas.length} PR{summary.prDeltas.length === 1 ? '' : 's'} hit</p>
              {summary.prDeltas.map((record) => (
                <p key={`${record.exerciseId}-${record.estimated1rm}`} className="text-emerald-100/85">
                  {record.exerciseName}: {record.weightKg} kg x {record.reps} ({record.estimated1rm} kg e1RM)
                </p>
              ))}
            </div>
          ) : null}
          <Link to="/gym/history" className="dn-button dn-button-secondary inline-flex px-4 py-2.5 text-sm">
            View History
          </Link>
        </Card>
      ) : null}

      <div className="space-y-3">
        {slots.map((slot) => {
          const exerciseId = slot.exercise_id;
          const isOpen = openExerciseIds.has(exerciseId);
          const targetSets = Number(slot.sets || 0) + Number(extraSets[exerciseId] || 0);
          const exerciseProgress = getExerciseSetProgress(session, exerciseId, targetSets);
          const rows = Array.from({ length: targetSets }, (_, index) => index + 1);
          return (
            <Card key={slot.id} className={slot.is_specialization ? 'border-emerald-500/30 bg-emerald-500/10' : ''}>
              <button
                type="button"
                onClick={() =>
                  setOpenExerciseIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(exerciseId)) next.delete(exerciseId);
                    else next.add(exerciseId);
                    return next;
                  })
                }
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <h2 className="font-semibold text-slate-50">{slot.exercise?.name || 'Exercise'}</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {slot.target_sets} sets x {slot.target_rep_low}-{slot.target_rep_high} reps
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300">
                    {exerciseProgress.logged}/{exerciseProgress.target} logged
                  </span>
                  {slot.is_specialization ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                      Specialization
                    </span>
                  ) : null}
                </div>
              </button>

              {isOpen ? (
                <div className="mt-4 space-y-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${Math.min(100, (exerciseProgress.logged / exerciseProgress.target) * 100)}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => prefillLast(slot)} className="inline-flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Last Time
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setExtraSets((prev) => ({ ...prev, [exerciseId]: Number(prev[exerciseId] || 0) + 1 }))}
                      className="inline-flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add Set
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {rows.map((setNumber) => {
                      const key = getSetKey(exerciseId, setNumber);
                      const draft = drafts[key] || { weight: '', reps: '', rir: '', isWarmup: false };
                      const lastLog = getLastLogForSet(sessions, sessionId, exerciseId, setNumber);
                      const lastDraft = draftFromLog(lastLog, unit);
                      const savedSet = getSavedSet(session, exerciseId, setNumber);
                      const hasDraft = draft.weight !== '' || draft.reps !== '' || draft.rir !== '' || draft.isWarmup;
                      const isSaved = Boolean(savedSet);
                      return (
                        <div
                          key={key}
                          className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-[3rem_1fr_1fr_1fr_5rem_auto_auto_auto] ${
                            isSaved ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/45'
                          }`}
                        >
                          <div className="flex flex-col justify-center gap-1 text-sm font-semibold text-slate-300">
                            <span>#{setNumber}</span>
                            <span className={`text-[11px] font-medium ${isSaved ? 'text-emerald-200' : hasDraft ? 'text-amber-200' : 'text-slate-500'}`}>
                              {isSaved ? 'Saved' : hasDraft ? 'Unsaved' : 'Empty'}
                            </span>
                          </div>
                          <label className="space-y-1 text-xs text-slate-400">
                            Weight ({unit})
                            <div className="flex">
                              <button
                                type="button"
                                aria-label={`Decrease set ${setNumber} weight`}
                                onClick={() => adjustDraft(exerciseId, setNumber, 'weight', -getWeightStep(slot, unit))}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-l-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                              >
                                <Minus className="h-3 w-3" aria-hidden="true" />
                              </button>
                              <input
                                value={draft.weight}
                                placeholder={lastDraft?.weight || ''}
                                onBlur={() => autosaveSet(slot, setNumber)}
                                onChange={(event) => updateDraft(exerciseId, setNumber, { weight: event.target.value })}
                                inputMode="decimal"
                                className="min-h-11 min-w-0 flex-1 border-y border-slate-700 bg-slate-950 px-2 py-2 text-base text-slate-100 sm:text-sm"
                              />
                              <button
                                type="button"
                                aria-label={`Increase set ${setNumber} weight`}
                                onClick={() => adjustDraft(exerciseId, setNumber, 'weight', getWeightStep(slot, unit))}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                              >
                                <Plus className="h-3 w-3" aria-hidden="true" />
                              </button>
                            </div>
                          </label>
                          <label className="space-y-1 text-xs text-slate-400">
                            Reps
                            <input
                              value={draft.reps}
                              placeholder={lastDraft?.reps || ''}
                              onBlur={() => autosaveSet(slot, setNumber)}
                              onChange={(event) => updateDraft(exerciseId, setNumber, { reps: event.target.value })}
                              inputMode="numeric"
                              className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-base text-slate-100 sm:text-sm"
                            />
                          </label>
                          <div className="space-y-1 text-xs text-slate-400">
                            RIR
                            <div className="grid grid-cols-4 gap-1">
                              {RIR_OPTIONS.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => updateDraft(exerciseId, setNumber, { rir: String(option) })}
                                  className={`min-h-11 rounded-lg border px-2 py-2 text-sm ${
                                    String(draft.rir) === String(option)
                                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                                      : 'border-slate-700 bg-slate-950 text-slate-300'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                            {lastDraft?.rir ? <p className="text-[11px] text-slate-500">Last {lastDraft.rir}</p> : null}
                          </div>
                          <label className="flex min-h-11 items-center gap-2 text-xs text-slate-400">
                            <input
                              type="checkbox"
                              checked={draft.isWarmup}
                              onChange={(event) => updateDraft(exerciseId, setNumber, { isWarmup: event.target.checked })}
                            />
                            Warmup
                          </label>
                          <div className="flex items-end">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!lastLog}
                              onClick={() => acceptLastSet(slot, setNumber, lastLog)}
                            >
                              Last
                            </Button>
                          </div>
                          <div className="flex items-end">
                            <Button size="sm" loading={savingKey === key} onClick={() => saveSet(slot, setNumber)} className="inline-flex items-center gap-2">
                              <Save className="h-4 w-4" aria-hidden="true" />
                              Save
                            </Button>
                          </div>
                          <div className="flex items-end">
                            <Button size="sm" variant="ghost" onClick={() => dropSet(slot, setNumber)}>
                              Drop
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Card className="sticky bottom-3 z-20 border-emerald-500/30 bg-slate-950/95 p-3 shadow-2xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-50">
              {workoutProgress.logged}/{workoutProgress.target} work sets logged
            </p>
            <p className="text-xs text-slate-400">{outboxCount} queued sets - finish when the real workout is done.</p>
          </div>
          <Button onClick={handleFinish}>Finish Workout</Button>
        </div>
      </Card>
    </div>
  );
}
