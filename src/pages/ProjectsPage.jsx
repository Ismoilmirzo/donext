import { useEffect, useState } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import ProjectCard from '../components/projects/ProjectCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useLocale } from '../contexts/LocaleContext';
import { useProjects } from '../hooks/useProjects';

export default function ProjectsPage() {
  const { t } = useLocale();
  const {
    activeProjects,
    completedProjects,
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
  const [error, setError] = useState('');

  useEffect(() => {
    void checkForStaleProjects();
  }, [checkForStaleProjects]);

  async function handleCreate(payload) {
    setSaving(true);
    setError('');
    const { error: createError } = await createProject(payload.title, payload.description, payload.color);
    setSaving(false);
    if (createError) {
      setError(createError.message);
      return;
    }
    setModalOpen(false);
    await fetchProjects();
  }

  if (loading) return <LoadingSpinner label={t('projects.loading')} />;

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
              onArchive={() => archiveProject(project.id)}
              onReopen={async () => {
                const { error: reopenError } = await reopenProject(project.id);
                if (reopenError) setError(reopenError.message);
              }}
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
              onArchive={async () => {
                const { error: archiveError } = await archiveProject(project.id);
                if (archiveError) setError(archiveError.message);
              }}
              onReopen={async () => {
                const { error: reopenError } = await reopenProject(project.id);
                if (reopenError) setError(reopenError.message);
              }}
            />
          ))}
      </section>

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleCreate} saving={saving} />
    </div>
  );
}
