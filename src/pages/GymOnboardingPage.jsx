import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Check, Database, Dumbbell, RefreshCw, Ruler, Target } from 'lucide-react';
import GymNav from '../components/gym/GymNav';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useToast } from '../contexts/ToastContext';
import {
  formatGymMuscleName,
  generateDefaultGymProgram,
  getGeneratedProgramPreview,
  getSpecializationMuscles,
  GYM_SPECIALIZATION_RULES,
} from '../gym/lib/gymProgramData';
import { formatWeekday } from '../gym/lib/gymMetrics';
import { useGym } from '../hooks/useGym';

const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0];

export default function GymOnboardingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { createProgram, retryGymSchema, schemaMissing } = useGym();
  const [specializationMuscle, setSpecializationMuscle] = useState('');
  const [unitPreference, setUnitPreference] = useState('kg');
  const [weekdayByDayOrder, setWeekdayByDayOrder] = useState({ 1: 1, 2: 3, 3: 5 });
  const [saving, setSaving] = useState(false);
  const specializationMuscles = useMemo(() => getSpecializationMuscles(GYM_SPECIALIZATION_RULES), []);
  const program = useMemo(() => generateDefaultGymProgram(specializationMuscle || null), [specializationMuscle]);
  const preview = useMemo(() => getGeneratedProgramPreview(specializationMuscle || null), [specializationMuscle]);

  async function handleCreate() {
    setSaving(true);
    try {
      await createProgram({
        specializationMuscle: specializationMuscle || null,
        unitPreference,
        weekdayByDayOrder,
      });
      toast.success('Gym program created');
      navigate('/gym');
    } catch (error) {
      toast.error('Program creation failed', error.message || 'Check the gym migration and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <GymNav />

      {schemaMissing ? (
        <Card className="space-y-3 border-amber-500/30 bg-amber-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2 text-sm text-amber-100">
              <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Gym setup is waiting on the database.</p>
                <p className="mt-1 text-amber-100/85">
                  Run supabase/migrations/014_gym_module_v2.sql in Supabase, then retry.
                </p>
              </div>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={retryGymSchema} className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-200">
            <Dumbbell className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Gym Setup</p>
            <h1 className="text-2xl font-semibold text-slate-50">3-Day Upper / Lower / Upper</h1>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {program.days.map((day) => (
            <div key={day.day_order} className="rounded-xl border border-slate-700 bg-slate-900/45 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Day {day.day_order}</p>
              <h2 className="mt-1 font-semibold text-slate-50">{day.label}</h2>
              <p className="mt-2 text-sm text-slate-400">{day.slots.length} exercises</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Target className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          Specialization
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setSpecializationMuscle('')}
            className={`rounded-xl border px-3 py-2 text-left text-sm ${
              !specializationMuscle
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : 'border-slate-700 bg-slate-900/45 text-slate-300'
            }`}
          >
            Balanced
          </button>
          {specializationMuscles.map((muscle) => (
            <button
              key={muscle}
              type="button"
              onClick={() => setSpecializationMuscle(muscle)}
              className={`rounded-xl border px-3 py-2 text-left text-sm ${
                specializationMuscle === muscle
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-slate-700 bg-slate-900/45 text-slate-300'
              }`}
            >
              {formatGymMuscleName(muscle)}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Generated Changes</p>
          <div className="mt-3 space-y-2">
            {preview.changedSlots.length ? (
              preview.changedSlots.map((slot) => (
                <div key={`${slot.dayLabel}-${slot.exerciseKey}`} className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="text-slate-300">{slot.dayLabel} - {slot.exerciseName}</span>
                  <span className={slot.isSpecialization ? 'text-emerald-200' : 'text-amber-200'}>
                    {slot.isSpecialization ? `+${slot.sets} sets` : `${slot.baseSets} -> ${slot.sets} sets`}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Balanced base program.</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,0.45fr)]">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <CalendarDays className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              Weekdays
            </div>
            <div className="space-y-3">
              {program.days.map((day) => (
                <label key={day.day_order} className="grid gap-2 sm:grid-cols-[minmax(12rem,1fr)_12rem]">
                  <span className="text-sm text-slate-300">{day.label}</span>
                  <select
                    value={weekdayByDayOrder[day.day_order]}
                    onChange={(event) =>
                      setWeekdayByDayOrder((prev) => ({ ...prev, [day.day_order]: Number(event.target.value) }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    {WEEKDAY_OPTIONS.map((weekday) => (
                      <option key={weekday} value={weekday}>
                        {formatWeekday(weekday)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Ruler className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              Unit
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['kg', 'lb'].map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setUnitPreference(unit)}
                  className={`rounded-xl border px-3 py-2 text-sm uppercase ${
                    unitPreference === unit
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                      : 'border-slate-700 bg-slate-900/45 text-slate-300'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button disabled={schemaMissing} loading={saving} onClick={handleCreate} className="inline-flex items-center gap-2">
          <Check className="h-4 w-4" aria-hidden="true" />
          Create Program
        </Button>
      </Card>
    </div>
  );
}
