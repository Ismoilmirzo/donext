import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

export default function WeeklyGoalPromptCard({
  suggestedHours = 5,
  lastWeekLabel = '0m',
  onSave,
  onSkip,
  saving = false,
  t,
}) {
  const [hours, setHours] = useState(String(suggestedHours));

  useEffect(() => {
    setHours(String(suggestedHours));
  }, [suggestedHours]);

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">{t('weeklyGoals.promptEyebrow')}</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-50">{t('weeklyGoals.promptTitle')}</h2>
          <p className="mt-2 text-sm text-slate-300">{t('weeklyGoals.promptLastWeek', { value: lastWeekLabel })}</p>
          <p className="mt-1 text-sm text-slate-400">{t('weeklyGoals.promptSuggested', { value: suggestedHours })}</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <div className="flex items-center gap-3">
            <Input
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              inputMode="decimal"
              placeholder="7.5"
            />
            <span className="text-sm text-slate-400">{t('weeklyGoals.hoursShort')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => onSave?.(Math.round(Math.max(0.5, Number(hours) || suggestedHours) * 60))}
              disabled={saving}
            >
              {saving ? t('common.saving') : t('weeklyGoals.setGoal')}
            </Button>
            <Button variant="secondary" onClick={onSkip} disabled={saving}>
              {t('weeklyGoals.skipWeek')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
