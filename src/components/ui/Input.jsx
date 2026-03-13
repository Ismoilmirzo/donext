export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`dn-input w-full rounded-lg px-4 py-3 ${className}`}
      {...props}
    />
  );
}
