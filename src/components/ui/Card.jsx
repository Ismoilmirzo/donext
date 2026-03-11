export default function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-slate-700 bg-slate-800 p-4 sm:p-6 ${className}`}>{children}</div>;
}
