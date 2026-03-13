import { endOfDay, startOfDay } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { APP_EVENTS, addAppEventListener } from '../lib/appEvents';
import { supabase } from '../lib/supabase';
import { toISODate } from '../lib/dates';

const EMPTY_SUMMARY = {
  totalHabits: 0,
  completedHabits: 0,
  focusMinutes: 0,
  tasksCompleted: 0,
  missedHabits: [],
  workedProjects: [],
  shouldShowEveningSummary: false,
  hasProgress: false,
};

export function useDailySummary() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user) {
      setSummary(EMPTY_SUMMARY);
      setLoading(false);
      setError('');
      return { data: EMPTY_SUMMARY, error: null };
    }

    const today = new Date();
    const todayIso = toISODate(today);
    const startIso = startOfDay(today).toISOString();
    const endIso = endOfDay(today).toISOString();

    const [habitsRes, logsRes, tasksRes, sessionsRes] = await Promise.all([
      supabase.from('habits').select('id,title').eq('user_id', user.id).eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('habit_logs').select('habit_id').eq('user_id', user.id).eq('date', todayIso).eq('completed', true),
      supabase
        .from('tasks')
        .select('id,title,project:projects(id,title)')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', startIso)
        .lte('completed_at', endIso),
      supabase
        .from('focus_sessions')
        .select('id,project_id,duration_minutes,project:projects(id,title),task:tasks(title)')
        .eq('user_id', user.id)
        .eq('date', todayIso),
    ]);

    const firstError = habitsRes.error || logsRes.error || tasksRes.error || sessionsRes.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return { data: null, error: firstError };
    }

    const habits = habitsRes.data || [];
    const completedHabitIds = new Set((logsRes.data || []).map((row) => row.habit_id));
    const tasksCompleted = tasksRes.data || [];
    const sessions = sessionsRes.data || [];
    const focusMinutes = sessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);

    const workedProjectMap = new Map();
    sessions.forEach((session) => {
      const key = session.project_id || session.project?.id || 'unknown';
      const entry = workedProjectMap.get(key) || {
        id: session.project_id || session.project?.id || null,
        title: session.project?.title || 'Unassigned',
        focusMinutes: 0,
        tasksCompleted: 0,
      };
      entry.focusMinutes += session.duration_minutes || 0;
      workedProjectMap.set(key, entry);
    });

    tasksCompleted.forEach((task) => {
      const key = task.project?.id || 'unknown';
      const entry = workedProjectMap.get(key) || {
        id: task.project?.id || null,
        title: task.project?.title || 'Unassigned',
        focusMinutes: 0,
        tasksCompleted: 0,
      };
      entry.tasksCompleted += 1;
      workedProjectMap.set(key, entry);
    });

    const nextSummary = {
      totalHabits: habits.length,
      completedHabits: completedHabitIds.size,
      focusMinutes,
      tasksCompleted: tasksCompleted.length,
      missedHabits: habits.filter((habit) => !completedHabitIds.has(habit.id)).map((habit) => habit.title),
      workedProjects: Array.from(workedProjectMap.values()).sort((a, b) => {
        if (b.focusMinutes !== a.focusMinutes) return b.focusMinutes - a.focusMinutes;
        return b.tasksCompleted - a.tasksCompleted;
      }),
      hasProgress: completedHabitIds.size > 0 || tasksCompleted.length > 0 || focusMinutes > 0,
      shouldShowEveningSummary: today.getHours() >= 20 && (completedHabitIds.size > 0 || tasksCompleted.length > 0 || focusMinutes > 0),
    };

    setSummary(nextSummary);
    setLoading(false);
    setError('');
    return { data: nextSummary, error: null };
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    const interval = window.setInterval(() => {
      void refresh();
    }, 60000);

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibility);
    const removeRefreshListener = addAppEventListener(APP_EVENTS.dailySummaryRefresh, () => {
      void refresh();
    });

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
      removeRefreshListener();
    };
  }, [refresh]);

  const habitProgressLabel = useMemo(() => `${summary.completedHabits}/${summary.totalHabits}`, [summary.completedHabits, summary.totalHabits]);

  return {
    summary,
    habitProgressLabel,
    loading,
    error,
    refresh,
  };
}
