import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateProgram, getSpecializationMuscles, validateGymSourceData } from '../../src/gym/lib/generateProgram.js';
import {
  calculateBodyweightTrend,
  calculateCurrentWeekMuscleSets,
  calculateExerciseProgress,
  calculateWeeklyMuscleSets,
  calculateWeeklySessionGoal,
  detectPersonalRecords,
  toDateKey,
} from '../../src/gym/lib/gymMetrics.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

const baseProgram = readJson('src/data/gym/base_program.json');
const exerciseCatalog = readJson('src/data/gym/exercise_catalog.json');
const specializationRules = readJson('src/data/gym/specialization_rules.json');
const baseProgramBefore = JSON.stringify(baseProgram);

const validation = validateGymSourceData({ baseProgram, exerciseCatalog, specializationRules });
if (!validation.ok) {
  console.error(validation.errors.join('\n'));
  process.exit(1);
}

const muscles = getSpecializationMuscles(specializationRules);
const summaries = muscles.map((muscle) => {
  const program = generateProgram({ baseProgram, exerciseCatalog, specializationRules, specializationMuscle: muscle });
  const targetSets = program.weeklyDirectSets[muscle] || 0;
  const specializationSlots = program.days.flatMap((day) => day.slots.filter((slot) => slot.is_specialization));
  const specializationKeys = specializationSlots.map((slot) => `${slot.exercise_key}:${slot.slot_order}`);
  if (specializationKeys.length !== new Set(specializationKeys).size) {
    throw new Error(`${muscle} specialization generated duplicate specialization slots.`);
  }
  return `${muscle}: ${targetSets}/${specializationRules.rules[muscle].weekly_cap_sets}`;
});

const balanced = generateProgram({ baseProgram, exerciseCatalog, specializationRules });
if (JSON.stringify(baseProgram) !== baseProgramBefore) {
  throw new Error('Generator mutated base_program.json data in memory.');
}

const bicepsProgram = generateProgram({ baseProgram, exerciseCatalog, specializationRules, specializationMuscle: 'biceps' });
const bicepsDayOneRow = bicepsProgram.days[0].slots.find((slot) => slot.exercise_key === 'chest_supported_row');
if (bicepsProgram.weeklyDirectSets.biceps !== 10 || bicepsDayOneRow?.sets !== 2) {
  throw new Error('Biceps specialization no longer matches the source plan add/trim rule.');
}
const bicepsAddedSlot = bicepsProgram.days[0].slots.find((slot) => slot.exercise_key === 'incline_db_curl');
if (!bicepsDayOneRow?.notes?.includes('Trimmed for Biceps') || !bicepsAddedSlot?.notes?.includes('Added for Biceps')) {
  throw new Error('Specialization slots must persist added/trimmed notes for the program UI.');
}
const resetProgram = generateProgram({ baseProgram, exerciseCatalog, specializationRules });
const resetDayOneRow = resetProgram.days[0].slots.find((slot) => slot.exercise_key === 'chest_supported_row');
if (resetDayOneRow?.sets !== 3) {
  throw new Error('Resetting to balanced no longer restores the source plan.');
}
if (toDateKey(new Date(2026, 5, 6, 0, 30)) !== '2026-06-06') {
  throw new Error('Gym date keys must use the local calendar date, not UTC slicing.');
}

