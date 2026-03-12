import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { isConfiguredAdmin } from '../lib/admin';
import { formatMinutesHuman } from '../lib/dates';
import { getLocaleTag } from '../lib/i18n';
import { supabase } from '../lib/supabase';

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

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      setLoading(true);
      setError('');

      if (!isConfiguredAdmin(user)) {
        if (active) {
          setError(t('adminUsers.notAuthorized'));
          setLoading(false);
        }
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        if (active) {
          setError(t('adminUsers.missingConfig'));
          setLoading(false);
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        if (active) {
          setError(t('adminUsers.missingSession'));
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/admin-list-users`, {
          method: 'GET',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
          },
        });

        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          const message = payload?.error || payload?.message || t('adminUsers.loadFailed');
          if (active) {
            setError(message);
            setLoading(false);
          }
          return;
        }

        if (active) {
          setUsers(payload?.users || []);
          setLoading(false);
        }
      } catch {
        if (active) {
          setError(t('adminUsers.loadFailed'));
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      active = false;
    };
  }, [t, user]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((entry) => {
      const haystack = [
        entry.email,
        entry.display_name,
        entry.timezone,
        ...(entry.providers || []),
      ]
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
            {filteredUsers.map((entry) => (
              <Card key={entry.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-50">{entry.display_name || t('adminUsers.noName')}</h2>
                    <p className="text-sm text-slate-300">{entry.email || '-'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
            ))}

            {!filteredUsers.length && (
              <Card>
                <p className="text-sm text-slate-400">{t('adminUsers.noResults')}</p>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
