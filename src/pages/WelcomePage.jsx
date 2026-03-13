import { BarChart3, CheckCircle2, CheckSquare, FolderKanban, Sparkles, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import LocaleSwitcher from '../components/ui/LocaleSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { supabase } from '../lib/supabase';

function StepStatus({ done, title, description, detail }) {
  return (
    <div className={`rounded-xl border p-4 ${done ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-700 bg-slate-800/60'}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ${done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">{title}</p>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
          <p className={`mt-2 text-xs ${done ? 'text-emerald-300' : 'text-slate-500'}`}>{detail}</p>
        </div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const { t } = useLocale();
  const [counts, setCounts] = useState({ habits: 0, projects: 0, tasks: 0, focusSessions: 0 });
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadCounts() {
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      const [habitsRes, projectsRes, tasksRes, focusRes] = await Promise.all([
        supabase.from('habits').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('focus_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      if (!active) return;

      const firstError = habitsRes.error || projectsRes.error || tasksRes.error || focusRes.error;
      if (firstError) {
        setError(firstError.message);
      } else {
        setCounts({
          habits: habitsRes.count || 0,
          projects: projectsRes.count || 0,
          tasks: tasksRes.count || 0,
          focusSessions: focusRes.count || 0,
        });
      }

      setLoading(false);
    }

    void loadCounts();
    return () => {
      active = false;
    };
  }, [user]);

  const setupSteps = useMemo(
    () => [
      {
        key: 'habits',
        done: counts.habits > 0,
        title: t('welcome.setupHabitsTitle'),
        description: t('welcome.setupHabitsBody'),
        detail: t('welcome.setupHabitsCount', { count: counts.habits }),
        href: '/habits',
      },
      {
        key: 'projects',
        done: counts.projects > 0,
        title: t('welcome.setupProjectsTitle'),
        description: t('welcome.setupProjectsBody'),
        detail: t('welcome.setupProjectsCount', { count: counts.projects }),
        href: '/projects',
      },
      {
        key: 'tasks',
        done: counts.tasks > 0,
        title: t('welcome.setupTasksTitle'),
        description: t('welcome.setupTasksBody'),
        detail: t('welcome.setupTasksCount', { count: counts.tasks }),
        href: '/projects',
      },
      {
        key: 'focus',
        done: counts.focusSessions > 0,
        title: t('welcome.setupFocusTitle'),
        description: t('welcome.setupFocusBody'),
        detail: t('welcome.setupFocusCount', { count: counts.focusSessions }),
        href: '/focus',
      },
    ],
    [counts.focusSessions, counts.habits, counts.projects, counts.tasks, t]
  );

  const nextStep = setupSteps.find((step) => !step.done);
  const flowCards = [
    { Icon: CheckSquare, title: t('welcome.flowHabitsTitle'), body: t('welcome.flowHabitsBody') },
    { Icon: FolderKanban, title: t('welcome.flowProjectsTitle'), body: t('welcome.flowProjectsBody') },
    { Icon: Zap, title: t('welcome.flowFocusTitle'), body: t('welcome.flowFocusBody') },
    { Icon: BarChart3, title: t('welcome.flowStatsTitle'), body: t('welcome.flowStatsBody') },
  ];

  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.onboarding_done) return <Navigate to="/habits" replace />;
  if (loading) return <LoadingSpinner label={t('welcome.loading')} />;

  async function finishOnboarding(targetPath = '/habits') {
    setFinishing(true);
    setError('');
    const { error: updateError } = await updateProfile({ onboarding_done: true });
    setFinishing(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigate(targetPath);
  }

  return (
    <div className="space-y-4">
      <Card className="border-emerald-500/20 bg-slate-800/80">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-300">
              <Sparkles className="h-4 w-4" />
              {t('welcome.badge')}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-50 sm:text-4xl">{t('welcome.title')}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{t('welcome.subtitle')}</p>
            </div>
          </div>
          <LocaleSwitcher />
        </div>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {flowCards.map((card) => (
          <Card key={card.title}>
            <card.Icon className="h-6 w-6 text-emerald-400" />
            <h2 className="mt-3 text-lg font-semibold text-slate-100">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{card.body}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{t('welcome.checklistTitle')}</h2>
          <p className="mt-1 text-sm text-slate-400">{t('welcome.checklistBody')}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {setupSteps.map((step) => (
            <StepStatus
              key={step.key}
              done={step.done}
              title={step.title}
              description={step.description}
              detail={step.detail}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {nextStep ? (
            <Button onClick={() => navigate(nextStep.href)}>{t('welcome.nextStepCta', { step: nextStep.title })}</Button>
          ) : (
            <Button onClick={() => finishOnboarding('/habits')} disabled={finishing}>
              {finishing ? t('common.saving') : t('welcome.finishCta')}
            </Button>
          )}
          <Button variant="secondary" onClick={() => finishOnboarding(nextStep?.href || '/habits')} disabled={finishing}>
            {finishing ? t('common.saving') : t('welcome.skipCta')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
