import { useEffect, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import TimeInput from '../ui/TimeInput';

function getElapsedMinutes(startedAt) {
  if (!startedAt) return 1;
  const startedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedMs)) return 1;
  return Math.max(1, Math.ceil((Date.now() - startedMs) / 60000));
}

export default function CompleteTaskModal({ open, onClose, startedAt, onSave, saving = false }) {
  const { t } = useLocale();
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(1);
  const [maxMinutes, setMaxMinutes] = useState(1);
  const [showClampHint, setShowClampHint] = useState(false);

  useEffect(() => {
    if (!open) return;
    const max = getElapsedMinutes(startedAt);
    setMaxMinutes(max);
    setHours(Math.floor(max / 60));
    setMinutes(max % 60);
    setShowClampHint(false);
  }, [open, startedAt]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setInterval(() => {
      setMaxMinutes(getElapsedMinutes(startedAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [open, startedAt]);

  useEffect(() => {
    if (!open) return;
    const currentTotal = Math.max(0, Number(hours) * 60 + Number(minutes));
    if (currentTotal <= maxMinutes) return;
    setHours(Math.floor(maxMinutes / 60));
    setMinutes(maxMinutes % 60);
  }, [hours, maxMinutes, minutes, open]);

  function handleSave() {
    const liveMaxMinutes = getElapsedMinutes(startedAt);
    const rawMinutes = Math.max(0, Number(hours) * 60 + Number(minutes));
    const nextMinutes = Math.max(1, Math.min(rawMinutes, liveMaxMinutes));
    if (nextMinutes !== rawMinutes) {
      setShowClampHint(true);
      setHours(Math.floor(nextMinutes / 60));
      setMinutes(nextMinutes % 60);
    }
    onSave?.(nextMinutes);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('focus.niceWork')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving') : t('focus.saveContinue')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-400">{t('focus.focusedTimePrompt')}</p>
        <TimeInput
          hours={hours}
          minutes={minutes}
          maxTotalMinutes={maxMinutes}
          onChange={({ hours: h, minutes: m, wasClamped }) => {
            setHours(h);
            setMinutes(m);
            setShowClampHint(Boolean(wasClamped));
          }}
        />
        <p className="text-xs text-slate-500">
          {t('focus.timerSays', { hours: Math.floor(maxMinutes / 60), minutes: maxMinutes % 60 })}
        </p>
        {showClampHint && (
          <p className="text-xs text-amber-400">{t('focus.timeExceedsMax')} ({formatMinutesHuman(maxMinutes)})</p>
        )}
      </div>
    </Modal>
  );
}
