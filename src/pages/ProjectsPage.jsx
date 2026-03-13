import { useEffect, useState } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import ProjectCard from '../components/projects/ProjectCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmActionModal from '../components/ui/ConfirmActionModal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useLocale } from '../contexts/LocaleContext';
import { useProjects } from '../hooks/useProjects';

export default function ProjectsPage() {
  const { t } = useLocale();
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
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void checkForStaleProjects();
  }, [checkForStaleProjects]);

  async function handleCreate(payload) {
    setSaving(true);
    setError('');
    const { error: createError } = await createProject(payload);
    setSaving(false);
    if (createError) {
      setError(createError.message);
      return;
    }
    setModalOpen(false);
    await fetchProjects();
  }

  if (loading) return <LoadingSpinner label={t('projects.loading')} />;

  async function handleProjectAction() {
    if (!pendingAction?.project) return;
    setActionLoading(true);
    setError('');

    let result;
    if (pendingAction.type === 'archive') {
      result = await archiveProject(pendingAction.project.id);
    } else {
      result = await reopenProject(pendingAction.project.id);
    }

    setActionLoading(false);
    if (result?.error) {
      setError(result.error.message);
      return;
    }

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
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
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
              onComplete={() => completeProject(project.id)}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <button
          onClick={() => setShowCompleted((prev) => !prev)}
          className="text-sm font-semibold uppercase tracking-wide text-slate-500"
        >
          {t('projects.completedCount', { count: completedProjects.length })} {showCompleted ? '▲' : '▼'}
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
          className="text-sm font-semibold uppercase tracking-wide text-slate-500"
        >
          {t('projects.archivedCount', { count: archivedProjects.length })} {showArchived ? '▲' : '▼'}
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
