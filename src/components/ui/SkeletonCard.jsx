export function SkeletonBlock({ className = '' }) {
  return <div className={`dn-skeleton ${className}`.trim()} aria-hidden="true" />;
}

export default function SkeletonCard({ className = '', children }) {
  return (
    <div className={`dn-card rounded-2xl border border-slate-700 bg-slate-800/60 p-4 ${className}`.trim()}>
      {children}
    </div>
  );
}
