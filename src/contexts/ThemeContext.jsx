import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const THEME_STORAGE_KEY = 'donext-theme';
export const DEFAULT_THEME = 'midnight';

export const THEMES = {
  midnight: {
    value: 'midnight',
    preview: ['#0f172a', '#1e293b', '#10b981'],
    themeColor: '#0f172a',
  },
  grove: {
    value: 'grove',
    preview: ['#071a13', '#122820', '#34d399'],
    themeColor: '#071a13',
  },
  ember: {
    value: 'ember',
    preview: ['#20101a', '#321a2d', '#fb7185'],
    themeColor: '#20101a',
  },
};

const ThemeContext = createContext(null);

function getStoredTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return THEMES[value] ? value : DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => getStoredTheme());

  useEffect(() => {
    const nextTheme = THEMES[theme] ? theme : DEFAULT_THEME;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }

    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = 'dark';

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', THEMES[nextTheme].themeColor);
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      themes: THEMES,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
