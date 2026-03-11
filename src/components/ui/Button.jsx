function classesForVariant(variant) {
  switch (variant) {
    case 'secondary':
      return 'bg-slate-700 hover:bg-slate-600 text-slate-200';
    case 'danger':
      return 'bg-red-500 hover:bg-red-600 text-white';
    case 'ghost':
      return 'bg-transparent hover:bg-slate-700 text-slate-200 border border-slate-600';
    case 'primary':
    default:
      return 'bg-emerald-500 hover:bg-emerald-600 text-white';
  }
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) {
  const sizeClass = size === 'sm' ? 'px-3 py-2 text-sm' : 'px-4 py-2.5 text-sm sm:px-6 sm:py-3';
  return (
    <button
      disabled={disabled}
      className={`rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${classesForVariant(
        variant
      )} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
