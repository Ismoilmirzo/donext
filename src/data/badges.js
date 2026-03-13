import { formatMinutesHuman } from '../lib/dates';

export const BADGE_CATEGORIES = [
  { id: 'focus', label: 'Focus' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'habits', label: 'Habits' },
  { id: 'streaks', label: 'Streaks' },
];

export const BADGES = [
  { id: 'first_focus', category: 'focus', icon: '🎯', title: 'First Focus', description: 'Complete your first focus session' },
  { id: 'deep_worker', category: 'focus', icon: '🧘', title: 'Deep Worker', description: 'Accumulate 10 hours of focus time' },
  { id: 'centurion', category: 'focus', icon: '💯', title: 'Centurion', description: 'Accumulate 100 hours of focus time' },
  { id: 'marathon', category: 'focus', icon: '🏃', title: 'Marathon Session', description: 'Complete a single focus session of 2+ hours' },
  { id: 'efficiency_master', category: 'focus', icon: '⚡', title: 'Efficiency Master', description: 'Achieve 90%+ efficiency in a week' },
  { id: 'random_roller', category: 'focus', icon: '🎲', title: 'Roll With It', description: 'Complete 10 randomly picked tasks without re-rolling' },
  { id: 'first_task', category: 'tasks', icon: '✅', title: 'Getting Started', description: 'Complete your first task' },
  { id: 'ten_tasks', category: 'tasks', icon: '📝', title: 'Ten Down', description: 'Complete 10 tasks' },
  { id: 'fifty_tasks', category: 'tasks', icon: '📋', title: 'Fifty and Counting', description: 'Complete 50 tasks' },
  { id: 'two_hundred_tasks', category: 'tasks', icon: '🏆', title: 'Task Machine', description: 'Complete 200 tasks' },
  { id: 'first_project_done', category: 'tasks', icon: '🎉', title: 'Project Complete', description: 'Finish your first project' },
  { id: 'five_projects_done', category: 'tasks', icon: '🗂️', title: 'Portfolio Builder', description: 'Finish 5 projects' },
  { id: 'first_habit', category: 'habits', icon: '🌱', title: 'Seed Planted', description: 'Create your first habit' },
  { id: 'perfect_day', category: 'habits', icon: '🌟', title: 'Perfect Day', description: 'Complete 100% of habits in a single day' },
  { id: 'perfect_week', category: 'habits', icon: '💎', title: 'Perfect Week', description: 'Complete 100% of habits for 7 straight days' },
  { id: 'streak_7', category: 'streaks', icon: '🔥', title: 'On Fire', description: 'Reach a 7-day streak' },
  { id: 'streak_30', category: 'streaks', icon: '🔥🔥', title: 'Unstoppable', description: 'Reach a 30-day streak' },
  { id: 'streak_100', category: 'streaks', icon: '💪', title: 'Iron Will', description: 'Reach a 100-day streak' },
  { id: 'freeze_used', category: 'streaks', icon: '❄️', title: 'Close Call', description: 'Have a streak saved by a freeze' },
  { id: 'streak_365', category: 'streaks', icon: '👑', title: 'Year of Momentum', description: 'Reach a 365-day streak' },
];

export const TRIGGER_POINTS = {
  task_completed: ['first_task', 'ten_tasks', 'fifty_tasks', 'two_hundred_tasks', 'first_project_done', 'five_projects_done'],
  focus_completed: ['first_focus', 'deep_worker', 'centurion', 'marathon', 'efficiency_master', 'random_roller'],
  habit_logged: ['first_habit', 'perfect_day', 'perfect_week'],
  day_change: ['streak_7', 'streak_30', 'streak_100', 'streak_365', 'freeze_used'],
};

