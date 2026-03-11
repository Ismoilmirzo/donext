const styles = {
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  completed: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  archived: 'bg-slate-700 text-slate-300 border-slate-600',
  review: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
};

export default function ProjectStatusBadge({ status = 'active', needsReview = false }) {
  if (needsReview) {
    return <span className={`rounded-full border px-2 py-0.5 text-xs ${styles.review}`}>Needs Review</span>;
  }

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${styles[status] || styles.active}`}>
      {status[0].toUpperCase() + status.slice(1)}
    </span>
  );
}
