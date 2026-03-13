import { addDays, parseISO, startOfWeek } from 'date-fns';
import { toISODate } from './dates';

export const STREAK_COMPLETION_THRESHOLD = 0.8;
export const FREE_TIER_WEEKLY_FREEZE_LIMIT = 1;
export const PREMIUM_WEEKLY_FREEZE_LIMIT = 3;

function countCompletedByDate(logs = []) {
  return logs.reduce((map, log) => {
    if (!log?.date || !log.completed) return map;
    map.set(log.date, (map.get(log.date) || 0) + 1);
    return map;
  }, new Map());
}

export function getWeekStartDate(input) {
  const date = typeof input === 'string' ? parseISO(input) : input;
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekStartIso(input) {
  return toISODate(getWeekStartDate(input));
}

export function getWeeklyFreezeLimit() {
  return FREE_TIER_WEEKLY_FREEZE_LIMIT;
}

export function isSuccessfulHabitDay(dateIso, completionByDate, activeHabitCount) {
  if (!activeHabitCount) return false;
  const completed = completionByDate.get(dateIso) || 0;
  return completed / activeHabitCount >= STREAK_COMPLETION_THRESHOLD;
}

function getLatestClosedDayIso(today = new Date(), completionByDate, freezeSet, activeHabitCount) {
  const todayIso = toISODate(today);
  if (isSuccessfulHabitDay(todayIso, completionByDate, activeHabitCount) || freezeSet.has(todayIso)) {
    return todayIso;
  }
  return toISODate(addDays(today, -1));
}

function buildUsedFreezeCounts(freezeDates = []) {
  return freezeDates.reduce((map, dateIso) => {
    const weekStart = getWeekStartIso(dateIso);
    map.set(weekStart, (map.get(weekStart) || 0) + 1);
    return map;
  }, new Map());
}

export function planAutomaticStreakFreezes({
  logs = [],
  freezeDates = [],
  activeHabitCount = 0,
  today = new Date(),
  weeklyLimit = getWeeklyFreezeLimit(),
} = {}) {
  if (!activeHabitCount) return [];

  const completionByDate = countCompletedByDate(logs);
  const freezeSet = new Set(freezeDates);
  const usedByWeek = buildUsedFreezeCounts(freezeDates);
  const latestClosedDayIso = getLatestClosedDayIso(today, completionByDate, freezeSet, activeHabitCount);
  const planned = [];
  let cursor = latestClosedDayIso;
  let sawProtectedDay = false;

  while (cursor) {
    if (freezeSet.has(cursor) || isSuccessfulHabitDay(cursor, completionByDate, activeHabitCount)) {
      sawProtectedDay = true;
      cursor = toISODate(addDays(parseISO(cursor), -1));
      continue;
    }

    const weekStart = getWeekStartIso(cursor);
    const used = usedByWeek.get(weekStart) || 0;
    if (used >= weeklyLimit) break;

    planned.push(cursor);
    usedByWeek.set(weekStart, used + 1);
    cursor = toISODate(addDays(parseISO(cursor), -1));
  }

  return sawProtectedDay ? planned : [];
}

export function calculateStreakMetrics({
  logs = [],
  freezeDates = [],
  activeHabitCount = 0,
  today = new Date(),
  weeklyLimit = getWeeklyFreezeLimit(),
} = {}) {
  if (!activeHabitCount) {
    return {
      current: 0,
      longest: 0,
      weeklyLimit,
      weeklyUsed: 0,
      weeklyRemaining: weeklyLimit,
      freezeDates: [],
      currentFrozenDates: [],
    };
  }

  const completionByDate = countCompletedByDate(logs);
  const freezeSet = new Set(freezeDates);
  const latestClosedDayIso = getLatestClosedDayIso(today, completionByDate, freezeSet, activeHabitCount);
  const currentFrozenDates = [];
  let current = 0;
  let cursor = latestClosedDayIso;

  while (cursor) {
    const isFrozen = freezeSet.has(cursor);
    const isSuccessful = isSuccessfulHabitDay(cursor, completionByDate, activeHabitCount);
    if (!isFrozen && !isSuccessful) break;
    if (isFrozen) currentFrozenDates.push(cursor);
    current += 1;
    cursor = toISODate(addDays(parseISO(cursor), -1));
  }

  const relevantDates = [...logs.map((log) => log.date), ...freezeDates].filter(Boolean).sort();
  let longest = 0;
  if (relevantDates.length) {
    const earliest = relevantDates[0];
    let running = 0;
    let dayCursor = earliest;
    while (dayCursor <= latestClosedDayIso) {
      const isFrozen = freezeSet.has(dayCursor);
      const isSuccessful = isSuccessfulHabitDay(dayCursor, completionByDate, activeHabitCount);
      if (isFrozen || isSuccessful) {
        running += 1;
        longest = Math.max(longest, running);
      } else {
        running = 0;
      }
      dayCursor = toISODate(addDays(parseISO(dayCursor), 1));
    }
  }

  const weekStart = getWeekStartIso(today);
  const weeklyUsed = freezeDates.filter((dateIso) => getWeekStartIso(dateIso) === weekStart).length;
  return {
    current,
    longest,
    weeklyLimit,
    weeklyUsed,
    weeklyRemaining: Math.max(0, weeklyLimit - weeklyUsed),
    freezeDates,
    currentFrozenDates,
  };
}