const BADGE_THRESHOLDS = {
  first_focus: { current: (stats) => stats.totalFocusSessions, target: 1, detail: (stats) => `${stats.totalFocusSessions}/1 sessions` },
  deep_worker: { current: (stats) => stats.totalFocusMinutes, target: 600, detail: (stats) => `${formatMinutesHuman(stats.totalFocusMinutes)} / 10h` },
  centurion: { current: (stats) => stats.totalFocusMinutes, target: 6000, detail: (stats) => `${formatMinutesHuman(stats.totalFocusMinutes)} / 100h` },
  marathon: { current: (stats) => stats.longestSessionMinutes, target: 120, detail: (stats) => `Best: ${formatMinutesHuman(stats.longestSessionMinutes)} / 2h` },
  efficiency_master: { current: (stats) => stats.bestWeeklyEfficiency, target: 90, detail: (stats) => `Best: ${Math.round(stats.bestWeeklyEfficiency)}% / 90%` },
  random_roller: { current: (stats) => stats.randomWithoutReroll, target: 10, detail: (stats) => `${stats.randomWithoutReroll}/10 random wins` },
  first_task: { current: (stats) => stats.totalTasksCompleted, target: 1, detail: (stats) => `${stats.totalTasksCompleted}/1 tasks` },
  ten_tasks: { current: (stats) => stats.totalTasksCompleted, target: 10, detail: (stats) => `${stats.totalTasksCompleted}/10 tasks` },
  fifty_tasks: { current: (stats) => stats.totalTasksCompleted, target: 50, detail: (stats) => `${stats.totalTasksCompleted}/50 tasks` },
  two_hundred_tasks: { current: (stats) => stats.totalTasksCompleted, target: 200, detail: (stats) => `${stats.totalTasksCompleted}/200 tasks` },
  first_project_done: { current: (stats) => stats.totalProjectsCompleted, target: 1, detail: (stats) => `${stats.totalProjectsCompleted}/1 projects` },
  five_projects_done: { current: (stats) => stats.totalProjectsCompleted, target: 5, detail: (stats) => `${stats.totalProjectsCompleted}/5 projects` },
  first_habit: { current: (stats) => stats.totalHabitsCreated, target: 1, detail: (stats) => `${stats.totalHabitsCreated}/1 habits` },
  perfect_day: { current: (stats) => (stats.hadPerfectDay ? 1 : 0), target: 1, detail: (stats) => (stats.hadPerfectDay ? 'Completed' : 'Hit 100% for one full day') },
  perfect_week: { current: (stats) => (stats.hadPerfectWeek ? 1 : 0), target: 1, detail: (stats) => (stats.hadPerfectWeek ? 'Completed' : 'Hit 100% for 7 straight days') },
  streak_7: { current: (stats) => stats.longestStreak, target: 7, detail: (stats) => `${stats.longestStreak}/7 days` },
  streak_30: { current: (stats) => stats.longestStreak, target: 30, detail: (stats) => `${stats.longestStreak}/30 days` },
  streak_100: { current: (stats) => stats.longestStreak, target: 100, detail: (stats) => `${stats.longestStreak}/100 days` },
  streak_365: { current: (stats) => stats.longestStreak, target: 365, detail: (stats) => `${stats.longestStreak}/365 days` },
  freeze_used: { current: (stats) => stats.freezesUsed, target: 1, detail: (stats) => `${stats.freezesUsed}/1 freezes` },
};

export function isBadgeUnlocked(badgeId, stats) {
  const current = BADGE_THRESHOLDS[badgeId]?.current?.(stats) || 0;
  const target = BADGE_THRESHOLDS[badgeId]?.target || 1;
  return current >= target;
}

export function getBadgeProgressMeta(badgeId, stats = {}) {
  const rule = BADGE_THRESHOLDS[badgeId];
  if (!rule) {
    return { current: 0, target: 1, percentage: 0, detail: '' };
  }

  const current = Math.max(0, Number(rule.current(stats) || 0));
  const target = Math.max(1, Number(rule.target || 1));
  return {
    current,
    target,
    percentage: Math.min(100, Math.round((current / target) * 100)),
    detail: rule.detail?.(stats) || '',
  };
}

export function getBadgeById(badgeId) {
  return BADGES.find((badge) => badge.id === badgeId) || null;
}
