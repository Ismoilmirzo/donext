import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  GYM_BASE_PROGRAM,
  GYM_EXERCISE_CATALOG,
  generateDefaultGymProgram,
  serializeGeneratedProgramDays,
} from '../gym/lib/gymProgramData';
import { toDateKey } from '../gym/lib/gymMetrics';
import { enqueueGymSetLog, flushGymSetLogQueue, readGymSetQueue } from '../gym/lib/offlineQueue';
import { supabase } from '../lib/supabase';

const PROGRAM_SELECT = `
  *,
  gym_program_days (
    *,
    gym_program_exercises (
      *,
      exercise:gym_exercises (*)
    )
  )
`;

const SESSION_SELECT = `
  *,
  program_day:gym_program_days (
    *,
    gym_program_exercises (
      *,
      exercise:gym_exercises (*)
    )
  ),
  gym_set_logs (
    *,
    exercise:gym_exercises (*)
  )
`;

const STATIC_CATALOG = (GYM_EXERCISE_CATALOG.exercises || []).map((exercise) => ({
  ...exercise,
  id: exercise.key,
  user_id: null,
}));

const GYM_MIGRATION_MESSAGE = 'Gym database migration is not applied yet.';
const GYM_SCHEMA_MISSING_KEY = 'donext:gym-schema-missing:v1';

function readGymSchemaMissingFlag() {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(GYM_SCHEMA_MISSING_KEY) === '1';
  } catch {
    return false;
  }
}

function writeGymSchemaMissingFlag(isMissing) {
  gymSchemaMissingRuntime = isMissing;
  if (typeof window === 'undefined') return;
  try {
    if (isMissing) window.sessionStorage.setItem(GYM_SCHEMA_MISSING_KEY, '1');
    else window.sessionStorage.removeItem(GYM_SCHEMA_MISSING_KEY);
  } catch {
    // Session storage can be unavailable in private or locked-down browsers.
  }
}

let gymSchemaMissingRuntime = false;
let gymExerciseProbeUserId = '';
let gymExerciseProbePromise = null;

function isMissingGymSchemaError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('could not find the table') ||
    message.includes('could not find table') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
}

function hasKnownMissingGymSchema() {
  return gymSchemaMissingRuntime || readGymSchemaMissingFlag();
}

function queryGymExercises(userId) {
  if (hasKnownMissingGymSchema()) return Promise.resolve({ schemaMissing: true });
  if (gymExerciseProbePromise && gymExerciseProbeUserId === userId) return gymExerciseProbePromise;

  gymExerciseProbeUserId = userId;
  gymExerciseProbePromise = supabase
    .from('gym_exercises')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order('name', { ascending: true })
    .then((response) => {
      if (isMissingGymSchemaError(response.error)) writeGymSchemaMissingFlag(true);
      return response;
    })
    .finally(() => {
      gymExerciseProbePromise = null;
      gymExerciseProbeUserId = '';
    });

  return gymExerciseProbePromise;
}

function sortByNumber(key) {
  return (left, right) => Number(left?.[key] || 0) - Number(right?.[key] || 0);
}

function normalizeProgram(program) {
  if (!program) return null;
  return {
    ...program,
    days: [...(program.gym_program_days || [])].sort(sortByNumber('day_order')).map((day) => ({
      ...day,
      slots: [...(day.gym_program_exercises || [])].sort(sortByNumber('slot_order')).map((slot) => ({
        ...slot,
        sets: Number(slot.target_sets),
        rep_low: Number(slot.target_rep_low),
        rep_high: Number(slot.target_rep_high),
        exercise_key: slot.exercise?.key,
      })),
    })),
  };
}

function normalizeSessions(sessions) {
  return (sessions || []).map((session) => ({
    ...session,
    gym_set_logs: [...(session.gym_set_logs || [])].sort(sortByNumber('set_number')),
  }));
}

function weekdayMapFromProgram(program) {
  return Object.fromEntries((program?.days || []).map((day) => [day.day_order, day.default_weekday]));
}

function getTodayDateKey() {
  return toDateKey(new Date());
}

function isMissingRpcError(error) {
  return (
    error?.code === 'PGRST202' ||
    error?.message?.includes('Could not find the function') ||
    error?.message?.includes('schema cache')
  );
}

