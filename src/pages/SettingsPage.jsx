import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmActionModal from '../components/ui/ConfirmActionModal';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useProfile } from '../hooks/useProfile';
import { useProjects } from '../hooks/useProjects';
import { isConfiguredAdmin } from '../lib/admin';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { locale, locales, setLocale, t } = useLocale();
  const { theme, setTheme, themes } = useTheme();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { archivedProjects, reopenProject } = useProjects();
  const canAccessAdmin = isConfiguredAdmin(user);

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [restoreProject, setRestoreProject] = useState(null);
  const [restoring, setRestoring] = useState(false);

  if (profileLoading) return <LoadingSpinner label={t('settings.loading')} />;

  async function saveProfile() {
    setError('');
    const { error: updateError } = await updateProfile({ display_name: displayName.trim() || 'User' });
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStatusMessage(t('settings.saved'));
    setTimeout(() => setStatusMessage(''), 2000);
  }

  async function handleDeleteAccount() {
    if (deleteText !== 'DELETE') {
      setError(t('settings.typeDelete'));
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      setError(t('settings.missingSupabase'));
      return;
    }

    setDeleting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      setDeleting(false);
      setError(t('settings.missingSession'));
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
        // Ignore parse failures and keep generic message.
      }
      setDeleting(false);
      setError(message);
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
      return;
    }
    setRestoreProject(null);
  }

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold text-slate-50">{t('settings.title')}</h1>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {!error && statusMessage && <p className="mt-2 text-sm text-emerald-400">{statusMessage}</p>}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">{t('settings.profile')}</h2>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} onBlur={saveProfile} />
        <Input value={user?.email || ''} disabled />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">{t('settings.language')}</h2>
        <p className="text-sm text-slate-400">{t('settings.languageDescription')}</p>
        <div className="flex gap-2">
          {Object.entries(locales).map(([value, label]) => (
            <Button key={value} variant={locale === value ? 'primary' : 'secondary'} size="sm" onClick={() => setLocale(value)}>
              {label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">{t('settings.theme')}</h2>
        <p className="text-sm text-slate-400">{t('settings.themeDescription')}</p>
        <div className="grid gap-3 grid-cols-2">
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
                  <span
                    key={color}
                    className="dn-theme-swatch h-8 flex-1 rounded-lg"
                    style={{ background: color }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">{t('settings.habits')}</h2>
        <Link to="/habits" className="text-sm text-emerald-400 hover:text-emerald-300">
          {t('settings.manageHabits')}
        </Link>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">{t('settings.projects')}</h2>
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
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">{t('settings.account')}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={signOut}>
            {t('settings.logOut')}
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            {t('settings.deleteAccount')}
          </Button>
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

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">{t('settings.about')}</h2>
        <p className="text-sm text-slate-300">{t('settings.version')}</p>
        <Link to="/privacy/" className="text-sm text-emerald-400 hover:text-emerald-300">
          {t('common.privacyPolicy')}
        </Link>
        <p className="text-sm text-slate-400">{t('settings.privacyPolicyDescription')}</p>
        <a
          className="text-sm text-emerald-400 hover:text-emerald-300"
          href="https://t.me/ismoilmirzouz"
          target="_blank"
          rel="noreferrer"
        >
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
        <p className="text-sm text-slate-300">
          {t('settings.deletePrompt')}
        </p>
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
