import { useMemo, useState } from 'react';
import { BookOpen, Filter, Plus, Search } from 'lucide-react';
import GymEmptyState from '../components/gym/GymEmptyState';
import GymNav from '../components/gym/GymNav';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useLocale } from '../contexts/LocaleContext';
import { useToast } from '../contexts/ToastContext';
import { formatGymAttributeLabel, formatGymMuscleLabel } from '../gym/lib/gymI18n';
import { useGym } from '../hooks/useGym';

function uniqueValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort();
}

function getRepRangeLabel(t, exercise) {
  const low = Number(exercise.default_rep_low || 0);
  const high = Number(exercise.default_rep_high || 0);
  if (low && high && low !== high) return `${low}-${high} reps`;
  if (low || high) return `${low || high} reps`;
  return t('gym.repsNotSet');
}

function getSecondaryMusclesLabel(t, exercise) {
  const secondary = Array.isArray(exercise.secondary_muscles) ? exercise.secondary_muscles : [];
  if (!secondary.length) return t('gym.noSecondaryMuscles');
  return secondary.map((muscle) => formatGymMuscleLabel(t, muscle)).join(', ');
}

function validateExerciseForm(form, t) {
  const low = Number(form.default_rep_low);
  const high = Number(form.default_rep_high);
  const rest = Number(form.rest_seconds);
  if (!form.name.trim()) return t('gym.validationNameRequired');
  if (!form.primary_muscle) return t('gym.validationPrimaryMuscle');
  if (!Number.isFinite(low) || low < 1) return t('gym.validationLowRep');
  if (!Number.isFinite(high) || high < 1) return t('gym.validationHighRep');
  if (low > high) return t('gym.validationRepOrder');
  if (!Number.isFinite(rest) || rest < 15) return t('gym.validationRest');
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
  const { t } = useLocale();
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
      return validateExerciseForm({ ...form, [field]: value }, t);
    });
  }

  async function handleAddExercise(event) {
    event.preventDefault();
    const validationError = validateExerciseForm(form, t);
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
      toast.success(t('gym.exerciseAdded'));
    } catch (error) {
      toast.error(t('gym.exerciseAddFailed'), error.message || t('gym.tryAgain'));
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
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">{t('gym.exercisesEyebrow')}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-50">{t('gym.exerciseLibrary')}</h1>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_12rem_12rem_12rem]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/45 px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('gym.search')}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>
          <select
            value={muscle}
            onChange={(event) => setMuscle(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{t('gym.allMuscles')}</option>
            {muscles.map((value) => (
              <option key={value} value={value}>
                {formatGymMuscleLabel(t, value)}
              </option>
            ))}
          </select>
          <select
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{t('gym.allEquipment')}</option>
            {equipmentOptions.map((value) => (
              <option key={value} value={value}>
                {formatGymAttributeLabel(t, value)}
              </option>
            ))}
          </select>
          <select
            value={movementType}
            onChange={(event) => setMovementType(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{t('gym.allTypes')}</option>
            {movementTypes.map((value) => (
              <option key={value} value={value}>
                {formatGymAttributeLabel(t, value)}
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
                  <p className="mt-1 text-sm text-slate-400">{exercise.execution_cue || t('gym.noCueSaved')}</p>
                </div>
                {exercise.user_id ? (
                  <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-200">
                    {t('gym.custom')}
                  </span>
                ) : null}
              </div>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                  {t('gym.primary', { value: formatGymMuscleLabel(t, exercise.primary_muscle) })}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                  {t('gym.secondary', { value: getSecondaryMusclesLabel(t, exercise) })}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                  {t('gym.repsRange', { value: getRepRangeLabel(t, exercise) })}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                  {formatGymAttributeLabel(t, exercise.equipment)}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300 sm:col-span-2">
                  {formatGymAttributeLabel(t, exercise.movement_type)}
                </span>
              </div>
            </Card>
          ))}
        </div>

        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Plus className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            {t('gym.customExercise')}
          </div>
          {formError ? (
            <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {formError}
            </p>
          ) : null}
          <form onSubmit={handleAddExercise} className="space-y-3">
            <label className="space-y-1 text-xs text-slate-400">
              {t('gym.name')}
              <input
                required
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs text-slate-400">
                {t('gym.muscle')}
                <select
                  value={form.primary_muscle}
                  onChange={(event) => updateForm('primary_muscle', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  {muscles.map((value) => (
                    <option key={value} value={value}>
                      {formatGymMuscleLabel(t, value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                {t('gym.type')}
                <select
                  value={form.movement_type}
                  onChange={(event) => updateForm('movement_type', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  {movementTypes.map((value) => (
                    <option key={value} value={value}>
                      {formatGymAttributeLabel(t, value)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="space-y-1 text-xs text-slate-400">
              {t('gym.equipment')}
              <select
                value={form.equipment}
                onChange={(event) => updateForm('equipment', event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                {equipmentOptions.map((value) => (
                  <option key={value} value={value}>
                    {formatGymAttributeLabel(t, value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              {t('gym.secondaryMuscles')}
              <input
                value={form.secondary_muscles}
                onChange={(event) => updateForm('secondary_muscles', event.target.value)}
                placeholder="biceps, shoulders_rear"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-1 text-xs text-slate-400">
                {t('gym.lowLabel')}
                <input
                  type="number"
                  value={form.default_rep_low}
                  onChange={(event) => updateForm('default_rep_low', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                {t('gym.highLabel')}
                <input
                  type="number"
                  value={form.default_rep_high}
                  onChange={(event) => updateForm('default_rep_high', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                {t('gym.rest')}
                <input
                  type="number"
                  value={form.rest_seconds}
                  onChange={(event) => updateForm('rest_seconds', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </label>
            </div>
            <label className="space-y-1 text-xs text-slate-400">
              {t('gym.cue')}
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
              {t('gym.unilateral')}
            </label>
            <Button type="submit" loading={saving} className="inline-flex items-center gap-2">
              <Filter className="h-4 w-4" aria-hidden="true" />
              {t('gym.addExercise')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
