import { useMemo, useState } from 'react';
import { BookOpen, Filter, Plus, Search } from 'lucide-react';
import GymEmptyState from '../components/gym/GymEmptyState';
import GymNav from '../components/gym/GymNav';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useToast } from '../contexts/ToastContext';
import { formatGymMuscleName } from '../gym/lib/gymProgramData';
import { useGym } from '../hooks/useGym';

function uniqueValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort();
}

function getRepRangeLabel(exercise) {
  const low = Number(exercise.default_rep_low || 0);
  const high = Number(exercise.default_rep_high || 0);
  if (low && high && low !== high) return `${low}-${high} reps`;
  if (low || high) return `${low || high} reps`;
  return 'Reps not set';
}

function getSecondaryMusclesLabel(exercise) {
  const secondary = Array.isArray(exercise.secondary_muscles) ? exercise.secondary_muscles : [];
  if (!secondary.length) return 'No secondary muscles';
  return secondary.map(formatGymMuscleName).join(', ');
}

function validateExerciseForm(form) {
  const low = Number(form.default_rep_low);
  const high = Number(form.default_rep_high);
  const rest = Number(form.rest_seconds);
  if (!form.name.trim()) return 'Name is required.';
  if (!form.primary_muscle) return 'Choose a primary muscle so this exercise can appear in swaps and specializations.';
  if (!Number.isFinite(low) || low < 1) return 'Low reps must be at least 1.';
  if (!Number.isFinite(high) || high < 1) return 'High reps must be at least 1.';
  if (low > high) return 'Low reps cannot be higher than high reps.';
  if (!Number.isFinite(rest) || rest < 15) return 'Rest should be at least 15 seconds.';
  return '';
}

const EMPTY_FORM = {
  name: '',
  primary_muscle: 'chest',
  secondary_muscles: '',
  movement_type: 'isolation',
  equipment: 'dumbbell',
  default_rep_low: 8,
  default_rep_high: 12,
  rest_seconds: 90,
  execution_cue: '',
  is_unilateral: false,
};

export default function GymExercisesPage() {
  const toast = useToast();
  const { addCustomExercise, catalog, error, loading, retryGymSchema, schemaMissing } = useGym();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [movementType, setMovementType] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const muscles = useMemo(() => uniqueValues(catalog, 'primary_muscle'), [catalog]);
  const equipmentOptions = useMemo(() => uniqueValues(catalog, 'equipment'), [catalog]);
  const movementTypes = useMemo(() => uniqueValues(catalog, 'movement_type'), [catalog]);
  const filteredExercises = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.filter((exercise) => {
      const matchesQuery =
        !needle ||
        exercise.name.toLowerCase().includes(needle) ||
        exercise.primary_muscle.toLowerCase().includes(needle) ||
        exercise.equipment.toLowerCase().includes(needle);
      const matchesMuscle = !muscle || exercise.primary_muscle === muscle;
      const matchesEquipment = !equipment || exercise.equipment === equipment;
      const matchesType = !movementType || exercise.movement_type === movementType;
      return matchesQuery && matchesMuscle && matchesEquipment && matchesType;
    });
  }, [catalog, equipment, movementType, muscle, query]);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError((prev) => {
      if (!prev) return '';
      return validateExerciseForm({ ...form, [field]: value });
    });
  }

  async function handleAddExercise(event) {
    event.preventDefault();
    const validationError = validateExerciseForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    try {
      await addCustomExercise({
        ...form,
        secondary_muscles: form.secondary_muscles
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      });
      setForm(EMPTY_FORM);
      setFormError('');
      toast.success('Exercise added');
    } catch (error) {
      toast.error('Exercise was not added', error.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <GymNav />
        <Card className="min-h-[16rem] animate-pulse" />
      </div>
    );
  }

  if (schemaMissing || (error && !catalog.length)) {
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
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Exercises</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-50">Exercise Library</h1>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_12rem_12rem_12rem]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/45 px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>
          <select
            value={muscle}
            onChange={(event) => setMuscle(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All muscles</option>
            {muscles.map((value) => (
              <option key={value} value={value}>
                {formatGymMuscleName(value)}
              </option>
            ))}
          </select>
          <select
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All equipment</option>
            {equipmentOptions.map((value) => (
              <option key={value} value={value}>
                {formatGymMuscleName(value)}
              </option>
            ))}
          </select>
          <select
            value={movementType}
            onChange={(event) => setMovementType(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All types</option>
            {movementTypes.map((value) => (
              <option key={value} value={value}>
                {formatGymMuscleName(value)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.5fr)]">
        <div className="grid gap-3 md:grid-cols-2">
          {filteredExercises.map((exercise) => (
            <Card key={exercise.id || exercise.key} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                    <h2 className="font-semibold text-slate-50">{exercise.name}</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{exercise.execution_cue || 'No cue saved.'}</p>
                </div>
                {exercise.user_id ? (
                  <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-200">
                    Custom
                  </span>
                ) : null}
              </div>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                  Primary: {formatGymMuscleName(exercise.primary_muscle)}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                  Secondary: {getSecondaryMusclesLabel(exercise)}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                  Reps: {getRepRangeLabel(exercise)}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                  {formatGymMuscleName(exercise.equipment)}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300 sm:col-span-2">
                  {formatGymMuscleName(exercise.movement_type)}
                </span>
              </div>
            </Card>
          ))}
        </div>

        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Plus className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            Custom Exercise
          </div>
          {formError ? (
            <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {formError}
            </p>
          ) : null}
          <form onSubmit={handleAddExercise} className="space-y-3">
            <label className="space-y-1 text-xs text-slate-400">
              Name
              <input
                required
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs text-slate-400">
                Muscle
                <select
                  value={form.primary_muscle}
                  onChange={(event) => updateForm('primary_muscle', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  {muscles.map((value) => (
                    <option key={value} value={value}>
                      {formatGymMuscleName(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                Type
                <select
                  value={form.movement_type}
                  onChange={(event) => updateForm('movement_type', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  {movementTypes.map((value) => (
                    <option key={value} value={value}>
                      {formatGymMuscleName(value)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="space-y-1 text-xs text-slate-400">
              Equipment
              <select
                value={form.equipment}
                onChange={(event) => updateForm('equipment', event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                {equipmentOptions.map((value) => (
                  <option key={value} value={value}>
                    {formatGymMuscleName(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              Secondary muscles
              <input
                value={form.secondary_muscles}
                onChange={(event) => updateForm('secondary_muscles', event.target.value)}
                placeholder="biceps, shoulders_rear"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-1 text-xs text-slate-400">
                Low
                <input
                  type="number"
                  value={form.default_rep_low}
                  onChange={(event) => updateForm('default_rep_low', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                High
                <input
                  type="number"
                  value={form.default_rep_high}
                  onChange={(event) => updateForm('default_rep_high', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                Rest
                <input
                  type="number"
                  value={form.rest_seconds}
                  onChange={(event) => updateForm('rest_seconds', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </label>
            </div>
            <label className="space-y-1 text-xs text-slate-400">
              Cue
              <textarea
                value={form.execution_cue}
                onChange={(event) => updateForm('execution_cue', event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={form.is_unilateral}
                onChange={(event) => updateForm('is_unilateral', event.target.checked)}
              />
              Unilateral
            </label>
            <Button type="submit" loading={saving} className="inline-flex items-center gap-2">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Add Exercise
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
