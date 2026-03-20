import { useLocale } from '../../contexts/LocaleContext';
import { formatMinutesHuman, formatRelativeTime } from '../../lib/dates';
import { calculateSessionMetrics } from '../../lib/taskSessions';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function RecoverySessionModal({ open, session, onResolve, loading = false }) {
  const { t } = useLocale();
  const metrics = calculateSessionMetrics(session, new Date());
  const taskTitle = session?.task?.title || t('focus.recoveryFallbackTask');

  return (
    <Modal
      open={open}
      onClose={undefined}
      title={t('focus.recoveryTitle')}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => onResolve?.('pause')} disabled={loading}>
            {t('focus.recoverySave')}
          </Button>
          <Button variant="ghost" onClick={() => onResolve?.('discard')} disabled={loading}>
            {t('focus.recoveryDiscard')}
          </Button>
          <Button onClick={() => onResolve?.('complete')} disabled={loading}>
            {t('focus.recoveryComplete')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-slate-300">
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3">
          <p className="text-base font-semibold text-slate-100">{taskTitle}</p>
          <p className="mt-1 text-slate-400">{t('focus.recoveryStartedAt', { value: formatRelativeTime(session?.started_at) })}</p>
          <p className="mt-1 text-slate-400">
            {t('focus.recoveryFocusRecorded', { value: formatMinutesHuman(Math.round(metrics.focusSeconds / 60)) })}
          </p>
        </div>
        <p>{t('focus.recoveryBody')}</p>
      </div>
    </Modal>
  );
}
