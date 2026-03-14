import React, { useEffect, useMemo, useState } from 'react';
import { Timer } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import Button from '../ui/Button';
import Card from '../ui/Card';

function formatElapsed(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const DEFAULT_TITLE = 'DoNext';
const TIMER_PREFIX = 'Timer';

export default function ActiveTaskScreen({ project, task, onDone }) {
  const { t } = useLocale();
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState(() =>
    task?.started_at ? new Date(task.started_at).getTime() : Date.now()
  );

  const motivation = t('focus.motivations');
  const quote = useMemo(
    () => motivation[Math.abs((task?.id || '').split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)) % motivation.length],
    [motivation, task?.id]
  );

  useEffect(() => {
    setStartedAt(task?.started_at ? new Date(task.started_at).getTime() : Date.now());
  }, [task?.started_at]);

  useEffect(() => {
    function tick() {
      const nextElapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setElapsed(nextElapsed);
      if (typeof document !== 'undefined') {
        document.title = `${TIMER_PREFIX} ${formatElapsed(nextElapsed)} - ${DEFAULT_TITLE}`;
      }
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => {
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.title = DEFAULT_TITLE;
      }
    };
  }, [startedAt]);

  return (
    <Card className="dn-active-focus-card space-y-5 text-center">
      <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
        <Timer className="h-3.5 w-3.5" />
        Active session
      </div>
      <p className="text-sm text-slate-400">{project?.title}</p>
      <h2 className="text-2xl font-semibold text-slate-50 sm:text-3xl">{task?.title}</h2>
      {task?.description ? <p className="mx-auto max-w-xl text-sm leading-6 text-slate-400">{task.description}</p> : null}
      <div className="rounded-[1.75rem] border border-emerald-500/25 bg-slate-900/70 px-4 py-5">
        <p className="font-mono text-5xl font-bold text-emerald-300 sm:text-6xl">{formatElapsed(elapsed)}</p>
        <p className="mt-3 text-sm text-slate-400">{quote}</p>
      </div>
      <Button
        onClick={() => {
          if (typeof document !== 'undefined') {
            document.title = DEFAULT_TITLE;
          }
          onDone?.(elapsed);
        }}
        className="w-full py-4 text-lg"
      >
        {t('focus.doneButton')}
      </Button>
    </Card>
  );
}
