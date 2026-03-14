import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ListChecks, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ActiveTaskScreen from '../components/focus/ActiveTaskScreen';
import CompleteTaskModal from '../components/focus/CompleteTaskModal';
import RandomProjectCard from '../components/focus/RandomProjectCard';
import RerollButton from '../components/focus/RerollButton';
import StartTaskButton from '../components/focus/StartTaskButton';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { FocusPageSkeleton } from '../components/ui/PageSkeletons';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useToast } from '../contexts/ToastContext';
import { useFocusSessions } from '../hooks/useFocusSessions';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useWeeklyGoal } from '../hooks/useWeeklyGoal';
import { APP_EVENTS, emitAppEvent } from '../lib/appEvents';
import { formatMinutesHuman } from '../lib/dates';
import { getLocaleTag } from '../lib/i18n';
import { getEffectiveProjectPriority, getProjectDeadlineMeta, normalizeProjectPreferredTime } from '../lib/projectPriority';
import { selectRandomProject } from '../lib/random';
import { supabase } from '../lib/supabase';

const FOCUS_INTRO_STORAGE_KEY = 'donext:focus-intro-hidden';

function normalizeProject(project) {
  if (!project) return project;
  return {
    ...project,
    priority_tag: project.priority_tag || 'normal',
    preferred_time: normalizeProjectPreferredTime(project.preferred_time),
    effectivePriority: getEffectiveProjectPriority(project),
    ...getProjectDeadlineMeta(project),
  };
}

