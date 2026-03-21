import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { completeTelegramSession, getTelegramMiniAppInitData, invokeTelegramAuthEndpoint, isTelegramMiniApp } from '../lib/telegram';

export function useTelegramAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = useCallback(async ({ provider, allowCreate = false, authData = null, initData = '' }) => {
    setLoading(true);
    setError('');

    try {
      const payload = await invokeTelegramAuthEndpoint({
        action: 'sign_in',
        allowCreate,
        authData,
        initData,
        provider,
      });

      if (payload?.status === 'ok' && payload?.tokenHash) {
        await completeTelegramSession(payload.tokenHash);
      }

      return payload;
    } catch (issue) {
      const message = issue.message || 'Telegram auth failed.';
      setError(message);
      throw issue;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithMiniApp = useCallback(
    async ({ allowCreate = false } = {}) =>
      signIn({
        allowCreate,
        initData: getTelegramMiniAppInitData(),
        provider: 'miniapp',
      }),
    [signIn]
  );

  const signInWithLoginWidget = useCallback(
    async (authData, { allowCreate = false } = {}) =>
      signIn({
        allowCreate,
        authData,
        provider: 'login_widget',
      }),
    [signIn]
  );

  const linkTelegram = useCallback(async ({ provider, authData = null, initData = '' }) => {
    setLoading(true);
    setError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || '';
      if (!accessToken) {
        throw new Error('No active session. Please log in again.');
      }

      return await invokeTelegramAuthEndpoint({
        accessToken,
        action: 'link',
        authData,
        initData,
        provider,
      });
    } catch (issue) {
      const message = issue.message || 'Telegram link failed.';
      setError(message);
      throw issue;
    } finally {
      setLoading(false);
    }
  }, []);

  const linkCurrentMiniAppTelegram = useCallback(
    async () =>
      linkTelegram({
        initData: getTelegramMiniAppInitData(),
        provider: 'miniapp',
      }),
    [linkTelegram]
  );

  const linkLoginWidgetTelegram = useCallback(
    async (authData) =>
      linkTelegram({
        authData,
        provider: 'login_widget',
      }),
    [linkTelegram]
  );

  return {
    clearError: () => setError(''),
    error,
    hasMiniApp: isTelegramMiniApp(),
    linkCurrentMiniAppTelegram,
    linkLoginWidgetTelegram,
    loading,
    signInWithLoginWidget,
    signInWithMiniApp,
  };
}