export function useGym() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState(STATIC_CATALOG);
  const [activeProgram, setActiveProgram] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [setLogs, setSetLogs] = useState([]);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schemaReady, setSchemaReady] = useState(() => !readGymSchemaMissingFlag());
  const [outboxCount, setOutboxCount] = useState(() => readGymSetQueue().length);

  const catalogByKey = useMemo(() => new Map(catalog.map((exercise) => [exercise.key, exercise])), [catalog]);
  const catalogById = useMemo(() => new Map(catalog.map((exercise) => [exercise.id, exercise])), [catalog]);

  const markSchemaMissing = useCallback(() => {
    writeGymSchemaMissingFlag(true);
    setSchemaReady(false);
    setError(GYM_MIGRATION_MESSAGE);
    setCatalog(STATIC_CATALOG);
    setActiveProgram(null);
    setSessions([]);
    setSetLogs([]);
    setPrs([]);
  }, []);

  const failGymOperation = useCallback(
    (operationError) => {
      if (isMissingGymSchemaError(operationError)) {
        markSchemaMissing();
        throw new Error(GYM_MIGRATION_MESSAGE);
      }
      throw operationError;
    },
    [markSchemaMissing]
  );

  const refreshGym = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setActiveProgram(null);
      setSessions([]);
      setSetLogs([]);
      setPrs([]);
      setSchemaReady(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (hasKnownMissingGymSchema()) {
        markSchemaMissing();
        return;
      }

      const exerciseRes = await queryGymExercises(user.id);
      if (exerciseRes.schemaMissing) {
        markSchemaMissing();
        return;
      }
      if (exerciseRes.error) {
        if (isMissingGymSchemaError(exerciseRes.error)) {
          markSchemaMissing();
          return;
        }
        throw exerciseRes.error;
      }

      writeGymSchemaMissingFlag(false);
      setSchemaReady(true);
      const [programRes, sessionsRes, logsRes, prsRes] = await Promise.all([
        supabase
          .from('gym_programs')
          .select(PROGRAM_SELECT)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('gym_sessions')
          .select(SESSION_SELECT)
          .eq('user_id', user.id)
          .order('performed_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(80),
        supabase
          .from('gym_set_logs')
          .select('*, exercise:gym_exercises (*)')
          .order('logged_at', { ascending: true })
          .limit(800),
        supabase
          .from('gym_prs')
          .select('*, exercise:gym_exercises (*)')
          .eq('user_id', user.id)
          .order('achieved_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (programRes.error) throw programRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      if (logsRes.error) throw logsRes.error;
      if (prsRes.error) throw prsRes.error;

      const rows = exerciseRes.data?.length ? exerciseRes.data : STATIC_CATALOG;
      setCatalog(rows);
      setActiveProgram(normalizeProgram(programRes.data));
      setSessions(normalizeSessions(sessionsRes.data));
      setSetLogs(logsRes.data || []);
      setPrs(prsRes.data || []);
    } catch (queryError) {
      if (isMissingGymSchemaError(queryError)) {
        markSchemaMissing();
      } else {
        setError(queryError.message || 'Gym data could not be loaded.');
        setSchemaReady(true);
        setCatalog(STATIC_CATALOG);
        setActiveProgram(null);
        setSessions([]);
        setSetLogs([]);
        setPrs([]);
      }
    } finally {
      setLoading(false);
      setOutboxCount(readGymSetQueue().length);
    }
  }, [markSchemaMissing, user?.id]);

  useEffect(() => {
    refreshGym();
  }, [refreshGym]);

  const retryGymSchema = useCallback(async () => {
    writeGymSchemaMissingFlag(false);
    gymExerciseProbePromise = null;
    gymExerciseProbeUserId = '';
    setSchemaReady(true);
    await refreshGym();
  }, [refreshGym]);

  const writeSetLog = useCallback(async (payload) => {
    const setPayload = {
      session_id: payload.session_id,
      exercise_id: payload.exercise_id,
      set_number: Number(payload.set_number),
      weight_kg: payload.weight_kg === '' || payload.weight_kg == null ? null : Number(payload.weight_kg),
      reps: payload.reps === '' || payload.reps == null ? null : Number(payload.reps),
      rir: payload.rir === '' || payload.rir == null ? null : Number(payload.rir),
      is_warmup: Boolean(payload.is_warmup),
      logged_at: payload.logged_at || new Date().toISOString(),
    };
    const { data, error: writeError } = await supabase
      .from('gym_set_logs')
      .upsert(setPayload, { onConflict: 'session_id,exercise_id,set_number' })
      .select('*, exercise:gym_exercises (*)')
      .single();
    if (writeError) throw writeError;
    return data;
  }, []);

  const flushOutbox = useCallback(async () => {
    const result = await flushGymSetLogQueue(writeSetLog);
    setOutboxCount(readGymSetQueue().length);
    if (result.flushed) await refreshGym();
    return result;
  }, [refreshGym, writeSetLog]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleOnline = () => {
      flushOutbox();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [flushOutbox]);

  const replaceProgramDays = useCallback(
    async (programId, specializationMuscle = null, weekdayByDayOrder = {}) => {
      const generated = generateDefaultGymProgram(specializationMuscle || null);
      const generatedDays = serializeGeneratedProgramDays(generated, weekdayByDayOrder);
      const rpcResult = await supabase.rpc('rpc_apply_gym_program', {
        target_program_id: programId,
        target_specialization_muscle: specializationMuscle || null,
        generated_days: generatedDays,
      });

      if (!rpcResult.error) return;
      if (!isMissingRpcError(rpcResult.error)) throw rpcResult.error;

      const existingDays = await supabase.from('gym_program_days').select('id').eq('program_id', programId);
      if (existingDays.error) failGymOperation(existingDays.error);
      const existingDayIds = (existingDays.data || []).map((day) => day.id);
      if (existingDayIds.length) {
        const deleteSlots = await supabase.from('gym_program_exercises').delete().in('program_day_id', existingDayIds);
        if (deleteSlots.error) failGymOperation(deleteSlots.error);
      }
      const deleteDays = await supabase.from('gym_program_days').delete().eq('program_id', programId);
      if (deleteDays.error) failGymOperation(deleteDays.error);

      const insertedDays = await supabase
        .from('gym_program_days')
        .insert(
          generatedDays.map((day) => ({
            program_id: programId,
            label: day.label,
            day_order: day.day_order,
            default_weekday: day.default_weekday,
          }))
        )
        .select('id,day_order');
      if (insertedDays.error) failGymOperation(insertedDays.error);

      const exerciseRows = await supabase.from('gym_exercises').select('id,key').or(`user_id.is.null,user_id.eq.${user.id}`);
      if (exerciseRows.error) failGymOperation(exerciseRows.error);
      const exerciseIdByKey = new Map((exerciseRows.data || []).map((exercise) => [exercise.key, exercise.id]));
      const dayIdByOrder = new Map((insertedDays.data || []).map((day) => [Number(day.day_order), day.id]));
      const slotRows = generatedDays.flatMap((day) =>
        day.slots.map((slot) => ({
          program_day_id: dayIdByOrder.get(Number(day.day_order)),
          exercise_id: exerciseIdByKey.get(slot.exercise_key),
          slot_order: slot.slot_order,
          target_sets: slot.sets,
          target_rep_low: slot.rep_low,
          target_rep_high: slot.rep_high,
          is_specialization: slot.is_specialization,
          notes: slot.notes,
        }))
      );
      const insertSlots = await supabase.from('gym_program_exercises').insert(slotRows);
      if (insertSlots.error) failGymOperation(insertSlots.error);

      const updateProgram = await supabase
        .from('gym_programs')
        .update({
          specialization_muscle: specializationMuscle || null,
          spec_started_on: specializationMuscle ? getTodayDateKey() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', programId)
        .eq('user_id', user.id);
      if (updateProgram.error) failGymOperation(updateProgram.error);
    },
    [failGymOperation, user?.id]
  );

  const createProgram = useCallback(
    async ({ specializationMuscle = null, unitPreference = 'kg', weekdayByDayOrder = { 1: 1, 2: 3, 3: 5 } } = {}) => {
      if (!user?.id) throw new Error('You must be signed in to create a gym program.');
      if (!schemaReady || hasKnownMissingGymSchema()) throw new Error(GYM_MIGRATION_MESSAGE);
      const previousActive = await supabase
        .from('gym_programs')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (previousActive.error) failGymOperation(previousActive.error);

      const programInsert = await supabase
        .from('gym_programs')
        .insert({
          user_id: user.id,
          name: GYM_BASE_PROGRAM._meta?.name || 'DoNext Gym Program',
          base_template: GYM_BASE_PROGRAM._meta?.template_key || 'upper_lower_upper_3day',
          specialization_muscle: specializationMuscle || null,
          spec_started_on: specializationMuscle ? getTodayDateKey() : null,
          unit_preference: unitPreference,
          deload_interval_weeks: GYM_BASE_PROGRAM._meta?.deload_interval_weeks || 7,
          status: 'archived',
        })
        .select('*')
        .single();
      if (programInsert.error) failGymOperation(programInsert.error);

      await replaceProgramDays(programInsert.data.id, specializationMuscle, weekdayByDayOrder);

      const generated = generateDefaultGymProgram(specializationMuscle || null);
      const existingHabits = await supabase.from('habits').select('title').eq('user_id', user.id);
      if (existingHabits.error) throw existingHabits.error;
      const existingTitles = new Set((existingHabits.data || []).map((habit) => habit.title));
      const habitRows = generated.days
        .map((day, index) => ({
          user_id: user.id,
          title: `Train - ${day.label}`,
          icon: 'G',
          color: '#10B981',
          is_active: true,
          sort_order: 100 + index,
        }))
        .filter((habit) => !existingTitles.has(habit.title));
      if (habitRows.length) {
        const habitInsert = await supabase.from('habits').insert(habitRows);
        if (habitInsert.error) throw habitInsert.error;
      }

      const archiveExisting = await supabase
        .from('gym_programs')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('status', 'active');
      if (archiveExisting.error) failGymOperation(archiveExisting.error);

      const activateNew = await supabase
        .from('gym_programs')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', programInsert.data.id)
        .eq('user_id', user.id);
      if (activateNew.error) {
        if (previousActive.data?.id) {
          await supabase
            .from('gym_programs')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', previousActive.data.id)
            .eq('user_id', user.id);
        }
        failGymOperation(activateNew.error);
      }

      await refreshGym();
      return programInsert.data;
    },
    [failGymOperation, refreshGym, replaceProgramDays, schemaReady, user?.id]
  );

  const applyProgram = useCallback(
    async (specializationMuscle = null) => {
      if (!activeProgram?.id) throw new Error('Create a gym program before applying a specialization.');
      await replaceProgramDays(activeProgram.id, specializationMuscle, weekdayMapFromProgram(activeProgram));
      await refreshGym();
    },
    [activeProgram, refreshGym, replaceProgramDays]
  );

  const updateProgramSlot = useCallback(
    async (slotId, updates) => {
      const payload = {};
      if (updates.sets != null) payload.target_sets = Number(updates.sets);
      if (updates.rep_low != null) payload.target_rep_low = Number(updates.rep_low);
      if (updates.rep_high != null) payload.target_rep_high = Number(updates.rep_high);
      if (updates.notes !== undefined) payload.notes = updates.notes || null;
      const { error: updateError } = await supabase.from('gym_program_exercises').update(payload).eq('id', slotId);
      if (updateError) throw updateError;
      await refreshGym();
    },
    [refreshGym]
  );

  const swapProgramSlot = useCallback(
    async (slotId, exerciseId) => {
      const { error: updateError } = await supabase
        .from('gym_program_exercises')
        .update({ exercise_id: exerciseId })
        .eq('id', slotId);
      if (updateError) throw updateError;
      await refreshGym();
    },
    [refreshGym]
  );

  const startSession = useCallback(
    async (programDayId, bodyweightKg = null) => {
      if (!user?.id || !activeProgram?.id) throw new Error('Create a gym program before starting a session.');
      const { data, error: insertError } = await supabase
        .from('gym_sessions')
        .insert({
          user_id: user.id,
          program_id: activeProgram.id,
          program_day_id: programDayId,
          performed_at: getTodayDateKey(),
          bodyweight_kg: bodyweightKg || null,
        })
        .select('*')
        .single();
      if (insertError) throw insertError;
      await refreshGym();
      return data;
    },
    [activeProgram?.id, refreshGym, user?.id]
  );

  const getSession = useCallback(async (sessionId) => {
    const { data, error: sessionError } = await supabase.from('gym_sessions').select(SESSION_SELECT).eq('id', sessionId).maybeSingle();
    if (sessionError) throw sessionError;
    return data ? { ...data, gym_set_logs: [...(data.gym_set_logs || [])].sort(sortByNumber('set_number')) } : null;
  }, []);

  const updateSessionBodyweight = useCallback(async (sessionId, bodyweightKg) => {
    const { error: updateError } = await supabase
      .from('gym_sessions')
      .update({ bodyweight_kg: bodyweightKg === '' || bodyweightKg == null ? null : Number(bodyweightKg) })
      .eq('id', sessionId);
    if (updateError) throw updateError;
  }, []);

  const logSet = useCallback(
    async (payload) => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        enqueueGymSetLog(payload);
        setOutboxCount(readGymSetQueue().length);
        return { queued: true };
      }
      try {
        const data = await writeSetLog(payload);
        await refreshGym();
        return data;
      } catch (writeError) {
        const isNetworkFailure =
          writeError?.name === 'TypeError' ||
          writeError?.message?.toLowerCase().includes('network') ||
          writeError?.message?.toLowerCase().includes('failed to fetch');
        if (!isNetworkFailure) throw writeError;
        enqueueGymSetLog(payload);
        setOutboxCount(readGymSetQueue().length);
        return { queued: true };
      }
    },
    [refreshGym, writeSetLog]
  );

  const deleteSetLog = useCallback(
    async ({ session_id, exercise_id, set_number }) => {
      const { error: deleteError } = await supabase
        .from('gym_set_logs')
        .delete()
        .eq('session_id', session_id)
        .eq('exercise_id', exercise_id)
        .eq('set_number', Number(set_number));
      if (deleteError) throw deleteError;
      await refreshGym();
    },
    [refreshGym]
  );

  const finishSession = useCallback(
    async (sessionId, durationMin) => {
      if (!user?.id) throw new Error('You must be signed in to finish a gym session.');
      const rpcResult = await supabase.rpc('rpc_finish_gym_session', {
        target_session_id: sessionId,
        target_duration_min: Number(durationMin || 0),
      });
      if (rpcResult.error) {
        if (!isMissingRpcError(rpcResult.error)) throw rpcResult.error;
        throw new Error('Apply the gym Supabase migration before finishing a gym session.');
      }
      await refreshGym();
      return rpcResult.data;
    },
    [refreshGym, user?.id]
  );

  const addCustomExercise = useCallback(
    async (exercise) => {
      if (!user?.id) throw new Error('You must be signed in to add an exercise.');
      const keyBase = exercise.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const { data, error: insertError } = await supabase
        .from('gym_exercises')
        .insert({
          user_id: user.id,
          key: `${keyBase || 'custom_exercise'}_${Date.now()}`,
          name: exercise.name.trim(),
          primary_muscle: exercise.primary_muscle,
          secondary_muscles: exercise.secondary_muscles || [],
          movement_type: exercise.movement_type,
          equipment: exercise.equipment,
          is_unilateral: Boolean(exercise.is_unilateral),
          default_rep_low: Number(exercise.default_rep_low || 8),
          default_rep_high: Number(exercise.default_rep_high || 12),
          execution_cue: exercise.execution_cue || '',
          rest_seconds: Number(exercise.rest_seconds || 90),
        })
        .select('*')
        .single();
      if (insertError) throw insertError;
      await refreshGym();
      return data;
    },
    [refreshGym, user?.id]
  );

  return {
    activeProgram,
    addCustomExercise,
    applyProgram,
    catalog,
    catalogById,
    catalogByKey,
    createProgram,
    deleteSetLog,
    error,
    finishSession,
    flushOutbox,
    getSession,
    loading,
    logSet,
    outboxCount,
    prs,
    refreshGym,
    retryGymSchema,
    sessions,
    setLogs,
    schemaMissing: !schemaReady,
    schemaReady,
    startSession,
    swapProgramSlot,
    updateProgramSlot,
    updateSessionBodyweight,
  };
}
