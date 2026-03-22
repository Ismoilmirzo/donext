import { differenceInCalendarDays, parseISO } from 'date-fns';
import { filterProjectsByPreferredTime, getProjectPriorityWeight } from './projectPriority.js';

function getWeight(daysSinceLastWork) {
  if (daysSinceLastWork === null) return 10;
  return Math.max(1, daysSinceLastWork + 1);
}

/**
 * Calculate hour-of-day efficiency multiplier from focus session history.
 * Projects where the user historically performs well at the current hour get a boost.
 */
function getHourEfficiencyWeight(projectId, focusSessions, currentHour) {
  const projectSessions = focusSessions.filter(
    (s) => s?.project_id === projectId && s?.duration_minutes > 0
  );
  if (projectSessions.length < 3) return 1;

  const hourBucket = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening';

  const bucketSessions = projectSessions.filter((s) => {
    if (!s.created_at) return false;
    const h = new Date(s.created_at).getHours();
    const bucket = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
    return bucket === hourBucket;
  });

  if (bucketSessions.length < 2) return 1;

  const avgEfficiency = bucketSessions.reduce((sum, s) => {
    const focus = s.duration_minutes || 0;
    const total = s.total_duration_minutes || focus;
    return sum + (total > 0 ? focus / total : 0);
  }, 0) / bucketSessions.length;

  // Boost 1.0-1.5x based on efficiency at this time of day
  return 1 + Math.min(0.5, avgEfficiency * 0.5);
}

export function selectRandomProject(projects = [], focusSessions = [], options = {}) {
  if (!projects.length) return null;
  const now = options.now || new Date();
  const excludedProjectIds = new Set(options.excludeProjectIds || []);
  const projectsAfterExclude = projects.filter((project) => !excludedProjectIds.has(project.id));
  const pool = filterProjectsByPreferredTime(projectsAfterExclude.length ? projectsAfterExclude : projects, now);
  if (!pool.length) return null;

  const lastSessionByProject = new Map();
  focusSessions.forEach((session) => {
    if (!session?.project_id || !session?.date) return;
    const current = lastSessionByProject.get(session.project_id);
    if (!current || session.date > current) {
      lastSessionByProject.set(session.project_id, session.date);
    }
  });

  const currentHour = now.getHours();

  const weightedProjects = pool.map((project) => {
    const lastSessionDate = lastSessionByProject.get(project.id) || null;
    const daysSince = lastSessionDate
      ? Math.max(0, differenceInCalendarDays(now, parseISO(lastSessionDate)))
      : null;
    const recencyWeight = getWeight(daysSince);
    const priorityWeight = getProjectPriorityWeight(project, now);
    const hourWeight = getHourEfficiencyWeight(project.id, focusSessions, currentHour);
    const weight = recencyWeight * priorityWeight * hourWeight;
    return { ...project, __weight: weight };
  });

  const totalWeight = weightedProjects.reduce((sum, project) => sum + project.__weight, 0);
  if (!totalWeight) return weightedProjects[0] || null;

  let target = Math.random() * totalWeight;
  for (const project of weightedProjects) {
    target -= project.__weight;
    if (target <= 0) {
      const { __weight, ...selected } = project;
      return selected;
    }
  }

  const fallback = weightedProjects[weightedProjects.length - 1];
  if (!fallback) return null;
  const { __weight, ...selected } = fallback;
  return selected;
}

/**
 * Suggest logical next task after completing a task.
 * Returns the next pending task in the same project if it makes sense.
 */
export function suggestNextTask(completedTask, eligible) {
  if (!completedTask?.project_id || !eligible?.length) return null;
  const sameProjPair = eligible.find((pair) => pair.project?.id === completedTask.project_id);
  if (sameProjPair?.task?.id && sameProjPair.task.id !== completedTask.id) {
    return sameProjPair;
  }
  return null;
}
