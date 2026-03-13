import { useEffect, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import Button from '../ui/Button';
import ColorPicker from '../ui/ColorPicker';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import TextArea from '../ui/TextArea';
import { PROJECT_PRIORITY_OPTIONS } from '../../lib/projectPriority';

export default function CreateProjectModal({ open, onClose, onSave, saving = false, initialProject = null }) {
  const { t } = useLocale();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [priority, setPriority] = useState('normal');
  const [deadlineDate, setDeadlineDate] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(initialProject?.title || '');
    setDescription(initialProject?.description || '');
    setColor(initialProject?.color || '#6366F1');
    setPriority(initialProject?.priority_tag || 'normal');
    setDeadlineDate(initialProject?.deadline_date || '');
  }, [initialProject, open]);

  async function handleSave() {
    if (!title.trim()) return;
    await onSave?.({
      title: title.trim(),
      description: description.trim(),
      color,
      priority_tag: priority,
      deadline_date: deadlineDate || null,
    });
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
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500">{t('projects.priorityLabel')}</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-slate-50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {PROJECT_PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`projects.priority.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500">{t('projects.deadlineLabel')}</span>
          <Input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} />
          <p className="text-xs text-slate-500">{t('projects.deadlineHint')}</p>
        </label>
      </div>
    </Modal>
  );
}
