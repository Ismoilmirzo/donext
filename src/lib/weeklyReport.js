import { addDays, differenceInCalendarDays, subDays } from 'date-fns';
import { toISODate, getWeekEnd, getWeekStart } from './dates';
import { supabase } from './supabase';

const MONTH_LABELS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
};

const GYM_SCHEMA_MISSING_KEY = 'donext:gym-schema-missing:v1';
let gymReportSchemaMissingRuntime = false;
let gymReportProbeKey = '';
let gymReportProbePromise = null;

function getMonthLabel(date, localeTag) {
  const language = String(localeTag || '').toLowerCase().startsWith('uz') ? 'uz' : 'en';
  return MONTH_LABELS[language][date.getMonth()];
}

function formatShortDate(date, localeTag, includeYear = false) {
  const isUzbek = String(localeTag || '').toLowerCase().startsWith('uz');
  const dayMonth = isUzbek
    ? `${date.getDate()}-${getMonthLabel(date, localeTag)}`
    : `${getMonthLabel(date, localeTag)} ${date.getDate()}`;
  return includeYear ? `${dayMonth}, ${date.getFullYear()}` : dayMonth;
}

function formatWeekLabel(weekStart, weekEnd, localeTag = 'en-US') {
  const startDate = new Date(`${weekStart}T00:00:00`);
  const endDate = new Date(`${weekEnd}T00:00:00`);
  const startLabel = formatShortDate(startDate, localeTag);
  const endLabel = formatShortDate(endDate, localeTag, true);
  return `${startLabel} - ${endLabel}`;
}

function readGymSchemaMissingFlag() {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(GYM_SCHEMA_MISSING_KEY) === '1';
  } catch {
    return false;
  }
}

function writeGymSchemaMissingFlag(isMissing) {
  gymReportSchemaMissingRuntime = isMissing;
  if (typeof window === 'undefined') return;
  try {
    if (isMissing) window.sessionStorage.setItem(GYM_SCHEMA_MISSING_KEY, '1');
    else window.sessionStorage.removeItem(GYM_SCHEMA_MISSING_KEY);
  } catch {
    // Session storage can be unavailable in restricted browser modes.
  }
}

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
  return gymReportSchemaMissingRuntime || readGymSchemaMissingFlag();
}

function estimateOneRepMax(weightKg, reps) {
  const weight = Number(weightKg || 0);
  const repCount = Number(reps || 0);
  if (!weight || !repCount) return 0;
  return Math.round(weight * (1 + repCount / 30) * 10) / 10;
}

function buildGymReportStats(gymSessions = [], gymPrs = []) {
  const setLogs = gymSessions.flatMap((session) =>
    (session.gym_set_logs || []).map((set) => ({
      ...set,
      performed_at: session.performed_at,
    }))
  );
  const workSets = setLogs.filter((set) => !set.is_warmup && set.weight_kg != null && set.reps != null);
  const totalVolumeKg = workSets.reduce((sum, set) => sum + Number(set.weight_kg || 0) * Number(set.reps || 0), 0);
  const topLift = workSets
    .map((set) => ({
      exerciseName: set.exercise?.name || 'Exercise',
      estimatedMax: estimateOneRepMax(set.weight_kg, set.reps),
      weightKg: Number(set.weight_kg || 0),
      reps: Number(set.reps || 0),
    }))
    .sort((left, right) => right.estimatedMax - left.estimatedMax || right.weightKg - left.weightKg)[0] || null;
  const prs = gymPrs.map((record) => ({
    exerciseName: record.exercise?.name || 'Exercise',
    estimatedMax: Number(record.estimated_1rm || 0),
    weightKg: Number(record.weight_kg || 0),
    reps: Number(record.reps || 0),
  }));

  return {
    hasData: gymSessions.length > 0 || prs.length > 0,
    sessions: gymSessions.length,
    totalVolumeKg: Math.round(totalVolumeKg),
    prCount: prs.length,
    prs,
    topLift,
  };
}

