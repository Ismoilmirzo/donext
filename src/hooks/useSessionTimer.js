import { useEffect, useMemo, useState } from 'react';
import { calculateSessionMetrics, formatSessionTimer } from '../lib/taskSessions';

const DEFAULT_TITLE = 'DoNext';

export function useSessionTimer(session) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!session?.id || session.status !== 'active') return undefined;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [session?.id, session?.status]);

  const metrics = useMemo(() => calculateSessionMetrics(session, now), [now, session]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!session?.id || session.status !== 'active') {
      document.title = DEFAULT_TITLE;
      return undefined;
    }

    const icon = metrics.isWorking ? '⏱' : '☕';
    document.title = `${icon} ${formatSessionTimer(metrics.focusSeconds)} - ${DEFAULT_TITLE}`;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [metrics.focusSeconds, metrics.isWorking, session?.id, session?.status]);

  return metrics;
}
