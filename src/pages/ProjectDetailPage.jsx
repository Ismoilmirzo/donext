import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AddTaskModal from '../components/projects/AddTaskModal';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import ProjectPriorityBadge from '../components/projects/ProjectPriorityBadge';
import ReorderableTasks from '../components/projects/ReorderableTasks';
import ProjectStatusBadge from '../components/projects/ProjectStatusBadge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmActionModal from '../components/ui/ConfirmActionModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ProgressBar from '../components/ui/ProgressBar';
import { useLocale } from '../contexts/LocaleContext';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { formatMinutesHuman } from '../lib/dates';
import { getLocaleTag } from '../lib/i18n';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const { projects, fetchProjects, updateProject, archiveProject, deleteProject, completeProject, reopenProject } = useProjects();
  const { tasks, loading, addTask, updateTask, reorderTasks } = useTasks(id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const project = useMemo(() => projects.find((item) => item.id === id), [id, projects]);

  useEffect(() => {
    if (!projects.length) {
      void fetchProjects();
    }
  }, [fetchProjects, projects.length]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (loading || !project) return <LoadingSpinner label={t('projects.loadingProject')} />;

  const completed = tasks.filter((task) => task.status === 'completed').length;
  const total = tasks.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;
  const totalFocusMinutes = tasks.reduce((sum, task) => sum + (task.time_spent_minutes || 0), 0);
  const totalSpentMinutes = tasks.reduce(
    (sum, task) => sum + (task.total_time_spent_minutes ?? task.time_spent_minutes ?? 0),
    0
  );
  const overheadMinutes = Math.max(0, totalSpentMinutes - totalFocusMinutes);
  const efficiencyRate = totalSpentMinutes > 0 ? Math.round((totalFocusMinutes / totalSpentMinutes) * 100) : 0;

  async function handleSaveTask(payload) {
    setSaving(true);
    setError('');
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
      setError(result.error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditingTask(null);
    setModalOpen(false);
  }

  async function handleSaveProject(payload) {
    setProjectSaving(true);
    const { error: updateError } = await updateProject(id, payload);
    setProjectSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setProjectModalOpen(false);
    await fetchProjects();
  }

  async function handleConfirmAction() {
    if (!pendingAction) return;
    setActionLoading(true);
    setError('');

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
      setError(result.error.message);
      return;
    }

    setPendingAction(null);

    if (pendingAction === 'delete') {
      navigate('/projects', { replace: true });
      return;
    }

    if (pendingAction === 'complete') {
      setToast(t('projects.projectCompleteToast', { value: formatMinutesHuman(totalFocusMinutes) }));
    } else if (pendingAction === 'archive') {
      navigate('/projects');
    }

    await fetchProjects();
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
          <div>
            <h1 className="text-xl font-semibold text-slate-50">{project.title}</h1>
            {project.description && <p className="mt-1 text-sm text-slate-400">{project.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ProjectPriorityBadge priority={project.priority_tag} effectivePriority={project.effectivePriority} deadlineMeta={project} />
              {project.hasDeadline && (
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
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setProjectModalOpen(true)}>
              {t('projects.editProject')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPendingAction(project.status === 'active' ? 'archive' : 'restore')}
            >
              {project.status === 'active' ? t('common.archive') : t('common.restore')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setPendingAction('delete')}
            >
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
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </Card>

      {toast && <Card className="border-emerald-500/40 bg-emerald-500/10 text-sm text-emerald-200">{toast}</Card>}

      <ReorderableTasks
        tasks={tasks}
        onTaskClick={(task) => {
          setEditingTask(task);
          setModalOpen(true);
        }}
        onMove={(task, direction) => {
          void reorderTasks(task.id, direction).then(({ error: reorderError }) => {
            if (reorderError) setError(reorderError.message);
          });
        }}
      />

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          onClick={() => {
            setEditingTask(null);
            setModalOpen(true);
          }}
        >
          {t('projects.addTask')}
        </Button>
        {allDone && <Button onClick={() => setPendingAction('complete')}>{t('projects.markProjectComplete')}</Button>}
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
    </div>
  );
}