async function queryGymReportData(userId, weekStart, weekEnd) {
  if (hasKnownMissingGymSchema()) return { sessions: [], prs: [] };

  const nextProbeKey = `${userId}:${weekStart}:${weekEnd}`;
  if (gymReportProbePromise && gymReportProbeKey === nextProbeKey) return gymReportProbePromise;

  gymReportProbeKey = nextProbeKey;
  gymReportProbePromise = (async () => {
    const sessionsRes = await supabase
      .from('gym_sessions')
      .select('id,performed_at,duration_min,gym_set_logs(weight_kg,reps,is_warmup,exercise:gym_exercises(name))')
      .eq('user_id', userId)
      .gte('performed_at', weekStart)
      .lte('performed_at', weekEnd);

    if (sessionsRes.error) {
      if (isMissingGymSchemaError(sessionsRes.error)) {
        writeGymSchemaMissingFlag(true);
        return { sessions: [], prs: [] };
      }
      return { error: sessionsRes.error };
    }

    writeGymSchemaMissingFlag(false);
    const prsRes = await supabase
      .from('gym_prs')
      .select('estimated_1rm,weight_kg,reps,achieved_at,exercise:gym_exercises(name)')
      .eq('user_id', userId)
      .gte('achieved_at', weekStart)
      .lte('achieved_at', weekEnd)
      .order('achieved_at', { ascending: false })
      .limit(3);

    if (prsRes.error) {
      if (isMissingGymSchemaError(prsRes.error)) {
        writeGymSchemaMissingFlag(true);
        return { sessions: sessionsRes.data || [], prs: [] };
      }
      return { error: prsRes.error };
    }

    return { sessions: sessionsRes.data || [], prs: prsRes.data || [] };
  })().finally(() => {
    gymReportProbeKey = '';
    gymReportProbePromise = null;
  });

  return gymReportProbePromise;
}

export async function getWeeklyReportStats(userId, streak = 0, localeTag = 'en-US') {
  const currentDate = new Date();
  const weekStartDate = getWeekStart(currentDate);
  const weekEndDate = getWeekEnd(currentDate);
  const weekStart = toISODate(weekStartDate);
  const weekEnd = toISODate(weekEndDate);
  const visibleEndDate = currentDate < weekEndDate ? currentDate : weekEndDate;
  const visibleEndIso = toISODate(visibleEndDate);

  const [sessionsRes, tasksRes, habitsRes, logsRes, gymReportRes] = await Promise.all([
    supabase
      .from('focus_sessions')
      .select('date,duration_minutes,project_id,project:projects(title,color)')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', weekEnd),
    supabase
      .from('tasks')
      .select('id,completed_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', `${toISODate(subDays(weekStartDate, 1))}T00:00:00`)
      .lte('completed_at', `${toISODate(addDays(weekEndDate, 1))}T23:59:59`),
    supabase.from('habits').select('id').eq('user_id', userId).eq('is_active', true),
    supabase
      .from('habit_logs')
      .select('habit_id,date,completed')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('date', weekStart)
      .lte('date', weekEnd),
    queryGymReportData(userId, weekStart, weekEnd),
  ]);

  const firstError = sessionsRes.error || tasksRes.error || habitsRes.error || logsRes.error;
  if (firstError) throw firstError;
  if (gymReportRes.error) throw gymReportRes.error;

  const sessions = (sessionsRes.data || []).filter((session) => session.date && session.date <= visibleEndIso);
  const gymSessions = (gymReportRes.sessions || []).filter((session) => session.performed_at && session.performed_at <= visibleEndIso);
  const gymPrs = (gymReportRes.prs || []).filter((record) => record.achieved_at && record.achieved_at <= visibleEndIso);
  const focusMinutes = sessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
  const focusByDate = sessions.reduce((map, session) => {
    if (!session.date) return map;
    map[session.date] = (map[session.date] || 0) + (session.duration_minutes || 0);
    return map;
  }, {});
  const projectMap = sessions.reduce((map, session) => {
    const key = session.project_id || 'unassigned';
    if (!map[key]) {
      map[key] = {
        name: session.project?.title || 'Unassigned',
        color: session.project?.color || '#10B981',
        minutes: 0,
      };
    }
    map[key].minutes += session.duration_minutes || 0;
    return map;
  }, {});

  const activeHabits = habitsRes.data || [];
  const possibleHabitLogs = activeHabits.length * 7;
  const habitRate = possibleHabitLogs > 0 ? ((logsRes.data || []).length / possibleHabitLogs) * 100 : 0;
  const dailyFocusMinutes = Array.from({ length: 7 }, (_, index) => {
    const day = toISODate(addDays(weekStartDate, index));
    return focusByDate[day] || 0;
  });
  const todayIndex = Math.min(6, Math.max(0, differenceInCalendarDays(currentDate, weekStartDate)));
  const completedTasks = (tasksRes.data || []).filter((task) => {
    if (!task.completed_at) return false;
    const completedAt = new Date(task.completed_at);
    return completedAt >= weekStartDate && completedAt <= visibleEndDate;
  });
  const gym = buildGymReportStats(gymSessions, gymPrs);

  return {
    weekLabel: formatWeekLabel(weekStart, weekEnd, localeTag),
    streak,
    focusMinutes,
    sessionsCount: sessions.length,
    tasksCompleted: completedTasks.length,
    projectsWorked: new Set(sessions.map((session) => session.project_id).filter(Boolean)).size,
    habitRate,
    dailyFocusMinutes,
    todayIndex,
    projectBreakdown: Object.values(projectMap).sort((a, b) => b.minutes - a.minutes),
    gym,
    hasShareableData: focusMinutes > 0 || completedTasks.length > 0 || (logsRes.data || []).length > 0 || gym.hasData,
  };
}
