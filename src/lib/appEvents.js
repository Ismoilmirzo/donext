export const APP_EVENTS = {
  dailySummaryRefresh: 'donext:daily-summary-refresh',
};

export function emitAppEvent(name, detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function addAppEventListener(name, handler) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(name, handler);
  return () => window.removeEventListener(name, handler);
}
