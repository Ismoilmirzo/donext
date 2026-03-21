function classesForVariant(variant) {
  switch (variant) {
    case 'secondary':
      return 'dn-button-secondary';
    case 'danger':
      return 'dn-button-danger';
    case 'ghost':
      return 'dn-button-ghost';
    case 'primary':
    default:
      return 'dn-button-primary';
  }
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  ...props
}) {
  const sizeClass = size === 'sm' ? 'px-3 py-2 text-sm' : 'px-4 py-2.5 text-sm sm:px-6 sm:py-3';
  const isDisabled = disabled || loading;
  return (
    <button
      disabled={isDisabled}
      className={`dn-button ${sizeClass} ${classesForVariant(variant)} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
