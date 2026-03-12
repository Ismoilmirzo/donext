import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, getStoredLocale, LOCALES, setStoredLocale, translate } from '../lib/i18n';

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(() => getStoredLocale());

  useEffect(() => {
    const nextLocale = LOCALES[locale] ? locale : DEFAULT_LOCALE;
    setStoredLocale(nextLocale);
    document.documentElement.lang = nextLocale;
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      locales: LOCALES,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside LocaleProvider');
  return context;
}
