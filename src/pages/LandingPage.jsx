import { BarChart3, CheckSquare, FolderKanban, Zap } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import LocaleSwitcher from '../components/ui/LocaleSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

export default function LandingPage() {
  const { user, profile } = useAuth();
  const { t } = useLocale();

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

  if (user) return <Navigate to={profile?.onboarding_done ? '/habits' : '/welcome'} replace />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3 py-4">
          <span className="inline-flex items-center gap-2 text-xl font-bold text-emerald-400">
            <FolderKanban className="h-5 w-5" />
            {t('common.appName')}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <LocaleSwitcher />
            <Link to="/auth" className="text-sm text-slate-300 hover:text-slate-100">
              {t('landing.logIn')}
            </Link>
          </div>
        </header>

        <main className="pt-16 text-center">
          <h1 className="text-4xl font-bold leading-tight sm:text-6xl">{t('landing.headline')}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">{t('landing.subheadline')}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="rounded-lg bg-emerald-500 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-600"
            >
              {t('landing.getStarted')}
            </Link>
            <Link
              to="/auth"
              className="rounded-lg border border-slate-600 px-6 py-3 text-slate-200 transition-colors hover:bg-slate-800"
            >
              {t('landing.alreadyHaveAccount')}
            </Link>
          </div>
        </main>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          {features.map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
              <item.Icon className="h-7 w-7 text-emerald-400" />
              <h3 className="mt-3 text-lg font-semibold text-slate-100">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
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

        <section className="mt-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
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

        <footer className="mt-10 flex justify-center">
          <Link to="/privacy/" className="text-sm text-slate-400 hover:text-slate-200">
            {t('common.privacyPolicy')}
          </Link>
        </footer>
      </div>
    </div>
  );
}
