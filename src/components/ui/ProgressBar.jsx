export default function ProgressBar({ value = 0, max = 100, colorClass = 'bg-emerald-500', className = '' }) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.min(safeMax, Math.max(0, value));
  const width = (safeValue / safeMax) * 100;

  return (
    <div className={`h-2 w-full rounded-full bg-slate-700 ${className}`}>
      <div className={`h-2 rounded-full transition-all ${colorClass}`} style={{ width: `${width}%` }}></div>
    </div>
  );
}
