import { useEffect, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

export default function AddHabitModal({ open, onClose, onSave, editingHabit = null, saving = false }) {
  const { t } = useLocale();
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('✓');

  useEffect(() => {
    if (!open) return;
    setTitle(editingHabit?.title || '');
    setIcon(editingHabit?.icon || '✓');
  }, [editingHabit, open]);

  async function handleSave() {
    if (!title.trim()) return;
    await onSave?.({
      title: title.trim(),
      icon: icon.trim() || '✓',
    });
    if (!editingHabit) {
      setTitle('');
      setIcon('✓');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingHabit ? t('habits.editHabitTitle') : t('habits.addHabitTitle')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? t('common.saving') : editingHabit ? t('taskModal.saveChanges') : t('habits.saveHabit')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500">{t('common.title')}</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('habits.titlePlaceholder')} />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500">{t('habits.iconLabel')}</span>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder={t('habits.iconPlaceholder')} maxLength={4} />
        </label>
      </div>
    </Modal>
  );
}
