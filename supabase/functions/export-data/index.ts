import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatDateStamp(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Missing export function configuration.' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace('Bearer ', '').trim();
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Missing authorization token.' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
  if (userError || !userData?.user?.id) {
    return new Response(JSON.stringify({ error: 'Invalid authorization token.' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const userId = userData.user.id;

  const [
    profileRes,
    habitsRes,
    habitLogsRes,
    projectsRes,
    tasksRes,
    focusRes,
    badgesRes,
    goalsRes,
    freezesRes,
  ] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', userId).maybeSingle(),
    adminClient.from('habits').select('*').eq('user_id', userId).order('sort_order'),
    adminClient.from('habit_logs').select('*').eq('user_id', userId).order('date'),
    adminClient.from('projects').select('*').eq('user_id', userId).order('created_at'),
    adminClient.from('tasks').select('*').eq('user_id', userId).order('created_at'),
    adminClient.from('focus_sessions').select('*').eq('user_id', userId).order('date'),
    adminClient.from('badges').select('*').eq('user_id', userId).order('unlocked_at'),
    adminClient.from('weekly_goals').select('*').eq('user_id', userId).order('week_start'),
    adminClient.from('streak_freezes').select('*').eq('user_id', userId).order('date'),
  ]);

  const firstError = [
    profileRes.error,
    habitsRes.error,
    habitLogsRes.error,
    projectsRes.error,
    tasksRes.error,
    focusRes.error,
    badgesRes.error,
    goalsRes.error,
    freezesRes.error,
  ].find(Boolean);

  if (firstError) {
    return new Response(JSON.stringify({ error: firstError.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const focusSessions = focusRes.data || [];
  const exportData = {
    exported_at: new Date().toISOString(),
    app: 'DoNext',
    version: '1.0',
    user: {
      id: userId,
      email: userData.user.email,
      display_name: profileRes.data?.display_name,
      created_at: profileRes.data?.created_at,
      random_without_reroll_count: profileRes.data?.random_without_reroll_count || 0,
    },
    habits: habitsRes.data || [],
    habit_logs: habitLogsRes.data || [],
    projects: projectsRes.data || [],
    tasks: tasksRes.data || [],
    focus_sessions: focusSessions,
    badges: badgesRes.data || [],
    weekly_goals: goalsRes.data || [],
    streak_freezes: freezesRes.data || [],
    summary: {
      total_habits: (habitsRes.data || []).length,
      total_habit_logs: (habitLogsRes.data || []).length,
      total_projects: (projectsRes.data || []).length,
      total_tasks: (tasksRes.data || []).length,
      total_focus_sessions: focusSessions.length,
      total_focus_minutes: focusSessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0),
      total_badges_unlocked: (badgesRes.data || []).length,
      total_weekly_goals: (goalsRes.data || []).length,
    },
  };

  const filename = `donext-export-${formatDateStamp()}.json`;
  return new Response(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
