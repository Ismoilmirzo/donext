import { useEffect, useState } from 'react';
import { BarChart3, CheckSquare, FolderKanban, Quote, Star, Zap } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import LocaleSwitcher from '../components/ui/LocaleSwitcher';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

export default function LandingPage() {
  const { user, profile } = useAuth();
  const { t } = useLocale();
  const [showStickyCta, setShowStickyCta] = useState(false);

  const features = [
    {
      title: t('landing.habitsTitle'),
      description: t('landing.habitsDescription'),
      Icon: CheckSquare,
    },
    {
      title: t('landing.randomTitle'),
      description: t('landing.randomDescription'),
      Icon: Zap,
    },
    {
      title: t('landing.analyticsTitle'),
      description: t('landing.analyticsDescription'),
      Icon: BarChart3,
    },
  ];

  const flow = [
    { title: t('landing.flowStep1Title'), description: t('landing.flowStep1Body') },
    { title: t('landing.flowStep2Title'), description: t('landing.flowStep2Body') },
    { title: t('landing.flowStep3Title'), description: t('landing.flowStep3Body') },
  ];

  useEffect(() => {
    function onScroll() {
      setShowStickyCta(window.scrollY > 440);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('[data-reveal="true"]'));
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-visible', 'true');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  if (user) return <Navigate to={profile?.onboarding_done ? '/habits' : '/welcome'} replace />;

  return (
    <div className="dn-public-shell bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3 py-4">
          <span className="dn-brand inline-flex items-center gap-2 text-xl font-bold">
            <FolderKanban className="h-5 w-5" />
            {t('common.appName')}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle />
            <LocaleSwitcher />
            <Link to="/auth" className="dn-link-muted text-sm">
              {t('landing.logIn')}
            </Link>
          </div>
        </header>

        <main className="grid gap-10 pt-12 text-center lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:text-left">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <Star className="h-3.5 w-3.5" />
              <span>Built for Telegram-first DoNext users</span>
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">{t('landing.headline')}</h1>
            <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">{t('landing.subheadline')}</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <Link to="/auth" className="dn-button dn-button-primary rounded-lg px-6 py-3 font-medium text-white">
                {t('landing.getStarted')}
              </Link>
              <Link to="/auth" className="dn-button dn-button-secondary rounded-lg px-6 py-3">
                {t('landing.alreadyHaveAccount')}
              </Link>
            </div>
            <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                <p className="text-2xl font-semibold text-slate-50">250+</p>
                <p className="mt-1 text-sm text-slate-400">Telegram users are already in the loop.</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                <p className="text-2xl font-semibold text-slate-50">1 tap</p>
                <p className="mt-1 text-sm text-slate-400">to let Focus choose the next task.</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                <p className="text-2xl font-semibold text-slate-50">4 views</p>
                <p className="mt-1 text-sm text-slate-400">Habits, Projects, Focus, and Stats with one mental model.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-8 top-6 h-40 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden="true" />
            <div className="grid gap-4">
              <div className="rounded-[2rem] border border-slate-700 bg-slate-900/80 p-5 text-left shadow-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Habits</p>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">4/5 done</span>
                </div>
                <div className="mt-4 space-y-3">
                  {['Read 30m', 'Exercise', 'Deep Work Prep'].map((item, index) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${index < 2 ? 'bg-emerald-500 text-slate-950' : 'border border-slate-600 text-slate-400'}`}>
                        {index < 2 ? '✓' : ''}
                      </span>
                      <span className="text-sm text-slate-100">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-700 bg-slate-900/75 p-5 text-left">
                  <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Focus</p>
                  <p className="mt-3 text-lg font-semibold text-slate-50">Launch portfolio site</p>
                  <p className="mt-1 text-sm text-slate-400">Task #2 of 4 · Add screenshots to the gallery</p>
                  <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    Let&apos;s Go → 0:24:18
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-slate-700 bg-slate-900/75 p-5 text-left">
                  <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Stats</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-50">6h 20m</p>
                  <p className="mt-1 text-sm text-slate-400">focused this week</p>
                  <div className="mt-4 grid gap-2">
                    <div className="h-3 rounded-full bg-slate-800">
                      <div className="h-3 w-4/5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <span className="h-14 rounded-xl bg-emerald-500/80" />
                      <span className="h-10 rounded-xl bg-emerald-500/60" />
                      <span className="h-16 rounded-xl bg-emerald-500/90" />
                      <span className="h-8 rounded-xl bg-slate-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <section className="mt-20 grid gap-4 sm:grid-cols-3" data-reveal="true">
          {features.map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
              <item.Icon className="h-7 w-7 text-emerald-400" />
              <h3 className="mt-3 text-lg font-semibold text-slate-100">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-900/70 p-6" data-reveal="true">
          <div className="flex items-start gap-3">
            <Quote className="mt-1 h-5 w-5 text-emerald-300" />
            <div>
              <p className="text-lg text-slate-100">“DoNext cuts the dead time between knowing what matters and actually starting.”</p>
              <p className="mt-2 text-sm text-slate-400">Shared by early Telegram users testing the random-picker workflow.</p>
            </div>
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/60 p-6" data-reveal="true">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">{t('landing.howItWorksEyebrow')}</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">{t('landing.howItWorksTitle')}</h2>
            <p className="mt-2 text-sm text-slate-400">{t('landing.howItWorksBody')}</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {flow.map((step, index) => (
              <div key={step.title} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{t('landing.stepLabel', { step: index + 1 })}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-100">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6" data-reveal="true">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">{t('landing.exampleEyebrow')}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-50">{t('landing.exampleTitle')}</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">{t('landing.exampleBody')}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-left md:w-80">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('landing.exampleProjectLabel')}</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{t('landing.exampleProjectTitle')}</p>
              <div className="mt-4 space-y-2">
                <p className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">{t('landing.exampleTaskOne')}</p>
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{t('landing.exampleTaskTwo')}</p>
                <p className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">{t('landing.exampleTaskThree')}</p>
              </div>
              <p className="mt-4 text-xs text-slate-400">{t('landing.exampleCaption')}</p>
            </div>
          </div>
        </section>

        <footer className="mt-10 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:grid-cols-[1fr_auto] md:items-center" data-reveal="true">
          <div>
            <p className="text-sm font-semibold text-slate-100">Take DoNext with you</p>
            <p className="mt-1 text-sm text-slate-400">Install it as a PWA, get updates on Telegram, and keep the loop small.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="https://t.me/ismoilmirzouz" target="_blank" rel="noreferrer" className="dn-link-muted text-sm">
              Telegram
            </a>
            <Link to="/privacy/" className="dn-link-muted text-sm">
              {t('common.privacyPolicy')}
            </Link>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">PWA-ready</span>
          </div>
        </footer>
      </div>
      {showStickyCta && (
        <div className="fixed inset-x-4 bottom-4 z-50 md:hidden">
          <Link to="/auth" className="dn-button dn-button-primary flex w-full items-center justify-center rounded-2xl px-6 py-3 text-sm font-medium text-white shadow-2xl">
            {t('landing.getStarted')}
          </Link>
        </div>
      )}
    </div>
  );
}
