import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import LocaleSwitcher from '../components/ui/LocaleSwitcher';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const { user, profile } = useAuth();
  const { t } = useLocale();
  const [mode, setMode] = useState('signup');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAuthSettings() {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) return;

      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
          headers: { apikey: supabaseAnonKey },
        });
        if (!response.ok) return;

        const payload = await response.json();
        if (active) {
          setGoogleEnabled(Boolean(payload?.external?.google));
        }
      } catch {
        if (active) {
          setGoogleEnabled(null);
        }
      }
    }

    void loadAuthSettings();
    return () => {
      active = false;
    };
  }, []);

  function getAuthRedirectUrl() {
    return new URL('/auth/', window.location.origin).toString();
  }

  function resetAuthState(nextMode) {
    setMode(nextMode);
    setPendingVerification(false);
    setVerificationCode('');
    setError('');
    setMessage('');
  }

  const passwordStrength = useMemo(() => {
    if (!password) return null;
    if (password.length >= 12 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)) {
      return { label: 'Strong', width: '100%', className: 'bg-emerald-500' };
    }
    if (password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)) {
      return { label: 'Medium', width: '68%', className: 'bg-amber-400' };
    }
    return { label: 'Weak', width: '36%', className: 'bg-red-400' };
  }, [password]);

  if (user) return <Navigate to={profile?.onboarding_done ? '/habits' : '/welcome'} replace />;

  async function handleForgotPassword() {
    if (!email) {
      setError(t('auth.enterEmailFirst'));
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl(),
    });
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage(t('auth.resetSent'));
  }

  async function handleGoogleAuth() {
    setError('');
    setMessage('');

    if (googleEnabled === false) {
      setError(t('auth.googleDisabled'));
      return;
    }

    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getAuthRedirectUrl() },
    });
    if (oauthError) setError(oauthError.message);
    setLoading(false);
  }

  async function handleVerifyCode(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: verificationCode.trim(),
      type: 'signup',
      options: { redirectTo: getAuthRedirectUrl() },
    });

    if (verifyError) {
      setError(verifyError.message);
    } else {
      setMessage(t('auth.verificationSuccess'));
    }

    setLoading(false);
  }

  async function handleResendCode() {
    setError('');
    setMessage('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setMessage(t('auth.verificationCodeSent', { email: normalizedEmail }));
    }

    setLoading(false);
  }

  async function handleSubmit(event) {
    if (mode === 'signup' && pendingVerification) {
      await handleVerifyCode(event);
      return;
    }

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
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });

      if (signUpError) setError(signUpError.message);
      else {
        setPendingVerification(true);
        setVerificationCode('');
        setMessage(t('auth.verificationCodeSent', { email: normalizedEmail }));
      }
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
    <div className="dn-page-shell flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md md:max-w-lg">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <Link to="/" className="dn-brand text-xl font-semibold">
              {t('common.appName')}
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LocaleSwitcher />
            </div>
          </div>
          <div className="mt-5 text-center">
            <h1 className="text-2xl font-bold text-slate-100 md:text-3xl">
              {mode === 'signup' ? t('auth.createAccount') : t('auth.welcomeBack')}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {mode === 'signup'
                ? pendingVerification
                  ? t('auth.verificationHelper')
                  : t('auth.signupHelper')
                : t('auth.loginHelper')}
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-900 p-1">
          <button
            onClick={() => resetAuthState('signup')}
            className={`rounded-md px-3 py-2 text-sm ${mode === 'signup' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
          >
            {t('auth.signUp')}
          </button>
          <button
            onClick={() => resetAuthState('login')}
            className={`rounded-md px-3 py-2 text-sm ${mode === 'login' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
          >
            {t('auth.logIn')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && !pendingVerification && (
            <Input placeholder={t('auth.displayName')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          )}
          <Input type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
          {mode === 'signup' && pendingVerification ? (
            <>
              <p className="text-sm text-slate-400">{t('auth.verificationHint', { email: email.trim().toLowerCase() || '-' })}</p>
              <Input placeholder={t('auth.verificationCode')} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} required />
            </>
          ) : (
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="dn-icon-button absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}
          {mode === 'signup' && !pendingVerification && (
            <>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t('auth.confirmPassword')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="dn-icon-button absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordStrength && (
                <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Password strength</span>
                    <span>{passwordStrength.label}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className={`h-2 rounded-full ${passwordStrength.className}`} style={{ width: passwordStrength.width }} />
                  </div>
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? t('auth.pleaseWait')
              : mode === 'signup'
                ? pendingVerification
                  ? t('auth.verifyCode')
                  : t('auth.createAccountAction')
                : t('auth.logIn')}
          </Button>

          {mode === 'signup' && pendingVerification && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handleResendCode} disabled={loading}>
                {t('auth.resendCode')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => resetAuthState('signup')} disabled={loading}>
                {t('auth.backToSignUp')}
              </Button>
            </div>
          )}
        </form>

        <div className="my-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-700"></div>
          <span className="text-xs text-slate-500">{t('common.or')}</span>
          <div className="h-px flex-1 bg-slate-700"></div>
        </div>

        <Button variant="secondary" className="w-full" onClick={handleGoogleAuth} disabled={loading || googleEnabled === false}>
          {t('auth.continueWithGoogle')}
        </Button>
        {googleEnabled === false && <p className="mt-3 text-sm text-amber-300">{t('auth.googleDisabled')}</p>}
        {googleEnabled !== false && <p className="mt-3 text-sm text-slate-400">{t('auth.googleHelper')}</p>}

        {mode === 'login' && (
          <button onClick={handleForgotPassword} className="mt-4 text-sm text-slate-400 hover:text-slate-200">
            {t('auth.forgotPassword')}
          </button>
        )}

        {mode === 'signup' && <p className="mt-4 text-center text-xs leading-5 text-slate-500">{t('auth.afterSignupHint')}</p>}

        <div className="mt-6 text-center text-xs text-slate-500">
          <Link to="/privacy/" className="hover:text-slate-300">
            {t('common.privacyPolicy')}
          </Link>
        </div>
      </Card>
    </div>
  );
}
