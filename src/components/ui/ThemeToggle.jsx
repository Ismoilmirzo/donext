import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== 'day';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'day' : 'night')}
      className={`dn-icon-button rounded-full p-2 ${className}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
