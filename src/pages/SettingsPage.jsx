import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useProjects } from '../hooks/useProjects';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { archivedProjects, reopenProject } = useProjects();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (profileLoading) return <LoadingSpinner label="Loading settings..." />;

  async function saveProfile() {
    setError('');
    const { error: updateError } = await updateProfile({ display_name: displayName.trim() || 'User' });
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStatusMessage('Saved');
    setTimeout(() => setStatusMessage(''), 2000);
  }

  async function handleDeleteAccount() {
    if (deleteText !== 'DELETE') {
      setError('Type DELETE to confirm account deletion.');
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('App is not configured: missing Supabase environment values.');
      return;
    }

    setDeleting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      setDeleting(false);
      setError('No active session. Please log in again.');
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
      let message = 'Account deletion failed.';
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

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold text-slate-50">Settings</h1>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {!error && statusMessage && <p className="mt-2 text-sm text-emerald-400">{statusMessage}</p>}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">Profile</h2>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} onBlur={saveProfile} />
        <Input value={user?.email || ''} disabled />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">Habits</h2>
        <Link to="/habits" className="text-sm text-emerald-400 hover:text-emerald-300">
          Manage habits →
        </Link>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">Projects</h2>
        <p className="text-sm text-slate-400">View archived projects and restore them.</p>
        <div className="space-y-2">
          {!archivedProjects.length && <p className="text-sm text-slate-500">No archived projects.</p>}
          {archivedProjects.map((project) => (
            <div key={project.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
              <p className="text-sm text-slate-200">{project.title}</p>
              <Button size="sm" variant="secondary" onClick={() => reopenProject(project.id)}>
                Restore
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">Account</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={signOut}>
            Log out
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">About</h2>
        <p className="text-sm text-slate-300">Version: 1.0</p>
        <a className="text-sm text-emerald-400 hover:text-emerald-300" href="mailto:feedback@donext.app">
          Send Feedback
        </a>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete account"
        footer={
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Confirm delete'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-300">
          This will permanently delete your account and all related data. Type <span className="font-mono">DELETE</span> to confirm.
        </p>
        <div className="mt-3">
          <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="Type DELETE" />
        </div>
      </Modal>
    </div>
  );
}
