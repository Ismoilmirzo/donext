import { differenceInCalendarDays } from 'date-fns';

/**
 * Calculate deadline pacing for a project.
 * Returns pacing status and alert level.
 *
 * @param {{ deadline_date?: string, totalTasks?: number, completedTasks?: number, pendingTasks?: number, created_at?: string }} project
 * @returns {{ level: 'on-track'|'at-risk'|'behind'|'none', message: string, daysLeft: number, tasksPerDay: number, requiredPace: number }|null}
 */
export function getDeadlinePacing(project, t) {
  if (!project?.deadline_date) return null;

  const now = new Date();
  const deadline = new Date(project.deadline_date);
  const daysLeft = differenceInCalendarDays(deadline, now);
  const totalTasks = project.totalTasks || 0;
  const completedTasks = project.completedTasks || 0;
  const pendingTasks = project.pendingTasks || (totalTasks - completedTasks);

  if (totalTasks === 0 || pendingTasks === 0) return null;

  // Calculate historical pace
  const created = project.created_at ? new Date(project.created_at) : now;
  const daysElapsed = Math.max(1, differenceInCalendarDays(now, created));
  const currentPace = completedTasks / daysElapsed; // tasks per day

  // Required pace to finish by deadline
  const requiredPace = daysLeft > 0 ? pendingTasks / daysLeft : Infinity;

  let level;
  let messageKey;

  if (daysLeft <= 0) {
    level = 'behind';
    messageKey = 'deadlinePacing.overdue';
  } else if (daysLeft <= 1 && pendingTasks > 0) {
    level = 'behind';
    messageKey = 'deadlinePacing.dueTomorrow';
  } else if (currentPace === 0 && completedTasks === 0) {
    // Haven't started yet
    level = daysLeft <= 3 ? 'behind' : daysLeft <= 7 ? 'at-risk' : 'on-track';
    messageKey = 'deadlinePacing.notStarted';
  } else if (requiredPace > currentPace * 2) {
    level = 'behind';
    messageKey = 'deadlinePacing.behind';
  } else if (requiredPace > currentPace * 1.3) {
    level = 'at-risk';
    messageKey = 'deadlinePacing.atRisk';
  } else {
    level = 'on-track';
    messageKey = 'deadlinePacing.onTrack';
  }

  const message = t ? t(messageKey, {
    days: daysLeft,
    pending: pendingTasks,
    pace: Math.round(requiredPace * 10) / 10,
  }) : messageKey;

  return {
    level,
    message,
    daysLeft,
    tasksPerDay: Math.round(currentPace * 10) / 10,
    requiredPace: Math.round(requiredPace * 10) / 10,
  };
}

/**
 * Get pacing alert color classes
 */
export function getPacingClasses(level) {
  switch (level) {
    case 'behind':
      return { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-300', dot: 'bg-red-400' };
    case 'at-risk':
      return { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-300', dot: 'bg-amber-400' };
    case 'on-track':
      return { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300', dot: 'bg-emerald-400' };
    default:
      return { border: 'border-slate-700', bg: 'bg-slate-800', text: 'text-slate-400', dot: 'bg-slate-500' };
  }
}
