import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-jwt',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function buildCounts<T extends string | number>(
  rows: Array<Record<string, unknown>>,
  keyField: string,
  valueField?: string
) {
  return rows.reduce<Record<T, number>>((acc, row) => {
    const key = row[keyField] as T | null;
    if (!key) return acc;
    const current = acc[key] || 0;
    const value = valueField ? Number(row[valueField] || 0) : 1;
    acc[key] = current + value;
    return acc;
  }, {} as Record<T, number>);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'GET') return jsonResponse({ error: 'Method not allowed.' }, 405);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: 'Missing service role configuration.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const forwardedJwt = req.headers.get('x-user-jwt') || '';
  const jwt = forwardedJwt.trim() || authHeader.replace('Bearer ', '').trim();
  if (!jwt) return jsonResponse({ error: 'Missing authorization token.' }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
  const requesterEmail = userData?.user?.email?.trim().toLowerCase();
  if (userError || !userData?.user?.id || !requesterEmail) {
    return jsonResponse({ error: 'Invalid authorization token.' }, 401);
  }

  if (!ADMIN_EMAILS.includes(requesterEmail)) {
    return jsonResponse({ error: 'Admin access required.' }, 403);
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) return jsonResponse({ error: listError.message }, 500);

  const authUsers = listData?.users || [];
  const userIds = authUsers.map((entry) => entry.id);
  if (!userIds.length) return jsonResponse({ users: [] });

  const [profilesRes, habitsRes, projectsRes, tasksRes, focusRes] = await Promise.all([
    adminClient.from('profiles').select('id, display_name, timezone, onboarding_done').in('id', userIds),
    adminClient.from('habits').select('user_id').in('user_id', userIds),
    adminClient.from('projects').select('user_id').in('user_id', userIds),
    adminClient.from('tasks').select('user_id, status').in('user_id', userIds),
    adminClient.from('focus_sessions').select('user_id, duration_minutes').in('user_id', userIds),
  ]);

  const failures = [profilesRes.error, habitsRes.error, projectsRes.error, tasksRes.error, focusRes.error].filter(Boolean);
  if (failures.length) {
    return jsonResponse({ error: failures[0]?.message || 'Failed to load user summaries.' }, 500);
  }

  const profiles = new Map((profilesRes.data || []).map((profile) => [profile.id, profile]));
  const habitCounts = buildCounts<string>(habitsRes.data || [], 'user_id');
  const projectCounts = buildCounts<string>(projectsRes.data || [], 'user_id');
  const taskCounts = buildCounts<string>(tasksRes.data || [], 'user_id');
  const completedTaskCounts = buildCounts<string>(
    (tasksRes.data || []).filter((task) => task.status === 'completed'),
    'user_id'
  );
  const focusSessionCounts = buildCounts<string>(focusRes.data || [], 'user_id');
  const focusMinutes = buildCounts<string>(focusRes.data || [], 'user_id', 'duration_minutes');

  const users = authUsers.map((entry) => {
    const profile = profiles.get(entry.id);
    const providers = Array.isArray(entry.app_metadata?.providers)
      ? entry.app_metadata.providers
      : entry.app_metadata?.provider
        ? [entry.app_metadata.provider]
        : [];

    return {
      id: entry.id,
      email: entry.email,
      created_at: entry.created_at,
      last_sign_in_at: entry.last_sign_in_at,
      providers,
      display_name: profile?.display_name || null,
      timezone: profile?.timezone || null,
      onboarding_done: Boolean(profile?.onboarding_done),
      stats: {
        habits: habitCounts[entry.id] || 0,
        projects: projectCounts[entry.id] || 0,
        tasks: taskCounts[entry.id] || 0,
        completed_tasks: completedTaskCounts[entry.id] || 0,
        focus_sessions: focusSessionCounts[entry.id] || 0,
        focus_minutes: focusMinutes[entry.id] || 0,
      },
    };
  });

  return jsonResponse({ users });
});
