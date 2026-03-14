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
    weekLabel: formatWeekLabel(weekStart, weekEnd, localeTag),
    streak,
    focusMinutes,
    sessionsCount: sessions.length,
    tasksCompleted: (tasksRes.data || []).length,
    projectsWorked: new Set(sessions.map((session) => session.project_id).filter(Boolean)).size,
    habitRate,
    projectBreakdown: Object.values(projectMap).sort((a, b) => b.minutes - a.minutes),
    hasShareableData: focusMinutes > 0 || (tasksRes.data || []).length > 0 || (logsRes.data || []).length > 0,
  };
}
