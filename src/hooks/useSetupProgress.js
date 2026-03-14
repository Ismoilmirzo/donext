import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function useSetupProgress() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    habits: 0,
    projects: 0,
    tasks: 0,
    focusSessions: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCounts({ habits: 0, projects: 0, tasks: 0, focusSessions: 0 });
      setLoading(false);
      return { error: null };
    }

    setLoading(true);
    const [habitsRes, projectsRes, tasksRes, focusRes] = await Promise.all([
      supabase.from('habits').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('focus_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    const firstError = habitsRes.error || projectsRes.error || tasksRes.error || focusRes.error;
    if (!firstError) {
      setCounts({
        habits: habitsRes.count || 0,
        projects: projectsRes.count || 0,
        tasks: tasksRes.count || 0,
        focusSessions: focusRes.count || 0,
      });
    }
    setLoading(false);
    return { error: firstError || null };
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const nextStep = useMemo(() => {
    if (counts.habits < 1) {
      return {
        title: 'Add your first habit',
        body: 'Keep it small so the Habits page starts becoming useful immediately.',
        route: '/habits',
        ctaLabel: 'Go to Habits',
      };
    }

    if (counts.projects < 1 || counts.tasks < 1) {
      return {
        title: 'Create one project with tasks',
        body: 'Focus works best once there is at least one concrete task ready to start.',
        route: '/projects',
        ctaLabel: 'Open Projects',
      };
    }

    if (counts.focusSessions < 1) {
      return {
        title: 'Finish one focus session',
        body: 'Your charts and weekly reports get much more useful after the first completed session.',
        route: '/focus',
        ctaLabel: 'Start Focus',
      };
    }

    return null;
  }, [counts.focusSessions, counts.habits, counts.projects, counts.tasks]);

  return {
    counts,
    loading,
    nextStep,
    refresh,
  };
}
