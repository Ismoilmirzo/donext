import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getStoredLocale, translate } from '../lib/i18n';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

async function ensureProfile(user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!error && data) return data;

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || translate(getStoredLocale(), 'common.defaultUser'),
        onboarding_done: false,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (createError) throw createError;
  return created;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    setProfile(data);
    return data;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    return fetchProfile(user.id);
  }, [fetchProfile, user]);

  const updateProfile = useCallback(
    async (updates) => {
      if (!user) return { data: null, error: new Error(translate(getStoredLocale(), 'system.notAuthenticated')) };
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select('*')
        .single();
      if (!error) setProfile(data);
      return { data, error };
    },
    [user]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;

        const nextUser = session?.user ?? null;
        setUser(nextUser);
        if (nextUser) {
          const ensured = await ensureProfile(nextUser);
          if (!active) return;
          setProfile(ensured);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[auth] bootstrap failed', error);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setTimeout(() => {
        void ensureProfile(nextUser)
          .then((ensured) => setProfile(ensured))
          .catch((error) => {
            if (import.meta.env.DEV) {
              console.error('[auth] onAuthStateChange ensureProfile failed', error);
            }
          })
          .finally(() => setLoading(false));
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, updateProfile, fetchProfile, refreshProfile, signOut }),
    [fetchProfile, loading, profile, refreshProfile, signOut, updateProfile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
