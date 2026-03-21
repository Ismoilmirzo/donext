import { useEffect } from 'react';
import { useLocale } from '../../contexts/LocaleContext';

export default function BadgeUnlockPopup({ badge, onClose }) {
  const { t } = useLocale();
  useEffect(() => {
    if (!badge) return undefined;
    const timer = window.setTimeout(() => onClose?.(), 4000);
    return () => window.clearTimeout(timer);
  }, [badge, onClose]);

  if (!badge) return null;

  return (
    <button
      type="button"
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-slate-900 px-6 py-7 text-center shadow-2xl shadow-emerald-950/30">
        <div className="text-5xl">{badge.icon}</div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">{t('badges.unlocked')}</p>
        <h3 className="mt-3 text-2xl font-semibold text-slate-50">{badge.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{badge.description}</p>
        <div className="mt-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {t('badges.dismiss')}
        </div>
      </div>
    </button>
  );
}