export default function FocusPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const toast = useToast();
  const { activeProjects, fetchProjects, loading: projectsLoading } = useProjects();
  const { sessions, getTodaySessions } = useFocusSessions();
  const weeklyGoal = useWeeklyGoal();
  const [eligible, setEligible] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activePair, setActivePair] = useState(null);
  const [rerollsLeft, setRerollsLeft] = useState(1);
  const [manualOpen, setManualOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [postCompleteState, setPostCompleteState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentDone, setRecentDone] = useState([]);
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const completionInFlightRef = useRef(false);

  const taskOps = useTasks(activePair?.project?.id || null);

  const fetchEligible = useCallback(async () => {
    if (!user || !activeProjects.length) {
      setEligible([]);
      setLoading(false);
      return;
    }

    const projectIds = activeProjects.map((project) => project.id);
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .in('project_id', projectIds)
      .in('status', ['pending', 'in_progress'])
      .order('sort_order', { ascending: true });

    const firstTaskByProject = new Map();
    (taskRows || []).forEach((task) => {
      if (!firstTaskByProject.has(task.project_id)) firstTaskByProject.set(task.project_id, task);
    });

    const nextEligible = activeProjects
      .map((project) => ({ project, task: firstTaskByProject.get(project.id) || null }))
      .filter((pair) => pair.task);
    setEligible(nextEligible);
    setLoading(false);
  }, [activeProjects, user]);

  const fetchInProgress = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.id) {
      setActivePair({ project: normalizeProject(data.project), task: data });
    }
  }, [user]);

  const fetchRecentDone = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tasks')
      .select('id,title,completed_at,project:projects(title)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(5);
    setRecentDone(data || []);
  }, [user]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    void fetchEligible();
    void fetchInProgress();
    void fetchRecentDone();
  }, [fetchEligible, fetchInProgress, fetchRecentDone]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(FOCUS_INTRO_STORAGE_KEY) === '1') {
      setShowHowItWorks(false);
    }
  }, []);

  useEffect(() => {
    if (!sessions.length) return;
    setShowHowItWorks(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FOCUS_INTRO_STORAGE_KEY, '1');
    }
  }, [sessions.length]);

  const todaysSessions = getTodaySessions();
  const todayMinutes = useMemo(
    () => todaysSessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0),
    [todaysSessions]
  );

  function pickRandom(options = {}) {
    if (!eligible.length) return;
    const projectChoice = selectRandomProject(
      eligible.map((pair) => pair.project),
      sessions,
      options
    );
    const pair = eligible.find((entry) => entry.project.id === projectChoice?.id) || null;
    setSelected(pair);
  }

  function beginSelectionCycle() {
    setPostCompleteState(null);
    setRerollsLeft(1);
    pickRandom();
  }

  function handleReroll() {
    if (rerollsLeft <= 0 || !selected?.project?.id) return;
    setRerollsLeft(0);
    pickRandom({ excludeProjectIds: [selected.project.id] });
  }

  async function startSelected(pair = selected) {
    if (!pair) return;
    const { error: startError } = await taskOps.startTask(pair.task.id);
    if (startError) {
      toast.error('Could not start task', startError.message);
      return;
    }
    setActivePair({
      project: normalizeProject(pair.project),
      task: { ...pair.task, status: 'in_progress', started_at: new Date().toISOString() },
      randomWithoutReroll: rerollsLeft > 0,
    });
    setSelected(null);
    setManualOpen(false);
    setRerollsLeft(1);
    await fetchEligible();
    toast.success('Focus started', pair.task.title);
  }

  async function handleSaveCompletion(minutes) {
    if (!activePair?.task || completionInFlightRef.current) return;

    completionInFlightRef.current = true;
    setCompletionSaving(true);

    const completedTaskTitle = activePair.task.title;
    const completedProjectTitle = activePair.project.title;
    const completedProjectId = activePair.project.id;
    const wasRandomWithoutReroll = Boolean(activePair.randomWithoutReroll);

    try {
      const result = await taskOps.completeTask(activePair.task.id, minutes);
      if (result.error) {
        toast.error('Could not save focus session', result.error.message);
        return;
      }

      if (result.skipped) {
        setCompleteModalOpen(false);
        setActivePair(null);
        await Promise.all([fetchProjects(), fetchEligible(), fetchRecentDone(), fetchInProgress()]);
        return;
      }

      if (wasRandomWithoutReroll && user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('random_without_reroll_count')
          .eq('id', user.id)
          .maybeSingle();
        if (!profileError) {
          await supabase
            .from('profiles')
            .update({
              random_without_reroll_count: (profileData?.random_without_reroll_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        }
      }
      emitAppEvent(APP_EVENTS.badgeCheckRequested, { trigger: 'focus_completed' });

      const { data: remaining, error: remainingError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', completedProjectId)
        .in('status', ['pending', 'in_progress']);
      const nextPostCompleteState = !remainingError && (remaining || []).length > 0 ? 'more_remaining' : 'all_done';

      setCompleteModalOpen(false);
      setActivePair(null);
      setPostCompleteState(nextPostCompleteState);
      if (nextPostCompleteState === 'all_done') {
        toast.success('Project queue cleared', completedProjectTitle);
      } else {
        toast.success('Task complete', completedTaskTitle);
      }
      await Promise.all([fetchProjects(), fetchEligible(), fetchRecentDone(), fetchInProgress()]);
    } finally {
      completionInFlightRef.current = false;
      setCompletionSaving(false);
    }
  }

  function hideHowItWorks() {
    setShowHowItWorks(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FOCUS_INTRO_STORAGE_KEY, '1');
    }
  }

  if (projectsLoading || loading) return <FocusPageSkeleton />;

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold text-slate-50">{t('focus.title')}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {t('focus.todaysFocus', { minutes: formatMinutesHuman(todayMinutes), count: todaysSessions.length })}
        </p>
      </Card>

      {postCompleteState ? (
        <Card>
          <div className="flex flex-wrap gap-2">
            {postCompleteState === 'more_remaining' ? (
              <Button onClick={beginSelectionCycle}>{t('focus.startAnotherTask')}</Button>
            ) : (
              <Button onClick={() => navigate('/projects')}>{t('focus.goToProject')}</Button>
            )}
            <Button variant="secondary" onClick={() => setPostCompleteState(null)}>
              {t('focus.doneForNow')}
            </Button>
          </div>
        </Card>
      ) : null}

      {!activePair && !selected ? (
        <>
          {showHowItWorks ? (
            <Card className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">{t('focus.howItWorksTitle')}</h2>
                  <p className="mt-1 text-sm text-slate-400">{t('focus.howItWorksBody')}</p>
                </div>
                <button type="button" onClick={hideHowItWorks} className="dn-icon-button rounded-full p-1.5" aria-label="Hide focus intro">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                {[t('focus.howItWorksPoint1'), t('focus.howItWorksPoint2'), t('focus.howItWorksPoint3')].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-emerald-400">*</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {!eligible.length ? (
            <EmptyState
              icon={<ListChecks className="h-5 w-5 text-emerald-400" />}
              title={t('focus.noFocusTitle')}
              message={t('focus.noFocusMessage')}
              ctaLabel={t('focus.noFocusCta')}
              onCta={() => navigate('/projects')}
            />
          ) : (
            <Card className="space-y-3">
              {weeklyGoal.goal ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{t('weeklyGoals.cardTitle')}</p>
                  <p className="mt-2 text-sm text-slate-200">
                    {weeklyGoal.formatGoalMinutes(weeklyGoal.progressMinutes)} / {weeklyGoal.formatGoalMinutes(weeklyGoal.goal.target_minutes)}
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-slate-700">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, weeklyGoal.percentageRaw)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{weeklyGoal.percentageRaw}%</p>
                </div>
              ) : null}
              <StartTaskButton onClick={beginSelectionCycle} />
              <button
                type="button"
                onClick={() => setManualOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
              >
                {t('focus.pickManual')}
                <ChevronDown className={`h-4 w-4 transition-transform ${manualOpen ? 'rotate-180' : ''}`} />
              </button>
              {manualOpen ? (
                <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/40 p-2">
                  {eligible.map((pair) => (
                    <button
                      key={pair.project.id}
                      type="button"
                      onClick={() => startSelected(pair)}
                      className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-left text-sm hover:bg-slate-700"
                    >
                      <p className="text-slate-200">{pair.project.title}</p>
                      <p className="text-xs text-slate-400">
                        {pair.project.effectivePriority === 'urgent'
                          ? t('projects.priority.urgent')
                          : t(`projects.priority.${pair.project.priority_tag || 'normal'}`)}
                        {' | '}
                        {pair.task.title}
                      </p>
                    </button>
                  ))}
                </div>
              ) : null}
            </Card>
          )}
        </>
      ) : null}

      {!activePair && selected ? (
        <div className="space-y-3">
          <RandomProjectCard project={selected.project} task={selected.task} onStart={() => startSelected(selected)} />
          <RerollButton remaining={rerollsLeft} hidden={eligible.length <= 1} onClick={handleReroll} />
          <Button
            variant="secondary"
            onClick={() => {
              setSelected(null);
              setManualOpen(true);
            }}
          >
            {t('focus.switchToManual')}
          </Button>
        </div>
      ) : null}

      {activePair ? (
        <ActiveTaskScreen
          project={activePair.project}
          task={activePair.task}
          onDone={() => {
            setCompleteModalOpen(true);
          }}
        />
      ) : null}

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('focus.recentCompleted')}</h2>
        <div className="mt-2 space-y-2">
          {recentDone.map((task) => (
            <div key={task.id} className="rounded-md border border-slate-700 bg-slate-800 p-2 text-sm">
              <p className="text-slate-200">{task.title}</p>
              <p className="text-xs text-slate-500">
                {task.project?.title || t('taskRow.projectFallback')} |{' '}
                {task.completed_at ? new Date(task.completed_at).toLocaleDateString(getLocaleTag(locale)) : ''}
              </p>
            </div>
          ))}
          {!recentDone.length ? <p className="text-sm text-slate-500">{t('focus.noCompleted')}</p> : null}
        </div>
      </Card>

      <CompleteTaskModal
        open={completeModalOpen}
        onClose={() => {
          if (!completionSaving) setCompleteModalOpen(false);
        }}
        startedAt={activePair?.task?.started_at}
        onSave={handleSaveCompletion}
        saving={completionSaving}
      />
    </div>
  );
}
