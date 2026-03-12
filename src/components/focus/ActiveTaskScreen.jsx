import { useEffect, useMemo, useState } from 'react';
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
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <Card className="space-y-4 text-center">
      <p className="text-sm text-slate-400">{project?.title}</p>
      <h2 className="text-2xl font-semibold text-slate-50">{task?.title}</h2>
      <p className="font-mono text-4xl font-bold text-emerald-300">{formatElapsed(elapsed)}</p>
      <p className="text-sm text-slate-400">{quote}</p>
      <Button onClick={() => onDone?.(elapsed)} className="w-full py-4 text-lg">
        {t('focus.doneButton')}
      </Button>
    </Card>
  );
}
