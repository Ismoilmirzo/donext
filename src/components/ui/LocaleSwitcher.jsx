import { useLocale } from '../../contexts/LocaleContext';

export default function LocaleSwitcher({ className = '' }) {
  const { locale, locales, setLocale } = useLocale();

  return (
    <div className={`inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 p-1 text-xs ${className}`}>
      {Object.entries(locales).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLocale(value)}
          className={`rounded-full px-3 py-1.5 transition-colors ${
            locale === value ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
          }`}
          aria-pressed={locale === value}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
