import Button from './Button';
import Card from './Card';

export default function EmptyState({ icon, title, message, ctaLabel, onCta }) {
  return (
    <Card className="text-center">
      {icon && <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-700">{icon}</div>}
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      {message && <p className="mt-2 text-sm text-slate-400">{message}</p>}
      {ctaLabel && onCta && (
        <div className="mt-4">
          <Button onClick={onCta}>{ctaLabel}</Button>
        </div>
      )}
    </Card>
  );
}
