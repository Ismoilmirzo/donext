import { Sparkles } from 'lucide-react';
import Button from '../ui/Button';

export default function AIBreakdownButton({ onClick, loading = false, disabled = false, t }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-1.5"
    >
      <Sparkles className={`h-3.5 w-3.5 ${loading ? 'animate-pulse' : ''}`} />
      {loading ? t('ai.generating') : t('ai.breakItDown')}
    </Button>
  );
}
