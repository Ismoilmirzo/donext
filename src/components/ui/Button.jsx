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
  ...props
}) {
  const sizeClass = size === 'sm' ? 'px-3 py-2 text-sm' : 'px-4 py-2.5 text-sm sm:px-6 sm:py-3';
  return (
    <button
      disabled={disabled}
      className={`dn-button ${sizeClass} ${classesForVariant(
        variant
      )} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
