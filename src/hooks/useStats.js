import { useCallback } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { getStoredLocale, translate } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { getTaskElapsedMinutes, getTaskFocusMinutes } from '../lib/taskSessions';
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

      const focusMinutes = (sessions || []).reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
      const totalMinutes = (sessions || []).reduce(
        (sum, session) => sum + (session.total_duration_minutes ?? session.duration_minutes ?? 0),
        0
      );
      const overheadMinutes = Math.max(0, totalMinutes - focusMinutes);
      const efficiencyRate = totalMinutes > 0 ? (focusMinutes / totalMinutes) * 100 : 0;
      const byDate = {};
      const byProject = {};
      (sessions || []).forEach((session) => {
        if (!byDate[session.date]) {
          byDate[session.date] = {
            focusMinutes: 0,
            totalMinutes: 0,
            overheadMinutes: 0,
          };
        }
        const sessionFocusMinutes = session.duration_minutes || 0;
        const sessionTotalMinutes = session.total_duration_minutes ?? session.duration_minutes ?? 0;
        byDate[session.date].focusMinutes += sessionFocusMinutes;
        byDate[session.date].totalMinutes += sessionTotalMinutes;
        byDate[session.date].overheadMinutes += Math.max(0, sessionTotalMinutes - sessionFocusMinutes);

        const key = session.project_id || 'none';
        if (!byProject[key]) {
          byProject[key] = {
            project_id: session.project_id,
            title: session.project?.title || translate(getStoredLocale(), 'system.unassigned'),
            color: session.project?.color || '#64748b',
            focusMinutes: 0,
            totalMinutes: 0,
            overheadMinutes: 0,
            efficiencyRate: 0,
          };
        }
        byProject[key].focusMinutes += sessionFocusMinutes;
        byProject[key].totalMinutes += sessionTotalMinutes;
        byProject[key].overheadMinutes += Math.max(0, sessionTotalMinutes - sessionFocusMinutes);
        byProject[key].efficiencyRate =
          byProject[key].totalMinutes > 0 ? Math.round((byProject[key].focusMinutes / byProject[key].totalMinutes) * 100) : 0;
      });

      return {
        data: {
          focusMinutes,
          totalMinutes,
          overheadMinutes,
          efficiencyRate,
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
      .select('status,sessions_count,total_focus_minutes,total_elapsed_minutes,time_spent_minutes,total_time_spent_minutes,completed_at')
      .eq('user_id', user.id);
    if (tasksError) return { data: null, error: tasksError };

    const completedTasks = (tasks || []).filter((task) => task.status === 'completed');
    const totalFocusMinutes = completedTasks.reduce((sum, task) => sum + getTaskFocusMinutes(task), 0);
    const totalSpentMinutes = completedTasks.reduce((sum, task) => sum + getTaskElapsedMinutes(task), 0);
    const totalSessions = completedTasks.reduce((sum, task) => sum + (Number(task.sessions_count) || 0), 0);
    const efficiencyRate = totalSpentMinutes > 0 ? (totalFocusMinutes / totalSpentMinutes) * 100 : 0;

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
        avgFocusTimePerTask: completedTasks.length ? totalFocusMinutes / completedTasks.length : 0,
        avgTotalTimePerTask: completedTasks.length ? totalSpentMinutes / completedTasks.length : 0,
        avgSessionsPerTask: completedTasks.length ? totalSessions / completedTasks.length : 0,
        efficiencyRate,
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
