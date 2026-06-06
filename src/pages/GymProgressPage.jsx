import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Dumbbell, Flame, LineChart as LineChartIcon, Scale, Trophy } from 'lucide-react';
import GymEmptyState from '../components/gym/GymEmptyState';
import GymNav from '../components/gym/GymNav';
import Card from '../components/ui/Card';
import { useLocale } from '../contexts/LocaleContext';
import {
  calculateBodyweightTrend,
  calculateCurrentWeekMuscleSets,
  calculateExerciseProgress,
  calculateWeeklyMuscleSets,
  calculateWeeklySessionGoal,
  detectPersonalRecords,
} from '../gym/lib/gymMetrics';
import { formatGymMuscleLabel, formatGymPrType } from '../gym/lib/gymI18n';
import { GYM_SPECIALIZATION_RULES } from '../gym/lib/gymProgramData';
import { useGym } from '../hooks/useGym';

const TABS = [
  { id: 'strength', labelKey: 'gym.strength', icon: Dumbbell },
  { id: 'volume', labelKey: 'gym.volume', icon: Flame },
  { id: 'bodyweight', labelKey: 'gym.bodyweight', icon: Scale },
  { id: 'consistency', labelKey: 'gym.consistency', icon: Activity },
  { id: 'prs', labelKey: 'gym.prs', icon: Trophy },
];

function getRecordMetricLabel(record) {
  if (record.type === 'Heaviest weight') return `${record.weightKg} kg`;
  if (record.type?.startsWith('Most reps at')) return `${record.reps} reps`;
  return `${record.estimatedMax} kg e1RM`;
}

