import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useProfile() {
  const { user, profile: authProfile, updateProfile: updateAuthProfile } = useAuth();
  const [profile, setProfile] = useState(authProfile);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return { data: null, error: null };
    }

    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (!error) setProfile(data);
    setLoading(false);
    return { data, error };
  }, [user]);

  const updateProfile = useCallback(
    async (updates) => {
      const { data, error } = await updateAuthProfile(updates);
      if (!error) setProfile(data);
      return { data, error };
    },
    [updateAuthProfile]
  );

  useEffect(() => {
    setProfile(authProfile);
  }, [authProfile]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, updateProfile, refetch: fetchProfile };
}
