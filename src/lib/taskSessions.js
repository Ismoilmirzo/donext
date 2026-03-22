import { toISODate } from './dates';
import { APP_EVENTS, emitAppEvent } from './appEvents';
import { supabase } from './supabase';

export const ACTIVE_SESSION_STORAGE_KEY = 'donext:active-task-session';

function toDate(value) {
  if (!value) return null;
  const next = value instanceof Date ? value : new Date(value);
  return Number.isNaN(next.getTime()) ? null : next;
}

function safeSecondsBetween(start, end) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return 0;
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));
}

export function getTaskFocusMinutes(task = {}) {
  return Math.max(0, Number(task.total_focus_minutes ?? task.time_spent_minutes ?? 0) || 0);
}

export function getTaskElapsedMinutes(task = {}) {
  return Math.max(0, Number(task.total_elapsed_minutes ?? task.total_time_spent_minutes ?? task.time_spent_minutes ?? 0) || 0);
}

export function normalizeSegments(segments) {
  if (!Array.isArray(segments)) return [];
  return segments
    .filter((segment) => segment?.start && (segment.type === 'work' || segment.type === 'break'))
    .map((segment) => ({
      type: segment.type,
      start: segment.start,
      end: segment.end || null,
    }));
}

export function getCurrentSegment(segments = []) {
  const normalized = normalizeSegments(segments);
  return normalized[normalized.length - 1] || null;
}

export function closeCurrentSegment(segments = [], endedAt) {
  const normalized = normalizeSegments(segments);
  if (!normalized.length) return normalized;
  const nextEndedAt = endedAt || new Date().toISOString();
  const lastIndex = normalized.length - 1;
  return normalized.map((segment, index) =>
    index === lastIndex ? { ...segment, end: segment.end || nextEndedAt } : segment
  );
}

export function switchSegment(segments = [], nextType, at = new Date().toISOString()) {
  const closed = closeCurrentSegment(segments, at);
  return [...closed, { type: nextType, start: at, end: null }];
}

export function calculateFocusSeconds(segments = [], now = new Date()) {
  return normalizeSegments(segments).reduce((total, segment) => {
    if (segment.type !== 'work') return total;
    return total + safeSecondsBetween(segment.start, segment.end || now);
  }, 0);
}

export function calculateSessionMetrics(session, now = new Date()) {
  const normalizedSegments = normalizeSegments(session?.segments);
  const currentSegment = getCurrentSegment(normalizedSegments);
  const totalElapsedSeconds = safeSecondsBetween(session?.started_at, session?.ended_at || now);
  const focusSeconds = calculateFocusSeconds(normalizedSegments, now);
  const breakSeconds = Math.max(0, totalElapsedSeconds - focusSeconds);
  const currentSegmentSeconds = currentSegment ? safeSecondsBetween(currentSegment.start, currentSegment.end || now) : 0;
  const currentBreakSeconds =
    currentSegment?.type === 'break' ? safeSecondsBetween(currentSegment.start, currentSegment.end || now) : 0;
  const isWorking = currentSegment?.type !== 'break';

  return {
    totalElapsedSeconds,
    focusSeconds,
    breakSeconds,
    currentSegmentSeconds,
    currentBreakSeconds,
    currentSegment,
    isWorking,
    efficiencyRate: totalElapsedSeconds > 0 ? Math.round((focusSeconds / totalElapsedSeconds) * 100) : 0,
  };
}

export function finalizeSegments(session, endedAt = new Date().toISOString()) {
  const finalSegments = closeCurrentSegment(session?.segments, endedAt);
  const focusSeconds = calculateFocusSeconds(finalSegments, endedAt);
  const totalElapsedSeconds = safeSecondsBetween(session?.started_at, endedAt);
  const breakSeconds = Math.max(0, totalElapsedSeconds - focusSeconds);

  return {
    segments: finalSegments,
    endedAt,
    focusSeconds,
    totalElapsedSeconds,
    breakSeconds,
    focusMinutes: Math.max(0, Math.round(focusSeconds / 60)),
    totalMinutes: Math.max(0, Math.round(totalElapsedSeconds / 60)),
    breakMinutes: Math.max(0, Math.round(breakSeconds / 60)),
    efficiencyRate: totalElapsedSeconds > 0 ? Math.round((focusSeconds / totalElapsedSeconds) * 100) : 0,
  };
}

