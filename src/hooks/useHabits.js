import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, eachDayOfInterval, parseISO, startOfMonth } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toISODate } from '../lib/dates';

export function calculateStreak(habitLogs = [], activeHabitCount = 0, today = new Date()) {
  if (!activeHabitCount) return { current: 0, longest: 0 };

  const completionByDate = new Map();
  habitLogs.forEach((log) => {
    if (!completionByDate.has(log.date)) completionByDate.set(log.date, 0);
    if (log.completed) completionByDate.set(log.date, completionByDate.get(log.date) + 1);
  });

  const sortedDates = Array.from(completionByDate.keys()).sort();
  let longest = 0;
  let current = 0;
  let running = 0;
  let cursor = toISODate(today);

  while (true) {
    const completed = completionByDate.get(cursor) || 0;
    const rate = activeHabitCount > 0 ? completed / activeHabitCount : 0;
    if (rate >= 0.8) {
      current += 1;
      cursor = toISODate(addDays(parseISO(cursor), -1));
    } else {
      break;
    }
  }

  sortedDates.forEach((date, index) => {
    const completed = completionByDate.get(date) || 0;
    const rate = activeHabitCount > 0 ? completed / activeHabitCount : 0;
    if (rate >= 0.8) {
      if (index === 0) running = 1;
      else {
        const prev = sortedDates[index - 1];
        const expected = toISODate(addDays(parseISO(prev), 1));
        running = expected === date ? running + 1 : 1;
      }
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  });

  return { current, longest };
}

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHabits = useCallback(async () => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (!error) setHabits(data || []);
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
      if (!error) setLogs(data || []);
      return { data, error };
    },
    [user]
  );

  const toggleHabit = useCallback(
    async (habitId, date, currentValue) => {
      if (!user) return { data: null, error: new Error('Not authenticated') };
      const nextValue = !currentValue;

      setLogs((prev) => {
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
      }
      return { data, error };
    },
    [user]
  );

  const addHabit = useCallback(
    async (title, icon = '✓', color = '#10B981') => {
      if (!user) return { data: null, error: new Error('Not authenticated') };
      const maxSort = habits.reduce((max, habit) => Math.max(max, habit.sort_order || 0), 0);

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

      if (!error && data) setHabits((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
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
      if (!error) setHabits((prev) => prev.filter((habit) => habit.id !== id));
      return { data, error };
    },
    [updateHabit]
  );

  const deleteHabit = useCallback(async (id) => {
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (!error) setHabits((prev) => prev.filter((habit) => habit.id !== id));
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

  return {
    habits,
    logs,
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
