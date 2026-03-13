import { BarChart3, CheckSquare, FolderKanban, Settings, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import BadgeUnlockPopup from '../badges/BadgeUnlockPopup';
import { useAuth } from '../../contexts/AuthContext';
import { useBadges } from '../../contexts/BadgeContext';
import { useDailySummary } from '../../hooks/useDailySummary';
import { useLocale } from '../../contexts/LocaleContext';
import { useProjects } from '../../hooks/useProjects';
import BottomNav from './BottomNav';
import DailySummaryBanner from './DailySummaryBanner';
import HabitQuickWidget from './HabitQuickWidget';

export default function AppShell() {
  const { profile } = useAuth();
  const { queue, markSeen } = useBadges();
  const { t } = useLocale();
  const { checkForStaleProjects } = useProjects();
  const { summary } = useDailySummary();
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
    <div className="dn-page-shell min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="dn-shell-panel sticky top-0 hidden h-screen w-64 flex-col border-r px-4 py-6 md:flex">
          <Link to="/habits" className="dn-brand mb-6 text-xl font-semibold">
            DoNext
          </Link>
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive ? 'dn-nav-item-active' : 'dn-nav-item'
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
          <header className="dn-shell-nav sticky top-0 z-30 border-b px-4 py-3 backdrop-blur md:px-6">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
              <Link to="/habits" className="dn-brand text-lg font-semibold md:hidden">
                {t('common.appName')}
              </Link>
              <p className="hidden text-sm text-slate-400 md:block">
                {profile?.display_name ? t('app.hiName', { name: profile.display_name }) : t('app.welcomeBack')}
              </p>
              <NavLink to="/settings" className="dn-link-muted text-sm md:hidden">
                {t('nav.settings')}
              </NavLink>
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 md:pb-8">
            {location.pathname !== '/welcome' && <DailySummaryBanner summary={summary} />}
            {!profile?.onboarding_done && location.pathname !== '/welcome' && (
              <div className="dn-onboarding-banner mb-4 rounded-xl border px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>{t('app.setupBanner')}</p>
                  <Link to="/welcome" className="font-medium">
                    {t('app.openSetupGuide')}
                  </Link>
                </div>
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>

      <HabitQuickWidget summary={summary} hidden={location.pathname === '/habits' || location.pathname === '/welcome'} />
      <BottomNav />
      <BadgeUnlockPopup badge={queue[0]} onClose={() => (queue[0]?.id ? void markSeen(queue[0].id) : undefined)} />
    </div>
  );
}
