import Input from './Input';

export default function TimeInput({ hours = 0, minutes = 0, maxTotalMinutes, onChange }) {
  function clamp(h, m) {
    h = Math.max(0, Number(h) || 0);
    m = Math.max(0, Math.min(59, Number(m) || 0));
    let wasClamped = false;
    if (maxTotalMinutes != null && h * 60 + m > maxTotalMinutes) {
      h = Math.floor(maxTotalMinutes / 60);
      m = maxTotalMinutes % 60;
      wasClamped = true;
    }
    return { hours: h, minutes: m, wasClamped };
  }

  function handleHours(nextHours) {
    onChange?.(clamp(nextHours, minutes));
  }

  function handleMinutes(nextMinutes) {
    onChange?.(clamp(hours, nextMinutes));
  }

  const maxHours = maxTotalMinutes != null ? Math.floor(maxTotalMinutes / 60) : undefined;

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="space-y-1">
        <span className="text-xs uppercase tracking-wide text-slate-500">Hours</span>
        <Input type="number" min="0" max={maxHours} value={hours} onChange={(e) => handleHours(e.target.value)} />
      </label>
      <label className="space-y-1">
        <span className="text-xs uppercase tracking-wide text-slate-500">Minutes</span>
        <Input type="number" min="0" max="59" value={minutes} onChange={(e) => handleMinutes(e.target.value)} />
      </label>
    </div>
  );
}
