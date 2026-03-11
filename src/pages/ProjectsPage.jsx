import { useEffect, useState } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import ProjectCard from '../components/projects/ProjectCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useProjects } from '../hooks/useProjects';

export default function ProjectsPage() {
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

  if (loading) return <LoadingSpinner label="Loading projects..." />;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-slate-50">Projects</h1>
          <Button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Active ({activeProjects.length})</h2>
        {!activeProjects.length ? (
          <EmptyState
            icon={<FolderKanban className="h-5 w-5 text-emerald-400" />}
            title="No projects yet."
            message="Create your first one to start tracking progress."
            ctaLabel="Create Project"
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
          Completed ({completedProjects.length}) {showCompleted ? '▲' : '▼'}
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
