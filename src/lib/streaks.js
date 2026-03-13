import { addDays, addWeeks, differenceInCalendarDays, parseISO, startOfWeek } from 'date-fns';
import { toISODate } from './dates';

export const STREAK_COMPLETION_THRESHOLD = 0.8;
export const FREE_TIER_WEEKLY_FREEZE_GRANT = 1;
export const FREE_TIER_FREEZE_STORAGE_CAP = 2;
export const PREMIUM_WEEKLY_FREEZE_GRANT = 3;
export const PREMIUM_FREEZE_STORAGE_CAP = 3;

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

export function getWeeklyFreezeGrant() {
  return FREE_TIER_WEEKLY_FREEZE_GRANT;
}

export function getFreezeStorageCap() {
  return FREE_TIER_FREEZE_STORAGE_CAP;
}

export function getNextWeeklyGrantDate(today = new Date()) {
  return startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
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

function resolveAccountStartDate(accountCreatedAt, today = new Date()) {
  if (!accountCreatedAt) return today;
  const parsed = typeof accountCreatedAt === 'string' ? parseISO(accountCreatedAt) : accountCreatedAt;
  if (Number.isNaN(parsed?.getTime?.())) return today;
  return parsed > today ? today : parsed;
}

export function calculateFreezeInventory({
  freezeDates = [],
  today = new Date(),
  accountCreatedAt,
  weeklyGrant = getWeeklyFreezeGrant(),
  storageCap = getFreezeStorageCap(),
} = {}) {
  const currentWeekStart = getWeekStartDate(today);
  const accountWeekStart = getWeekStartDate(resolveAccountStartDate(accountCreatedAt, today));
  const usedByWeek = buildUsedFreezeCounts(freezeDates);
  let availableFreezes = 0;
  let cursorWeek = accountWeekStart;

  while (cursorWeek <= currentWeekStart) {
    const weekIso = toISODate(cursorWeek);
    availableFreezes = Math.min(storageCap, availableFreezes + weeklyGrant);
    availableFreezes = Math.max(0, availableFreezes - (usedByWeek.get(weekIso) || 0));
    cursorWeek = addWeeks(cursorWeek, 1);
  }

  const currentWeekIso = toISODate(currentWeekStart);
  const usedThisWeek = freezeDates.filter((dateIso) => getWeekStartIso(dateIso) === currentWeekIso).length;
  const nextGrantDate = getNextWeeklyGrantDate(today);

  return {
    weeklyGrant,
    storageCap,
    availableFreezes,
    usedThisWeek,
    nextGrantDate: toISODate(nextGrantDate),
    daysUntilGrant: differenceInCalendarDays(nextGrantDate, today),
  };
}

export function planAutomaticStreakFreezes({
  logs = [],
  freezeDates = [],
  activeHabitCount = 0,
  today = new Date(),
  accountCreatedAt,
  weeklyGrant = getWeeklyFreezeGrant(),
  storageCap = getFreezeStorageCap(),
} = {}) {
  if (!activeHabitCount) return [];

  const completionByDate = countCompletedByDate(logs);
  const freezeSet = new Set(freezeDates);
  const latestClosedDayIso = getLatestClosedDayIso(today, completionByDate, freezeSet, activeHabitCount);
  const inventory = calculateFreezeInventory({
    freezeDates,
    today,
    accountCreatedAt,
    weeklyGrant,
    storageCap,
  });
  const planned = [];
  let cursor = latestClosedDayIso;
  let sawProtectedDay = false;
  let remainingFreezes = inventory.availableFreezes;

  while (cursor) {
    if (freezeSet.has(cursor) || isSuccessfulHabitDay(cursor, completionByDate, activeHabitCount)) {
      sawProtectedDay = true;
      cursor = toISODate(addDays(parseISO(cursor), -1));
      continue;
    }

    if (remainingFreezes <= 0) break;

    planned.push(cursor);
    remainingFreezes -= 1;
    cursor = toISODate(addDays(parseISO(cursor), -1));
  }

  return sawProtectedDay ? planned : [];
}

export function calculateStreakMetrics({
  logs = [],
  freezeDates = [],
  activeHabitCount = 0,
  today = new Date(),
  accountCreatedAt,
  weeklyGrant = getWeeklyFreezeGrant(),
  storageCap = getFreezeStorageCap(),
} = {}) {
  const inventory = calculateFreezeInventory({
    freezeDates,
    today,
    accountCreatedAt,
    weeklyGrant,
    storageCap,
  });

  if (!activeHabitCount) {
    return {
      current: 0,
      longest: 0,
      weeklyGrant: inventory.weeklyGrant,
      storageCap: inventory.storageCap,
      availableFreezes: inventory.availableFreezes,
      usedThisWeek: inventory.usedThisWeek,
      nextGrantDate: inventory.nextGrantDate,
      daysUntilGrant: inventory.daysUntilGrant,
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

  return {
    current,
    longest,
    weeklyGrant: inventory.weeklyGrant,
    storageCap: inventory.storageCap,
    availableFreezes: inventory.availableFreezes,
    usedThisWeek: inventory.usedThisWeek,
    nextGrantDate: inventory.nextGrantDate,
    daysUntilGrant: inventory.daysUntilGrant,
    freezeDates,
    currentFrozenDates,
  };
}
