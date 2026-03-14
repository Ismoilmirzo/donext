import { useCallback, useEffect, useMemo, useState } from 'react';
import { eachDayOfInterval, startOfMonth } from 'date-fns';
import { getStoredLocale, translate } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toISODate } from '../lib/dates';
import { APP_EVENTS, emitAppEvent } from '../lib/appEvents';
import { calculateStreakMetrics, getWeekStartIso, planAutomaticStreakFreezes } from '../lib/streaks';

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [streakFreezes, setStreakFreezes] = useState([]);
  const [freezeNotice, setFreezeNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshStreakState = useCallback(
    async ({ applyAutoFreeze = false } = {}) => {
      if (!user) {
        setAllLogs([]);
        setStreakFreezes([]);
        setFreezeNotice(null);
        return { data: { allLogs: [], freezeDates: [] }, error: null };
      }

      const [logsRes, freezesRes] = await Promise.all([
        supabase.from('habit_logs').select('*').eq('user_id', user.id),
        supabase.from('streak_freezes').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      ]);

      if (logsRes.error || freezesRes.error) {
        return { data: null, error: logsRes.error || freezesRes.error };
      }

      let nextAllLogs = logsRes.data || [];
      let nextFreezes = freezesRes.data || [];

      if (applyAutoFreeze) {
        const plannedDates = planAutomaticStreakFreezes({
          logs: nextAllLogs,
          freezeDates: nextFreezes.map((freeze) => freeze.date),
          activeHabitCount: habits.length,
          today: new Date(),
          accountCreatedAt: user.created_at,
        });

        if (plannedDates.length) {
          const inserts = plannedDates.map((date) => ({
            user_id: user.id,
            date,
            week_start_date: getWeekStartIso(date),
            source: 'auto',
          }));
          const { error: insertError } = await supabase.from('streak_freezes').upsert(inserts, { onConflict: 'user_id,date' });
          if (insertError) {
            return { data: null, error: insertError };
          }

          const { data: refreshedFreezes, error: refreshedFreezeError } = await supabase
            .from('streak_freezes')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: true });

          if (refreshedFreezeError) {
            return { data: null, error: refreshedFreezeError };
          }

          nextFreezes = refreshedFreezes || [];

          const streakAfterFreeze = calculateStreakMetrics({
            logs: nextAllLogs,
            freezeDates: nextFreezes.map((freeze) => freeze.date),
            activeHabitCount: habits.length,
            today: new Date(),
            accountCreatedAt: user.created_at,
          });
          const latestApplied = plannedDates.sort().pop();
          setFreezeNotice({
            date: latestApplied,
            streakDays: streakAfterFreeze.current,
            count: plannedDates.length,
            remaining: streakAfterFreeze.availableFreezes,
            total: streakAfterFreeze.storageCap,
          });
        } else {
          setFreezeNotice(null);
        }
      }

      setAllLogs(nextAllLogs);
      setStreakFreezes(nextFreezes);
      return { data: { allLogs: nextAllLogs, freezeDates: nextFreezes }, error: null };
    },
    [habits.length, user]
  );

  const fetchHabits = useCallback(async () => {
    if (!user) {
      setHabits([]);
      setAllLogs([]);
      setStreakFreezes([]);
      setLoading(false);
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (!error) {
      setHabits(data || []);
    }
    setLoading(false);
    return { data, error };
  }, [user]);

  const fetchHabitLogs = useCallback(
    async (startDate, endDate) => {
      if (!user) {
        setLogs([]);
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (!error) {
        setLogs(data || []);
        const streakState = await refreshStreakState({ applyAutoFreeze: true });
        if (streakState.error) return { data: null, error: streakState.error };
      }

      if (!error) emitAppEvent(APP_EVENTS.dailySummaryRefresh);
      return { data, error };
    },
    [refreshStreakState, user]
  );

  const toggleHabit = useCallback(
    async (habitId, date, currentValue) => {
      if (!user) return { data: null, error: new Error(translate(getStoredLocale(), 'system.notAuthenticated')) };
      const nextValue = !currentValue;

      setLogs((prev) => {
        const withoutTarget = prev.filter((row) => !(row.habit_id === habitId && row.date === date));
        return [...withoutTarget, { habit_id: habitId, date, completed: nextValue, user_id: user.id }];
      });
      setAllLogs((prev) => {
        const withoutTarget = prev.filter((row) => !(row.habit_id === habitId && row.date === date));
        return [...withoutTarget, { habit_id: habitId, date, completed: nextValue, user_id: user.id }];
      });

      const { data, error } = await supabase
        .from('habit_logs')
        .upsert(
          {
            user_id: user.id,
            habit_id: habitId,
            date,
            completed: nextValue,
          },
          { onConflict: 'habit_id,date' }
        )
        .select('*')
        .single();

      if (error) {
        setLogs((prev) => {
          const withoutTarget = prev.filter((row) => !(row.habit_id === habitId && row.date === date));
          return [...withoutTarget, { habit_id: habitId, date, completed: currentValue, user_id: user.id }];
        });
        setAllLogs((prev) => {
          const withoutTarget = prev.filter((row) => !(row.habit_id === habitId && row.date === date));
          return [...withoutTarget, { habit_id: habitId, date, completed: currentValue, user_id: user.id }];
        });
      } else if (data) {
        setLogs((prev) => {
          const withoutTarget = prev.filter((row) => !(row.habit_id === habitId && row.date === date));
          return [...withoutTarget, data];
        });
        setAllLogs((prev) => {
          const withoutTarget = prev.filter((row) => !(row.habit_id === habitId && row.date === date));
          return [...withoutTarget, data];
        });
      }
      if (!error && data) {
        emitAppEvent(APP_EVENTS.badgeCheckRequested, { trigger: 'habit_logged' });
        emitAppEvent(APP_EVENTS.dailySummaryRefresh);
      }
      return { data, error };
    },
    [user]
  );

  const addHabit = useCallback(
    async (title, icon = '✓', color = '#10B981') => {
      if (!user) return { data: null, error: new Error(translate(getStoredLocale(), 'system.notAuthenticated')) };
      const maxSort = habits.reduce((max, habit) => Math.max(max, habit.sort_order || 0), 0);
      const tempId = `temp-${Date.now()}`;
      const optimisticHabit = {
        id: tempId,
        user_id: user.id,
        title: title.trim(),
        icon: icon || '✓',
        color: color || '#10B981',
        sort_order: maxSort + 1,
        is_active: true,
      };

      setHabits((prev) => [...prev, optimisticHabit].sort((a, b) => a.sort_order - b.sort_order));

      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          title: title.trim(),
          icon: icon || '✓',
          color: color || '#10B981',
          sort_order: maxSort + 1,
        })
        .select('*')
        .single();

      if (error) {
        setHabits((prev) => prev.filter((habit) => habit.id !== tempId));
      } else if (data) {
        setHabits((prev) =>
          prev
            .map((habit) => (habit.id === tempId ? data : habit))
            .sort((a, b) => a.sort_order - b.sort_order)
        );
        emitAppEvent(APP_EVENTS.dailySummaryRefresh);
        emitAppEvent(APP_EVENTS.badgeCheckRequested, { trigger: 'habit_logged' });
      }
      return { data, error };
    },
    [habits, user]
  );

  const updateHabit = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('habits')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (!error && data) {
      setHabits((prev) => prev.map((habit) => (habit.id === id ? data : habit)));
    }
    return { data, error };
  }, []);

  const archiveHabit = useCallback(
    async (id) => {
      const { data, error } = await updateHabit(id, { is_active: false });
      if (!error) {
        setHabits((prev) => prev.filter((habit) => habit.id !== id));
        emitAppEvent(APP_EVENTS.dailySummaryRefresh);
      }
      return { data, error };
    },
    [updateHabit]
  );

  const deleteHabit = useCallback(async (id) => {
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (!error) {
      setHabits((prev) => prev.filter((habit) => habit.id !== id));
      emitAppEvent(APP_EVENTS.dailySummaryRefresh);
    }
    return { error };
  }, []);

  const reorderHabits = useCallback(
    async (habitId, direction) => {
      const sorted = habits.slice().sort((a, b) => a.sort_order - b.sort_order);
      const index = sorted.findIndex((habit) => habit.id === habitId);
      if (index === -1) return { data: null, error: null };

      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= sorted.length) return { data: null, error: null };

      const current = sorted[index];
      const target = sorted[swapIndex];
      const updates = [
        supabase.from('habits').update({ sort_order: target.sort_order }).eq('id', current.id),
        supabase.from('habits').update({ sort_order: current.sort_order }).eq('id', target.id),
      ];

      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);
      if (!failed) {
        setHabits((prev) =>
          prev
            .map((habit) => {
              if (habit.id === current.id) return { ...habit, sort_order: target.sort_order };
              if (habit.id === target.id) return { ...habit, sort_order: current.sort_order };
              return habit;
            })
            .sort((a, b) => a.sort_order - b.sort_order)
        );
      }

      return { data: null, error: failed?.error || null };
    },
    [habits]
  );

  const todayIso = toISODate(new Date());

  const completedToday = useMemo(() => {
    const completedIds = new Set(
      logs.filter((row) => row.date === todayIso && row.completed).map((row) => row.habit_id)
    );
    return completedIds.size;
  }, [logs, todayIso]);

  const monthRange = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = new Date();
    return eachDayOfInterval({ start, end }).map((day) => toISODate(day));
  }, []);

  useEffect(() => {
    void fetchHabits();
  }, [fetchHabits]);

  const streak = useMemo(
    () =>
      calculateStreakMetrics({
        logs: allLogs,
        freezeDates: streakFreezes.map((freeze) => freeze.date),
        activeHabitCount: habits.length,
        today: new Date(),
        accountCreatedAt: user?.created_at,
      }),
    [allLogs, habits.length, streakFreezes, user?.created_at]
  );

  return {
    habits,
    logs,
    streakFreezes,
    streak,
    freezeNotice,
    loading,
    completedToday,
    monthRange,
    fetchHabits,
    fetchHabitLogs,
    toggleHabit,
    addHabit,
    updateHabit,
    archiveHabit,
    deleteHabit,
    reorderHabits,
  };
}
