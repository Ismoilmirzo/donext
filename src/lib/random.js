import { differenceInCalendarDays, parseISO } from 'date-fns';
import { filterProjectsByPreferredTime, getProjectPriorityWeight } from './projectPriority.js';

function getWeight(daysSinceLastWork) {
  if (daysSinceLastWork === null) return 10;
  return Math.max(1, daysSinceLastWork + 1);
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

  const weightedProjects = pool.map((project) => {
    const lastSessionDate = lastSessionByProject.get(project.id) || null;
    const daysSince = lastSessionDate
      ? Math.max(0, differenceInCalendarDays(now, parseISO(lastSessionDate)))
      : null;
    const recencyWeight = getWeight(daysSince);
    const weight = recencyWeight * getProjectPriorityWeight(project, now);
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
