import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

export default function AddHabitModal({ open, onClose, onSave, editingHabit = null, saving = false }) {
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
      title={editingHabit ? 'Edit Habit' : 'Add Habit'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? 'Saving...' : editingHabit ? 'Save Changes' : 'Save Habit'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500">Title</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Read 30 min" />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500">Icon (emoji optional)</span>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="✓" maxLength={4} />
        </label>
      </div>
    </Modal>
  );
}
