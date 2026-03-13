import { differenceInCalendarDays, parseISO, startOfToday } from 'date-fns';

export const PROJECT_PRIORITY_OPTIONS = ['urgent', 'normal', 'someday'];

export const PROJECT_PRIORITY_WEIGHTS = {
  urgent: 5,
  normal: 2,
  someday: 1,
};

function parseDeadline(deadlineDate) {
  if (!deadlineDate) return null;
  const parsed = typeof deadlineDate === 'string' ? parseISO(deadlineDate) : deadlineDate;
  if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function getProjectDeadlineMeta(project, now = new Date()) {
  const deadline = parseDeadline(project?.deadline_date);
  if (!deadline) {
    return {
      deadline: null,
      daysUntilDeadline: null,
      isDueSoon: false,
      isOverdue: false,
      hasDeadline: false,
    };
  }

  const daysUntilDeadline = differenceInCalendarDays(deadline, startOfToday(now));
  return {
    deadline,
    daysUntilDeadline,
    isDueSoon: daysUntilDeadline >= 0 && daysUntilDeadline <= 7,
    isOverdue: daysUntilDeadline < 0,
    hasDeadline: true,
  };
}

export function getEffectiveProjectPriority(project, now = new Date()) {
  const priority = PROJECT_PRIORITY_OPTIONS.includes(project?.priority_tag) ? project.priority_tag : 'normal';
  const deadlineMeta = getProjectDeadlineMeta(project, now);
  if (deadlineMeta.isDueSoon || deadlineMeta.isOverdue) return 'urgent';
  return priority;
}

export function getProjectPriorityWeight(project, now = new Date()) {
  const effectivePriority = getEffectiveProjectPriority(project, now);
  return PROJECT_PRIORITY_WEIGHTS[effectivePriority] || PROJECT_PRIORITY_WEIGHTS.normal;
}
