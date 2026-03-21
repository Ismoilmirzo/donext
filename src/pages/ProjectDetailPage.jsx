import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AddTaskModal from '../components/projects/AddTaskModal';
import AIBreakdownButton from '../components/projects/AIBreakdownButton';
import AITaskPreview from '../components/projects/AITaskPreview';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import ProjectFocusHistory from '../components/projects/ProjectFocusHistory';
import ProjectPriorityBadge from '../components/projects/ProjectPriorityBadge';
import ProjectStatusBadge from '../components/projects/ProjectStatusBadge';
import ReorderableTasks from '../components/projects/ReorderableTasks';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmActionModal from '../components/ui/ConfirmActionModal';
import { ProjectDetailSkeleton } from '../components/ui/PageSkeletons';
import ProgressBar from '../components/ui/ProgressBar';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useToast } from '../contexts/ToastContext';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { decomposeProject } from '../lib/aiDecompose';
import { formatMinutesHuman } from '../lib/dates';
import { getLocaleTag } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { getTaskElapsedMinutes, getTaskFocusMinutes } from '../lib/taskSessions';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const toast = useToast();
  const { projects, fetchProjects, updateProject, archiveProject, deleteProject, completeProject, reopenProject } = useProjects();
  const { tasks, loading, addTask, updateTask, reorderTasks } = useTasks(id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [focusHistory, setFocusHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTasks, setAiTasks] = useState([]);
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);
  const [aiRemaining, setAiRemaining] = useState(null);
  const [aiInserting, setAiInserting] = useState(false);

  const project = useMemo(() => projects.find((item) => item.id === id), [id, projects]);

  useEffect(() => {
    if (!projects.length) {
      void fetchProjects();
    }
  }, [fetchProjects, projects.length]);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!user || !id) {
        if (active) {
          setFocusHistory([]);
          setHistoryLoading(false);
        }
        return;
      }

      setHistoryLoading(true);
      const { data, error: historyError } = await supabase
        .from('focus_sessions')
        .select('id,date,created_at,duration_minutes,total_duration_minutes,task:tasks(title)')
        .eq('user_id', user.id)
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(12);

      if (!active) return;

      if (historyError) {
        toast.error('Could not load focus history', historyError.message);
        setFocusHistory([]);
      } else {
        setFocusHistory(data || []);
      }
      setHistoryLoading(false);
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, [id, toast, user]);

  if (loading || !project) return <ProjectDetailSkeleton />;

  const completed = tasks.filter((task) => task.status === 'completed').length;
  const total = tasks.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;
  const totalFocusMinutes = tasks.reduce((sum, task) => sum + getTaskFocusMinutes(task), 0);
  const totalSpentMinutes = tasks.reduce((sum, task) => sum + getTaskElapsedMinutes(task), 0);
  const overheadMinutes = Math.max(0, totalSpentMinutes - totalFocusMinutes);
  const efficiencyRate = totalSpentMinutes > 0 ? Math.round((totalFocusMinutes / totalSpentMinutes) * 100) : 0;

  async function handleSaveTask(payload) {
    setSaving(true);
    let result;
    if (editingTask) {
      result = await updateTask(editingTask.id, {
        title: payload.title,
        description: payload.description,
      });
    } else {
      result = await addTask(id, payload.title, payload.description, payload.position);
    }
    if (result?.error) {
      toast.error('Could not save task', result.error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditingTask(null);
    setModalOpen(false);
    toast.success(editingTask ? 'Task updated' : 'Task added', payload.title);
  }

  async function handleSaveProject(payload) {
    setProjectSaving(true);
    const { error: updateError } = await updateProject(id, payload);
    setProjectSaving(false);
    if (updateError) {
      toast.error('Could not update project', updateError.message);
      return;
    }
    setProjectModalOpen(false);
    await fetchProjects();
    toast.success('Project updated', payload.title || project.title);
  }

  async function handleConfirmAction() {
    if (!pendingAction) return;
    setActionLoading(true);

    let result = null;
    if (pendingAction === 'archive') {
      result = await archiveProject(id);
    } else if (pendingAction === 'restore') {
      result = await reopenProject(id);
    } else if (pendingAction === 'complete') {
      result = await completeProject(id);
    } else if (pendingAction === 'delete') {
      result = await deleteProject(id);
    }

    setActionLoading(false);

    if (result?.error) {
      toast.error('Project action failed', result.error.message);
      return;
    }

    setPendingAction(null);

    if (pendingAction === 'delete') {
      toast.success('Project deleted', project.title);
      navigate('/projects', { replace: true });
      return;
    }

    if (pendingAction === 'complete') {
      toast.success('Project complete', formatMinutesHuman(totalFocusMinutes));
    } else if (pendingAction === 'archive') {
      toast.success('Project archived', project.title);
      navigate('/projects');
    } else if (pendingAction === 'restore') {
      toast.success('Project restored', project.title);
    }

    await fetchProjects();
  }

  async function handleStartTask(task) {
    navigate('/focus', { state: { requestedTaskId: task.id, requestedProjectId: id } });
  }

  async function handleAIBreakdown() {
    if (!project || aiLoading) return;
    setAiLoading(true);
    const result = await decomposeProject({
      title: project.title,
      description: project.description || '',
      locale,
      deadline: project.deadline_date || undefined,
    });
    setAiLoading(false);

    if (result.error) {
      toast.error(t('ai.errorTitle'), result.rateLimited ? t('ai.rateLimited') : result.error);
      if (result.remaining) setAiRemaining(result.remaining);
      return;
    }

    setAiTasks(result.tasks || []);
    setAiRemaining(result.remaining || null);
    setAiPreviewOpen(true);
  }

  async function handleConfirmAITasks(confirmedTasks) {
    if (!confirmedTasks.length) return;
    setAiInserting(true);

    for (let i = 0; i < confirmedTasks.length; i++) {
      const task = confirmedTasks[i];
      const { error } = await addTask(id, task.title, task.description || '', 'end');
      if (error) {
        toast.error('Could not add task', error.message);
        setAiInserting(false);
        return;
      }
    }

    setAiInserting(false);
    setAiPreviewOpen(false);
    setAiTasks([]);
    toast.success(t('ai.addTasks', { count: confirmedTasks.length }));
  }

  const confirmMap = {
    archive: {
      title: t('projects.confirmArchiveTitle'),
      body: t('projects.confirmArchiveBody', { title: project.title }),
      label: t('common.archive'),
      variant: 'secondary',
    },
    restore: {
      title: t('projects.confirmRestoreTitle'),
      body: t('projects.confirmRestoreBody', { title: project.title }),
      label: t('common.restore'),
      variant: 'primary',
    },
    complete: {
      title: t('projects.confirmCompleteTitle'),
      body: t('projects.confirmCompleteBody', { title: project.title }),
      label: t('projects.markProjectComplete'),
      variant: 'primary',
    },
    delete: {
      title: t('common.delete'),
      body: t('projects.deleteProjectConfirm'),
      label: t('common.delete'),
      variant: 'danger',
    },
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link to="/projects" className="text-sm text-slate-400 hover:text-slate-100">
            {t('projects.backToProjects')}
          </Link>
          <ProjectStatusBadge status={project.status} needsReview={project.hasAutoReviewPending} />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-slate-50">{project.title}</h1>
            {project.description ? <p className="mt-1 text-sm text-slate-400">{project.description}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ProjectPriorityBadge priority={project.priority_tag} effectivePriority={project.effectivePriority} deadlineMeta={project} />
              <span className="text-xs text-slate-500">
                {t('projects.preferredTimeSummary', { value: t(`projects.preferredTime.${project.preferred_time || 'any'}`) })}
              </span>
              {project.hasDeadline ? (
                <span className="text-xs text-slate-500">
                  {project.isOverdue
                    ? t('projects.deadlineOverdue', {
                        date: new Date(project.deadline_date).toLocaleDateString(getLocaleTag(locale)),
                      })
                    : project.daysUntilDeadline === 0
                      ? t('projects.deadlineToday', {
                          date: new Date(project.deadline_date).toLocaleDateString(getLocaleTag(locale)),
                        })
                      : project.isDueSoon
                        ? t('projects.deadlineSoon', {
                            count: project.daysUntilDeadline,
                            date: new Date(project.deadline_date).toLocaleDateString(getLocaleTag(locale)),
                          })
                        : t('projects.deadlineOn', {
                            date: new Date(project.deadline_date).toLocaleDateString(getLocaleTag(locale)),
                          })}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setProjectModalOpen(true)}>
              {t('projects.editProject')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPendingAction(project.status === 'active' ? 'archive' : 'restore')}>
              {project.status === 'active' ? t('common.archive') : t('common.restore')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setPendingAction('delete')}>
              {t('common.delete')}
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{t('projects.taskCount', { completed, total })}</span>
            <span>{percent}%</span>
          </div>
          <ProgressBar value={percent} max={100} />
          <p className="text-xs text-slate-500">{t('projects.totalFocusTime', { value: formatMinutesHuman(totalFocusMinutes) })}</p>
          <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
            <p>{t('projects.totalTimeSpent', { value: formatMinutesHuman(totalSpentMinutes) })}</p>
            <p>{t('projects.overheadTime', { value: formatMinutesHuman(overheadMinutes) })}</p>
            <p>{t('projects.efficiencyRate', { value: efficiencyRate })}</p>
          </div>
        </div>
      </Card>

      <ProjectFocusHistory sessions={focusHistory} loading={historyLoading} />

      <ReorderableTasks
        tasks={tasks}
        onTaskClick={(task) => {
          setEditingTask(task);
          setModalOpen(true);
        }}
        onMove={(task, direction) => {
          void reorderTasks(task.id, direction).then(({ error }) => {
            if (error) {
              toast.error('Could not reorder task', error.message);
              return;
            }
            toast.info(direction === 'up' ? 'Task moved up' : 'Task moved down', task.title);
          });
        }}
        onStartTask={handleStartTask}
      />

      {total === 0 ? (
        <Card className="text-center">
          <p className="mb-3 text-sm text-slate-400">{t('ai.emptyProjectHint')}</p>
          <AIBreakdownButton onClick={handleAIBreakdown} loading={aiLoading} t={t} />
        </Card>
      ) : null}

      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setEditingTask(null);
              setModalOpen(true);
            }}
          >
            {t('projects.addTask')}
          </Button>
          {project.status === 'active' && total > 0 ? (
            <AIBreakdownButton onClick={handleAIBreakdown} loading={aiLoading} t={t} />
          ) : null}
        </div>
        {allDone ? <Button onClick={() => setPendingAction('complete')}>{t('projects.markProjectComplete')}</Button> : null}
      </div>

      <AddTaskModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
        saving={saving}
      />

      <CreateProjectModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSave={handleSaveProject}
        saving={projectSaving}
        initialProject={project}
      />

      <ConfirmActionModal
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmMap[pendingAction]?.title || ''}
        message={confirmMap[pendingAction]?.body || ''}
        confirmLabel={confirmMap[pendingAction]?.label || t('common.confirm')}
        cancelLabel={t('common.cancel')}
        confirmVariant={confirmMap[pendingAction]?.variant || 'primary'}
        loading={actionLoading}
      />

      <AITaskPreview
        open={aiPreviewOpen}
        onClose={() => setAiPreviewOpen(false)}
        tasks={aiTasks}
        onConfirm={handleConfirmAITasks}
        saving={aiInserting}
        remaining={aiRemaining}
        t={t}
      />
    </div>
  );
}
