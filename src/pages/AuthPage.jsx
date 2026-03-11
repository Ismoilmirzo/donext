import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const { user } = useAuth();
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
      setError('Enter your email first.');
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage('Password reset link sent. Check your inbox.');
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
        setError('Passwords do not match.');
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
      else setMessage('Account created. Continue with login if email confirmation is required.');
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
            DoNext
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-100">
            {mode === 'signup' ? 'Create account' : 'Welcome back'}
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
            Sign Up
          </button>
          <button
            onClick={() => {
              setMode('login');
              setError('');
              setMessage('');
            }}
            className={`rounded-md px-3 py-2 text-sm ${mode === 'login' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
          >
            Log In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <Input placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          )}
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {mode === 'signup' && (
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Log In'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-700"></div>
          <span className="text-xs text-slate-500">or</span>
          <div className="h-px flex-1 bg-slate-700"></div>
        </div>

        <Button variant="secondary" className="w-full" onClick={handleGoogleAuth} disabled={loading}>
          Continue with Google
        </Button>

        {mode === 'login' && (
          <button onClick={handleForgotPassword} className="mt-4 text-sm text-slate-400 hover:text-slate-200">
            Forgot password?
          </button>
        )}
      </Card>
    </div>
  );
}
