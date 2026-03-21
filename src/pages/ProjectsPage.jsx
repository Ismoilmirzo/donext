import { useEffect, useState } from 'react';
import { ChevronDown, FolderKanban, Plus } from 'lucide-react';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import ProjectCard from '../components/projects/ProjectCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmActionModal from '../components/ui/ConfirmActionModal';
import EmptyState from '../components/ui/EmptyState';
import { ProjectsPageSkeleton } from '../components/ui/PageSkeletons';
import { useLocale } from '../contexts/LocaleContext';
import { useToast } from '../contexts/ToastContext';
import { useProjects } from '../hooks/useProjects';

export default function ProjectsPage() {
  const { t } = useLocale();
  const toast = useToast();
  const {
    activeProjects,
    completedProjects,
    archivedProjects,
    loading,
    createProject,
    completeProject,
    archiveProject,
    reopenProject,
    fetchProjects,
    checkForStaleProjects,
  } = useProjects();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void checkForStaleProjects();
  }, [checkForStaleProjects]);

  async function handleCreate(payload) {
    setSaving(true);
    const { error: createError } = await createProject(payload);
    setSaving(false);
    if (createError) {
      toast.error(t('toasts.projectCreateFailed'), createError.message);
      return;
    }
    setModalOpen(false);
    await fetchProjects();
    toast.success(t('toasts.projectCreated'), payload.title);
  }

  if (loading) return <ProjectsPageSkeleton />;

  async function handleProjectAction() {
    if (!pendingAction?.project) return;
    setActionLoading(true);

    let result;
    if (pendingAction.type === 'archive') {
      result = await archiveProject(pendingAction.project.id);
    } else {
      result = await reopenProject(pendingAction.project.id);
    }

    setActionLoading(false);
    if (result?.error) {
      toast.error(t('toasts.projectActionFailed'), result.error.message);
      return;
    }

    toast.success(
      pendingAction.type === 'archive' ? t('toasts.projectArchived') : t('toasts.projectRestored'),
      pendingAction.project.title
    );
    setPendingAction(null);
  }

  const confirmTitle =
    pendingAction?.type === 'archive' ? t('projects.confirmArchiveTitle') : t('projects.confirmRestoreTitle');
  const confirmBody =
    pendingAction?.type === 'archive'
      ? t('projects.confirmArchiveBody', { title: pendingAction?.project?.title || '' })
      : t('projects.confirmRestoreBody', { title: pendingAction?.project?.title || '' });

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-slate-50">{t('projects.title')}</h1>
          <Button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1">
            <Plus className="h-4 w-4" />
            {t('projects.newProject')}
          </Button>
        </div>
      </Card>

      {!activeProjects.length && !completedProjects.length && !archivedProjects.length && (
        <Card className="space-y-2">
          <h2 className="text-base font-semibold text-slate-100">{t('projects.getStartedTitle')}</h2>
          <p className="text-sm text-slate-400">{t('projects.getStartedBody')}</p>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('projects.activeCount', { count: activeProjects.length })}</h2>
        {!activeProjects.length ? (
          <EmptyState
            icon={<FolderKanban className="h-5 w-5 text-emerald-400" />}
            title={t('projects.noProjectsTitle')}
            message={t('projects.noProjectsMessage')}
            ctaLabel={t('projects.createProject')}
            onCta={() => setModalOpen(true)}
          />
        ) : (
          activeProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onArchive={() => setPendingAction({ type: 'archive', project })}
              onReopen={() => setPendingAction({ type: 'restore', project })}
              onComplete={async () => {
                const { error } = await completeProject(project.id);
                if (error) {
                  toast.error(t('toasts.projectCompleteFailed'), error.message);
                  return;
                }
                toast.success(t('toasts.projectCompleted'), project.title);
              }}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <button
          onClick={() => setShowCompleted((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-300"
        >
          {t('projects.completedCount', { count: completedProjects.length })}
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showCompleted ? 'rotate-180' : ''}`} />
        </button>
        {showCompleted &&
          completedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onArchive={() => setPendingAction({ type: 'archive', project })}
              onReopen={() => setPendingAction({ type: 'restore', project })}
            />
          ))}
      </section>

      <section className="space-y-3">
        <button
          onClick={() => setShowArchived((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-300"
        >
          {t('projects.archivedCount', { count: archivedProjects.length })}
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showArchived ? 'rotate-180' : ''}`} />
        </button>
        {showArchived &&
          (archivedProjects.length ? (
            archivedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onReopen={() => setPendingAction({ type: 'restore', project })}
              />
            ))
          ) : (
            <Card>
              <p className="text-sm text-slate-500">{t('projects.noArchivedProjectsTitle')}</p>
            </Card>
          ))}
      </section>

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleCreate} saving={saving} />

      <ConfirmActionModal
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        onConfirm={handleProjectAction}
        title={confirmTitle}
        message={confirmBody}
        confirmLabel={pendingAction?.type === 'archive' ? t('common.archive') : t('common.restore')}
        cancelLabel={t('common.cancel')}
        confirmVariant={pendingAction?.type === 'archive' ? 'secondary' : 'primary'}
        loading={actionLoading}
      />
    </div>
  );
}
