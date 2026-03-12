import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [mode, setMode] = useState('signup');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to="/habits" replace />;

  async function handleForgotPassword() {
    if (!email) {
      setError(t('auth.enterEmailFirst'));
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage(t('auth.resetSent'));
  }

  async function handleGoogleAuth() {
    setError('');
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (oauthError) setError(oauthError.message);
    setLoading(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError(t('auth.passwordsMismatch'));
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: displayName.trim() || normalizedEmail.split('@')[0],
          },
        },
      });

      if (signUpError) setError(signUpError.message);
      else setMessage(t('auth.accountCreated'));
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInError) setError(signInError.message);
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="text-xl font-semibold text-emerald-400">
            {t('common.appName')}
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-100">
            {mode === 'signup' ? t('auth.createAccount') : t('auth.welcomeBack')}
          </h1>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-900 p-1">
          <button
            onClick={() => {
              setMode('signup');
              setError('');
              setMessage('');
            }}
            className={`rounded-md px-3 py-2 text-sm ${mode === 'signup' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
          >
            {t('auth.signUp')}
          </button>
          <button
            onClick={() => {
              setMode('login');
              setError('');
              setMessage('');
            }}
            className={`rounded-md px-3 py-2 text-sm ${mode === 'login' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
          >
            {t('auth.logIn')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <Input placeholder={t('auth.displayName')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          )}
          <Input type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} required />
          {mode === 'signup' && (
            <Input
              type="password"
              placeholder={t('auth.confirmPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth.pleaseWait') : mode === 'signup' ? t('auth.createAccountAction') : t('auth.logIn')}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-700"></div>
          <span className="text-xs text-slate-500">{t('common.or')}</span>
          <div className="h-px flex-1 bg-slate-700"></div>
        </div>

        <Button variant="secondary" className="w-full" onClick={handleGoogleAuth} disabled={loading}>
          {t('auth.continueWithGoogle')}
        </Button>

        {mode === 'login' && (
          <button onClick={handleForgotPassword} className="mt-4 text-sm text-slate-400 hover:text-slate-200">
            {t('auth.forgotPassword')}
          </button>
        )}
      </Card>
    </div>
  );
}
