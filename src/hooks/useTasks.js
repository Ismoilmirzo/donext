import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredLocale, translate } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toISODate } from '../lib/dates';
import { APP_EVENTS, emitAppEvent } from '../lib/appEvents';

function getElapsedMinutes(startedAt, fallbackMinutes = 1) {
  const fallback = Math.max(1, Number(fallbackMinutes) || 1);
  if (!startedAt) return fallback;
  const startedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedMs)) return fallback;
  return Math.max(1, Math.ceil((Date.now() - startedMs) / 60000));
}

export function useTasks(projectId = null) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(
    async (nextProjectId = projectId) => {
      if (!user || !nextProjectId) {
        setTasks([]);
        setLoading(false);
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', nextProjectId)
        .order('sort_order', { ascending: true });

      if (!error) setTasks(data || []);
      setLoading(false);
      return { data, error };
    },
    [projectId, user]
  );

  const refreshProjectAllDoneState = useCallback(
    async (projectIdToCheck) => {
      if (!user || !projectIdToCheck) return;
      const { data } = await supabase
        .from('tasks')
        .select('id,status')
        .eq('user_id', user.id)
        .eq('project_id', projectIdToCheck);
      const allDone = (data || []).length > 0 && (data || []).every((task) => task.status === 'completed');
      const updates = {
        updated_at: new Date().toISOString(),
        all_tasks_done_at: allDone ? new Date().toISOString() : null,
      };
      await supabase.from('projects').update(updates).eq('id', projectIdToCheck);
    },
    [user]
  );

  const addTask = useCallback(
    async (targetProjectId, title, description = '', position = 'end') => {
      if (!user || !targetProjectId) return { data: null, error: new Error(translate(getStoredLocale(), 'system.missingProject')) };

      const current = targetProjectId === projectId ? tasks : [];
      const pending = current.filter((task) => task.status !== 'completed');
      const firstPending = pending[0];
      const maxSort = current.reduce((max, task) => Math.max(max, task.sort_order || 0), 0);

      let nextSort = maxSort + 1;
      if (position === 'after-current' && firstPending) {
        nextSort = (firstPending.sort_order || 0) + 1;
        const shiftTargets = current.filter((task) => (task.sort_order || 0) >= nextSort);
        await Promise.all(
          shiftTargets.map((task) =>
            supabase.from('tasks').update({ sort_order: (task.sort_order || 0) + 1 }).eq('id', task.id)
          )
        );
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          project_id: targetProjectId,
          title: title.trim(),
          description: description.trim(),
          sort_order: nextSort,
          status: 'pending',
        })
        .select('*')
        .single();

      if (!error && projectId === targetProjectId) {
        await fetchTasks(targetProjectId);
      }
      return { data, error };
    },
    [fetchTasks, projectId, tasks, user]
  );

  const updateTask = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (!error && data) {
      setTasks((prev) => prev.map((task) => (task.id === id ? data : task)));
    }
    return { data, error };
  }, []);

  const startTask = useCallback(
    async (id) =>
      updateTask(id, {
        status: 'in_progress',
        started_at: new Date().toISOString(),
      }),
    [updateTask]
  );

  const completeTask = useCallback(
    async (id, focusMinutes) => {
      const currentTask = tasks.find((task) => task.id === id);
      if (!currentTask || !user) return { data: null, error: new Error(translate(getStoredLocale(), 'system.taskNotFound')) };

      const completedAt = new Date().toISOString();
      const totalElapsedMinutes = getElapsedMinutes(currentTask.started_at, focusMinutes);
      const validFocusMinutes = Math.max(1, Math.min(Number(focusMinutes) || 0, totalElapsedMinutes));

      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          time_spent_minutes: validFocusMinutes,
          total_time_spent_minutes: totalElapsedMinutes,
          completed_at: completedAt,
          updated_at: completedAt,
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) return { data: null, error };

      const sessionResult = await supabase.from('focus_sessions').insert({
        user_id: user.id,
        task_id: id,
        project_id: currentTask.project_id,
        date: toISODate(new Date()),
        duration_minutes: validFocusMinutes,
        total_duration_minutes: totalElapsedMinutes,
      });
      if (sessionResult.error) return { data, error: sessionResult.error };

      setTasks((prev) =>
        prev
          .map((task) => (task.id === id ? data : task))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      );
      emitAppEvent(APP_EVENTS.dailySummaryRefresh);
      await refreshProjectAllDoneState(currentTask.project_id);
      return { data, error: null };
    },
    [refreshProjectAllDoneState, tasks, user]
  );

  const reorderTasks = useCallback(
    async (taskId, direction) => {
      const pending = tasks
        .filter((task) => task.status !== 'completed')
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      const index = pending.findIndex((task) => task.id === taskId);
      if (index === -1) return { data: null, error: null };

      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= pending.length) return { data: null, error: null };

      const current = pending[index];
      const target = pending[swapIndex];
      const results = await Promise.all([
        supabase.from('tasks').update({ sort_order: target.sort_order }).eq('id', current.id),
        supabase.from('tasks').update({ sort_order: current.sort_order }).eq('id', target.id),
      ]);
      const failed = results.find((result) => result.error);
      if (!failed) {
        setTasks((prev) =>
          prev
            .map((task) => {
              if (task.id === current.id) return { ...task, sort_order: target.sort_order };
              if (task.id === target.id) return { ...task, sort_order: current.sort_order };
              return task;
            })
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        );
      }
      return { data: null, error: failed?.error || null };
    },
    [tasks]
  );

  const deleteTask = useCallback(async (id) => {
    const existing = tasks.find((task) => task.id === id);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks((prev) => prev.filter((task) => task.id !== id));
      if (existing?.project_id) {
        await refreshProjectAllDoneState(existing.project_id);
      }
    }
    return { error };
  }, [refreshProjectAllDoneState, tasks]);

  useEffect(() => {
    void fetchTasks(projectId);
  }, [fetchTasks, projectId]);

  const nextTask = useMemo(
    () => tasks.find((task) => task.status === 'in_progress') || tasks.find((task) => task.status === 'pending') || null,
    [tasks]
  );

  return {
    tasks,
    nextTask,
    loading,
    fetchTasks,
    addTask,
    updateTask,
    startTask,
    completeTask,
    reorderTasks,
    deleteTask,
  };
}
