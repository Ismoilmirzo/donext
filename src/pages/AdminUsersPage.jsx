import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmActionModal from '../components/ui/ConfirmActionModal';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { isConfiguredAdmin, isUserSuspended } from '../lib/admin';
import { formatMinutesHuman } from '../lib/dates';
import { getLocaleTag } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { getTaskFocusMinutes } from '../lib/taskSessions';

function formatDate(value, locale) {
  if (!value) return '-';
  return new Date(value).toLocaleString(getLocaleTag(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailSection({ title, emptyLabel, children, hasItems }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      {hasItems ? children : <p className="text-sm text-slate-400">{emptyLabel}</p>}
    </div>
  );
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [pendingAction, setPendingAction] = useState('');

  const getAccessToken = useCallback(async (refresh = false) => {
    if (refresh) {
      const refreshRes = await supabase.auth.refreshSession();
      return refreshRes.data.session?.access_token || '';
    }

    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.access_token || '';
  }, []);

  const invokeAdminEndpoint = useCallback(
    async ({ method = 'GET', body = null }) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(t('adminUsers.missingConfig'));
      }

      let accessToken = await getAccessToken();
      if (!accessToken) {
        accessToken = await getAccessToken(true);
      }
      if (!accessToken) {
        throw new Error(t('adminUsers.missingSession'));
      }

      async function fetchAdminEndpoint(token) {
        return fetch(`${supabaseUrl}/functions/v1/admin-list-users`, {
          method,
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${token}`,
            'x-user-jwt': token,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });
      }

      let response = await fetchAdminEndpoint(accessToken);
      if (response.status === 401) {
        const refreshedToken = await getAccessToken(true);
        if (refreshedToken) {
          response = await fetchAdminEndpoint(refreshedToken);
        }
      }

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || t('adminUsers.loadFailed'));
      }

      return payload;
    },
    [getAccessToken, t]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    if (!isConfiguredAdmin(user)) {
      setError(t('adminUsers.notAuthorized'));
      setLoading(false);
      return;
    }

    try {
      const payload = await invokeAdminEndpoint({ method: 'GET' });
      setUsers(payload?.users || []);
    } catch (loadError) {
      setError(loadError.message || t('adminUsers.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [invokeAdminEndpoint, t, user]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((entry) => {
      const haystack = [entry.email, entry.display_name, entry.timezone, ...(entry.providers || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [search, users]);

  const totals = useMemo(
    () =>
      filteredUsers.reduce(
        (acc, entry) => {
          acc.users += 1;
          acc.projects += entry.stats?.projects || 0;
          acc.tasks += entry.stats?.tasks || 0;
          acc.focusMinutes += entry.stats?.focus_minutes || 0;
          return acc;
        },
        { users: 0, projects: 0, tasks: 0, focusMinutes: 0 }
      ),
    [filteredUsers]
  );

  function updateUserInState(updatedUser) {
    setUsers((current) => current.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)));
    setSelectedUser((current) => (current?.id === updatedUser.id ? updatedUser : current));
  }

  async function handleOpenDetails(entry) {
    setSelectedUser(entry);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);

    try {
      const payload = await invokeAdminEndpoint({
        method: 'POST',
        body: { action: 'detail', userId: entry.id },
      });
      if (payload?.user) {
        updateUserInState(payload.user);
        setSelectedUser(payload.user);
      }
      setDetail(payload?.detail || null);
    } catch (loadError) {
      setDetailError(loadError.message || t('adminUsers.loadFailed'));
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleUserAction(action) {
    if (!selectedUser) return;

    setActionLoading(action);
    setDetailError('');
    setStatusMessage('');

    try {
      const payload = await invokeAdminEndpoint({
        method: 'POST',
        body: { action, userId: selectedUser.id },
      });

      if (action === 'delete') {
        setUsers((current) => current.filter((entry) => entry.id !== selectedUser.id));
        setSelectedUser(null);
        setDetail(null);
      } else if (payload?.user) {
        updateUserInState(payload.user);
      }

      setStatusMessage(t('adminUsers.actionCompleted'));
    } catch (actionError) {
      setDetailError(actionError.message || t('adminUsers.loadFailed'));
    } finally {
      setActionLoading('');
    }
  }

  const actionConfig =
    pendingAction === 'delete'
      ? { title: t('adminUsers.deleteUser'), message: t('adminUsers.confirmDelete'), label: t('adminUsers.deleteUser'), variant: 'danger' }
      : pendingAction === 'suspend'
        ? { title: t('adminUsers.suspend'), message: t('adminUsers.confirmSuspend'), label: t('adminUsers.suspend'), variant: 'secondary' }
        : pendingAction === 'unsuspend'
          ? { title: t('adminUsers.unsuspend'), message: t('adminUsers.confirmUnsuspend'), label: t('adminUsers.unsuspend'), variant: 'primary' }
          : null;

  if (loading) return <LoadingSpinner label={t('adminUsers.loading')} />;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-300">{t('adminUsers.badge')}</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-50">{t('adminUsers.title')}</h1>
            <p className="mt-1 text-sm text-slate-400">{t('adminUsers.subtitle', { email: user?.email || '-' })}</p>
          </div>
          <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-slate-100">
            <ArrowLeft className="h-4 w-4" />
            {t('adminUsers.backToSettings')}
          </Link>
        </div>
      </Card>

      {statusMessage && !error && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <p className="text-sm text-emerald-200">{statusMessage}</p>
        </Card>
      )}

      {error ? (
        <Card className="space-y-3 border-red-500/30 bg-red-500/10">
          <div className="inline-flex items-center gap-2 text-red-300">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">{t('adminUsers.accessIssue')}</span>
          </div>
          <p className="text-sm text-red-100">{error}</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.totalUsers')}</p>
              <p className="mt-2 text-3xl font-bold text-slate-50">{totals.users}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.totalProjects')}</p>
              <p className="mt-2 text-3xl font-bold text-slate-50">{totals.projects}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.totalTasks')}</p>
              <p className="mt-2 text-3xl font-bold text-slate-50">{totals.tasks}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.totalFocus')}</p>
              <p className="mt-2 text-3xl font-bold text-slate-50">{formatMinutesHuman(totals.focusMinutes)}</p>
            </Card>
          </div>

          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-slate-100">
                <Users className="h-4 w-4 text-emerald-400" />
                <span className="font-medium">{t('adminUsers.userList')}</span>
              </div>
              <p className="text-sm text-slate-400">{t('adminUsers.visibleCount', { count: filteredUsers.length, total: users.length })}</p>
            </div>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('adminUsers.searchPlaceholder')} />
          </Card>

          <div className="space-y-4">
            {filteredUsers.map((entry) => {
              const suspended = isUserSuspended(entry);

              return (
                <Card key={entry.id} className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-50">{entry.display_name || t('adminUsers.noName')}</h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            suspended ? 'bg-amber-500/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-200'
                          }`}
                        >
                          {suspended ? t('adminUsers.statusSuspended') : t('adminUsers.statusActive')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{entry.email || '-'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(entry.providers || []).map((provider) => (
                        <span key={provider} className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-300">
                          {provider}
                        </span>
                      ))}
                      {!entry.providers?.length && (
                        <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-400">
                          {t('adminUsers.unknownProvider')}
                        </span>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => handleOpenDetails(entry)}>
                        {t('adminUsers.openDetails')}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.createdAt')}</p>
                      <p className="mt-1">{formatDate(entry.created_at, locale)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.lastSignIn')}</p>
                      <p className="mt-1">{formatDate(entry.last_sign_in_at, locale)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.timezone')}</p>
                      <p className="mt-1">{entry.timezone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.onboarding')}</p>
                      <p className="mt-1">{entry.onboarding_done ? t('adminUsers.completed') : t('adminUsers.incomplete')}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.habits')}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-50">{entry.stats?.habits || 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.projects')}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-50">{entry.stats?.projects || 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.tasks')}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-50">{entry.stats?.tasks || 0}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {t('adminUsers.completedTasks', { count: entry.stats?.completed_tasks || 0 })}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.focusSessions')}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-50">{entry.stats?.focus_sessions || 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.focusTime')}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-50">{formatMinutesHuman(entry.stats?.focus_minutes || 0)}</p>
                    </div>
                  </div>
                </Card>
              );
            })}

            {!filteredUsers.length && (
              <Card>
                <p className="text-sm text-slate-400">{t('adminUsers.noResults')}</p>
              </Card>
            )}
          </div>
        </>
      )}

      <Modal
        open={Boolean(selectedUser)}
        onClose={() => {
          if (actionLoading) return;
          setSelectedUser(null);
          setDetail(null);
          setDetailError('');
        }}
        title={t('adminUsers.userDetails')}
        panelClassName="max-w-4xl"
        bodyClassName="space-y-6 max-h-[75vh] overflow-y-auto"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="secondary" onClick={() => setSelectedUser(null)} disabled={Boolean(actionLoading)}>
              {t('adminUsers.close')}
            </Button>
            {selectedUser && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setPendingAction(isUserSuspended(selectedUser) ? 'unsuspend' : 'suspend')}
                  disabled={Boolean(actionLoading)}
                >
                  {actionLoading === 'suspend' || actionLoading === 'unsuspend'
                    ? t('adminUsers.actionInProgress')
                    : isUserSuspended(selectedUser)
                      ? t('adminUsers.unsuspend')
                      : t('adminUsers.suspend')}
                </Button>
                <Button variant="danger" onClick={() => setPendingAction('delete')} disabled={Boolean(actionLoading)}>
                  {actionLoading === 'delete' ? t('adminUsers.actionInProgress') : t('adminUsers.deleteUser')}
                </Button>
              </div>
            )}
          </div>
        }
      >
        {!selectedUser ? null : detailLoading ? (
          <LoadingSpinner label={t('adminUsers.detailsLoading')} />
        ) : (
          <div className="space-y-6">
            {detailError && <p className="text-sm text-red-300">{detailError}</p>}

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-50">{selectedUser.display_name || t('adminUsers.noName')}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isUserSuspended(selectedUser) ? 'bg-amber-500/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-200'
                    }`}
                  >
                    {isUserSuspended(selectedUser) ? t('adminUsers.statusSuspended') : t('adminUsers.statusActive')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{selectedUser.email || '-'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(selectedUser.providers || []).map((provider) => (
                  <span key={provider} className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-300">
                    {provider}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.createdAt')}</p>
                <p className="mt-1 break-all">{formatDate(selectedUser.created_at, locale)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.lastSignIn')}</p>
                <p className="mt-1 break-all">{formatDate(selectedUser.last_sign_in_at, locale)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.emailConfirmedAt')}</p>
                <p className="mt-1 break-all">{formatDate(selectedUser.email_confirmed_at, locale)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.authUserId')}</p>
                <p className="mt-1 break-all text-xs text-slate-400">{selectedUser.id}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.habits')}</p>
                <p className="mt-2 text-xl font-semibold text-slate-50">{selectedUser.stats?.habits || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.projects')}</p>
                <p className="mt-2 text-xl font-semibold text-slate-50">{selectedUser.stats?.projects || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.tasks')}</p>
                <p className="mt-2 text-xl font-semibold text-slate-50">{selectedUser.stats?.tasks || 0}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {t('adminUsers.completedTasks', { count: selectedUser.stats?.completed_tasks || 0 })}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.focusSessions')}</p>
                <p className="mt-2 text-xl font-semibold text-slate-50">{selectedUser.stats?.focus_sessions || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminUsers.focusTime')}</p>
                <p className="mt-2 text-xl font-semibold text-slate-50">{formatMinutesHuman(selectedUser.stats?.focus_minutes || 0)}</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <DetailSection title={t('adminUsers.recentProjects')} emptyLabel={t('adminUsers.noProjects')} hasItems={detail?.projects?.length}>
                <div className="space-y-2">
                  {detail?.projects?.map((project) => (
                    <div key={project.id} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-100">{project.title}</p>
                        <span className="text-xs text-slate-400">{project.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(project.updated_at || project.created_at, locale)}</p>
                    </div>
                  ))}
                </div>
              </DetailSection>

              <DetailSection title={t('adminUsers.recentTasks')} emptyLabel={t('adminUsers.noTasks')} hasItems={detail?.tasks?.length}>
                <div className="space-y-2">
                  {detail?.tasks?.map((task) => (
                    <div key={task.id} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-100">{task.title}</p>
                        <span className="text-xs text-slate-400">{task.status}</span>
                      </div>
                      {task.project_title && <p className="mt-1 text-xs text-slate-400">{t('adminUsers.projectLabel', { value: task.project_title })}</p>}
                      {getTaskFocusMinutes(task) ? (
                        <p className="mt-1 text-xs text-slate-400">{t('adminUsers.timeSpent', { count: getTaskFocusMinutes(task) })}</p>
                      ) : null}
                      {task.sessions_count > 0 ? <p className="mt-1 text-xs text-slate-500">{t('stats.sessionsLabel', { count: task.sessions_count })}</p> : null}
                    </div>
                  ))}
                </div>
              </DetailSection>

              <DetailSection title={t('adminUsers.recentHabits')} emptyLabel={t('adminUsers.noHabits')} hasItems={detail?.habits?.length}>
                <div className="space-y-2">
                  {detail?.habits?.map((habit) => (
                    <div key={habit.id} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-100">{habit.title}</p>
                        <span className="text-xs text-slate-400">{habit.is_active ? t('adminUsers.statusActive') : t('adminUsers.inactive')}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(habit.updated_at || habit.created_at, locale)}</p>
                    </div>
                  ))}
                </div>
              </DetailSection>

              <DetailSection
                title={t('adminUsers.recentFocusSessions')}
                emptyLabel={t('adminUsers.noFocusSessions')}
                hasItems={detail?.focusSessions?.length}
              >
                <div className="space-y-2">
                  {detail?.focusSessions?.map((session) => (
                    <div key={session.id} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-100">{formatMinutesHuman(session.duration_minutes || 0)}</p>
                        <span className="text-xs text-slate-400">{session.date}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{t('adminUsers.focusDate', { value: session.date || '-' })}</p>
                    </div>
                  ))}
                </div>
              </DetailSection>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmActionModal
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction('')}
        onConfirm={async () => {
          const action = pendingAction;
          setPendingAction('');
          await handleUserAction(action);
        }}
        title={actionConfig?.title || ''}
        message={actionConfig?.message || ''}
        confirmLabel={actionConfig?.label || t('common.confirm')}
        cancelLabel={t('common.cancel')}
        confirmVariant={actionConfig?.variant || 'primary'}
        loading={Boolean(actionLoading)}
      />
    </div>
  );
}
