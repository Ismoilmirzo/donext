import { useMemo } from 'react';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import { getDeadlinePacing, getPacingClasses } from '../../lib/deadlinePacing';

export default function DeadlinePacingAlert({ project }) {
  const { t } = useLocale();

  const pacing = useMemo(
    () => getDeadlinePacing(project, t),
    [project, t]
  );

  if (!pacing) return null;

  const classes = getPacingClasses(pacing.level);
  const Icon = pacing.level === 'on-track' ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border py-2 px-3 text-xs ${classes.border} ${classes.bg} ${classes.text}`}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{pacing.message}</span>
    </div>
  );
}
