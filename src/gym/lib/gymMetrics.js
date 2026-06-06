export function toDateKey(date = new Date()) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekStart(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  current.setHours(0, 0, 0, 0);
  return current;
}

export function formatWeekday(index) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Number(index) % 7] || 'Mon';
}

export function estimateOneRepMax(weightKg, reps) {
  const weight = Number(weightKg || 0);
  const repCount = Number(reps || 0);
  if (!weight || !repCount) return 0;
  return Math.round(weight * (1 + repCount / 30) * 10) / 10;
}

export function convertWeight(weightKg, unit = 'kg') {
  const value = Number(weightKg || 0);
  if (unit === 'lb') return Math.round(value * 2.20462 * 10) / 10;
  return Math.round(value * 10) / 10;
}

export function toKg(displayWeight, unit = 'kg') {
  const value = Number(displayWeight || 0);
  if (unit === 'lb') return Math.round((value / 2.20462) * 100) / 100;
  return Math.round(value * 100) / 100;
}

export function calculateSessionVolume(setLogs = []) {
  return setLogs.reduce((sum, set) => {
    if (set.is_warmup) return sum;
    return sum + Number(set.weight_kg || 0) * Number(set.reps || 0);
  }, 0);
}

export function groupSetsByExercise(setLogs = []) {
  return setLogs.reduce((groups, set) => {
    const key = set.exercise_id || set.exercise?.key || 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(set);
    return groups;
  }, {});
}

export function calculateExerciseProgress(setLogs = []) {
  const bestByDate = new Map();
  setLogs.forEach((set) => {
    if (set.is_warmup) return;
    const key = set.logged_at ? toDateKey(set.logged_at) : toDateKey();
    const estimatedMax = estimateOneRepMax(set.weight_kg, set.reps);
    const weightKg = Number(set.weight_kg || 0);
    const previous = bestByDate.get(key) || { estimatedMax: 0, topWeightKg: 0 };
    bestByDate.set(key, {
      estimatedMax: Math.max(previous.estimatedMax, estimatedMax),
      topWeightKg: Math.max(previous.topWeightKg, weightKg),
    });
  });
  return [...bestByDate.entries()]
    .map(([date, row]) => ({ date, ...row }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function calculateMuscleVolume(setLogs = []) {
  const totals = {};
  setLogs.forEach((set) => {
    if (set.is_warmup) return;
    const muscle = set.exercise?.primary_muscle || 'unknown';
    totals[muscle] = (totals[muscle] || 0) + Number(set.weight_kg || 0) * Number(set.reps || 0);
  });
  return Object.entries(totals)
    .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }))
    .sort((left, right) => right.volume - left.volume);
}

export function calculateWeeklyMuscleSets(setLogs = [], weeks = 8, now = new Date()) {
  const start = getWeekStart(now);
  start.setDate(start.getDate() - 7 * (weeks - 1));
  const rowsByWeek = new Map();
  for (let index = 0; index < weeks; index += 1) {
    const week = new Date(start);
    week.setDate(start.getDate() + index * 7);
    const weekStart = toDateKey(week);
    rowsByWeek.set(weekStart, { weekStart, label: weekStart });
  }

  setLogs.forEach((set) => {
    if (set.is_warmup || !set.reps) return;
    const loggedAt = new Date(set.logged_at || set.created_at || now);
    const weekStart = toDateKey(getWeekStart(loggedAt));
    const row = rowsByWeek.get(weekStart);
    const muscle = set.exercise?.primary_muscle;
    if (!row || !muscle) return;
    row[muscle] = Number(row[muscle] || 0) + 1;
  });

  return [...rowsByWeek.values()];
}

export function calculateCurrentWeekMuscleSets(setLogs = [], now = new Date()) {
  const currentWeekStart = toDateKey(getWeekStart(now));
  const row = calculateWeeklyMuscleSets(setLogs, 1, now).find((week) => week.weekStart === currentWeekStart) || {};
  return Object.entries(row)
    .filter(([key]) => !['weekStart', 'label'].includes(key))
    .map(([muscle, sets]) => ({ muscle, sets: Number(sets || 0) }))
    .sort((left, right) => right.sets - left.sets);
}

