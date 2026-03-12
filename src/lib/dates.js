import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { getLocaleTag, getStoredLocale } from './i18n';

export function toISODate(date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

export function getWeekStart(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekEnd(date = new Date()) {
  return endOfWeek(date, { weekStartsOn: 1 });
}

export function getMonthStart(date = new Date()) {
  return startOfMonth(date);
}

export function getMonthEnd(date = new Date()) {
  return endOfMonth(date);
}

export function getWeekDays(baseDate = new Date(), locale = getStoredLocale()) {
  const start = getWeekStart(baseDate);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i);
    return {
      label: new Intl.DateTimeFormat(getLocaleTag(locale), { weekday: 'short' }).format(day),
      date: toISODate(day),
      dateObj: day,
    };
  });
}

export function formatRelativeTime(input) {
  const locale = getStoredLocale();
  if (!input) return locale === 'uz' ? 'Hech qachon' : 'Never';
  const date = typeof input === 'string' ? parseISO(input) : input;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return locale === 'uz' ? "Noma'lum" : 'Unknown';

  if (isToday(date)) {
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
    if (diffMinutes < 60) return locale === 'uz' ? `${diffMinutes} daqiqa oldin` : `${diffMinutes} min ago`;
    const hours = Math.floor(diffMinutes / 60);
    return locale === 'uz' ? `${hours} soat oldin` : `${hours}h ago`;
  }

  if (isYesterday(date)) return locale === 'uz' ? 'Kecha' : 'Yesterday';

  const diffDays = Math.max(1, differenceInCalendarDays(new Date(), date));
  if (diffDays < 7) return locale === 'uz' ? `${diffDays} kun oldin` : `${diffDays}d ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 5) return locale === 'uz' ? `${weeks} hafta oldin` : `${weeks}w ago`;
  const months = Math.floor(diffDays / 30);
  return locale === 'uz' ? `${months} oy oldin` : `${months}mo ago`;
}

export function formatMinutesHuman(totalMinutes = 0) {
  const minutes = Math.max(0, Number(totalMinutes) || 0);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining}m`;
  return `${hours}h ${remaining}m`;
}
