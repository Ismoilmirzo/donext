import { useCallback, useEffect, useState } from 'react';
import { getStoredLocale, translate } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toISODate } from '../lib/dates';

export function useFocusSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(
    async (startDate, endDate) => {
      if (!user) {
        setSessions([]);
        setLoading(false);
        return { data: [], error: null };
      }

      const query = supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (startDate) query.gte('date', startDate);
      if (endDate) query.lte('date', endDate);

      const { data, error } = await query;
      if (!error) setSessions(data || []);
      setLoading(false);
      return { data, error };
    },
    [user]
  );

  const createSession = useCallback(
    async (taskId, projectId, date, durationMinutes) => {
      if (!user) return { data: null, error: new Error(translate(getStoredLocale(), 'system.notAuthenticated')) };
      const payload = {
        user_id: user.id,
        task_id: taskId || null,
        project_id: projectId || null,
        date: date || toISODate(new Date()),
        duration_minutes: Math.max(0, Number(durationMinutes) || 0),
      };
      const { data, error } = await supabase.from('focus_sessions').insert(payload).select('*').single();
      if (!error && data) setSessions((prev) => [data, ...prev]);
      return { data, error };
    },
    [user]
  );

  const getTodaySessions = useCallback(() => {
    const today = toISODate(new Date());
    return sessions.filter((session) => session.date === today);
  }, [sessions]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    fetchSessions,
    createSession,
    getTodaySessions,
  };
}
