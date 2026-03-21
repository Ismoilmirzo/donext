import { supabase } from './supabase';

/**
 * Call the ai-decompose edge function to break a project into tasks.
 * @param {{ title: string, description?: string, locale?: string, deadline?: string }} params
 * @returns {Promise<{ tasks?: Array<{title:string,description:string,sort_order:number}>, remaining?: {daily:number,monthly:number}, error?: string }>}
 */
export async function decomposeProject({ title, description, locale, deadline }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { error: 'Not authenticated' };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(`${supabaseUrl}/functions/v1/ai-decompose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'x-user-jwt': session.access_token,
    },
    body: JSON.stringify({ title, description, locale, deadline }),
  });

  const body = await res.json();

  if (!res.ok) {
    return {
      error: body.message || body.error || 'AI decomposition failed',
      rateLimited: res.status === 429,
      remaining: body.remaining,
    };
  }

  return { tasks: body.tasks, remaining: body.remaining };
}
