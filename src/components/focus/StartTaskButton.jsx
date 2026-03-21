import { useLocale } from '../../contexts/LocaleContext';
import Button from '../ui/Button';

export default function StartTaskButton({ onClick, disabled = false }) {
  const { t } = useLocale();

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 text-lg"
      style={{ boxShadow: '0 12px 28px rgb(var(--dn-accent-rgb) / 0.24)' }}
    >
      {t('focus.startTask')}
    </Button>
  );
}
