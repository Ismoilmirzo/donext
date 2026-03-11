export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-slate-50 placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 ${className}`}
      {...props}
    />
  );
}