const metricNow = new Date(2026, 5, 17, 12);
const weeklySetRows = calculateWeeklyMuscleSets(
  [
    { logged_at: '2026-06-09T12:00:00', reps: 8, is_warmup: false, exercise: { primary_muscle: 'back' } },
    { logged_at: '2026-06-16T12:00:00', reps: 10, is_warmup: false, exercise: { primary_muscle: 'chest' } },
    { logged_at: '2026-06-16T12:05:00', reps: 8, is_warmup: true, exercise: { primary_muscle: 'chest' } },
    { logged_at: '2026-06-16T12:10:00', reps: 9, is_warmup: false, exercise: { primary_muscle: 'chest' } },
  ],
  2,
  metricNow
);
if (weeklySetRows[0].back !== 1 || weeklySetRows[1].chest !== 2) {
  throw new Error('Weekly muscle sets must count hard sets per week and ignore warmups.');
}
const currentWeekSets = calculateCurrentWeekMuscleSets(
  [
    { logged_at: '2026-06-16T12:00:00', reps: 10, is_warmup: false, exercise: { primary_muscle: 'chest' } },
    { logged_at: '2026-06-16T12:10:00', reps: 9, is_warmup: false, exercise: { primary_muscle: 'chest' } },
  ],
  metricNow
);
if (currentWeekSets.find((row) => row.muscle === 'chest')?.sets !== 2) {
  throw new Error('Current-week muscle set summary is not counting the selected week correctly.');
}
const bodyweightTrend = calculateBodyweightTrend([
  { performed_at: '2026-06-14', bodyweight_kg: 80 },
  { performed_at: '2026-06-15', bodyweight_kg: 81 },
  { performed_at: '2026-06-16', bodyweight_kg: 82 },
]);
if (bodyweightTrend.at(-1)?.movingAverage7 !== 81) {
  throw new Error('Bodyweight trend must include a 7-entry moving average.');
}
const exerciseProgress = calculateExerciseProgress([
  { logged_at: '2026-06-16T12:00:00', weight_kg: 60, reps: 10, is_warmup: false },
  { logged_at: '2026-06-16T12:10:00', weight_kg: 65, reps: 6, is_warmup: false },
]);
if (exerciseProgress[0]?.estimatedMax !== 80 || exerciseProgress[0]?.topWeightKg !== 65) {
  throw new Error('Exercise progress must chart both estimated 1RM and top-set weight.');
}
const detectedPrs = detectPersonalRecords([
  { logged_at: '2026-06-14T12:00:00', exercise_id: 'bench', exercise: { name: 'Bench press' }, weight_kg: 60, reps: 8, is_warmup: false },
  { logged_at: '2026-06-15T12:00:00', exercise_id: 'bench', exercise: { name: 'Bench press' }, weight_kg: 65, reps: 5, is_warmup: false },
  { logged_at: '2026-06-16T12:00:00', exercise_id: 'bench', exercise: { name: 'Bench press' }, weight_kg: 60, reps: 10, is_warmup: false },
]);
if (!detectedPrs.some((record) => record.type === 'Heaviest weight') || !detectedPrs.some((record) => record.type === 'Most reps at 60 kg')) {
  throw new Error('PR detection must include heaviest weight and most reps at a given load.');
}
const weeklySessionGoal = calculateWeeklySessionGoal(
  [
    { performed_at: '2026-06-09' },
    { performed_at: '2026-06-10' },
    { performed_at: '2026-06-16' },
    { performed_at: '2026-06-17' },
    { performed_at: '2026-06-18' },
  ],
  2,
  3,
  metricNow
);
if (weeklySessionGoal.currentStreak !== 1 || weeklySessionGoal.longestStreak !== 1) {
  throw new Error('Weekly session goal streak must count consecutive goal-hit weeks.');
}

const migrationSql = fs.readFileSync(path.join(root, 'supabase/migrations/014_gym_module_v2.sql'), 'utf8');
const weeklyReportJs = fs.readFileSync(path.join(root, 'src/lib/weeklyReport.js'), 'utf8');
const weeklyReportCardJsx = fs.readFileSync(path.join(root, 'src/components/stats/WeeklyReportCard.jsx'), 'utf8');
const i18nJs = fs.readFileSync(path.join(root, 'src/lib/i18n.js'), 'utf8');
const useGymJs = fs.readFileSync(path.join(root, 'src/hooks/useGym.js'), 'utf8');
const buttonJsx = fs.readFileSync(path.join(root, 'src/components/ui/Button.jsx'), 'utf8');
const gymEmptyStateJsx = fs.readFileSync(path.join(root, 'src/components/gym/GymEmptyState.jsx'), 'utf8');
const gymNavJsx = fs.readFileSync(path.join(root, 'src/components/gym/GymNav.jsx'), 'utf8');
const gymI18nJs = fs.readFileSync(path.join(root, 'src/gym/lib/gymI18n.js'), 'utf8');
const gymMetricsJs = fs.readFileSync(path.join(root, 'src/gym/lib/gymMetrics.js'), 'utf8');
const offlineQueueJs = fs.readFileSync(path.join(root, 'src/gym/lib/offlineQueue.js'), 'utf8');
const gymLogPageJsx = fs.readFileSync(path.join(root, 'src/pages/GymLogPage.jsx'), 'utf8');
const gymHomePageJsx = fs.readFileSync(path.join(root, 'src/pages/GymHomePage.jsx'), 'utf8');
const gymOnboardingPageJsx = fs.readFileSync(path.join(root, 'src/pages/GymOnboardingPage.jsx'), 'utf8');
const gymProgramPageJsx = fs.readFileSync(path.join(root, 'src/pages/GymProgramPage.jsx'), 'utf8');
const gymProgressPageJsx = fs.readFileSync(path.join(root, 'src/pages/GymProgressPage.jsx'), 'utf8');
const gymHistoryPageJsx = fs.readFileSync(path.join(root, 'src/pages/GymHistoryPage.jsx'), 'utf8');
const gymExercisesPageJsx = fs.readFileSync(path.join(root, 'src/pages/GymExercisesPage.jsx'), 'utf8');
const userArchiveTs = fs.readFileSync(path.join(root, 'supabase/functions/_shared/user-archive.ts'), 'utf8');
[
  'CREATE TABLE IF NOT EXISTS gym_exercises',
  'CREATE TABLE IF NOT EXISTS gym_programs',
  'CREATE TABLE IF NOT EXISTS gym_program_days',
  'CREATE TABLE IF NOT EXISTS gym_program_exercises',
  'CREATE TABLE IF NOT EXISTS gym_sessions',
  'CREATE TABLE IF NOT EXISTS gym_set_logs',
  'CREATE TABLE IF NOT EXISTS gym_prs',
  'CREATE OR REPLACE FUNCTION rpc_apply_gym_program',
  'CREATE OR REPLACE FUNCTION rpc_finish_gym_session',
  'CREATE OR REPLACE FUNCTION rpc_apply_program',
  'CREATE OR REPLACE FUNCTION rpc_finish_session',
  "'prDeltas'",
  'focus_session_id UUID REFERENCES focus_sessions',
  'total_duration_minutes',
  "'focusSessionId'",
  "NOTIFY pgrst, 'reload schema'",
].forEach((needle) => {
  if (!migrationSql.includes(needle)) {
    throw new Error(`Gym v2 migration is missing: ${needle}`);
  }
});

