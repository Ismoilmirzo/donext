import { useEffect, useState } from 'react';
import { GripVertical, Pencil, Trash2, X } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';

export default function AITaskPreview({ open, onClose, tasks: initialTasks, onConfirm, saving, remaining, t }) {
  const [tasks, setTasks] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Sync internal state when modal opens with new tasks
  useEffect(() => {
    if (open && initialTasks.length > 0) {
      setTasks(initialTasks);
      setEditingIndex(null);
      setEditTitle('');
    }
  }, [open, initialTasks]);

  function handleRemove(index) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  function handleStartEdit(index) {
    setEditingIndex(index);
    setEditTitle(tasks[index].title);
  }

  function handleSaveEdit() {
    if (editingIndex === null || !editTitle.trim()) return;
    setTasks((prev) =>
      prev.map((task, i) => (i === editingIndex ? { ...task, title: editTitle.trim() } : task))
    );
    setEditingIndex(null);
    setEditTitle('');
  }

  function handleConfirm() {
    onConfirm(tasks.filter((task) => task.title.trim()));
  }

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('ai.previewTitle')}
      panelClassName="max-w-xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {remaining != null ? t('ai.remainingCalls', { daily: remaining.daily, monthly: remaining.monthly }) : ''}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirm} disabled={saving || tasks.length === 0}>
              {saving ? t('common.saving') : t('ai.addTasks', { count: tasks.length })}
            </Button>
          </div>
        </div>
      }
    >
      <p className="mb-3 text-sm text-slate-400">{t('ai.previewBody')}</p>

      {tasks.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">{t('ai.noTasksLeft')}</p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((task, index) => (
            <li
              key={index}
              className="dn-card-flat flex items-center gap-2 rounded-xl px-3 py-2.5"
            >
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              {editingIndex === index ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingIndex(null);
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveEdit} disabled={!editTitle.trim()}>
                    {t('common.save')}
                  </Button>
                  <button onClick={() => setEditingIndex(null)} className="dn-icon-button rounded-lg p-1">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-100">{task.title}</p>
                    {task.description ? (
                      <p className="truncate text-xs text-slate-500">{task.description}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => handleStartEdit(index)}
                    className="dn-icon-button shrink-0 rounded-lg p-1.5"
                    aria-label="Edit task"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleRemove(index)}
                    className="dn-icon-button shrink-0 rounded-lg p-1.5 text-red-400 hover:text-red-300"
                    aria-label="Remove task"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
