import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toISODate } from '../lib/dates';

function summarizeProject(project, tasks = []) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const pendingTasks = tasks.filter((task) => task.status !== 'completed').length;
  const focusMinutes = tasks.reduce((sum, task) => sum + (task.time_spent_minutes || 0), 0);
  const lastWorkedAt = tasks
    .filter((task) => task.completed_at)
    .map((task) => task.completed_at)
    .sort()
    .pop() || null;
  const hasAutoReviewPending = tasks.some((task) => task.is_auto_generated && task.status !== 'completed');

  return {
    ...project,
    totalTasks,
    completedTasks,
    pendingTasks,
    focusMinutes,
    lastWorkedAt,
    hasAutoReviewPending,
  };
}

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return { data: [], error: null };
    }

    const { data: projectRows, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (projectError) {
      setLoading(false);
      return { data: null, error: projectError };
    }

    const projectIds = (projectRows || []).map((project) => project.id);
    if (!projectIds.length) {
      setProjects([]);
      setLoading(false);
      return { data: [], error: null };
    }

    const { data: taskRows, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .in('project_id', projectIds);

    if (taskError) {
      setLoading(false);
      return { data: null, error: taskError };
    }

    const tasksByProject = (taskRows || []).reduce((acc, task) => {
      if (!acc[task.project_id]) acc[task.project_id] = [];
      acc[task.project_id].push(task);
      return acc;
    }, {});

    const merged = (projectRows || []).map((project) =>
      summarizeProject(project, tasksByProject[project.id] || [])
    );
    setProjects(merged);
    setLoading(false);
    return { data: merged, error: null };
  }, [user]);

  const createProject = useCallback(
    async (title, description = '', color = '#6366F1') => {
      if (!user) return { data: null, error: new Error('Not authenticated') };
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          color,
          status: 'active',
        })
        .select('*')
        .single();

      if (!error && data) setProjects((prev) => [summarizeProject(data, []), ...prev]);
      return { data, error };
    },
    [user]
  );

  const updateProject = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (!error && data) {
      setProjects((prev) =>
        prev.map((project) => (project.id === id ? { ...project, ...data } : project))
      );
    }
    return { data, error };
  }, []);

  const completeProject = useCallback(
    (id) => updateProject(id, { status: 'completed', completed_at: new Date().toISOString() }),
    [updateProject]
  );

  const archiveProject = useCallback(
    (id) => updateProject(id, { status: 'archived' }),
    [updateProject]
  );

  const reopenProject = useCallback(
    (id) => updateProject(id, { status: 'active', completed_at: null }),
    [updateProject]
  );

  const deleteProject = useCallback(async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) setProjects((prev) => prev.filter((project) => project.id !== id));
    return { error };
  }, []);

  const checkForStaleProjects = useCallback(async () => {
    if (!user) return { data: null, error: null };
    const threeDaysAgoIso = toISODate(addDays(new Date(), -3));

    const staleCandidates = projects.filter(
      (project) =>
        project.status === 'active' &&
        project.pendingTasks === 0 &&
        project.all_tasks_done_at &&
        project.all_tasks_done_at.slice(0, 10) <= threeDaysAgoIso &&
        !project.hasAutoReviewPending
    );

    if (!staleCandidates.length) return { data: [], error: null };

    const inserts = staleCandidates.map(async (project) => {
      const { data: projectTasks } = await supabase
        .from('tasks')
        .select('sort_order')
        .eq('project_id', project.id)
        .order('sort_order', { ascending: false })
        .limit(1);
      const maxSort = projectTasks?.[0]?.sort_order || 0;
      return supabase.from('tasks').insert({
        user_id: user.id,
        project_id: project.id,
        title: `Review ${project.title} and add next steps`,
        description: 'Project has been idle for 3 days after all tasks were finished.',
        sort_order: maxSort + 1,
        is_auto_generated: true,
        status: 'pending',
      });
    });

    const results = await Promise.all(inserts);
    const failed = results.find((result) => result.error);
    if (!failed) await fetchProjects();
    return { data: results, error: failed?.error || null };
  }, [fetchProjects, projects, user]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === 'active'),
    [projects]
  );
  const completedProjects = useMemo(
    () => projects.filter((project) => project.status === 'completed'),
    [projects]
  );
  const archivedProjects = useMemo(
    () => projects.filter((project) => project.status === 'archived'),
    [projects]
  );

  return {
    projects,
    activeProjects,
    completedProjects,
    archivedProjects,
    loading,
    fetchProjects,
    createProject,
    updateProject,
    completeProject,
    archiveProject,
    reopenProject,
    deleteProject,
    checkForStaleProjects,
  };
}
