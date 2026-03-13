import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const THEME_STORAGE_KEY = 'donext-theme';
export const DEFAULT_THEME = 'night';

export const THEMES = {
  day: {
    value: 'day',
    preview: ['#eff3f7', '#ffffff', '#3390ec'],
    themeColor: '#eff3f7',
  },
  night: {
    value: 'night',
    preview: ['#0e1621', '#17212b', '#64a8ea'],
    themeColor: '#0e1621',
  },
  midnight: {
    value: 'midnight',
    preview: ['#000000', '#121212', '#818cf8'],
    themeColor: '#000000',
  },
  mocha: {
    value: 'mocha',
    preview: ['#1e1714', '#28201c', '#f5a623'],
    themeColor: '#1e1714',
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
    document.documentElement.style.colorScheme = nextTheme === 'day' ? 'light dark' : 'dark';

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
