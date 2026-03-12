import { BarChart3, CheckSquare, FolderKanban, Zap } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useLocale } from '../../contexts/LocaleContext';

export default function BottomNav() {
  const { t } = useLocale();
  const links = [
    { to: '/habits', label: t('nav.habits'), Icon: CheckSquare },
    { to: '/projects', label: t('nav.projects'), Icon: FolderKanban },
    { to: '/focus', label: t('nav.focus'), Icon: Zap },
    { to: '/stats', label: t('nav.stats'), Icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-700 bg-slate-900/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `rounded-lg px-2 py-2 text-center text-xs font-medium transition-colors ${
                isActive ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <link.Icon className="mx-auto mb-1 h-4 w-4" />
            <span className="block">{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