export function formatSessionTimer(totalSeconds = 0) {
  const safeValue = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeValue / 3600);
  const minutes = Math.floor((safeValue % 3600) / 60);
  const seconds = safeValue % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getStoredActiveSessionId() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
}

export function storeActiveSessionId(sessionId) {
  if (typeof window === 'undefined') return;
  if (!sessionId) {
    window.sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
}

function getSessionTaskId(session) {
  return session?.task_id || session?.task?.id || null;
}

async function fetchTaskRow(taskId, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', userId)
    .single();

  return { data, error };
}

async function fetchTaskSessionById(sessionId, userId) {
  const { data, error } = await supabase
    .from('task_sessions')
    .select('*, task:tasks(*), project:projects(*)')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  return { data, error };
}

async function refreshProjectCompletionState(userId, projectId) {
  if (!userId || !projectId) return;

  const { data, error } = await supabase
    .from('tasks')
    .select('id,status')
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) return;

  const allDone = (data || []).length > 0 && (data || []).every((task) => task.status === 'completed');
  await supabase
    .from('projects')
    .update({
      updated_at: new Date().toISOString(),
      all_tasks_done_at: allDone ? new Date().toISOString() : null,
    })
    .eq('id', projectId);
}

async function insertCompatibilityFocusSession(userId, session, summary) {
  return supabase.from('focus_sessions').insert({
    user_id: userId,
    task_id: session.task_id,
    project_id: session.project_id || null,
    date: toISODate(new Date(summary.endedAt)),
    duration_minutes: summary.focusMinutes,
    total_duration_minutes: summary.totalMinutes,
  });
}

