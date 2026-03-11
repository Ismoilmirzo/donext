import Card from '../ui/Card';
import { formatMinutesHuman } from '../../lib/dates';

export default function AllTimeStatsCard({ stats }) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">Projects Overview</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
        <p>Active: {stats.activeCount}</p>
        <p>Completed this month: {stats.completedThisMonth}</p>
        <p>Tasks completed: {stats.tasksCompleted}</p>
        <p>Avg time/task: {formatMinutesHuman(Math.round(stats.avgTimePerTask || 0))}</p>
      </div>
    </Card>
  );
}
