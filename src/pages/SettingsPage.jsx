import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmActionModal from '../components/ui/ConfirmActionModal';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { SettingsPageSkeleton } from '../components/ui/PageSkeletons';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useProfile } from '../hooks/useProfile';
import { useProjects } from '../hooks/useProjects';
import { isConfiguredAdmin } from '../lib/admin';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { locales, setLocale, t } = useLocale();
  const { theme, setTheme, themes } = useTheme();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { archivedProjects, reopenProject } = useProjects();
  const toast = useToast();
  const canAccessAdmin = isConfiguredAdmin(user);

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [restoreProject, setRestoreProject] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportCooldown, setExportCooldown] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);

  if (profileLoading) return <SettingsPageSkeleton />;

  async function saveProfile() {
    setError('');
    const { error: updateError } = await updateProfile({ display_name: displayName.trim() || 'User' });
    if (updateError) {
      setError(updateError.message);
      toast.error(updateError.message);
      return;
    }
    setStatusMessage(t('settings.saved'));
    toast.success(t('settings.saved'));
    setTimeout(() => setStatusMessage(''), 2000);
  }

  async function handleDeleteAccount() {
    if (deleteText !== 'DELETE') {
      setError(t('settings.typeDelete'));
      toast.error(t('settings.typeDelete'));
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      setError(t('settings.missingSupabase'));
      toast.error(t('settings.missingSupabase'));
      return;
    }

    setDeleting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      setDeleting(false);
      setError(t('settings.missingSession'));
      toast.error(t('settings.missingSession'));
      return;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/account-delete-user`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'x-user-jwt': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      let message = t('settings.accountDeletionFailed');
      try {
        const payload = await response.json();
        message = payload?.error || payload?.message || message;
      } catch {
        // Keep generic error.
      }
      setDeleting(false);
      setError(message);
      toast.error(message);
      return;
    }

    await signOut();
    setDeleting(false);
  }

  async function handleRestoreProject() {
    if (!restoreProject) return;
    setRestoring(true);
    const { error: reopenError } = await reopenProject(restoreProject.id);
    setRestoring(false);
    if (reopenError) {
      setError(reopenError.message);
      toast.error(reopenError.message);
      return;
    }
    setRestoreProject(null);
    toast.success(t('toasts.projectRestored'), restoreProject.title);
  }

  async function handleExportData() {
    if (exportCooldown) return;
    setExporting(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(t('settings.missingSupabase'));
      }

      async function getAccessToken() {
        const sessionRes = await supabase.auth.getSession();
        return sessionRes.data?.session?.access_token || '';
      }

      async function fetchExport(accessToken) {
        return fetch(`${supabaseUrl}/functions/v1/export-data`, {
          method: 'POST',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            'x-user-jwt': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
      }

      let accessToken = await getAccessToken();
      if (!accessToken) {
        const refreshRes = await supabase.auth.refreshSession();
        accessToken = refreshRes.data.session?.access_token || '';
      }
      if (!accessToken) {
        throw new Error(t('settings.missingSession'));
      }

      let response = await fetchExport(accessToken);
      if (response.status === 401) {
        const refreshRes = await supabase.auth.refreshSession();
        const refreshedToken = refreshRes.data.session?.access_token || '';
        if (refreshedToken) {
          response = await fetchExport(refreshedToken);
        }
      }

      if (!response.ok) {
        let message = t('settings.exportFailed');
        try {
          const payload = await response.json();
          message = payload?.error || payload?.message || message;
        } catch {
          // Keep generic export error.
        }
        throw new Error(message);
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `donext-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage(t('settings.exportReady'));
      toast.success(t('settings.exportReady'));
      setExportCooldown(true);
      window.setTimeout(() => setExportCooldown(false), 60000);
    } catch (exportIssue) {
      const message = exportIssue.message || t('settings.exportFailed');
      setError(message);
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold text-slate-50">{t('settings.title')}</h1>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {!error && statusMessage && <p className="mt-2 text-sm text-emerald-400">{statusMessage}</p>}
      </Card>

      <Card className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t('sections.personal')}</p>
        <h2 className="text-base font-semibold text-slate-100">{t('settings.profile')}</h2>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} onBlur={saveProfile} />
        <Input value={user?.email || ''} disabled />
      </Card>

      <Card className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t('sections.appearance')}</p>
        <h2 className="text-base font-semibold text-slate-100">{t('settings.language')}</h2>
        <p className="text-sm text-slate-400">{t('settings.languageDescription')}</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(locales).map(([value, label]) => (
            <Button key={value} variant="secondary" size="sm" onClick={() => setLocale(value)}>
              {label}
            </Button>
          ))}
        </div>
        <h2 className="pt-2 text-base font-semibold text-slate-100">{t('settings.theme')}</h2>
        <p className="text-sm text-slate-400">{t('settings.themeDescription')}</p>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(themes).map(([value, config]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              data-active={theme === value}
              className="dn-theme-option rounded-xl p-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{t(`settings.themes.${value}.name`)}</p>
                  <p className="mt-1 text-xs text-slate-400">{t(`settings.themes.${value}.description`)}</p>
                </div>
                {theme === value && (
                  <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-300">
                    {t('settings.themeSelected')}
                  </span>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                {config.preview.map((color) => (
                  <span key={color} className="dn-theme-swatch h-8 flex-1 rounded-lg" style={{ background: color }} aria-hidden="true" />
                ))}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t('sections.data')}</p>
        <h2 className="text-base font-semibold text-slate-100">{t('settings.habits')}</h2>
        <Link to="/habits" className="text-sm text-emerald-400 hover:text-emerald-300">
          {t('settings.manageHabits')}
        </Link>
        <h2 className="pt-2 text-base font-semibold text-slate-100">{t('settings.projects')}</h2>
        <p className="text-sm text-slate-400">{t('settings.archivedDescription')}</p>
        <div className="space-y-2">
          {!archivedProjects.length && <p className="text-sm text-slate-500">{t('settings.noArchivedProjects')}</p>}
          {archivedProjects.map((project) => (
            <div key={project.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
              <p className="text-sm text-slate-200">{project.title}</p>
              <Button size="sm" variant="secondary" onClick={() => setRestoreProject(project)}>
                {t('common.restore')}
              </Button>
            </div>
          ))}
        </div>
        <Link to="/projects" className="text-sm text-emerald-400 hover:text-emerald-300">
          {t('projects.openArchive')}
        </Link>
        <h2 className="pt-2 text-base font-semibold text-slate-100">{t('settings.dataPrivacy')}</h2>
        <p className="text-sm text-slate-400">{t('settings.exportDescription')}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void handleExportData()} disabled={exporting || exportCooldown}>
            {exporting ? t('settings.exporting') : exportCooldown ? t('settings.exportCooldown') : t('settings.downloadData')}
          </Button>
          <Link to="/privacy/" className="inline-flex items-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-emerald-300 hover:text-emerald-200">
            {t('common.privacyPolicy')}
          </Link>
        </div>
      </Card>

      {canAccessAdmin && (
        <Card className="space-y-3">
          <h2 className="text-base font-semibold text-slate-100">{t('settings.admin')}</h2>
          <p className="text-sm text-slate-400">{t('settings.adminDescription')}</p>
          <Link to="/admin/users" className="text-sm text-emerald-400 hover:text-emerald-300">
            {t('settings.viewUsers')}
          </Link>
        </Card>
      )}

      <div className="pt-2">
        <div className="mb-4 h-px w-full bg-red-500/15" />
        <Card className={`space-y-3 ${dangerOpen ? 'border-red-500/40' : 'border-slate-700'}`}>
          <button type="button" onClick={() => setDangerOpen((prev) => !prev)} className="flex w-full items-center justify-between text-left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-300">{t('sections.dangerZone')}</p>
              <h2 className="mt-2 text-base font-semibold text-slate-100">{t('settings.account')}</h2>
            </div>
            <span className="text-sm text-slate-500">{dangerOpen ? t('sections.hide') : t('sections.show')}</span>
          </button>
          {dangerOpen && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">{t('sections.dangerDescription')}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={signOut}>
                  {t('settings.logOut')}
                </Button>
                <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                  {t('settings.deleteAccount')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">{t('settings.about')}</h2>
        <p className="text-sm text-slate-300">{t('settings.version')}</p>
        <p className="text-sm text-slate-400">{t('settings.privacyPolicyDescription')}</p>
        <a className="text-sm text-emerald-400 hover:text-emerald-300" href="https://t.me/ismoilmirzouz" target="_blank" rel="noreferrer">
          {t('settings.sendFeedback')}
        </a>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t('settings.deleteModalTitle')}
        footer={
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? t('settings.deleting') : t('settings.confirmDelete')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-300">{t('settings.deletePrompt')}</p>
        <div className="mt-3">
          <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder={t('settings.deletePlaceholder')} />
        </div>
      </Modal>

      <ConfirmActionModal
        open={Boolean(restoreProject)}
        onClose={() => setRestoreProject(null)}
        onConfirm={handleRestoreProject}
        title={t('projects.confirmRestoreTitle')}
        message={t('projects.confirmRestoreBody', { title: restoreProject?.title || '' })}
        confirmLabel={t('common.restore')}
        cancelLabel={t('common.cancel')}
        confirmVariant="primary"
        loading={restoring}
      />
    </div>
  );
}
