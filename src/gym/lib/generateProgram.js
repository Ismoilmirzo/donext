import {
  countWeeklyDirectSets,
  formatGymMuscleName,
  generateGymProgram,
  getSpecializationMuscles,
  hydrateGymProgramDays,
  validateGymSourceData,
} from '../../lib/gymProgramCore.js';

export {
  countWeeklyDirectSets,
  formatGymMuscleName,
  generateGymProgram as generateProgram,
  getSpecializationMuscles,
  hydrateGymProgramDays,
  validateGymSourceData,
};

export function serializeGeneratedProgramDays(program, weekdayByDayOrder = {}) {
  return (program?.days || []).map((day) => ({
    label: day.label,
    day_order: Number(day.day_order),
    default_weekday: Number(weekdayByDayOrder[day.day_order] ?? day.default_weekday ?? 1),
    slots: (day.slots || []).map((slot) => ({
      slot_order: Number(slot.slot_order),
      exercise_id: slot.exercise_id || null,
      exercise_key: slot.exercise_key,
      sets: Number(slot.sets),
      rep_low: Number(slot.rep_low),
      rep_high: Number(slot.rep_high),
      is_specialization: Boolean(slot.is_specialization),
      notes: slot.notes || null,
    })),
  }));
}

export function getGeneratedProgramPreview({ baseProgram, exerciseCatalog, specializationRules, specializationMuscle = null }) {
  const balanced = generateGymProgram({ baseProgram, exerciseCatalog, specializationRules, specializationMuscle: null });
  const selected = generateGymProgram({ baseProgram, exerciseCatalog, specializationRules, specializationMuscle });
  const changedSlots = [];

  selected.days.forEach((day) => {
    const balancedDay = balanced.days.find((candidate) => Number(candidate.day_order) === Number(day.day_order));
    (day.slots || []).forEach((slot) => {
      const baseSlot = (balancedDay?.slots || []).find((candidate) => candidate.exercise_key === slot.exercise_key);
      if (slot.is_specialization || Number(slot.sets) !== Number(baseSlot?.sets || slot.sets)) {
        changedSlots.push({
          dayLabel: day.label,
          exerciseName: slot.exercise?.name || slot.exercise_key,
          exerciseKey: slot.exercise_key,
          sets: Number(slot.sets),
          baseSets: Number(baseSlot?.sets || 0),
          isSpecialization: Boolean(slot.is_specialization),
        });
      }
    });
  });

  return {
    balanced,
    selected,
    changedSlots,
  };
}
