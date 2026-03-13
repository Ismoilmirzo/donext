import { differenceInCalendarDays, parseISO } from 'date-fns';
import { getProjectPriorityWeight } from './projectPriority';

function getWeight(daysSinceLastWork) {
  if (daysSinceLastWork === null) return 10;
  return Math.max(1, daysSinceLastWork + 1);
}

export function selectRandomProject(projects = [], focusSessions = []) {
  if (!projects.length) return null;

  const lastSessionByProject = new Map();
  focusSessions.forEach((session) => {
    if (!session?.project_id || !session?.date) return;
    const current = lastSessionByProject.get(session.project_id);
    if (!current || session.date > current) {
      lastSessionByProject.set(session.project_id, session.date);
    }
  });

  const today = new Date();
  const weightedProjects = projects.map((project) => {
    const lastSessionDate = lastSessionByProject.get(project.id) || null;
    const daysSince = lastSessionDate
      ? Math.max(0, differenceInCalendarDays(today, parseISO(lastSessionDate)))
      : null;
    const recencyWeight = getWeight(daysSince);
    const weight = recencyWeight * getProjectPriorityWeight(project, today);
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
