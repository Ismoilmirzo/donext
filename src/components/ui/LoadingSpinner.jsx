import { useLocale } from '../../contexts/LocaleContext';

export default function LoadingSpinner({ fullScreen = false, label }) {
  const { t } = useLocale();
  const wrapperClass = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-slate-900'
    : 'flex items-center justify-center py-8';

  return (
    <div className={wrapperClass}>
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-600 border-b-emerald-400"></div>
        <span className="text-sm text-slate-400">{label || t('common.loading')}</span>
      </div>
    </div>
  );
}
