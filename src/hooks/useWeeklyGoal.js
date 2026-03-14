import { useCallback, useEffect, useState } from 'react';
import { differenceInCalendarDays, endOfWeek, parseISO, startOfWeek, subWeeks } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { addAppEventListener, APP_EVENTS } from '../lib/appEvents';
import { formatMinutesHuman, getWeekEnd, getWeekStart, toISODate } from '../lib/dates';
import { supabase } from '../lib/supabase';

function getDismissKey(userId, weekStart) {
  return `donext:weekly-goal-skip:${userId}:${weekStart}`;
}

function groupFocusByWeek(sessions = []) {
  return sessions.reduce((map, session) => {
    const weekKey = toISODate(startOfWeek(parseISO(session.date), { weekStartsOn: 1 }));
    map[weekKey] = (map[weekKey] || 0) + (session.duration_minutes || 0);
    return map;
  }, {});
}

export function suggestWeeklyGoal(minutesByWeek = {}, currentWeekStart) {
  const history = Object.entries(minutesByWeek)
    .filter(([week]) => week < currentWeekStart)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-4)
    .map(([, total]) => total);

  if (!history.length) return 300;
  const average = history.reduce((sum, total) => sum + total, 0) / history.length;
  return Math.max(120, Math.ceil((average * 1.1) / 30) * 30);
}

export function useWeeklyGoal() {
  const { user } = useAuth();
  const [goal, setGoal] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [progressMinutes, setProgressMinutes] = useState(0);
  const [suggestedMinutes, setSuggestedMinutes] = useState(300);
  const [lastWeekMinutes, setLastWeekMinutes] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const weekStart = toISODate(getWeekStart(new Date()));
  const weekEnd = toISODate(getWeekEnd(new Date()));

  const refresh = useCallback(async () => {
    if (!user) {
      setGoal(null);
      setHistoryRows([]);
      setProgressMinutes(0);
      setSuggestedMinutes(300);
      setLastWeekMinutes(0);
      setDismissed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const rangeStart = toISODate(subWeeks(getWeekStart(new Date()), 8));
    const [goalsRes, focusRes] = await Promise.all([
      supabase.from('weekly_goals').select('*').eq('user_id', user.id).order('week_start', { ascending: false }).limit(12),
      supabase.from('focus_sessions').select('date,duration_minutes').eq('user_id', user.id).gte('date', rangeStart).lte('date', weekEnd),
    ]);

    const firstError = goalsRes.error || focusRes.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const byWeek = groupFocusByWeek(focusRes.data || []);
    const currentGoal = (goalsRes.data || []).find((row) => row.week_start === weekStart) || null;
    const lastWeekKey = toISODate(subWeeks(getWeekStart(new Date()), 1));
    setGoal(currentGoal);
    setProgressMinutes(byWeek[weekStart] || 0);
    setSuggestedMinutes(suggestWeeklyGoal(byWeek, weekStart));
    setLastWeekMinutes(byWeek[lastWeekKey] || 0);
    setHistoryRows(
      (goalsRes.data || []).map((row) => {
        const actualMinutes = byWeek[row.week_start] || 0;
        const percentage = row.target_minutes > 0 ? Math.round((actualMinutes / row.target_minutes) * 100) : 0;
        return {
          ...row,
          actual_minutes: actualMinutes,
          percentage,
          hit: percentage >= 100,
        };
      })
    );
    if (typeof window !== 'undefined') {
      setDismissed(Boolean(window.localStorage.getItem(getDismissKey(user.id, weekStart))));
    }
    setLoading(false);
  }, [user, weekEnd, weekStart]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => addAppEventListener(APP_EVENTS.dailySummaryRefresh, () => void refresh()), [refresh]);

  const setWeeklyGoal = useCallback(
    async (targetMinutes) => {
      if (!user) return { data: null, error: new Error('Not authenticated') };
      const payload = {
        user_id: user.id,
        week_start: weekStart,
        target_minutes: Math.max(30, Math.round(Number(targetMinutes) || 0)),
        updated_at: new Date().toISOString(),
      };
      const result = await supabase
        .from('weekly_goals')
        .upsert(payload, { onConflict: 'user_id,week_start' })
        .select('*')
        .single();

      if (!result.error) {
        setGoal(result.data);
        setDismissed(false);
      }
      await refresh();
      return result;
    },
    [refresh, user, weekStart]
  );

  const skipWeek = useCallback(() => {
    if (!user || typeof window === 'undefined') return;
    window.localStorage.setItem(getDismissKey(user.id, weekStart), '1');
    setDismissed(true);
  }, [user, weekStart]);

  const percentageRaw = goal?.target_minutes ? Math.round((progressMinutes / goal.target_minutes) * 100) : 0;
  const percentage = goal?.target_minutes ? Math.min(100, percentageRaw) : 0;
  const remainingMinutes = goal?.target_minutes ? Math.max(0, goal.target_minutes - progressMinutes) : 0;
  const daysLeft = Math.max(0, differenceInCalendarDays(endOfWeek(new Date(), { weekStartsOn: 1 }), new Date()));
  const minutesPerDay = daysLeft > 0 ? Math.ceil(remainingMinutes / (daysLeft + 1)) : 0;

  return {
    goal,
    historyRows,
    progressMinutes,
    suggestedMinutes,
    lastWeekMinutes,
    percentage,
    percentageRaw,
    remainingMinutes,
    daysLeft,
    minutesPerDay,
    loading,
    error,
    dismissed,
    promptVisible: !loading && !goal && !dismissed,
    weekStart,
    weekEnd,
    refresh,
    setWeeklyGoal,
    skipWeek,
    formatGoalMinutes: formatMinutesHuman,
  };
}
