import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ActiveTaskScreen from '../components/focus/ActiveTaskScreen';
import CompleteTaskModal from '../components/focus/CompleteTaskModal';
import RandomProjectCard from '../components/focus/RandomProjectCard';
import RerollButton from '../components/focus/RerollButton';
import StartTaskButton from '../components/focus/StartTaskButton';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useFocusSessions } from '../hooks/useFocusSessions';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useWeeklyGoal } from '../hooks/useWeeklyGoal';
import { emitAppEvent, APP_EVENTS } from '../lib/appEvents';
import { formatMinutesHuman } from '../lib/dates';
import { getLocaleTag } from '../lib/i18n';
import { getEffectiveProjectPriority, getProjectDeadlineMeta, normalizeProjectPreferredTime } from '../lib/projectPriority';
import { selectRandomProject } from '../lib/random';
import { supabase } from '../lib/supabase';

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
  const { activeProjects, fetchProjects, loading: projectsLoading } = useProjects();
  const { sessions, getTodaySessions } = useFocusSessions();
  const weeklyGoal = useWeeklyGoal();
  const [eligible, setEligible] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activePair, setActivePair] = useState(null);
  const [rerollsLeft, setRerollsLeft] = useState(1);
  const [manualOpen, setManualOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [postCompleteState, setPostCompleteState] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [recentDone, setRecentDone] = useState([]);

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
    setFeedback('');
    setError('');
    const { error: startError } = await taskOps.startTask(pair.task.id);
    if (startError) {
      setError(startError.message);
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
  }

  async function handleSaveCompletion(minutes) {
    if (!activePair?.task) return;
    setError('');
    const result = await taskOps.completeTask(activePair.task.id, minutes);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (activePair.randomWithoutReroll && user) {
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

    setCompleteModalOpen(false);
    setActivePair(null);
    await fetchProjects();
    await fetchEligible();
    await fetchRecentDone();

    const { data: remaining } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', activePair.project.id)
      .in('status', ['pending', 'in_progress']);

    if ((remaining || []).length === 0) {
      setFeedback(t('focus.allDoneFeedback', { project: activePair.project.title }));
      setPostCompleteState('all_done');
    } else {
      setFeedback(t('focus.taskCompleteFeedback'));
      setPostCompleteState('more_remaining');
    }
  }

  if (projectsLoading || loading) return <LoadingSpinner label={t('focus.loading')} />;

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold text-slate-50">{t('focus.title')}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {t('focus.todaysFocus', { minutes: formatMinutesHuman(todayMinutes), count: todaysSessions.length })}
        </p>
      </Card>

      {feedback && <Card className="border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-200">{feedback}</Card>}
      {error && <Card className="border-red-500/30 bg-red-500/10 text-sm text-red-200">{error}</Card>}

      {postCompleteState && (
        <Card>
          <div className="flex flex-wrap gap-2">
            {postCompleteState === 'more_remaining' && (
              <Button
                onClick={() => {
                  setFeedback('');
                  setPostCompleteState(null);
                  beginSelectionCycle();
                }}
              >
                {t('focus.startAnotherTask')}
              </Button>
            )}
            {postCompleteState === 'all_done' && <Button onClick={() => navigate('/projects')}>{t('focus.goToProject')}</Button>}
            <Button
              variant="secondary"
              onClick={() => {
                setFeedback('');
                setPostCompleteState(null);
              }}
            >
              {t('focus.doneForNow')}
            </Button>
          </div>
        </Card>
      )}

      {!activePair && !selected && (
        <>
          <Card className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100">{t('focus.howItWorksTitle')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('focus.howItWorksBody')}</p>
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
              {weeklyGoal.goal && (
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
              )}
              <StartTaskButton onClick={beginSelectionCycle} />
              <button
                onClick={() => setManualOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
              >
                {t('focus.pickManual')}
                <ChevronDown className={`h-4 w-4 transition-transform ${manualOpen ? 'rotate-180' : ''}`} />
              </button>
              {manualOpen && (
                <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/40 p-2">
                  {eligible.map((pair) => (
                    <button
                      key={pair.project.id}
                      onClick={() => startSelected(pair)}
                      className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-left text-sm hover:bg-slate-700"
                    >
                      <p className="text-slate-200">{pair.project.title}</p>
                      <p className="text-xs text-slate-400">
                        {pair.project.effectivePriority === 'urgent' ? t('projects.priority.urgent') : t(`projects.priority.${pair.project.priority_tag || 'normal'}`)}
                        {' | '}
                        {pair.task.title}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {!activePair && selected && (
        <div className="space-y-3">
          <RandomProjectCard project={selected.project} task={selected.task} onStart={() => startSelected(selected)} />
          <RerollButton
            remaining={rerollsLeft}
            hidden={eligible.length <= 1}
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
      )}

      {activePair && (
        <ActiveTaskScreen
          project={activePair.project}
          task={activePair.task}
          onDone={() => {
            setCompleteModalOpen(true);
          }}
        />
      )}

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('focus.recentCompleted')}</h2>
        <div className="mt-2 space-y-2">
          {recentDone.map((task) => (
            <div key={task.id} className="rounded-md border border-slate-700 bg-slate-800 p-2 text-sm">
              <p className="text-slate-200">{task.title}</p>
              <p className="text-xs text-slate-500">
                {task.project?.title || t('taskRow.projectFallback')} | {task.completed_at ? new Date(task.completed_at).toLocaleDateString(getLocaleTag(locale)) : ''}
              </p>
            </div>
          ))}
          {!recentDone.length && <p className="text-sm text-slate-500">{t('focus.noCompleted')}</p>}
        </div>
      </Card>

      <CompleteTaskModal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        startedAt={activePair?.task?.started_at}
        onSave={handleSaveCompletion}
      />
    </div>
  );
}