[
  "from('gym_sessions')",
  "from('gym_prs')",
  'isMissingGymSchemaError',
  'buildGymReportStats',
].forEach((needle) => {
  if (!weeklyReportJs.includes(needle)) {
    throw new Error(`Weekly report stats are missing gym integration: ${needle}`);
  }
});

[
  'reportGymHeader',
  'reportGymSessions',
  'reportGymVolume',
  'reportGymPrs',
  'reportGymTopLift',
].forEach((needle) => {
  if (!weeklyReportCardJsx.includes(needle) || !i18nJs.includes(needle)) {
    throw new Error(`Weekly report card is missing gym rendering/i18n key: ${needle}`);
  }
});

if (useGymJs.includes(".from('gym_sessions')\n          .update({ duration_min")) {
  throw new Error('finishSession must not silently fall back to a non-atomic duration-only update.');
}

[
  'indexedDB',
  'openGymQueueDb',
  'migrateLegacyQueue',
  'donext-gym-outbox',
].forEach((needle) => {
  if (!offlineQueueJs.includes(needle)) {
    throw new Error(`Gym offline queue must use IndexedDB-backed persistence: ${needle}`);
  }
});

[
  'getLastLogForSet',
  'draftFromLog',
  'acceptLastSet',
  'getWeightStep',
  'isWorkSetLogged',
  'getExerciseSetProgress',
  'workoutProgress',
  "t('gym.saved')",
  "t('gym.unsaved')",
  "t('gym.finishWorkout')",
  'min-h-11',
  'placeholder={lastDraft?.weight',
  'upsertOptimisticSetLog',
  'local-${sessionId}',
  'RIR_OPTIONS',
  'adjustRestTimer',
  'getLastBodyweightDisplay',
  'volumeDelta',
  'prDeltas: (finishResult?.prDeltas || []).map',
  'exerciseNameById',
].forEach((needle) => {
  if (!gymLogPageJsx.includes(needle)) {
    throw new Error(`Gym log screen is missing last-session speed logging support: ${needle}`);
  }
});

[
  'calculateWeeklyMuscleSets',
  'calculateCurrentWeekMuscleSets',
  'calculateBodyweightTrend',
  'calculateWeeklySessionGoal',
].forEach((needle) => {
  if (!gymMetricsJs.includes(needle)) {
    throw new Error(`Gym metrics are missing progress/history calculation support: ${needle}`);
  }
});

[
  'ReferenceArea',
  'ReferenceLine',
  "t('gym.weeklyHardSets')",
  'volume_landmarks_reference',
  'stackId="sets"',
  'movingAverage7',
  'topWeightKg',
  "t('gym.weeklyConsistency')",
  'currentStreak',
  'longestStreak',
  'record.type',
  'getRecordMetricLabel',
  'formatGymPrType',
].forEach((needle) => {
  if (!gymProgressPageJsx.includes(needle)) {
    throw new Error(`Gym progress page is missing v2 analytics support: ${needle}`);
  }
});

