import { useEffect, useState } from 'react';
import { ChevronDown, FolderKanban, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import ProjectCard from '../components/projects/ProjectCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmActionModal from '../components/ui/ConfirmActionModal';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import { ProjectsPageSkeleton } from '../components/ui/PageSkeletons';
import { useLocale } from '../contexts/LocaleContext';
import { useToast } from '../contexts/ToastContext';
import { useProjects } from '../hooks/useProjects';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    checkForStaleProjects,
  } = useProjects();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void checkForStaleProjects();
  }, [checkForStaleProjects]);

  async function handleCreate(payload) {
    const { _templateTasks, ...projectPayload } = payload;
    setSaving(true);
    const { data, error: createError } = await createProject(projectPayload);
    if (createError) {
      setSaving(false);
      toast.error(t('toasts.projectCreateFailed'), createError.message);
      return;
    }
    // Insert template tasks if provided
    if (_templateTasks?.length && data?.id && user) {
      for (let i = 0; i < _templateTasks.length; i++) {
        await supabase.from('tasks').insert({
          user_id: user.id,
          project_id: data.id,
          title: _templateTasks[i].title,
          description: _templateTasks[i].description || '',
          sort_order: i + 1,
          status: 'pending',
        });
      }
    }
    setSaving(false);
    setModalOpen(false);
    toast.success(t('toasts.projectCreated'), payload.title);
    navigate(`/projects/${data.id}`);
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
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesQuery = (project) =>
    !normalizedQuery ||
    project.title?.toLowerCase().includes(normalizedQuery) ||
    project.description?.toLowerCase().includes(normalizedQuery);
  const filteredActiveProjects = activeProjects.filter(matchesQuery);
  const filteredCompletedProjects = completedProjects.filter(matchesQuery);
  const filteredArchivedProjects = archivedProjects.filter(matchesQuery);
  const hasSearch = Boolean(normalizedQuery);
  const hasAnyFilteredProjects =
    filteredActiveProjects.length || filteredCompletedProjects.length || filteredArchivedProjects.length;
  const showCompletedSection = showCompleted || hasSearch;
  const showArchivedSection = showArchived || hasSearch;
  const showEmptyActiveState = !filteredActiveProjects.length && (!hasSearch || !hasAnyFilteredProjects);
  const showActiveSearchEmptyState = hasSearch && !filteredActiveProjects.length && hasAnyFilteredProjects;

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
        {(activeProjects.length || completedProjects.length || archivedProjects.length) ? (
          <div className="mt-3">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('projects.searchPlaceholder')}
              aria-label={t('projects.searchPlaceholder')}
            />
          </div>
        ) : null}
      </Card>

      {!activeProjects.length && !completedProjects.length && !archivedProjects.length && (
        <Card className="space-y-2">
          <h2 className="text-base font-semibold text-slate-100">{t('projects.getStartedTitle')}</h2>
          <p className="text-sm text-slate-400">{t('projects.getStartedBody')}</p>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('projects.activeCount', { count: activeProjects.length })}</h2>
        {showEmptyActiveState ? (
          <EmptyState
            icon={<FolderKanban className="h-5 w-5 text-emerald-400" />}
            title={hasSearch ? t('projects.noSearchResultsTitle') : t('projects.noProjectsTitle')}
            message={hasSearch ? t('projects.noSearchResults') : t('projects.noProjectsMessage')}
            ctaLabel={hasSearch ? undefined : t('projects.createProject')}
            onCta={hasSearch ? undefined : () => setModalOpen(true)}
          />
        ) : showActiveSearchEmptyState ? (
          <Card>
            <p className="text-sm text-slate-500">{t('projects.noActiveSearchResults')}</p>
          </Card>
        ) : (
          filteredActiveProjects.map((project) => (
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
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showCompletedSection ? 'rotate-180' : ''}`} />
        </button>
        {showCompletedSection &&
          filteredCompletedProjects.map((project) => (
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
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showArchivedSection ? 'rotate-180' : ''}`} />
        </button>
        {showArchivedSection &&
          (filteredArchivedProjects.length ? (
            filteredArchivedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onReopen={() => setPendingAction({ type: 'restore', project })}
              />
            ))
          ) : (
            <Card>
              <p className="text-sm text-slate-500">
                {hasSearch ? t('projects.noSearchResults') : t('projects.noArchivedProjectsTitle')}
              </p>
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
