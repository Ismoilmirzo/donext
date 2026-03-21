import Button from './Button';
import Card from './Card';

export default function EmptyState({ icon, title, message, ctaLabel, onCta }) {
  return (
    <Card className="dn-fade-in text-center">
      {icon && <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-700">{icon}</div>}
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      {message && <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">{message}</p>}
      {ctaLabel && onCta && (
        <div className="mt-5">
          <Button onClick={onCta}>{ctaLabel}</Button>
        </div>
      )}
    </Card>
  );
}
