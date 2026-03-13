import { useLocale } from '../../contexts/LocaleContext';
import Button from '../ui/Button';

export default function RerollButton({ remaining = 1, onClick, hidden = false }) {
  const { t } = useLocale();

  if (hidden) return null;

  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={onClick} disabled={remaining <= 0}>
        {remaining > 0 ? t('focus.reroll', { count: remaining }) : t('focus.rerollLocked')}
      </Button>
      <p className="text-center text-xs text-slate-500">
        {remaining > 0 ? t('focus.rerollHint') : t('focus.rerollLockedHint')}
      </p>
    </div>
  );
}
