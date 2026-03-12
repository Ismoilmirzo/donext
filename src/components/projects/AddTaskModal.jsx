import { useEffect, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import TextArea from '../ui/TextArea';

export default function AddTaskModal({ open, onClose, onSave, saving = false, initialTask = null }) {
  const { t } = useLocale();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(initialTask?.title || '');
    setDescription(initialTask?.description || '');
  }, [initialTask, open]);

  async function handleSave(position) {
    if (!title.trim()) return;
    await onSave?.({ title: title.trim(), description: description.trim(), position });
    if (!initialTask) {
      setTitle('');
      setDescription('');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialTask ? t('taskModal.editTitle') : t('taskModal.addTitle')}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          {!initialTask && (
            <Button variant="secondary" onClick={() => handleSave('after-current')} disabled={!title.trim() || saving}>
              {t('taskModal.addAfterCurrent')}
            </Button>
          )}
          <Button onClick={() => handleSave('end')} disabled={!title.trim() || saving}>
            {saving ? t('common.saving') : initialTask ? t('taskModal.saveChanges') : t('taskModal.addToEnd')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500">{t('common.title')}</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('taskModal.titlePlaceholder')} />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500">{t('common.description')}</span>
          <TextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('taskModal.descriptionPlaceholder')} />
        </label>
      </div>
    </Modal>
  );
}
