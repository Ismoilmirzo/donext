import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';

function goalColorClass(percentage) {
  if (percentage >= 100) return 'bg-emerald-500';
  if (percentage >= 90) return 'bg-emerald-400';
  if (percentage >= 50) return 'bg-sky-500';
  return 'bg-amber-500';
}

export default function WeeklyGoalCard({
  goal,
  progressMinutes = 0,
  percentage = 0,
  percentageRaw = 0,
  remainingMinutes = 0,
  daysLeft = 0,
  minutesPerDay = 0,
  formatMinutes,
  compact = false,
  t,
}) {
  if (!goal) return null;

  const goalLabel = `${formatMinutes(progressMinutes)} / ${formatMinutes(goal.target_minutes)}`;
  return (
    <Card className={compact ? 'space-y-3' : ''}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-100">{t('weeklyGoals.cardTitle')}</h3>
        {percentageRaw >= 100 && <span className="text-sm font-medium text-emerald-300">{t('weeklyGoals.goalReached')}</span>}
      </div>
      <p className="mt-2 text-sm text-slate-200">{goalLabel}</p>
      <div className="mt-3">
        <ProgressBar value={percentage} max={100} colorClass={goalColorClass(percentageRaw)} />
      </div>
      <p className="mt-2 text-sm text-slate-400">{t('weeklyGoals.progressPercent', { value: percentageRaw })}</p>
      {!compact && percentageRaw < 100 && (
        <div className="mt-3 space-y-1 text-sm text-slate-400">
          <p>{t('weeklyGoals.remainingLine', { days: daysLeft + 1, remaining: formatMinutes(remainingMinutes) })}</p>
          {minutesPerDay > 0 && <p>{t('weeklyGoals.dailyPaceLine', { value: formatMinutes(minutesPerDay) })}</p>}
        </div>
      )}
    </Card>
  );
}
