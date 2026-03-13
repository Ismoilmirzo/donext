import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { BADGES, getBadgeById, getBadgeProgressMeta, isBadgeUnlocked, TRIGGER_POINTS } from '../data/badges';
import { useAuth } from './AuthContext';
import { addAppEventListener, APP_EVENTS } from '../lib/appEvents';
import { calculateStreakMetrics } from '../lib/streaks';
import { supabase } from '../lib/supabase';

const BadgeContext = createContext(null);

function getDayCheckKey(userId) {
  return `donext:badge-day-check:${userId}`;
}

function calculateBestWeeklyEfficiency(sessions = []) {
  const weekly = sessions.reduce((map, session) => {
    const weekKey = format(startOfWeek(new Date(session.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (!map[weekKey]) {
      map[weekKey] = { focus: 0, total: 0 };
    }
    map[weekKey].focus += session.duration_minutes || 0;
    map[weekKey].total += session.total_duration_minutes ?? session.duration_minutes ?? 0;
    return map;
  }, {});

  return Object.values(weekly).reduce((best, row) => {
    if (!row.total) return best;
    return Math.max(best, (row.focus / row.total) * 100);
  }, 0);
}

function hasPerfectWeek(logs = [], activeHabitCount = 0) {
  if (!activeHabitCount) return false;
  const completionsByDate = logs.reduce((map, log) => {
    if (!log.completed) return map;
    map.set(log.date, (map.get(log.date) || 0) + 1);
    return map;
  }, new Map());

  const today = new Date();
  for (let offset = 0; offset < 21; offset += 1) {
    let streak = 0;
    for (let dayOffset = offset; dayOffset < offset + 7; dayOffset += 1) {
      const day = addDays(today, -dayOffset);
      const dayKey = format(day, 'yyyy-MM-dd');
      if ((completionsByDate.get(dayKey) || 0) >= activeHabitCount) {
        streak += 1;
      } else {
        break;
      }
    }
    if (streak >= 7) return true;
  }
  return false;
}

async function gatherBadgeStats(userId) {
  const [profileRes, sessionsRes, tasksRes, projectsRes, habitsRes, logsRes, freezesRes] = await Promise.all([
    supabase.from('profiles').select('random_without_reroll_count,created_at').eq('id', userId).maybeSingle(),
    supabase.from('focus_sessions').select('date,duration_minutes,total_duration_minutes').eq('user_id', userId),
    supabase.from('tasks').select('status,completed_at').eq('user_id', userId),
    supabase.from('projects').select('status,completed_at').eq('user_id', userId),
    supabase.from('habits').select('id,is_active').eq('user_id', userId),
    supabase.from('habit_logs').select('habit_id,date,completed').eq('user_id', userId),
    supabase.from('streak_freezes').select('date').eq('user_id', userId),
  ]);

  const firstError = [
    profileRes.error,
    sessionsRes.error,
    tasksRes.error,
    projectsRes.error,
    habitsRes.error,
    logsRes.error,
    freezesRes.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  const sessions = sessionsRes.data || [];
  const tasks = tasksRes.data || [];
  const projects = projectsRes.data || [];
  const habits = habitsRes.data || [];
  const logs = logsRes.data || [];
  const freezeDates = (freezesRes.data || []).map((row) => row.date);
  const activeHabitCount = habits.filter((habit) => habit.is_active).length;
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayCompleted = logs.filter((log) => log.completed && log.date === todayKey).length;
  const streakMetrics = calculateStreakMetrics({
    logs,
    freezeDates,
    activeHabitCount,
    today: new Date(),
    accountCreatedAt: profileRes.data?.created_at,
  });

  return {
    totalFocusSessions: sessions.length,
    totalFocusMinutes: sessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0),
    longestSessionMinutes: sessions.length ? Math.max(...sessions.map((session) => session.duration_minutes || 0)) : 0,
    bestWeeklyEfficiency: calculateBestWeeklyEfficiency(sessions),
    totalTasksCompleted: tasks.filter((task) => task.status === 'completed').length,
    totalProjectsCompleted: projects.filter((project) => project.status === 'completed').length,
    totalHabitsCreated: habits.length,
    hadPerfectDay: activeHabitCount > 0 && todayCompleted >= activeHabitCount,
    hadPerfectWeek: hasPerfectWeek(logs, activeHabitCount),
    longestStreak: streakMetrics.longest,
    freezesUsed: freezeDates.length,
    randomWithoutReroll: profileRes.data?.random_without_reroll_count || 0,
  };
}

export function BadgeProvider({ children }) {
  const { user } = useAuth();
  const [badges, setBadges] = useState([]);
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const enrichRows = useCallback(
    (rows, nextStats) =>
      BADGES.map((badge) => {
        const unlockedRow = rows.find((row) => row.badge_id === badge.id) || null;
        return {
          ...badge,
          unlocked: Boolean(unlockedRow),
          unlocked_at: unlockedRow?.unlocked_at || null,
          seen: unlockedRow?.seen ?? true,
          progress: getBadgeProgressMeta(badge.id, nextStats || {}),
        };
      }),
    []
  );

  const refresh = useCallback(async () => {
    if (!user) {
      setBadges([]);
      setStats(null);
      setQueue([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [rowsRes, nextStats] = await Promise.all([
      supabase.from('badges').select('*').eq('user_id', user.id).order('unlocked_at', { ascending: true }),
      gatherBadgeStats(user.id),
    ]);

    if (rowsRes.error) {
      setLoading(false);
      throw rowsRes.error;
    }

    const enriched = enrichRows(rowsRes.data || [], nextStats);
    setStats(nextStats);
    setBadges(enriched);
    setQueue(enriched.filter((badge) => badge.unlocked && badge.seen === false));
    setLoading(false);
  }, [enrichRows, user]);

  useEffect(() => {
    void refresh().catch((error) => {
      if (import.meta.env.DEV) {
        console.error('[badges] refresh failed', error);
      }
    });
  }, [refresh]);

  const requestCheck = useCallback(
    async (trigger) => {
      if (!user || !TRIGGER_POINTS[trigger]) return [];

      const existingRes = await supabase.from('badges').select('*').eq('user_id', user.id);
      if (existingRes.error) throw existingRes.error;

      const unlockedSet = new Set((existingRes.data || []).map((row) => row.badge_id));
      const candidates = TRIGGER_POINTS[trigger].filter((badgeId) => !unlockedSet.has(badgeId));
      if (!candidates.length) {
        const nextStats = await gatherBadgeStats(user.id);
        setStats(nextStats);
        setBadges((prev) => prev.map((badge) => ({ ...badge, progress: getBadgeProgressMeta(badge.id, nextStats) })));
        return [];
      }

      const nextStats = await gatherBadgeStats(user.id);
      const unlockedIds = candidates.filter((badgeId) => isBadgeUnlocked(badgeId, nextStats));

      if (unlockedIds.length) {
        const inserts = unlockedIds.map((badgeId) => ({
          user_id: user.id,
          badge_id: badgeId,
          seen: false,
        }));
        const insertRes = await supabase.from('badges').upsert(inserts, { onConflict: 'user_id,badge_id' });
        if (insertRes.error) throw insertRes.error;
      }

      const refreshedRows = await supabase.from('badges').select('*').eq('user_id', user.id).order('unlocked_at', { ascending: true });
      if (refreshedRows.error) throw refreshedRows.error;

      const enriched = enrichRows(refreshedRows.data || [], nextStats);
      setStats(nextStats);
      setBadges(enriched);
      setQueue((prev) => {
        const existingIds = new Set(prev.map((badge) => badge.id));
        const additions = enriched.filter((badge) => badge.unlocked && badge.seen === false && !existingIds.has(badge.id));
        return [...prev, ...additions];
      });
      return unlockedIds.map((badgeId) => getBadgeById(badgeId)).filter(Boolean);
    },
    [enrichRows, user]
  );

  const markSeen = useCallback(
    async (badgeId) => {
      if (!user) return;
      await supabase.from('badges').update({ seen: true }).eq('user_id', user.id).eq('badge_id', badgeId);
      setQueue((prev) => prev.filter((badge) => badge.id !== badgeId));
      setBadges((prev) => prev.map((badge) => (badge.id === badgeId ? { ...badge, seen: true } : badge)));
    },
    [user]
  );

  useEffect(() => addAppEventListener(APP_EVENTS.badgeCheckRequested, (event) => void requestCheck(event.detail?.trigger)), [requestCheck]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return undefined;
    const key = getDayCheckKey(user.id);
    const today = format(new Date(), 'yyyy-MM-dd');
    if (window.localStorage.getItem(key) !== today) {
      window.localStorage.setItem(key, today);
      void requestCheck('day_change');
    }
    return undefined;
  }, [requestCheck, user]);

  const value = useMemo(
    () => ({
      badges,
      stats,
      queue,
      loading,
      unlockedCount: badges.filter((badge) => badge.unlocked).length,
      requestCheck,
      markSeen,
      refresh,
    }),
    [badges, loading, markSeen, queue, refresh, requestCheck, stats]
  );

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
}

export function useBadges() {
  const context = useContext(BadgeContext);
  if (!context) throw new Error('useBadges must be used inside BadgeProvider');
  return context;
}