[
  'getTrainingWeekRows',
  'weeksSinceStart % deloadWeeks === 0',
  "t('gym.blockReassessment')",
  "t('gym.repeatBlock')",
  "t('gym.switchFocus')",
  "t('gym.returnBalanced')",
].forEach((needle) => {
  if (!gymHomePageJsx.includes(needle)) {
    throw new Error(`Gym home page is missing v2 home/reassessment support: ${needle}`);
  }
});

[
  'calculateWeeklySessionGoal',
  'getDayTypeDotClass',
  "t('gym.currentStreak')",
  "filter.startsWith('day:')",
  "t('gym.bodyweight')",
  'selectedSession.notes',
].forEach((needle) => {
  if (!gymHistoryPageJsx.includes(needle)) {
    throw new Error(`Gym history page is missing calendar/streak/session detail support: ${needle}`);
  }
});

if (gymExercisesPageJsx.includes('activeProgram')) {
  throw new Error('Gym exercise library must not require an active program.');
}
if (!gymExercisesPageJsx.includes('schemaMissing || (error && !catalog.length)')) {
  throw new Error('Gym exercise library should only block on missing gym schema or an empty error state.');
}
[
  'validateExerciseForm',
  'role="alert"',
  'getRepRangeLabel',
  'getSecondaryMusclesLabel',
  "t('gym.primary'",
  "t('gym.secondary'",
  "t('gym.repsRange'",
].forEach((needle) => {
  if (!gymExercisesPageJsx.includes(needle)) {
    throw new Error(`Gym exercise library is missing row details from the v2 spec: ${needle}`);
  }
});

[
  'min-h-11',
].forEach((needle) => {
  if (!buttonJsx.includes(needle) || !gymNavJsx.includes(needle)) {
    throw new Error(`Gym UX touch targets must preserve mobile tap size support: ${needle}`);
  }
});

[
  'databaseNotReadyTitle',
  '014_gym_module_v2.sql',
].forEach((needle) => {
  if ((!gymEmptyStateJsx.includes(needle) && !i18nJs.includes(needle)) || (!gymOnboardingPageJsx.includes(needle) && !i18nJs.includes(needle))) {
    throw new Error(`Gym migration state must stay actionable for users/admins: ${needle}`);
  }
});

[
  "import Modal from '../components/ui/Modal'",
  "t('gym.changeFocus')",
  'title={t',
  'specializingLine',
  'formatGymNote',
  "t('gym.confirm')",
].forEach((needle) => {
  if (!gymProgramPageJsx.includes(needle)) {
    throw new Error(`Gym program page is missing the specialization modal flow: ${needle}`);
  }
});

[
  'formatGymDayLabel',
  'formatGymWeekdayLabel',
  'formatGymMuscleLabel',
  'formatGymPrType',
].forEach((needle) => {
  if (!gymI18nJs.includes(needle)) {
    throw new Error(`Gym i18n helpers are missing: ${needle}`);
  }
});

[
  'navToday',
  'databaseNotReadyTitle',
  'finishWorkout',
  'weeklyConsistency',
  'Mashqni tugatish',
  'Zal sozlamasi',
].forEach((needle) => {
  if (!i18nJs.includes(needle)) {
    throw new Error(`Gym localized copy is missing i18n key/content: ${needle}`);
  }
});

[
  "SNAPSHOT_VERSION = '1.2'",
  "'gym_exercises'",
  "'gym_programs'",
  "'gym_program_days'",
  "'gym_program_exercises'",
  "'gym_sessions'",
  "'gym_set_logs'",
  "'gym_prs'",
  'buildGymExportEntries',
  'restoreGymSnapshot',
  'total_gym_sessions',
  'total_gym_volume',
].forEach((needle) => {
  if (!userArchiveTs.includes(needle)) {
    throw new Error(`User export/archive is missing gym coverage: ${needle}`);
  }
});

[
  'gym programs',
  'workout logs',
  'PRs as JSON',
  'gym dasturlari',
].forEach((needle) => {
  if (!i18nJs.includes(needle)) {
    throw new Error(`Settings export description is missing gym copy: ${needle}`);
  }
});

console.log(
  JSON.stringify(
    {
      ok: true,
      exercises: exerciseCatalog.exercises.length,
      baseDays: balanced.days.length,
      specializationCount: muscles.length,
      specializationCaps: summaries,
      bicepsRule: '10 direct sets, chest_supported_row trimmed to 2, reset restores 3',
      dateKeys: 'local calendar date',
    },
    null,
    2
  )
);
