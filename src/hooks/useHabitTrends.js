import { useEffect, useMemo, useState } from 'react';
import { addWeeks, differenceInCalendarDays, endOfWeek, parseISO, startOfDay, startOfWeek, subWeeks } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { toISODate } from '../lib/dates';
import { supabase } from '../lib/supabase';

export function useHabitTrends(weeksCount = 8) {
  const { user } = useAuth();
  const [trends, setTrends] = useState([]);
  const [weekLabels, setWeekLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user) {
        if (active) {
          setTrends([]);
          setWeekLabels([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError('');
      const today = new Date();
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      const rangeStart = subWeeks(currentWeekStart, weeksCount - 1);
      const [habitsRes, logsRes] = await Promise.all([
        supabase
          .from('habits')
          .select('id,title,color,created_at,sort_order')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('habit_logs')
          .select('habit_id,date,completed')
          .eq('user_id', user.id)
          .eq('completed', true)
          .gte('date', toISODate(rangeStart))
          .lte('date', toISODate(today)),
      ]);

      if (!active) return;
      const firstError = habitsRes.error || logsRes.error;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      const habits = habitsRes.data || [];
      const logs = logsRes.data || [];
      const labels = Array.from({ length: weeksCount }, (_, index) => {
        const weekStart = addWeeks(rangeStart, index);
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(weekStart);
      });

      const nextTrends = habits.map((habit) => {
        const createdAt = habit.created_at ? startOfDay(new Date(habit.created_at)) : rangeStart;
        const weeklyRates = Array.from({ length: weeksCount }, (_, index) => {
          const weekStart = addWeeks(rangeStart, index);
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const effectiveEnd = weekEnd > today ? today : weekEnd;
          const effectiveStart = createdAt > weekStart ? createdAt : weekStart;
          const totalDays = differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;
          if (totalDays <= 0) return null;

            const completedCount = logs.filter((log) => {
              if (log.habit_id !== habit.id) return false;
              const logDate = parseISO(log.date);
              return logDate >= effectiveStart && logDate <= effectiveEnd;
            }).length;

          return Math.round((completedCount / totalDays) * 100);
        });

        const visibleRates = weeklyRates.filter((value) => value !== null);
        const currentRate = visibleRates.at(-1) || 0;
        const previousRate = visibleRates.length > 1 ? visibleRates.at(-2) || 0 : currentRate;
        return {
          habitId: habit.id,
          title: habit.title,
          color: habit.color || '#10B981',
          weeklyRates,
          currentRate,
          delta: currentRate - previousRate,
        };
      });

      setWeekLabels(labels);
      setTrends(nextTrends);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, weeksCount]);

  const chartData = useMemo(
    () =>
      weekLabels.map((label, index) => {
        const row = { week: label };
        trends.forEach((habit) => {
          row[habit.habitId] = habit.weeklyRates[index];
        });
        return row;
      }),
    [trends, weekLabels]
  );

  return { trends, weekLabels, chartData, loading, error };
}
