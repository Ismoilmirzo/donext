import { useLocale } from '../../contexts/LocaleContext';
import Button from '../ui/Button';

export default function RerollButton({ remaining = 1, onClick, hidden = false }) {
  const { t } = useLocale();

  if (hidden) return null;

  return (
    <Button variant="secondary" onClick={onClick} disabled={remaining <= 0}>
      {t('focus.reroll', { count: remaining })}
    </Button>
  );
}
