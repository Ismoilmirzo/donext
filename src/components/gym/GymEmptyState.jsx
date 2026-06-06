import { Link } from 'react-router-dom';
import { Database, Dumbbell, RefreshCw } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function GymEmptyState({ error = '', schemaMissing = false, onRetry }) {
  const Icon = schemaMissing ? Database : Dumbbell;
  const title = schemaMissing ? 'Gym database not ready' : 'No active gym program';
  const message = schemaMissing ? 'Gym database migration is not applied yet.' : error;

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-300">DoNext Gym</p>
          <h1 className="text-xl font-semibold text-slate-50">{title}</h1>
        </div>
      </div>

      {message ? <p className="text-sm text-amber-200">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Link to="/gym/onboarding" className="dn-button dn-button-primary inline-flex px-4 py-2.5 text-sm">
          Create Program
        </Link>
        {schemaMissing && onRetry ? (
          <Button type="button" variant="secondary" onClick={onRetry} className="inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
