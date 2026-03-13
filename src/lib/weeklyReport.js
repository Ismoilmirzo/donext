import { format, parseISO } from 'date-fns';
import { toISODate, getWeekEnd, getWeekStart } from './dates';
import { supabase } from './supabase';

export async function getWeeklyReportStats(userId, streak = 0) {
  const weekStart = toISODate(getWeekStart(new Date()));
  const weekEnd = toISODate(getWeekEnd(new Date()));

  const [sessionsRes, tasksRes, habitsRes, logsRes] = await Promise.all([
    supabase
      .from('focus_sessions')
      .select('duration_minutes,project_id,project:projects(title,color)')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', weekEnd),
    supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', `${weekStart}T00:00:00`)
      .lte('completed_at', `${weekEnd}T23:59:59`),
    supabase.from('habits').select('id').eq('user_id', userId).eq('is_active', true),
    supabase
      .from('habit_logs')
      .select('habit_id,date,completed')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('date', weekStart)
      .lte('date', weekEnd),
  ]);

  const firstError = sessionsRes.error || tasksRes.error || habitsRes.error || logsRes.error;
  if (firstError) throw firstError;

  const sessions = sessionsRes.data || [];
  const focusMinutes = sessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
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

  return {
    weekLabel: `${format(parseISO(weekStart), 'MMM d')} - ${format(parseISO(weekEnd), 'MMM d, yyyy')}`,
    streak,
    focusMinutes,
    tasksCompleted: (tasksRes.data || []).length,
    projectsWorked: new Set(sessions.map((session) => session.project_id).filter(Boolean)).size,
    habitRate,
    projectBreakdown: Object.values(projectMap).sort((a, b) => b.minutes - a.minutes),
    hasShareableData: focusMinutes > 0 || (tasksRes.data || []).length > 0 || (logsRes.data || []).length > 0,
  };
}
