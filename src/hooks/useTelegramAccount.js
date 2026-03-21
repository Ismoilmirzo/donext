import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function useTelegramAccount() {
  const { user } = useAuth();
  const [telegramAccount, setTelegramAccount] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');

  const fetchTelegramAccount = useCallback(async () => {
    if (!user?.id) {
      setTelegramAccount(null);
      setLoading(false);
      setError('');
      return null;
    }

    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('telegram_accounts')
      .select('telegram_user_id, telegram_username, first_name, last_name, photo_url, linked_at, last_login_at')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (queryError) {
      setTelegramAccount(null);
      setError(queryError.message);
      setLoading(false);
      return null;
    }

    setTelegramAccount(data || null);
    setLoading(false);
    return data || null;
  }, [user]);

  useEffect(() => {
    void fetchTelegramAccount();
  }, [fetchTelegramAccount]);

  return {
    error,
    loading,
    refetch: fetchTelegramAccount,
    telegramAccount,
  };
}
