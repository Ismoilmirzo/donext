import { useLocale } from '../../contexts/LocaleContext';

export default function LocaleSwitcher({ className = '' }) {
  const { locale, locales, setLocale } = useLocale();

  return (
    <div className={`dn-locale-switcher inline-flex items-center rounded-full p-1 text-xs ${className}`}>
      {Object.entries(locales).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLocale(value)}
          className="dn-locale-option rounded-full px-3 py-1.5"
          data-active={locale === value}
          aria-pressed={locale === value}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
