function deepClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function makeExerciseMap(exerciseCatalog) {
  return new Map((exerciseCatalog?.exercises || []).map((exercise) => [exercise.key, exercise]));
}

function normalizeMuscleName(muscle) {
  return String(muscle || '')
    .trim()
    .toLowerCase();
}

export function formatGymMuscleName(muscle) {
  return String(muscle || '')
    .replace(/^shoulders_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getSpecializationMuscles(specializationRules) {
  return Object.keys(specializationRules?.rules || {});
}

export function countWeeklyDirectSets(programDays, exerciseCatalog) {
  const exerciseByKey = makeExerciseMap(exerciseCatalog);
  return (programDays || []).reduce((totals, day) => {
    (day.slots || []).forEach((slot) => {
      const exercise = exerciseByKey.get(slot.exercise_key);
      if (!exercise?.primary_muscle) return;
      totals[exercise.primary_muscle] = (totals[exercise.primary_muscle] || 0) + Number(slot.sets || 0);
    });
    return totals;
  }, {});
}

export function hydrateGymProgramDays(programDays, exerciseCatalog) {
  const exerciseByKey = makeExerciseMap(exerciseCatalog);
  return (programDays || []).map((day) => ({
    ...day,
    slots: (day.slots || []).map((slot) => ({
      ...slot,
      exercise: exerciseByKey.get(slot.exercise_key) || null,
    })),
  }));
}

function reduceProgramSlot(days, reduction, selectedMuscle) {
  const targetDay = days.find((day) => Number(day.day_order) === Number(reduction.day));
  if (!targetDay) return;

  const targetSlot = (targetDay.slots || []).find((slot) => slot.exercise_key === reduction.exercise_key);
  if (!targetSlot) return;

  targetSlot.sets = Math.max(1, Number(reduction.sets_to || targetSlot.sets || 1));
  targetSlot.notes = `Trimmed for ${formatGymMuscleName(selectedMuscle)} recovery`;
}

function appendSpecializationSlot(days, addition, selectedMuscle) {
  const targetDay = days.find((day) => Number(day.day_order) === Number(addition.day));
  if (!targetDay) {
    throw new Error(`[gym] Specialization add targets missing day ${addition.day}.`);
  }

  const maxSlotOrder = Math.max(0, ...(targetDay.slots || []).map((slot) => Number(slot.slot_order || 0)));
  targetDay.slots = [
    ...(targetDay.slots || []),
    {
      slot_order: maxSlotOrder + 1,
      exercise_key: addition.exercise_key,
      sets: Number(addition.sets),
      rep_low: Number(addition.rep_low),
      rep_high: Number(addition.rep_high),
      is_specialization: true,
      notes: `Added for ${formatGymMuscleName(selectedMuscle)}`,
    },
  ];
}

export function generateGymProgram({ baseProgram, exerciseCatalog, specializationRules, specializationMuscle = null }) {
  const selectedMuscle = normalizeMuscleName(specializationMuscle);
  const days = deepClone(baseProgram?.days || []);
  const rule = selectedMuscle ? specializationRules?.rules?.[selectedMuscle] : null;

  if (selectedMuscle && !rule) {
    throw new Error(`[gym] Unknown specialization muscle: ${selectedMuscle}.`);
  }

  if (rule) {
    (rule.reduce || []).forEach((reduction) => reduceProgramSlot(days, reduction, selectedMuscle));
    (rule.add || []).forEach((addition) => appendSpecializationSlot(days, addition, selectedMuscle));
  }

  const weeklyDirectSets = countWeeklyDirectSets(days, exerciseCatalog);
  if (rule) {
    const targetSets = weeklyDirectSets[selectedMuscle] || 0;
    if (targetSets > Number(rule.weekly_cap_sets)) {
      throw new Error(
        `[gym] ${selectedMuscle} specialization produces ${targetSets} weekly direct sets, exceeding cap ${rule.weekly_cap_sets}.`
      );
    }
  }

  return {
    meta: deepClone(baseProgram?._meta || {}),
    specializationMuscle: selectedMuscle || null,
    specializationRule: rule ? deepClone(rule) : null,
    weeklyDirectSets,
    days: hydrateGymProgramDays(days, exerciseCatalog),
  };
}

export function validateGymSourceData({ baseProgram, exerciseCatalog, specializationRules }) {
  const errors = [];
  const exerciseByKey = makeExerciseMap(exerciseCatalog);
  const exerciseKeys = (exerciseCatalog?.exercises || []).map((exercise) => exercise.key);
  const duplicateExerciseKeys = exerciseKeys.filter((key, index) => exerciseKeys.indexOf(key) !== index);

  if (duplicateExerciseKeys.length) {
    errors.push(`[gym] Duplicate exercise keys: ${[...new Set(duplicateExerciseKeys)].join(', ')}`);
  }

  (baseProgram?.days || []).forEach((day) => {
    (day.slots || []).forEach((slot) => {
      if (!exerciseByKey.has(slot.exercise_key)) {
        errors.push(`[gym] Base day ${day.day_order} references missing exercise ${slot.exercise_key}.`);
      }
      if (Number(slot.sets) < 1) {
        errors.push(`[gym] Base day ${day.day_order} slot ${slot.slot_order} has invalid set count.`);
      }
      if (Number(slot.rep_low) > Number(slot.rep_high)) {
        errors.push(`[gym] Base day ${day.day_order} slot ${slot.slot_order} has invalid rep range.`);
      }
    });
  });

  Object.entries(specializationRules?.rules || {}).forEach(([muscle, rule]) => {
    [...(rule.add || []), ...(rule.reduce || [])].forEach((entry) => {
      if (!exerciseByKey.has(entry.exercise_key)) {
        errors.push(`[gym] ${muscle} rule references missing exercise ${entry.exercise_key}.`);
      }
    });

    try {
      const first = generateGymProgram({ baseProgram, exerciseCatalog, specializationRules, specializationMuscle: muscle });
      const second = generateGymProgram({ baseProgram, exerciseCatalog, specializationRules, specializationMuscle: muscle });
      if (JSON.stringify(first.days) !== JSON.stringify(second.days)) {
        errors.push(`[gym] ${muscle} specialization is not idempotent.`);
      }
      const targetSets = first.weeklyDirectSets[muscle] || 0;
      if (targetSets > Number(rule.weekly_cap_sets)) {
        errors.push(`[gym] ${muscle} exceeds weekly cap (${targetSets}/${rule.weekly_cap_sets}).`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  });

  return {
    ok: errors.length === 0,
    errors,
  };
}
