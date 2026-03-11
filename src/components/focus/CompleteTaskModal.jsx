import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import TimeInput from '../ui/TimeInput';

export default function CompleteTaskModal({ open, onClose, timerSeconds = 0, onSave, saving = false }) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(25);

  const timerMinutes = Math.max(1, Math.round(timerSeconds / 60));

  useEffect(() => {
    if (!open) return;
    setHours(Math.floor(timerMinutes / 60));
    setMinutes(timerMinutes % 60);
  }, [open, timerMinutes]);

  const totalMinutes = Math.max(0, Number(hours) * 60 + Number(minutes));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nice work!"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => onSave?.(totalMinutes)} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-400">How much focused time did you spend?</p>
        <TimeInput hours={hours} minutes={minutes} onChange={({ hours: h, minutes: m }) => {
          setHours(h);
          setMinutes(m);
        }} />
        <p className="text-xs text-slate-500">
          Timer says: {Math.floor(timerMinutes / 60)}h {timerMinutes % 60}m
        </p>
      </div>
    </Modal>
  );
}