export function calculateBodyweightTrend(sessions = []) {
  const rows = sessions
    .filter((session) => session.bodyweight_kg)
    .map((session) => ({ date: session.performed_at, bodyweight: Number(session.bodyweight_kg) }))
    .sort((left, right) => left.date.localeCompare(right.date));

  return rows.map((row, index) => {
    const windowStart = Math.max(0, index - 6);
    const windowRows = rows.slice(windowStart, index + 1);
    const movingAverage7 = windowRows.reduce((sum, item) => sum + item.bodyweight, 0) / windowRows.length;
    return { ...row, movingAverage7: Math.round(movingAverage7 * 10) / 10 };
  });
}

export function calculateWeeklySessionGoal(sessions = [], weeks = 8, goal = 3, now = new Date()) {
  const start = getWeekStart(now);
  start.setDate(start.getDate() - 7 * (weeks - 1));
  const rows = [];
  for (let index = 0; index < weeks; index += 1) {
    const week = new Date(start);
    week.setDate(start.getDate() + index * 7);
    rows.push({ weekStart: toDateKey(week), label: toDateKey(week), sessions: 0, goal });
  }

  const rowsByWeek = new Map(rows.map((row) => [row.weekStart, row]));
  sessions.forEach((session) => {
    if (!session.performed_at) return;
    const row = rowsByWeek.get(toDateKey(getWeekStart(session.performed_at)));
    if (row) row.sessions += 1;
  });

  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  rows.forEach((row) => {
    if (row.sessions >= goal) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  });
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index].sessions >= goal) currentStreak += 1;
    else break;
  }

  return { rows, currentStreak, longestStreak, goal };
}

export function calculateConsistency(sessions = [], days = 28) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const completedDates = new Set((sessions || []).map((session) => session.performed_at).filter(Boolean));
  const rows = [];
  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateKey = toDateKey(date);
    rows.push({ date: dateKey, completed: completedDates.has(dateKey) ? 1 : 0 });
  }
  return rows;
}

export function detectPersonalRecords(setLogs = []) {
  const bestByExercise = new Map();
  const records = [];
  [...setLogs]
    .sort((left, right) => String(left.logged_at || '').localeCompare(String(right.logged_at || '')))
    .forEach((set) => {
      if (set.is_warmup || set.weight_kg == null || set.reps == null) return;
      const exerciseKey = set.exercise?.key || set.exercise_id;
      const exerciseName = set.exercise?.name || exerciseKey;
      const estimatedMax = estimateOneRepMax(set.weight_kg, set.reps);
      const weightKg = Number(set.weight_kg || 0);
      const reps = Number(set.reps || 0);
      const previous = bestByExercise.get(exerciseKey) || {
        estimatedMax: 0,
        heaviestWeightKg: 0,
        repsByWeight: new Map(),
      };

      if (estimatedMax > previous.estimatedMax) {
        records.push({
          type: 'Best e1RM',
          exerciseName,
          date: set.logged_at ? toDateKey(set.logged_at) : '',
          estimatedMax,
          weightKg,
          reps,
        });
        previous.estimatedMax = estimatedMax;
      }

      if (weightKg > previous.heaviestWeightKg) {
        records.push({
          type: 'Heaviest weight',
          exerciseName,
          date: set.logged_at ? toDateKey(set.logged_at) : '',
          estimatedMax,
          weightKg,
          reps,
        });
        previous.heaviestWeightKg = weightKg;
      }

      const weightKey = String(weightKg);
      if (reps > Number(previous.repsByWeight.get(weightKey) || 0)) {
        records.push({
          type: `Most reps at ${weightKg} kg`,
          exerciseName,
          date: set.logged_at ? toDateKey(set.logged_at) : '',
          estimatedMax,
          weightKg,
          reps,
        });
        previous.repsByWeight.set(weightKey, reps);
      }

      bestByExercise.set(exerciseKey, previous);
    });
  return records.slice(-20).reverse();
}
