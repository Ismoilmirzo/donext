import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, CheckSquare, Flame, FolderKanban, Play, Settings, Timer, Zap } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import BadgeUnlockPopup from '../badges/BadgeUnlockPopup';
import Button from '../ui/Button';
import OnboardingHint from '../ui/OnboardingHint';
import { useAuth } from '../../contexts/AuthContext';
import { useBadges } from '../../contexts/BadgeContext';
import { useDailySummary } from '../../hooks/useDailySummary';
import { useHabits } from '../../hooks/useHabits';
import { useSetupProgress } from '../../hooks/useSetupProgress';
import { useLocale } from '../../contexts/LocaleContext';
import { useProjects } from '../../hooks/useProjects';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import BottomNav from './BottomNav';
import DailySummaryBanner from './DailySummaryBanner';
import HabitQuickWidget from './HabitQuickWidget';

const HINT_STORAGE_PREFIX = 'donext:first-visit:';

export default function AppShell() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { queue, markSeen } = useBadges();
  const { t } = useLocale();
  const toast = useToast();
  const { checkForStaleProjects } = useProjects();
  const { summary } = useDailySummary();
  const { streak } = useHabits();
  const { nextStep } = useSetupProgress();
  const location = useLocation();
  const [activeTask, setActiveTask] = useState(null);
  const [dismissedHints, setDismissedHints] = useState({});
  const lastBadgeToastIdRef = useRef(null);
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const routeKey = `${HINT_STORAGE_PREFIX}${location.pathname}`;
    if (window.localStorage.getItem(routeKey) === '1') {
      setDismissedHints((prev) => ({ ...prev, [location.pathname]: true }));
    }
  }, [location.pathname]);

  useEffect(() => {
    let active = true;

    async function loadActiveTask() {
      if (!user) {
        if (active) setActiveTask(null);
        return;
      }

      const { data } = await supabase
        .from('task_sessions')
        .select('id, task:tasks(title)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (active) {
        setActiveTask(
          data?.id
            ? {
                id: data.id,
                title: data.task?.title || 'Focus in progress',
              }
            : null
        );
      }
    }

    void loadActiveTask();
    return () => {
      active = false;
    };
  }, [location.pathname, user]);

  useEffect(() => {
    const nextBadge = queue[0];
    if (!nextBadge) {
      lastBadgeToastIdRef.current = null;
      return;
    }
    if (lastBadgeToastIdRef.current === nextBadge.id) return;
    lastBadgeToastIdRef.current = nextBadge.id;
    toast.success('Badge unlocked', `${nextBadge.icon} ${nextBadge.title}`);
  }, [queue, toast]);

  useEffect(() => {
    function onKeyDown(event) {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase?.();
      const isTypingTarget =
        target?.isContentEditable ||
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select';

      if (isTypingTarget || event.metaKey || event.ctrlKey || event.altKey) return;

      const nextPath = {
        h: '/habits',
        p: '/projects',
        f: '/focus',
        s: '/stats',
      }[event.key.toLowerCase()];

      if (!nextPath || nextPath === location.pathname) return;
      event.preventDefault();
      navigate(nextPath);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [location.pathname, navigate]);

  const initials = (profile?.display_name || user?.email || 'D')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const pageHint = useMemo(() => {
    const hintMap = {
      '/habits': {
        title: 'Track the smallest daily wins here',
        message: 'Add one habit, tick it off today, and the charts will start to build naturally.',
      },
      '/projects': {
        title: 'Keep projects concrete and current',
        message: 'A small list of active projects works better than dumping everything here.',
      },
      '/focus': {
        title: 'Use Focus when you are ready to start',
        message: 'Let the app pick the next task so you spend less time deciding what to do.',
      },
      '/stats': {
        title: 'Stats are for reflection, not pressure',
        message: 'Once you log a little real usage, this page becomes a quick weekly review instead of a dashboard wall.',
      },
      '/settings': {
        title: 'Settings should stay quiet',
        message: 'Most people only need language, theme, export, and account controls here.',
      },
    };
    return hintMap[location.pathname] || null;
  }, [location.pathname]);

  const showPageHint = pageHint && !dismissedHints[location.pathname];

  function dismissPageHint() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`${HINT_STORAGE_PREFIX}${location.pathname}`, '1');
    }
    setDismissedHints((prev) => ({ ...prev, [location.pathname]: true }));
  }

  return (
    <div className="dn-page-shell min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="dn-shell-panel sticky top-0 hidden h-screen w-64 flex-col border-r px-4 py-6 md:flex">
          <Link to="/habits" className="dn-brand mb-6 text-xl font-semibold">
            DoNext
          </Link>
          <div className="mb-5 h-px w-full bg-slate-700/70" />
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
          <Button
            variant="secondary"
            size="sm"
            className="mt-5 inline-flex items-center justify-center gap-2"
            onClick={() => navigate('/focus')}
          >
            <Play className="h-4 w-4" />
            Quick Focus
          </Button>
          <div className="mt-auto rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-300">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {profile?.display_name || user?.email || t('common.appName')}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {profile?.display_name ? t('app.signedInAs', { name: profile.display_name }) : t('app.oneTaskAtATime')}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              <Flame className="h-4 w-4" />
              <span>{streak.current || 0} day streak</span>
            </div>
          </div>
        </aside>

        <div className="min-h-screen w-full">
          <header className="dn-shell-nav sticky top-0 z-30 border-b px-4 py-3 backdrop-blur md:px-6">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
              <Link to="/habits" className="dn-brand text-lg font-semibold md:hidden">
                {t('common.appName')}
              </Link>
              <div className="hidden items-center gap-3 md:flex">
                <p className="text-sm text-slate-400">
                  {profile?.display_name ? t('app.hiName', { name: profile.display_name }) : t('app.welcomeBack')}
                </p>
                {activeTask && (
                  <Link
                    to="/focus"
                    className="inline-flex max-w-[18rem] items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200"
                  >
                    <Timer className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{activeTask.title || 'Focus in progress'}</span>
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2 md:hidden">
                {activeTask ? (
                  <Link
                    to="/focus"
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200"
                  >
                    <Timer className="h-3.5 w-3.5" />
                    <span>Focus</span>
                  </Link>
                ) : null}
                <NavLink to="/settings" className="dn-link-muted text-sm">
                  {t('nav.settings')}
                </NavLink>
              </div>
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
            {location.pathname !== '/welcome' && showPageHint ? (
              <OnboardingHint title={pageHint.title} message={pageHint.message} onDismiss={dismissPageHint} compact />
            ) : null}
            {location.pathname !== '/welcome' && nextStep && nextStep.route !== location.pathname ? (
              <OnboardingHint
                title={nextStep.title}
                message={nextStep.body}
                ctaLabel={nextStep.ctaLabel}
                ctaTo={nextStep.route}
                compact
              />
            ) : null}
            <div key={location.pathname} className="dn-route-fade">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <HabitQuickWidget summary={summary} hidden={location.pathname === '/habits' || location.pathname === '/welcome'} />
      <BottomNav summary={summary} />
      <BadgeUnlockPopup badge={queue[0]} onClose={() => (queue[0]?.id ? void markSeen(queue[0].id) : undefined)} />
    </div>
  );
}
