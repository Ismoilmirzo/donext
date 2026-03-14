import { BarChart3, CheckSquare, FolderKanban, Zap } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useLocale } from '../../contexts/LocaleContext';

export default function BottomNav({ summary }) {
  const { t } = useLocale();
  const links = [
    { to: '/habits', label: t('nav.habits'), Icon: CheckSquare },
    { to: '/projects', label: t('nav.projects'), Icon: FolderKanban },
    { to: '/focus', label: t('nav.focus'), Icon: Zap },
    { to: '/stats', label: t('nav.stats'), Icon: BarChart3 },
  ];

  return (
    <nav className="dn-shell-nav fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `relative flex min-h-11 flex-col items-center justify-center rounded-2xl px-2 py-2 text-center text-xs font-medium transition-all ${
                isActive ? 'dn-nav-item-active scale-[1.02]' : 'dn-nav-item'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-1/2 top-1.5 h-1.5 w-10 -translate-x-1/2 rounded-full transition-opacity ${
                    isActive ? 'bg-emerald-400 opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden="true"
                />
                <link.Icon className="mx-auto mb-1 h-5 w-5" />
                <span className="block">{link.label}</span>
                {link.to === '/habits' && summary?.totalHabits ? (
                  <span className="mt-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                    {summary.completedHabits}/{summary.totalHabits}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
