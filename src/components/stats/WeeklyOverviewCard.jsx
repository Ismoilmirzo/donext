import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';

export default function WeeklyOverviewCard({ overallRate = 0, bestHabit = null, worstHabit = null, streak = 0 }) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">Habit Overview</h3>
      <p className="mt-2 text-sm text-slate-400">Weekly completion: {Math.round(overallRate)}%</p>
      <div className="mt-2">
        <ProgressBar value={overallRate} max={100} />
      </div>
      <div className="mt-3 space-y-1 text-sm text-slate-400">
        <p>Best habit: {bestHabit ? `${bestHabit.title} (${Math.round(bestHabit.completionRate)}%)` : '—'}</p>
        <p>Needs work: {worstHabit ? `${worstHabit.title} (${Math.round(worstHabit.completionRate)}%)` : '—'}</p>
        <p>Streak: 🔥 {streak} days</p>
      </div>
    </Card>
  );
}
