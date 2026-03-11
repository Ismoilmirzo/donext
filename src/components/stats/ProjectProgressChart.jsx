import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import Card from '../ui/Card';
import { formatMinutesHuman } from '../../lib/dates';

export default function ProjectProgressChart({ projects = [] }) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100">Focus by Project</h3>
      <div className="mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={projects} dataKey="minutes" nameKey="title" cx="50%" cy="50%" outerRadius={85}>
              {projects.map((project) => (
                <Cell key={project.project_id || project.title} fill={project.color || '#64748b'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              formatter={(value) => [formatMinutesHuman(value), 'Focus']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1">
        {projects.map((project) => (
          <p key={project.project_id || project.title} className="text-xs text-slate-400">
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: project.color || '#64748b' }}></span>
            {project.title}: {formatMinutesHuman(project.minutes)}
          </p>
        ))}
      </div>
    </Card>
  );
}
