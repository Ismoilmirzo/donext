import { BarChart3, CheckSquare, FolderKanban, Settings, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useProjects } from '../../hooks/useProjects';
import BottomNav from './BottomNav';

export default function AppShell() {
  const { profile } = useAuth();
  const { t } = useLocale();
  const { checkForStaleProjects } = useProjects();
  const location = useLocation();
  const navLinks = [
    { to: '/habits', label: t('nav.habits'), Icon: CheckSquare },
    { to: '/projects', label: t('nav.projects'), Icon: FolderKanban },
    { to: '/focus', label: t('nav.focus'), Icon: Zap },
    { to: '/stats', label: t('nav.stats'), Icon: BarChart3 },
    { to: '/settings', label: t('nav.settings'), Icon: Settings },
  ];

  useEffect(() => {
    void checkForStaleProjects();
  }, [checkForStaleProjects]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-slate-800 bg-slate-900 px-4 py-6 md:flex">
          <Link to="/habits" className="mb-6 text-xl font-semibold text-emerald-400">
            DoNext
          </Link>
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  }`
                }
              >
                <link.Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
          <p className="mt-auto text-xs text-slate-500">
            {profile?.display_name ? t('app.signedInAs', { name: profile.display_name }) : t('app.oneTaskAtATime')}
          </p>
        </aside>

        <div className="min-h-screen w-full">
          <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur md:px-6">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
              <Link to="/habits" className="text-lg font-semibold text-emerald-400 md:hidden">
                {t('common.appName')}
              </Link>
              <p className="hidden text-sm text-slate-400 md:block">
                {profile?.display_name ? t('app.hiName', { name: profile.display_name }) : t('app.welcomeBack')}
              </p>
              <NavLink to="/settings" className="text-sm text-slate-400 hover:text-slate-100 md:hidden">
                {t('nav.settings')}
              </NavLink>
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 md:pb-8">
            {!profile?.onboarding_done && location.pathname !== '/welcome' && (
              <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>{t('app.setupBanner')}</p>
                  <Link to="/welcome" className="font-medium text-emerald-300 hover:text-emerald-200">
                    {t('app.openSetupGuide')}
                  </Link>
                </div>
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
