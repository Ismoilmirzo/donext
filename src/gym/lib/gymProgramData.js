import baseProgram from '../../data/gym/base_program.json';
import exerciseCatalog from '../../data/gym/exercise_catalog.json';
import specializationRules from '../../data/gym/specialization_rules.json';
import {
  formatGymMuscleName,
  generateProgram,
  getGeneratedProgramPreview as getPreviewFromData,
  getSpecializationMuscles,
  serializeGeneratedProgramDays,
  validateGymSourceData,
} from './generateProgram.js';

export {
  formatGymMuscleName,
  getSpecializationMuscles,
  serializeGeneratedProgramDays,
  validateGymSourceData,
};

export const GYM_BASE_PROGRAM = baseProgram;
export const GYM_EXERCISE_CATALOG = exerciseCatalog;
export const GYM_SPECIALIZATION_RULES = specializationRules;

export function generateDefaultGymProgram(specializationMuscle = null) {
  return generateProgram({
    baseProgram,
    exerciseCatalog,
    specializationRules,
    specializationMuscle,
  });
}

export function getGeneratedProgramPreview(specializationMuscle = null) {
  return getPreviewFromData({
    baseProgram,
    exerciseCatalog,
    specializationRules,
    specializationMuscle,
  });
}