export async function fetchActiveTaskSession(userId) {
  if (!userId) return { data: null, error: new Error('Missing user id') };

  const { data, error } = await supabase
    .from('task_sessions')
    .select('*, task:tasks(*), project:projects(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

export async function clearDanglingInProgressTasks(userId) {
  if (!userId) return { data: [], error: null };

  const { data: danglingTasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'in_progress');

  if (fetchError || !(danglingTasks || []).length) return { data: danglingTasks || [], error: fetchError || null };

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'pending',
      started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .select('id');

  return { data: data || [], error };
}

export async function startTaskSession({ userId, task }) {
  if (!userId || !task?.id) return { data: null, error: new Error('Missing task') };

  const taskResult = await fetchTaskRow(task.id, userId);
  if (taskResult.error) return { data: null, error: taskResult.error };

  const currentTask = taskResult.data;
  if (!currentTask) return { data: null, error: new Error('Task not found') };
  if (currentTask.status === 'completed') return { data: null, error: new Error('Task already completed') };

  const activeSession = await fetchActiveTaskSession(userId);
  if (activeSession.error) return { data: null, error: activeSession.error };
  if (activeSession.data?.id) return { data: activeSession.data, error: new Error('Another active session already exists') };

  const nowIso = new Date().toISOString();
  const sessionNumber = Math.max(0, Number(currentTask.sessions_count) || 0) + 1;
  const segments = [{ type: 'work', start: nowIso, end: null }];

  const { data: insertedSession, error: insertError } = await supabase
    .from('task_sessions')
    .insert({
      user_id: userId,
      task_id: currentTask.id,
      project_id: currentTask.project_id,
      session_number: sessionNumber,
      started_at: nowIso,
      segments,
      status: 'active',
    })
    .select('id')
    .single();

  if (insertError) return { data: null, error: insertError };

  const { error: taskUpdateError } = await supabase
    .from('tasks')
    .update({
      status: 'in_progress',
      sessions_count: sessionNumber,
      started_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', currentTask.id)
    .eq('user_id', userId);

  if (taskUpdateError) {
    const { error: cleanupError } = await supabase
      .from('task_sessions')
      .delete()
      .eq('id', insertedSession.id)
      .eq('user_id', userId);

    if (cleanupError) {
      return {
        data: null,
        error: new Error(`${taskUpdateError.message || 'Task update failed'}; cleanup failed: ${cleanupError.message}`),
      };
    }

    return { data: null, error: taskUpdateError };
  }

  const sessionResult = await fetchTaskSessionById(insertedSession.id, userId);
  if (sessionResult.data?.id) {
    storeActiveSessionId(sessionResult.data.id);
  }
  return sessionResult;
}

export async function toggleTaskSession(session, nextType) {
  if (!session?.id) return { data: null, error: new Error('Missing session') };
  const nowIso = new Date().toISOString();
  const nextSegments = switchSegment(session.segments, nextType, nowIso);

  const { error } = await supabase
    .from('task_sessions')
    .update({ segments: nextSegments })
    .eq('id', session.id);

  if (error) return { data: null, error };
  return {
    data: {
      ...session,
      segments: nextSegments,
    },
    error: null,
  };
}

async function finalizeTask(session, userId, mode, endedAt) {
  const taskId = getSessionTaskId(session);
  if (!taskId) return { data: null, error: new Error('Missing task id') };

  const taskResult = await fetchTaskRow(taskId, userId);
  if (taskResult.error) return { data: null, error: taskResult.error };

  const task = taskResult.data;
  if (!task) return { data: null, error: new Error('Task not found') };

  const summary = finalizeSegments(session, endedAt);
  const sessionUpdate = await supabase
    .from('task_sessions')
    .update({
      segments: summary.segments,
      status: mode,
      ended_at: summary.endedAt,
      focus_minutes: summary.focusMinutes,
      total_minutes: summary.totalMinutes,
    })
    .eq('id', session.id)
    .eq('user_id', userId);

  if (sessionUpdate.error) return { data: null, error: sessionUpdate.error };

  const nextTaskStatus = mode === 'completed' ? 'completed' : 'pending';
  const nextTaskUpdate = {
    status: nextTaskStatus,
    total_focus_minutes: getTaskFocusMinutes(task) + summary.focusMinutes,
    total_elapsed_minutes: getTaskElapsedMinutes(task) + summary.totalMinutes,
    started_at: null,
    updated_at: summary.endedAt,
  };

  if (mode === 'completed') {
    nextTaskUpdate.completed_at = summary.endedAt;
  }

  const { data: updatedTask, error: taskUpdateError } = await supabase
    .from('tasks')
    .update(nextTaskUpdate)
    .eq('id', taskId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (taskUpdateError || !updatedTask?.id) return { data: null, error: taskUpdateError || new Error('Task update failed') };

  const compatibilityInsert = await insertCompatibilityFocusSession(userId, session, summary);
  if (compatibilityInsert.error) return { data: null, error: compatibilityInsert.error };

  await refreshProjectCompletionState(userId, session.project_id || task.project_id);
  storeActiveSessionId(null);
  emitAppEvent(APP_EVENTS.dailySummaryRefresh);
  emitAppEvent(APP_EVENTS.badgeCheckRequested, { trigger: 'focus_completed' });

  const sessionResult = await fetchTaskSessionById(session.id, userId);
  return {
    data: {
      session: sessionResult.data,
      summary,
      mode,
    },
    error: null,
  };
}

export async function completeTaskSession(session, userId) {
  return finalizeTask(session, userId, 'completed', new Date().toISOString());
}

export async function pauseTaskSession(session, userId) {
  return finalizeTask(session, userId, 'paused', new Date().toISOString());
}

export async function resolveOrphanTaskSession(session, userId, action) {
  if (!session?.id) return { data: null, error: new Error('Missing session') };
  if (action === 'discard') {
    const taskId = getSessionTaskId(session);
    if (!taskId) return { data: null, error: new Error('Missing task id') };

    const taskResult = await fetchTaskRow(taskId, userId);
    if (taskResult.error) return { data: null, error: taskResult.error };

    const task = taskResult.data;
    const nextSessionsCount = Math.max(0, (Number(task?.sessions_count) || 0) - 1);

    const deleteResult = await supabase
      .from('task_sessions')
      .delete()
      .eq('id', session.id)
      .eq('user_id', userId);

    if (deleteResult.error) return { data: null, error: deleteResult.error };

    const taskUpdateResult = await supabase
      .from('tasks')
      .update({
        status: 'pending',
        sessions_count: nextSessionsCount,
        started_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (taskUpdateResult.error || !taskUpdateResult.data?.id) {
      return { data: null, error: taskUpdateResult.error || new Error('Task update failed') };
    }

    await refreshProjectCompletionState(userId, session.project_id || task?.project_id);
    storeActiveSessionId(null);
    emitAppEvent(APP_EVENTS.dailySummaryRefresh);
    return { data: { action: 'discard' }, error: null };
  }

  const currentSegment = getCurrentSegment(session.segments);
  const safeEndedAt = currentSegment?.start || session.started_at || new Date().toISOString();
  return finalizeTask(session, userId, action === 'complete' ? 'completed' : 'paused', safeEndedAt);
}
