import { useLocale } from '../../contexts/LocaleContext';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function PauseSessionModal({ open, onClose, onConfirm, loading = false }) {
  const { t } = useLocale();

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={t('focus.pauseTitle')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('focus.keepWorking')}
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? t('common.saving') : t('focus.pauseConfirm')}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-300">{t('focus.pauseBody')}</p>
    </Modal>
  );
}
