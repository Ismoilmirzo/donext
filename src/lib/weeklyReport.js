import { addDays, differenceInCalendarDays, subDays } from 'date-fns';
import { toISODate, getWeekEnd, getWeekStart } from './dates';
import { supabase } from './supabase';

const MONTH_LABELS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
};

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

export async function getWeeklyReportStats(userId, streak = 0, localeTag = 'en-US') {
  const currentDate = new Date();
  const weekStartDate = getWeekStart(currentDate);
  const weekEndDate = getWeekEnd(currentDate);
  const weekStart = toISODate(weekStartDate);
  const weekEnd = toISODate(weekEndDate);
  const visibleEndDate = currentDate < weekEndDate ? currentDate : weekEndDate;
  const visibleEndIso = toISODate(visibleEndDate);

  const [sessionsRes, tasksRes, habitsRes, logsRes] = await Promise.all([
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
  ]);

  const firstError = sessionsRes.error || tasksRes.error || habitsRes.error || logsRes.error;
  if (firstError) throw firstError;

  const sessions = (sessionsRes.data || []).filter((session) => session.date && session.date <= visibleEndIso);
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
    hasShareableData: focusMinutes > 0 || (tasksRes.data || []).length > 0 || (logsRes.data || []).length > 0,
  };
}
