import { BarChart3, CheckSquare, FolderKanban, Zap } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

export default function LandingPage() {
  const { user } = useAuth();
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

  if (user) return <Navigate to="/habits" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between py-4">
          <span className="inline-flex items-center gap-2 text-xl font-bold text-emerald-400">
            <FolderKanban className="h-5 w-5" />
            {t('common.appName')}
          </span>
          <Link to="/auth" className="text-sm text-slate-300 hover:text-slate-100">
            {t('landing.logIn')}
          </Link>
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

        <footer className="mt-10 flex justify-center">
          <Link to="/privacy" className="text-sm text-slate-400 hover:text-slate-200">
            {t('common.privacyPolicy')}
          </Link>
        </footer>
      </div>
    </div>
  );
}
