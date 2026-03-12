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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-jwt',
};

type JsonRecord = Record<string, unknown>;

function jsonResponse(body: JsonRecord, status = 200) {
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

async function requireAdmin(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    return { error: jsonResponse({ error: 'Missing service role configuration.' }, 500) };
  }

  const authHeader = req.headers.get('Authorization') || '';
  const forwardedJwt = req.headers.get('x-user-jwt') || '';
  const jwt = forwardedJwt.trim() || authHeader.replace('Bearer ', '').trim();
  if (!jwt) return { error: jsonResponse({ error: 'Missing authorization token.' }, 401) };

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
  const requester = userData?.user;
  const requesterEmail = requester?.email?.trim().toLowerCase();
  if (userError || !requester?.id || !requesterEmail) {
    return { error: jsonResponse({ error: 'Invalid authorization token.' }, 401) };
  }

  if (!ADMIN_EMAILS.includes(requesterEmail)) {
    return { error: jsonResponse({ error: 'Admin access required.' }, 403) };
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  return { adminClient, requester };
}

async function fetchStats(adminClient: ReturnType<typeof createClient>, userIds: string[]) {
  const [profilesRes, habitsRes, projectsRes, tasksRes, focusRes] = await Promise.all([
    adminClient.from('profiles').select('id, display_name, timezone, onboarding_done').in('id', userIds),
    adminClient.from('habits').select('user_id').in('user_id', userIds),
    adminClient.from('projects').select('user_id').in('user_id', userIds),
    adminClient.from('tasks').select('user_id, status').in('user_id', userIds),
    adminClient.from('focus_sessions').select('user_id, duration_minutes').in('user_id', userIds),
  ]);

  const failures = [profilesRes.error, habitsRes.error, projectsRes.error, tasksRes.error, focusRes.error].filter(Boolean);
  if (failures.length) {
    return { error: failures[0]?.message || 'Failed to load user summaries.' };
  }

  return {
    profiles: new Map((profilesRes.data || []).map((profile) => [profile.id, profile])),
    habitCounts: buildCounts<string>(habitsRes.data || [], 'user_id'),
    projectCounts: buildCounts<string>(projectsRes.data || [], 'user_id'),
    taskCounts: buildCounts<string>(tasksRes.data || [], 'user_id'),
    completedTaskCounts: buildCounts<string>(
      (tasksRes.data || []).filter((task) => task.status === 'completed'),
      'user_id'
    ),
    focusSessionCounts: buildCounts<string>(focusRes.data || [], 'user_id'),
    focusMinutes: buildCounts<string>(focusRes.data || [], 'user_id', 'duration_minutes'),
  };
}

function buildUserSummary(entry: any, profile: any, stats: any) {
  const providers = Array.isArray(entry?.app_metadata?.providers)
    ? entry.app_metadata.providers
    : entry?.app_metadata?.provider
      ? [entry.app_metadata.provider]
      : [];

  return {
    id: entry.id,
    email: entry.email,
    created_at: entry.created_at,
    last_sign_in_at: entry.last_sign_in_at,
    email_confirmed_at: entry.email_confirmed_at,
    banned_until: entry.banned_until,
    providers,
    display_name: profile?.display_name || null,
    timezone: profile?.timezone || null,
    onboarding_done: Boolean(profile?.onboarding_done),
    stats: {
      habits: stats.habitCounts[entry.id] || 0,
      projects: stats.projectCounts[entry.id] || 0,
      tasks: stats.taskCounts[entry.id] || 0,
      completed_tasks: stats.completedTaskCounts[entry.id] || 0,
      focus_sessions: stats.focusSessionCounts[entry.id] || 0,
      focus_minutes: stats.focusMinutes[entry.id] || 0,
    },
  };
}

async function loadUserDetails(adminClient: ReturnType<typeof createClient>, userId: string) {
  const [habitsRes, projectsRes, tasksRes, focusRes] = await Promise.all([
    adminClient
      .from('habits')
      .select('id, title, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10),
    adminClient
      .from('projects')
      .select('id, title, status, created_at, updated_at, completed_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10),
    adminClient
      .from('tasks')
      .select('id, project_id, title, status, time_spent_minutes, created_at, completed_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10),
    adminClient
      .from('focus_sessions')
      .select('id, date, duration_minutes, created_at')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(10),
  ]);

  const failures = [habitsRes.error, projectsRes.error, tasksRes.error, focusRes.error].filter(Boolean);
  if (failures.length) {
    return { error: failures[0]?.message || 'Failed to load user details.' };
  }

  const projectTitleById = new Map((projectsRes.data || []).map((project) => [project.id, project.title]));

  return {
    habits: (habitsRes.data || []).map((habit) => ({
      id: habit.id,
      title: habit.title,
      is_active: habit.is_active,
      created_at: habit.created_at,
      updated_at: habit.updated_at,
    })),
    projects: projectsRes.data || [],
    tasks: (tasksRes.data || []).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      time_spent_minutes: task.time_spent_minutes,
      created_at: task.created_at,
      completed_at: task.completed_at,
      project_title: task.project_id ? projectTitleById.get(task.project_id) || null : null,
    })),
    focusSessions: focusRes.data || [],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (!['GET', 'POST'].includes(req.method)) return jsonResponse({ error: 'Method not allowed.' }, 405);

  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  const { adminClient, requester } = auth;

  if (req.method === 'GET') {
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listError) return jsonResponse({ error: listError.message }, 500);

    const authUsers = listData?.users || [];
    const userIds = authUsers.map((entry) => entry.id);
    if (!userIds.length) return jsonResponse({ users: [] });

    const stats = await fetchStats(adminClient, userIds);
    if ('error' in stats) return jsonResponse({ error: stats.error }, 500);

    const users = authUsers.map((entry) => buildUserSummary(entry, stats.profiles.get(entry.id), stats));
    return jsonResponse({ users });
  }

  const body = (await req.json().catch(() => null)) as JsonRecord | null;
  const action = String(body?.action || '').trim().toLowerCase();
  const userId = String(body?.userId || '').trim();
  if (!action || !userId) return jsonResponse({ error: 'Missing action or user id.' }, 400);

  const { data: userResponse, error: userLookupError } = await adminClient.auth.admin.getUserById(userId);
  if (userLookupError || !userResponse?.user) {
    return jsonResponse({ error: 'User not found.' }, 404);
  }

  if (action !== 'detail' && requester.id === userId) {
    return jsonResponse({ error: 'You cannot modify your own admin account.' }, 400);
  }

  if (action === 'detail') {
    const stats = await fetchStats(adminClient, [userId]);
    if ('error' in stats) return jsonResponse({ error: stats.error }, 500);

    const summary = buildUserSummary(userResponse.user, stats.profiles.get(userId), stats);
    const detail = await loadUserDetails(adminClient, userId);
    if ('error' in detail) return jsonResponse({ error: detail.error }, 500);

    return jsonResponse({ user: summary, detail });
  }

  if (action === 'suspend' || action === 'unsuspend') {
    const { data: updatedResponse, error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: action === 'suspend' ? '876000h' : 'none',
    });
    if (updateError || !updatedResponse?.user) {
      return jsonResponse({ error: updateError?.message || 'Failed to update user access.' }, 500);
    }

    const stats = await fetchStats(adminClient, [userId]);
    if ('error' in stats) return jsonResponse({ error: stats.error }, 500);

    return jsonResponse({
      message: action === 'suspend' ? 'User suspended.' : 'User access restored.',
      user: buildUserSummary(updatedResponse.user, stats.profiles.get(userId), stats),
    });
  }

  if (action === 'delete') {
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      return jsonResponse({ error: authDeleteError.message }, 500);
    }

    const { error: profileDeleteError } = await adminClient.from('profiles').delete().eq('id', userId);
    if (profileDeleteError) {
      return jsonResponse({ error: `Auth user deleted but profile cleanup failed: ${profileDeleteError.message}` }, 500);
    }

    return jsonResponse({ message: 'User deleted.', deletedUserId: userId });
  }

  return jsonResponse({ error: 'Unsupported action.' }, 400);
});
