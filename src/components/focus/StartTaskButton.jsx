import { useLocale } from '../../contexts/LocaleContext';
import Button from '../ui/Button';

export default function StartTaskButton({ onClick, disabled = false }) {
  const { t } = useLocale();

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 text-lg shadow-lg shadow-emerald-500/20"
    >
      {t('focus.startTask')}
    </Button>
  );
}
