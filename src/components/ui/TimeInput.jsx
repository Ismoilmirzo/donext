import Input from './Input';

export default function TimeInput({ hours = 0, minutes = 0, onChange }) {
  function handleHours(nextHours) {
    onChange?.({
      hours: Math.max(0, Number(nextHours) || 0),
      minutes: Math.max(0, Math.min(59, Number(minutes) || 0)),
    });
  }

  function handleMinutes(nextMinutes) {
    onChange?.({
      hours: Math.max(0, Number(hours) || 0),
      minutes: Math.max(0, Math.min(59, Number(nextMinutes) || 0)),
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="space-y-1">
        <span className="text-xs uppercase tracking-wide text-slate-500">Hours</span>
        <Input type="number" min="0" value={hours} onChange={(e) => handleHours(e.target.value)} />
      </label>
      <label className="space-y-1">
        <span className="text-xs uppercase tracking-wide text-slate-500">Minutes</span>
        <Input type="number" min="0" max="59" value={minutes} onChange={(e) => handleMinutes(e.target.value)} />
      </label>
    </div>
  );
}
