export default function BadgeProgressBar({ percentage = 0 }) {
  return (
    <div className="mt-2 h-1.5 rounded-full bg-slate-700">
      <div
        className="h-1.5 rounded-full bg-emerald-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  );
}