export default function GymProgressPage() {
  const { t } = useLocale();
  const { activeProgram, catalog, error, loading, prs, retryGymSchema, schemaMissing, sessions, setLogs } = useGym();
  const [tab, setTab] = useState('strength');
  const [exerciseId, setExerciseId] = useState('');
  const [volumeMuscle, setVolumeMuscle] = useState(activeProgram?.specialization_muscle || 'chest');
  const selectedExerciseId = exerciseId || setLogs.find((set) => set.exercise_id)?.exercise_id || catalog[0]?.id || '';
  const selectedExerciseLogs = useMemo(
    () => setLogs.filter((set) => set.exercise_id === selectedExerciseId),
    [selectedExerciseId, setLogs]
  );
  const strengthRows = useMemo(() => calculateExerciseProgress(selectedExerciseLogs), [selectedExerciseLogs]);
  const weeklyMuscleRows = useMemo(() => calculateWeeklyMuscleSets(setLogs, 8), [setLogs]);
  const currentWeekMuscleRows = useMemo(() => calculateCurrentWeekMuscleSets(setLogs), [setLogs]);
  const volumeMuscles = useMemo(() => {
    const muscles = new Set([
      ...Object.keys(GYM_SPECIALIZATION_RULES.rules || {}),
      ...currentWeekMuscleRows.map((row) => row.muscle),
      activeProgram?.specialization_muscle,
    ]);
    return [...muscles].filter(Boolean).sort();
  }, [activeProgram?.specialization_muscle, currentWeekMuscleRows]);
  const selectedVolumeMuscle = volumeMuscle || activeProgram?.specialization_muscle || volumeMuscles[0] || 'chest';
  const volumeLandmark = GYM_SPECIALIZATION_RULES._meta?.volume_landmarks_reference?.[selectedVolumeMuscle] || null;
  const bodyweightRows = useMemo(() => calculateBodyweightTrend(sessions), [sessions]);
  const consistency = useMemo(() => calculateWeeklySessionGoal(sessions, 8, 3), [sessions]);
  const consistencyRows = consistency.rows;
  const records = useMemo(() => {
    const serverRecords = prs.map((record) => ({
      exerciseName: record.exercise?.name || record.exercise_id,
      type: 'Best e1RM',
      date: record.achieved_at ? String(record.achieved_at).slice(0, 10) : '',
      estimatedMax: Number(record.estimated_1rm || 0),
      weightKg: Number(record.weight_kg || 0),
      reps: Number(record.reps || 0),
    }));
    const detectedRecords = detectPersonalRecords(setLogs);
    const combined = prs.length
      ? [...serverRecords, ...detectedRecords.filter((record) => record.type !== 'Best e1RM')]
      : detectedRecords;
    const seen = new Set();
    return combined
      .filter((record) => {
        const key = `${record.exerciseName}-${record.type}-${record.date}-${record.weightKg}-${record.reps}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
      .slice(0, 20);
  }, [prs, setLogs]);

  if (loading) {
    return (
      <div className="space-y-4">
        <GymNav />
        <Card className="min-h-[16rem] animate-pulse" />
      </div>
    );
  }

  if (!activeProgram) {
    return (
      <div className="space-y-4">
        <GymNav />
        <GymEmptyState error={error} schemaMissing={schemaMissing} onRetry={retryGymSchema} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GymNav />

      <Card className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">{t('gym.progressEyebrow')}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-50">{t('gym.gymAnalytics')}</h1>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  tab === item.id
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                    : 'border-slate-700 bg-slate-900/45 text-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t(item.labelKey)}
              </button>
            );
          })}
        </div>
      </Card>

      {tab === 'strength' ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <LineChartIcon className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              {t('gym.estimatedOneRm')}
            </div>
            <select
              value={selectedExerciseId}
              onChange={(event) => setExerciseId(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              {catalog.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={strengthRows}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="estimatedMax" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="topWeightKg" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      {tab === 'volume' ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Flame className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              {t('gym.weeklyHardSets')}
            </div>
            <select
              value={selectedVolumeMuscle}
              onChange={(event) => setVolumeMuscle(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              {volumeMuscles.map((muscle) => (
                <option key={muscle} value={muscle}>
                  {formatGymMuscleLabel(t, muscle)}
                </option>
              ))}
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyMuscleRows}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  formatter={(value) => [t('gym.setsUnit', { count: value }), formatGymMuscleLabel(t, selectedVolumeMuscle)]}
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }}
                />
                {volumeLandmark?.MAV ? (
                  <ReferenceArea y1={volumeLandmark.MAV[0]} y2={volumeLandmark.MAV[1]} fill="#10b981" fillOpacity={0.08} />
                ) : null}
                {volumeLandmark?.MEV != null ? (
                  <ReferenceLine y={volumeLandmark.MEV} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: 'MEV', fill: '#94a3b8' }} />
                ) : null}
                {volumeLandmark?.MRV != null ? (
                  <ReferenceLine y={volumeLandmark.MRV} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'MRV', fill: '#94a3b8' }} />
                ) : null}
                {volumeMuscles.map((muscle) => (
                  <Bar
                    key={muscle}
                    dataKey={muscle}
                    stackId="sets"
                    fill={
                      muscle === activeProgram.specialization_muscle
                        ? '#10b981'
                        : muscle === selectedVolumeMuscle
                          ? '#38bdf8'
                          : '#334155'
                    }
                    radius={[6, 6, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {currentWeekMuscleRows.slice(0, 6).map((row) => {
              const landmark = GYM_SPECIALIZATION_RULES._meta?.volume_landmarks_reference?.[row.muscle];
              return (
                <div
                  key={row.muscle}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    row.muscle === activeProgram.specialization_muscle
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                      : 'border-slate-700 bg-slate-900/45 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <span>{formatGymMuscleLabel(t, row.muscle)}</span>
                    <span>{t('gym.setsUnit', { count: row.sets })}</span>
                  </div>
                  {landmark ? (
                    <p className="mt-1 text-xs text-slate-500">
                      MEV {landmark.MEV} / MAV {landmark.MAV[0]}-{landmark.MAV[1]} / MRV {landmark.MRV}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {tab === 'bodyweight' ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Scale className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            {t('gym.bodyweight')}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyweightRows}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="bodyweight" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="movingAverage7" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      {tab === 'consistency' ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Activity className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            {t('gym.weeklyConsistency')}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('gym.goal')}</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">{t('gym.perWeek', { count: consistency.goal })}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('gym.currentStreak')}</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">{t('gym.currentWeekStreak', { count: consistency.currentStreak })}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('gym.longestStreak')}</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">{t('gym.currentWeekStreak', { count: consistency.longestStreak })}</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consistencyRows}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }} />
                <ReferenceLine y={consistency.goal} stroke="#38bdf8" strokeDasharray="4 4" />
                <Bar dataKey="sessions" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      {tab === 'prs' ? (
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Trophy className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            {t('gym.prFeed')}
          </div>
          {records.length ? (
            records.map((record) => (
              <div key={`${record.exerciseName}-${record.type}-${record.date}-${record.weightKg}-${record.reps}`} className="rounded-xl border border-slate-700 bg-slate-900/45 px-3 py-2">
                <div className="flex flex-wrap justify-between gap-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-100">{record.exerciseName}</span>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                      {formatGymPrType(t, record.type)}
                    </span>
                  </div>
                  <span className="text-emerald-200">{getRecordMetricLabel(record)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {record.date} - {record.weightKg} kg x {record.reps}
                  {record.type !== 'Best e1RM' ? ` - ${record.estimatedMax} kg e1RM` : ''}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">{t('gym.noPrsYet')}</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
