import { differenceInCalendarDays } from 'date-fns';
import { supabase } from './supabase';

/**
 * Generate post-session insights from stats.
 * Pure computation — no LLM needed.
 */

/**
 * @param {{ focusMinutes: number, breakMinutes: number, totalMinutes: number, efficiencyRate: number }} summary
 * @param {{ title: string, sessions_count: number, total_focus_minutes: number, project_id: string }} task
 * @param {string} userId
 * @param {function} t - translation function
 * @returns {Promise<string[]>} Array of insight strings
 */
export async function generateSessionInsights(summary, task, userId, t) {
  if (!summary || !task || !userId) return [];

  const insights = [];

  try {
    // 1. Compare to this week's sessions
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weekSessions } = await supabase
      .from('focus_sessions')
      .select('duration_minutes,total_duration_minutes')
      .eq('user_id', userId)
      .gte('date', weekAgo.toISOString().slice(0, 10));

    if (weekSessions?.length) {
      const weekEfficiencies = weekSessions
        .filter((s) => (s.total_duration_minutes || s.duration_minutes) > 0)
        .map((s) => {
          const focus = s.duration_minutes || 0;
          const total = s.total_duration_minutes || focus;
          return total > 0 ? Math.round((focus / total) * 100) : 0;
        });

      const avgEfficiency = weekEfficiencies.length
        ? Math.round(weekEfficiencies.reduce((a, b) => a + b, 0) / weekEfficiencies.length)
        : 0;

      if (summary.efficiencyRate >= avgEfficiency + 10 && summary.efficiencyRate >= 80) {
        insights.push(t('insights.bestEfficiency', { rate: summary.efficiencyRate }));
      }

      const maxFocus = Math.max(...weekSessions.map((s) => s.duration_minutes || 0));
      if (summary.focusMinutes >= maxFocus && summary.focusMinutes >= 20) {
        insights.push(t('insights.longestSession', { minutes: summary.focusMinutes }));
      }
    }

    // 2. Multi-session task insight
    const sessionsCount = Math.max(0, Number(task.sessions_count) || 0);
    if (sessionsCount > 1) {
      const { data: avgData } = await supabase
        .from('tasks')
        .select('sessions_count')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gt('sessions_count', 0);

      if (avgData?.length >= 3) {
        const avgSessions = avgData.reduce((s, row) => s + (Number(row.sessions_count) || 0), 0) / avgData.length;
        if (sessionsCount > avgSessions * 1.5) {
          insights.push(t('insights.moreSessions', {
            count: sessionsCount,
            avg: Math.round(avgSessions * 10) / 10,
          }));
        }
      }
    }

    // 3. Project progress insight
    if (task.project_id) {
      const { data: projectTasks } = await supabase
        .from('tasks')
        .select('status')
        .eq('project_id', task.project_id);

      if (projectTasks?.length) {
        const total = projectTasks.length;
        const completed = projectTasks.filter((row) => row.status === 'completed').length;
        if (completed > 0 && completed < total) {
          const pct = Math.round((completed / total) * 100);
          insights.push(t('insights.projectProgress', { completed, total, percent: pct }));
        }

        // Pace estimate
        if (completed >= 2) {
          const { data: projectSessions } = await supabase
            .from('focus_sessions')
            .select('date')
            .eq('project_id', task.project_id)
            .eq('user_id', userId)
            .order('date', { ascending: true });

          if (projectSessions?.length >= 2) {
            const firstDate = new Date(projectSessions[0].date);
            const daysSpent = Math.max(1, differenceInCalendarDays(new Date(), firstDate));
            const tasksPerDay = completed / daysSpent;
            const remaining = total - completed;
            if (tasksPerDay > 0 && remaining > 0) {
              const daysLeft = Math.ceil(remaining / tasksPerDay);
              const finishDate = new Date();
              finishDate.setDate(finishDate.getDate() + daysLeft);
              insights.push(t('insights.paceEstimate', {
                days: daysLeft,
                date: finishDate.toLocaleDateString(),
              }));
            }
          }
        }
      }
    }

    // 4. Streak awareness
    if (summary.focusMinutes >= 30) {
      insights.push(t('insights.solidSession', { minutes: summary.focusMinutes }));
    }
  } catch {
    // Insights are non-critical; silently skip on error
  }

  return insights.slice(0, 3);
}
