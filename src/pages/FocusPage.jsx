import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ListChecks, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import ActiveTaskScreen from '../components/focus/ActiveTaskScreen';
import PauseSessionModal from '../components/focus/PauseSessionModal';
import RandomProjectCard from '../components/focus/RandomProjectCard';
import RecoverySessionModal from '../components/focus/RecoverySessionModal';
import RerollButton from '../components/focus/RerollButton';
import SessionSummaryModal from '../components/focus/SessionSummaryModal';
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
import { useSessionTimer } from '../hooks/useSessionTimer';
import { useWeeklyGoal } from '../hooks/useWeeklyGoal';
import { formatMinutesHuman } from '../lib/dates';
import { getLocaleTag } from '../lib/i18n';
import {
  clearDanglingInProgressTasks,
  completeTaskSession,
  fetchActiveTaskSession,
  getStoredActiveSessionId,
  pauseTaskSession,
  resolveOrphanTaskSession,
  startTaskSession,
  storeActiveSessionId,
  toggleTaskSession,
} from '../lib/taskSessions';
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

function decoratePair(pair, selectionMode = 'random') {
  if (!pair) return null;
  return {
    ...pair,
    selectionMode,
  };
}

export default function FocusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const toast = useToast();
  const { activeProjects, fetchProjects, loading: projectsLoading } = useProjects();
  const { sessions, getTodaySessions } = useFocusSessions();
  const weeklyGoal = useWeeklyGoal();

  const [eligible, setEligible] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [recoverySession, setRecoverySession] = useState(null);
  const [summaryState, setSummaryState] = useState(null);
  const [postCompleteState, setPostCompleteState] = useState(null);
  const [rerollsLeft, setRerollsLeft] = useState(1);
  const [manualOpen, setManualOpen] = useState(false);
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [sessionAction, setSessionAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [recentDone, setRecentDone] = useState([]);
  const [showHowItWorks, setShowHowItWorks] = useState(true);

  const requestedTaskHandledRef = useRef('');
  const timer = useSessionTimer(activeSession);

  const actionLoading = Boolean(sessionAction);
  const requestedTaskId = location.state?.requestedTaskId || '';

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
      .eq('status', 'pending')
      .order('sort_order', { ascending: true });

    const firstTaskByProject = new Map();
    (taskRows || []).forEach((task) => {
      if (!firstTaskByProject.has(task.project_id)) firstTaskByProject.set(task.project_id, task);
    });

    const nextEligible = activeProjects
      .map((project) => ({ project, task: firstTaskByProject.get(project.id) || null }))
      .filter((pair) => pair.task)
      .map((pair) => ({ ...pair, project: normalizeProject(pair.project) }));

    setEligible(nextEligible);
    setLoading(false);
  }, [activeProjects, user]);

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

  const syncActiveSession = useCallback(async () => {
    if (!user) {
      setActiveSession(null);
      setRecoverySession(null);
      return;
    }

    const result = await fetchActiveTaskSession(user.id);
    if (result.error) {
      toast.error('Could not load active focus session', result.error.message);
      setActiveSession(null);
      setRecoverySession(null);
      return;
    }

    const nextSession = result.data ? { ...result.data, project: normalizeProject(result.data.project) } : null;
    const storedSessionId = getStoredActiveSessionId();

    if (!nextSession?.id) {
      await clearDanglingInProgressTasks(user.id);
      setActiveSession(null);
      setRecoverySession(null);
      storeActiveSessionId(null);
      return;
    }

    if (storedSessionId && storedSessionId === nextSession.id) {
      setRecoverySession(null);
      setActiveSession(nextSession);
      return;
    }

    setActiveSession(null);
    setRecoverySession(nextSession);
  }, [toast, user]);

  const refreshFocusData = useCallback(async () => {
    await Promise.all([fetchProjects(), fetchEligible(), fetchRecentDone(), syncActiveSession()]);
  }, [fetchEligible, fetchProjects, fetchRecentDone, syncActiveSession]);

  const getPostCompleteState = useCallback(async (projectId) => {
    if (!projectId) return null;
    const { data, error } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', projectId)
      .in('status', ['pending', 'in_progress'])
      .limit(1);

    if (error) return null;
    return (data || []).length > 0 ? 'more_remaining' : 'all_done';
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    void fetchEligible();
    void fetchRecentDone();
    void syncActiveSession();
  }, [fetchEligible, fetchRecentDone, syncActiveSession]);

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

  useEffect(() => {
    if (!requestedTaskId || requestedTaskHandledRef.current === requestedTaskId) return;
    if (!eligible.length || activeSession?.id || recoverySession?.id) return;

    const requestedPair = eligible.find((pair) => pair.task?.id === requestedTaskId);
    if (!requestedPair) return;

    setSelected(decoratePair(requestedPair, 'manual'));
    setManualOpen(false);
    setSummaryState(null);
    requestedTaskHandledRef.current = requestedTaskId;
  }, [activeSession?.id, eligible, recoverySession?.id, requestedTaskId]);

  useEffect(() => {
    if (!requestedTaskId) {
      requestedTaskHandledRef.current = '';
    }
  }, [requestedTaskId]);

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
    setSelected(decoratePair(pair, 'random'));
  }

  function beginSelectionCycle() {
    setSummaryState(null);
    setPostCompleteState(null);
    setManualOpen(false);
    setRerollsLeft(1);
    pickRandom();
  }

  function handleReroll() {
    if (rerollsLeft <= 0 || !selected?.project?.id) return;
    setRerollsLeft(0);
    pickRandom({ excludeProjectIds: [selected.project.id] });
  }

  async function startSelected(pair = selected) {
    if (!user || !pair?.task?.id) return;

    setSessionAction('start');
    try {
      const result = await startTaskSession({ userId: user.id, task: pair.task });
      if (result.error) {
        toast.error('Could not start task', result.error.message);
        return;
      }

      const nextSession = result.data ? { ...result.data, project: normalizeProject(result.data.project) } : null;
      setActiveSession(nextSession);
      setRecoverySession(null);
      setSelected(null);
      setPostCompleteState(null);
      setManualOpen(false);
      setRerollsLeft(1);
      await Promise.all([fetchProjects(), fetchEligible()]);
      toast.success('Focus started', pair.task.title);
    } finally {
      setSessionAction('');
    }
  }

  async function handleToggleMode() {
    if (!activeSession?.id) return;
    const nextType = timer.isWorking ? 'break' : 'work';

    setSessionAction('toggle');
    try {
      const result = await toggleTaskSession(activeSession, nextType);
      if (result.error) {
        toast.error('Could not update session state', result.error.message);
        return;
      }
      setActiveSession(result.data);
    } finally {
      setSessionAction('');
    }
  }

  async function handlePauseConfirm() {
    if (!activeSession?.id || !user) return;

    setSessionAction('pause');
    try {
      const result = await pauseTaskSession(activeSession, user.id);
      if (result.error) {
        toast.error('Could not pause session', result.error.message);
        return;
      }

      setPauseModalOpen(false);
      setActiveSession(null);
      setRecoverySession(null);
      await refreshFocusData();
      toast.success('Session saved', t('focus.sessionSavedToast'));
    } finally {
      setSessionAction('');
    }
  }

  async function handleComplete() {
    if (!activeSession?.id || !user) return;

    setSessionAction('complete');
    try {
      const result = await completeTaskSession(activeSession, user.id);
      if (result.error) {
        toast.error('Could not complete task', result.error.message);
        return;
      }

      const nextState = await getPostCompleteState(result.data?.session?.task?.project_id);
      setPostCompleteState(nextState);
      setSummaryState({
        summary: result.data?.summary,
        task: result.data?.session?.task,
        postCompleteState: nextState,
      });
      setActiveSession(null);
      setRecoverySession(null);
      await refreshFocusData();
    } finally {
      setSessionAction('');
    }
  }

  async function handleRecoveryResolve(action) {
    if (!recoverySession?.id || !user) return;

    setSessionAction(`recover-${action}`);
    try {
      const result = await resolveOrphanTaskSession(recoverySession, user.id, action);
      if (result.error) {
        toast.error('Could not recover session', result.error.message);
        return;
      }

      setRecoverySession(null);
      setActiveSession(null);

      if (action === 'complete') {
        const nextState = await getPostCompleteState(result.data?.session?.task?.project_id);
        setPostCompleteState(nextState);
        setSummaryState({
          summary: result.data?.summary,
          task: result.data?.session?.task,
          postCompleteState: nextState,
        });
      } else if (action === 'pause') {
        toast.success('Session saved', t('focus.sessionSavedToast'));
      } else {
        toast.info('Session discarded', t('focus.sessionDiscardedToast'));
      }

      await refreshFocusData();
    } finally {
      setSessionAction('');
    }
  }

  function hideHowItWorks() {
    setShowHowItWorks(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FOCUS_INTRO_STORAGE_KEY, '1');
    }
  }

  function handleSummaryPrimary() {
    if (summaryState?.postCompleteState === 'all_done') {
      setSummaryState(null);
      navigate('/projects');
      return;
    }

    setSummaryState(null);
    beginSelectionCycle();
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

      <RecoverySessionModal
        open={Boolean(recoverySession)}
        session={recoverySession}
        onResolve={handleRecoveryResolve}
        loading={actionLoading}
      />

      <PauseSessionModal
        open={pauseModalOpen}
        onClose={() => {
          if (!actionLoading) setPauseModalOpen(false);
        }}
        onConfirm={handlePauseConfirm}
        loading={actionLoading}
      />

      <SessionSummaryModal
        open={Boolean(summaryState)}
        onClose={() => setSummaryState(null)}
        onPrimary={summaryState?.postCompleteState ? handleSummaryPrimary : undefined}
        primaryLabel={
          summaryState?.postCompleteState === 'all_done'
            ? t('focus.goToProject')
            : summaryState?.postCompleteState === 'more_remaining'
              ? t('focus.startAnotherTask')
              : ''
        }
        task={summaryState?.task}
        summary={summaryState?.summary}
        loading={actionLoading}
      />

      {!activeSession && !selected ? (
        <>
          {postCompleteState && !summaryState ? (
            <Card className={postCompleteState === 'all_done' ? 'border-emerald-500/20 bg-emerald-500/10' : ''}>
              {postCompleteState === 'all_done' ? (
                <div className="space-y-3">
                  <p className="text-sm text-emerald-100">{t('focus.projectDonePrompt')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate('/projects')}>{t('focus.goToProject')}</Button>
                    <Button variant="secondary" onClick={() => setPostCompleteState(null)}>
                      {t('focus.doneForNow')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={beginSelectionCycle}>{t('focus.startAnotherTask')}</Button>
                  <Button variant="secondary" onClick={() => setPostCompleteState(null)}>
                    {t('focus.doneForNow')}
                  </Button>
                </div>
              )}
            </Card>
          ) : null}

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
                      onClick={() => {
                        setSummaryState(null);
                        setSelected(decoratePair(pair, 'manual'));
                        setManualOpen(false);
                      }}
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

      {!activeSession && selected ? (
        <div className="space-y-3">
          <RandomProjectCard project={selected.project} task={selected.task} onStart={() => startSelected(selected)} />
          <RerollButton
            remaining={rerollsLeft}
            hidden={eligible.length <= 1 || selected.selectionMode !== 'random'}
            onClick={handleReroll}
          />
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

      {activeSession ? (
        <ActiveTaskScreen
          project={normalizeProject(activeSession.project)}
          task={activeSession.task}
          session={activeSession}
          timer={timer}
          onDone={handleComplete}
          onPause={() => setPauseModalOpen(true)}
          onToggleMode={handleToggleMode}
          actionLoading={actionLoading}
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
    </div>
  );
}
