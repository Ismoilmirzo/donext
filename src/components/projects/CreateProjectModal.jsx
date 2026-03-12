import { useEffect, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import Button from '../ui/Button';
import ColorPicker from '../ui/ColorPicker';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import TextArea from '../ui/TextArea';

export default function CreateProjectModal({ open, onClose, onSave, saving = false, initialProject = null }) {
  const { t } = useLocale();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366F1');

  useEffect(() => {
    if (!open) return;
    setTitle(initialProject?.title || '');
    setDescription(initialProject?.description || '');
    setColor(initialProject?.color || '#6366F1');
  }, [initialProject, open]);

  async function handleSave() {
    if (!title.trim()) return;
    await onSave?.({ title: title.trim(), description: description.trim(), color });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialProject ? t('projectModal.editTitle') : t('projectModal.createTitle')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? t('common.saving') : initialProject ? t('projectModal.saveChanges') : t('projectModal.createTitle')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500">{t('common.title')}</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('projectModal.titlePlaceholder')} />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500">{t('common.description')}</span>
          <TextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('projectModal.descriptionPlaceholder')} />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500">{t('common.color')}</span>
          <ColorPicker value={color} onChange={setColor} />
        </label>
      </div>
    </Modal>
  );
}
