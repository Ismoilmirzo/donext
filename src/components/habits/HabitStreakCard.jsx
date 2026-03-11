import Card from '../ui/Card';

export default function HabitStreakCard({ current = 0, longest = 0 }) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">Streaks</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Current</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">🔥 {current}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Longest</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{longest} days</p>
        </div>
      </div>
    </Card>
  );
}
