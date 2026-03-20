import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman } from '../../lib/dates';
import { getTaskElapsedMinutes, getTaskFocusMinutes } from '../../lib/taskSessions';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function SessionSummaryModal({ open, onClose, onPrimary, primaryLabel, task, summary, loading = false }) {
  const { t } = useLocale();

  if (!summary || !task) return null;

  const totalFocusMinutes = getTaskFocusMinutes(task);
  const totalElapsedMinutes = getTaskElapsedMinutes(task);
  const sessionsCount = Math.max(0, Number(task.sessions_count) || 0);

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={t('focus.completedTitle')}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('focus.doneForNow')}
          </Button>
          {primaryLabel ? (
            <Button onClick={onPrimary} disabled={loading}>
              {primaryLabel}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-slate-100">{task.title}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">{t('focus.thisSession')}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-100 sm:grid-cols-2">
            <p>{t('focus.summaryFocus', { value: formatMinutesHuman(summary.focusMinutes) })}</p>
            <p>{t('focus.summaryBreaks', { value: formatMinutesHuman(summary.breakMinutes) })}</p>
            <p>{t('focus.summaryTotal', { value: formatMinutesHuman(summary.totalMinutes) })}</p>
            <p>{t('focus.summaryEfficiency', { value: summary.efficiencyRate })}</p>
          </div>
        </div>

        {sessionsCount > 1 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('focus.fullTaskSummary')}</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
              <p>{t('focus.summarySessions', { count: sessionsCount })}</p>
              <p>{t('focus.summaryFocus', { value: formatMinutesHuman(totalFocusMinutes) })}</p>
              <p>{t('focus.summaryElapsed', { value: formatMinutesHuman(totalElapsedMinutes) })}</p>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
