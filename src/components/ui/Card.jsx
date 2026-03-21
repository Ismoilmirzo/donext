export default function Card({ children, className = '', interactive = false }) {
  return (
    <div className={`dn-card rounded-2xl border border-slate-700 bg-slate-800 p-4 sm:p-6 ${interactive ? 'dn-card-interactive cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}
