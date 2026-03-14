import { Info, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from './Button';
import Card from './Card';

export default function OnboardingHint({
  title,
  message,
  ctaLabel = '',
  ctaTo = '',
  onDismiss,
  compact = false,
}) {
  return (
    <Card className={`dn-onboarding-hint ${compact ? 'px-4 py-3' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Info className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">{title}</p>
          <p className="mt-1 text-sm text-slate-300">{message}</p>
          {ctaLabel && ctaTo ? (
            <div className="mt-3">
              <Link to={ctaTo}>
                <Button size="sm">{ctaLabel}</Button>
              </Link>
            </div>
          ) : null}
        </div>
        {onDismiss ? (
          <button type="button" onClick={onDismiss} className="dn-icon-button rounded-full p-1.5" aria-label="Dismiss hint">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </Card>
  );
}
