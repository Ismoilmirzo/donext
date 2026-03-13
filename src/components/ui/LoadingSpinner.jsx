import { useLocale } from '../../contexts/LocaleContext';

export default function LoadingSpinner({ fullScreen = false, label }) {
  const { t } = useLocale();
  const wrapperClass = fullScreen
    ? 'dn-page-shell flex min-h-screen items-center justify-center'
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
