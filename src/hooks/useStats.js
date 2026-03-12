import { useCallback } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { getStoredLocale, translate } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useStats() {
  const { user } = useAuth();

  const getFocusStats = useCallback(
    async (startDate, endDate) => {
      if (!user) return { data: null, error: new Error(translate(getStoredLocale(), 'system.notAuthenticated')) };
      const { data: sessions, error } = await supabase
        .from('focus_sessions')
        .select('*, project:projects(title,color)')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) return { data: null, error };

      const totalMinutes = (sessions || []).reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
      const byDate = {};
      const byProject = {};
      (sessions || []).forEach((session) => {
        byDate[session.date] = (byDate[session.date] || 0) + (session.duration_minutes || 0);
        const key = session.project_id || 'none';
        if (!byProject[key]) {
          byProject[key] = {
            project_id: session.project_id,
            title: session.project?.title || translate(getStoredLocale(), 'system.unassigned'),
            color: session.project?.color || '#64748b',
            minutes: 0,
          };
        }
        byProject[key].minutes += session.duration_minutes || 0;
      });

      return {
        data: {
          totalMinutes,
          byDate,
          byProject: Object.values(byProject),
          sessionCount: (sessions || []).length,
        },
        error: null,
      };
    },
    [user]
  );

  const getHabitStats = useCallback(
    async (startDate, endDate) => {
      if (!user) return { data: null, error: new Error(translate(getStoredLocale(), 'system.notAuthenticated')) };
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (habitsError) return { data: null, error: habitsError };

      const { data: logs, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('completed', true);
      if (logsError) return { data: null, error: logsError };

      const totalDays = differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1;
      const possibleLogs = (habits || []).length * totalDays;
      const completedLogs = (logs || []).length;
      const overallRate = possibleLogs > 0 ? (completedLogs / possibleLogs) * 100 : 0;

      const perHabit = (habits || [])
        .map((habit) => {
          const count = (logs || []).filter((log) => log.habit_id === habit.id).length;
          return {
            ...habit,
            completionRate: totalDays > 0 ? (count / totalDays) * 100 : 0,
          };
        })
        .sort((a, b) => b.completionRate - a.completionRate);

      return { data: { overallRate, perHabit, totalDays }, error: null };
    },
    [user]
  );

  const getProjectStats = useCallback(async () => {
    if (!user) return { data: null, error: new Error(translate(getStoredLocale(), 'system.notAuthenticated')) };
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id);
    if (projectsError) return { data: null, error: projectsError };

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('status,time_spent_minutes,completed_at')
      .eq('user_id', user.id);
    if (tasksError) return { data: null, error: tasksError };

    const completedTasks = (tasks || []).filter((task) => task.status === 'completed');
    const totalMinutes = completedTasks.reduce((sum, task) => sum + (task.time_spent_minutes || 0), 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const completedThisMonth = (projects || []).filter(
      (project) => project.status === 'completed' && project.completed_at && project.completed_at >= monthStart
    ).length;

    return {
      data: {
        activeCount: (projects || []).filter((project) => project.status === 'active').length,
        completedThisMonth,
        tasksCompleted: completedTasks.length,
        avgTimePerTask: completedTasks.length ? totalMinutes / completedTasks.length : 0,
      },
      error: null,
    };
  }, [user]);

  return {
    getFocusStats,
    getHabitStats,
    getProjectStats,
  };
}
