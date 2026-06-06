import { formatGymMuscleName } from './gymProgramData';
import { formatWeekday } from './gymMetrics';

const DAY_LABEL_KEYS = {
  'Upper (Push focus)': 'upperPush',
  Lower: 'lower',
  'Upper (Pull focus + arms)': 'upperPullArms',
};

const WEEKDAY_KEYS = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

function fallbackTranslate(t, key, fallback, vars) {
  const value = t(key, vars);
  return value === key ? fallback : value;
}

export function formatGymDayLabel(t, label) {
  const key = DAY_LABEL_KEYS[label];
  return key ? fallbackTranslate(t, `gym.dayLabels.${key}`, label) : label;
}

export function formatGymWeekdayLabel(t, index) {
  const key = WEEKDAY_KEYS[Number(index) % 7];
  return key ? fallbackTranslate(t, `gym.weekdays.${key}`, formatWeekday(index)) : formatWeekday(index);
}

export function formatGymMuscleLabel(t, muscle) {
  return fallbackTranslate(t, `gym.muscles.${muscle}`, formatGymMuscleName(muscle));
}

export function formatGymAttributeLabel(t, value) {
  return fallbackTranslate(t, `gym.attributes.${value}`, formatGymMuscleName(value));
}

export function formatGymStatusLabel(t, status) {
  return fallbackTranslate(t, `gym.status.${status}`, status);
}

export function formatGymRationale(t, muscle, fallback) {
  return fallbackTranslate(t, `gym.rationales.${muscle}`, fallback || '');
}

export function formatGymReassessmentPrompt(t, fallback) {
  return fallbackTranslate(t, 'gym.reassessmentPrompt', fallback || '');
}

export function formatGymPrType(t, type = '') {
  if (type === 'Best e1RM') return t('gym.recordBestE1rm');
  if (type === 'Heaviest weight') return t('gym.recordHeaviestWeight');
  if (type.startsWith('Most reps at')) {
    const load = type.replace('Most reps at ', '');
    return t('gym.recordMostRepsAt', { load });
  }
  return type || t('gym.recordBestE1rm');
}

export function formatGymNote(t, note, specializationMuscle) {
  if (specializationMuscle && String(note || '').startsWith('Added for ')) {
    return t('gym.notes.addedFor', { muscle: formatGymMuscleLabel(t, specializationMuscle) });
  }
  if (specializationMuscle && String(note || '').startsWith('Trimmed for ')) {
    return t('gym.notes.trimmedFor', { muscle: formatGymMuscleLabel(t, specializationMuscle) });
  }
  return note;
}
