import { useEffect, useMemo, useState } from 'react';
import { Check, Repeat2, RotateCcw, Save, ShieldCheck, Target } from 'lucide-react';
import GymEmptyState from '../components/gym/GymEmptyState';
import GymNav from '../components/gym/GymNav';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import { useToast } from '../contexts/ToastContext';
import {
  formatGymMuscleName,
  getGeneratedProgramPreview,
  getSpecializationMuscles,
  GYM_SPECIALIZATION_RULES,
} from '../gym/lib/gymProgramData';
import { useGym } from '../hooks/useGym';

function getBlockWeek(program, nowMs) {
  if (!program?.spec_started_on) return 0;
  const started = new Date(program.spec_started_on);
  return Math.floor((nowMs - started.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

function SlotEditor({ catalog, onSave, onSwap, slot }) {
  const toast = useToast();
  const [sets, setSets] = useState(slot.sets);
  const [repLow, setRepLow] = useState(slot.rep_low);
  const [repHigh, setRepHigh] = useState(slot.rep_high);
  const [swapId, setSwapId] = useState(slot.exercise_id);
  const [saving, setSaving] = useState(false);
  const exercise = slot.exercise;
  const swapOptions = useMemo(
    () =>
      catalog
        .filter(
          (candidate) =>
            candidate.id &&
            candidate.primary_muscle === exercise?.primary_muscle &&
            candidate.movement_type === exercise?.movement_type
        )
        .sort((left, right) => left.name.localeCompare(right.name)),
    [catalog, exercise?.movement_type, exercise?.primary_muscle]
  );

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(slot.id, { sets, rep_low: repLow, rep_high: repHigh });
      if (swapId !== slot.exercise_id) await onSwap(slot.id, swapId);
      toast.success('Slot updated');
    } catch (error) {
      toast.error('Slot update failed', error.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`rounded-xl border px-4 py-3 ${slot.is_specialization ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/45'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-50">{exercise?.name || slot.exercise_key}</p>
            {slot.is_specialization ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                {slot.notes || 'Added for specialization'}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-400">{exercise?.execution_cue || 'No cue saved.'}</p>
          {!slot.is_specialization && slot.notes ? (
            <p className="mt-2 text-xs font-medium text-amber-200">{slot.notes}</p>
          ) : null}
        </div>
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {formatGymMuscleName(exercise?.primary_muscle)} / {formatGymMuscleName(exercise?.movement_type)}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[6rem_6rem_6rem_minmax(12rem,1fr)_auto]">
        <label className="space-y-1 text-xs text-slate-400">
          Sets
          <input
            min="1"
            max="8"
            type="number"
            value={sets}
            onChange={(event) => setSets(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          Low
          <input
            min="1"
            type="number"
            value={repLow}
            onChange={(event) => setRepLow(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          High
          <input
            min="1"
            type="number"
            value={repHigh}
            onChange={(event) => setRepHigh(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          Swap
          <select
            value={swapId || ''}
            onChange={(event) => setSwapId(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            {swapOptions.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button size="sm" loading={saving} onClick={handleSave} className="inline-flex items-center gap-2">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function DayEditor({ catalog, day, onSave, onSwap }) {
  const totalSets = day.slots.reduce((sum, slot) => sum + Number(slot.sets || 0), 0);
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-300">Day {day.day_order}</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-50">{day.label}</h2>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-300">
          {day.slots.length} exercises / {totalSets} sets
        </div>
      </div>
      <div className="space-y-3">
        {day.slots.map((slot) => (
          <SlotEditor key={slot.id} catalog={catalog} onSave={onSave} onSwap={onSwap} slot={slot} />
        ))}
      </div>
    </Card>
  );
}

export default function GymProgramPage() {
  const toast = useToast();
  const {
    activeProgram,
    applyProgram,
    catalog,
    error,
    loading,
    retryGymSchema,
    schemaMissing,
    updateProgramSlot,
    swapProgramSlot,
  } = useGym();
  const [nowMs] = useState(() => Date.now());
  const specializationMuscles = useMemo(() => getSpecializationMuscles(GYM_SPECIALIZATION_RULES), []);
  const [selectedMuscle, setSelectedMuscle] = useState(activeProgram?.specialization_muscle || '');
  const [focusPickerOpen, setFocusPickerOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const preview = useMemo(() => getGeneratedProgramPreview(selectedMuscle || null), [selectedMuscle]);
  const previewProgram = preview.selected;
  const volumeRows = useMemo(
    () => Object.entries(previewProgram.weeklyDirectSets).sort((left, right) => right[1] - left[1]),
    [previewProgram.weeklyDirectSets]
  );
  const activeBlockWeek = getBlockWeek(activeProgram, nowMs);

  useEffect(() => {
    setSelectedMuscle(activeProgram?.specialization_muscle || '');
  }, [activeProgram?.specialization_muscle]);

  async function handleApply(targetMuscle = selectedMuscle) {
    setApplying(true);
    try {
      await applyProgram(targetMuscle || null);
      toast.success(targetMuscle ? `${formatGymMuscleName(targetMuscle)} specialization applied` : 'Balanced program restored');
      setFocusPickerOpen(false);
    } catch (applyError) {
      toast.error('Program update failed', applyError.message || 'Try again.');
    } finally {
      setApplying(false);
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

      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Program</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-50">{activeProgram.name}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {activeProgram.specialization_muscle
                ? `Specializing: ${formatGymMuscleName(activeProgram.specialization_muscle)} - week ${Math.min(8, Math.max(1, activeBlockWeek))} of 8`
                : 'Balanced'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setFocusPickerOpen(true)} className="inline-flex items-center gap-2">
              <Target className="h-4 w-4" aria-hidden="true" />
              Change Focus
            </Button>
            {activeProgram.specialization_muscle ? (
              <Button variant="secondary" loading={applying} onClick={() => handleApply('')} className="inline-flex items-center gap-2">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Return Balanced
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Modal
        open={focusPickerOpen}
        onClose={() => setFocusPickerOpen(false)}
        title="Change focus"
        panelClassName="max-w-3xl"
        bodyClassName="max-h-[75vh] space-y-4 overflow-y-auto"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setFocusPickerOpen(false)} disabled={applying}>
              Cancel
            </Button>
            <Button loading={applying} onClick={() => handleApply(selectedMuscle)} className="inline-flex items-center gap-2">
              <Check className="h-4 w-4" aria-hidden="true" />
              Confirm
            </Button>
          </div>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setSelectedMuscle('')}
            className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
              !selectedMuscle
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : 'border-slate-700 bg-slate-900/40 text-slate-300 hover:text-slate-100'
            }`}
          >
            Balanced
          </button>
          {specializationMuscles.map((muscle) => (
            <button
              key={muscle}
              type="button"
              onClick={() => setSelectedMuscle(muscle)}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                selectedMuscle === muscle
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-slate-700 bg-slate-900/40 text-slate-300 hover:text-slate-100'
              }`}
            >
              {formatGymMuscleName(muscle)}
            </button>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.65fr)]">
          <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Target className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              Add / Trim Preview
            </div>
            <div className="mt-3 space-y-2">
              {preview.changedSlots.length ? (
                preview.changedSlots.map((slot) => (
                  <div key={`${slot.dayLabel}-${slot.exerciseKey}-${slot.sets}`} className="flex flex-wrap justify-between gap-2 text-sm">
                    <span className="text-slate-300">{slot.dayLabel} - {slot.exerciseName}</span>
                    <span className={slot.isSpecialization ? 'text-emerald-200' : 'text-amber-200'}>
                      {slot.isSpecialization ? `+${slot.sets} sets` : `${slot.baseSets} -> ${slot.sets} sets`}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No specialization changes.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              Weekly Target
            </div>
            <div className="mt-3 space-y-3">
              {volumeRows.slice(0, 7).map(([muscle, sets]) => {
                const cap = GYM_SPECIALIZATION_RULES.rules[muscle]?.weekly_cap_sets || Math.max(sets, 1);
                return (
                  <div key={muscle} className="space-y-1">
                    <div className="flex justify-between gap-3 text-xs text-slate-400">
                      <span>{formatGymMuscleName(muscle)}</span>
                      <span>{sets}/{cap}</span>
                    </div>
                    <ProgressBar value={sets} max={cap} colorClass="bg-emerald-500" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {activeProgram.specialization_muscle && activeBlockWeek >= 8 ? (
        <Card className="space-y-3 border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
            <Repeat2 className="h-4 w-4" aria-hidden="true" />
            Block Reassessment
          </div>
          <p className="text-sm leading-6 text-amber-100/90">{GYM_SPECIALIZATION_RULES._meta?.reassess_prompt}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => handleApply(activeProgram.specialization_muscle)}>
              Repeat Block
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleApply('')}>
              Return Balanced
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="space-y-4">
        {activeProgram.days.map((day) => (
          <DayEditor
            key={day.id}
            catalog={catalog}
            day={day}
            onSave={updateProgramSlot}
            onSwap={swapProgramSlot}
          />
        ))}
      </div>
    </div>
  );
}
