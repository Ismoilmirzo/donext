import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

const DAILY_LIMIT = 5;
const MONTHLY_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-jwt',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

interface RequestBody {
  title?: string;
  description?: string;
  locale?: string;
  deadline?: string;
  mode?: 'decompose' | 'split' | 'clarify' | 'replan';
  taskTitle?: string;
  completedTasks?: string[];
  pendingTasks?: string[];
}

function buildPrompt(body: RequestBody): { system: string; user: string } {
  const { title, description, locale, deadline, mode, taskTitle, completedTasks, pendingTasks } = body;
  const isUzbek = locale === 'uz';
  const deadlineNote = deadline ? `\nDeadline: ${deadline}` : '';
  const descriptionNote = description ? `\nDescription: ${description}` : '';

  switch (mode) {
    case 'split': {
      const system = isUzbek
        ? `Siz mahsuldorlik ilovasi yordamchisisiz. Foydalanuvchi bitta vazifani beradi. Uni 2-3 ta kichikroq, aniq vazifalarga ajrating. Har birini fe'l bilan boshlang. Javobni faqat JSON massiv sifatida bering: [{"title": "...", "description": "..."}, ...]. Boshqa matn qo'shmang.`
        : `You are a productivity assistant. The user gives a single task that is too large. Split it into 2-3 smaller, specific tasks. Start each with an action verb. Respond ONLY with a JSON array: [{"title": "...", "description": "..."}, ...]. No other text.`;
      const user = `Project: ${title}\nTask to split: ${taskTitle}${descriptionNote}`;
      return { system, user };
    }

    case 'clarify': {
      const system = isUzbek
        ? `Siz mahsuldorlik ilovasi yordamchisisiz. Foydalanuvchi noaniq vazifani beradi. Uni aniq harakatga ega vazifaga qayta yozing. Natijada aniq maqsad va bajariladigan qadam bo'lishi kerak. Javobni faqat JSON massiv sifatida bering: [{"title": "...", "description": "..."}]. Boshqa matn qo'shmang.`
        : `You are a productivity assistant. The user gives a vague task. Rewrite it as a clear, actionable task with a specific deliverable and concrete next step. Respond ONLY with a JSON array: [{"title": "...", "description": "..."}]. No other text.`;
      const user = `Project: ${title}\nVague task: ${taskTitle}${descriptionNote}`;
      return { system, user };
    }

    case 'replan': {
      const completedList = (completedTasks || []).map((t) => `  - [done] ${t}`).join('\n');
      const pendingList = (pendingTasks || []).map((t) => `  - [stale] ${t}`).join('\n');
      const system = isUzbek
        ? `Siz mahsuldorlik ilovasi yordamchisisiz. Loyihada ba'zi vazifalar bajarilgan, qolganlari eskirgan. Qolgan ishni 3-8 ta yangi, aniq vazifalarga qayta rejalashtiring. Bajarilganlarni takrorlamang. Javobni faqat JSON massiv sifatida bering: [{"title": "...", "description": "..."}, ...]. Boshqa matn qo'shmang.`
        : `You are a productivity assistant. A project has some completed tasks and remaining stale tasks. Re-plan the remaining work into 3-8 fresh, actionable tasks. Do not repeat completed work. Consider what the user has already accomplished. Respond ONLY with a JSON array: [{"title": "...", "description": "..."}, ...]. No other text.`;
      const user = `Project: ${title}${descriptionNote}${deadlineNote}\n\nCompleted tasks:\n${completedList || '  (none)'}\n\nStale/pending tasks:\n${pendingList || '  (none)'}`;
      return { system, user };
    }

    default: {
      const system = isUzbek
        ? `Siz mahsuldorlik ilovasi yordamchisisiz. Foydalanuvchi loyiha sarlavhasi va tavsifini beradi. Loyihani 4-10 ta aniq, bajariladigan vazifalarga ajrating. Har bir vazifa bitta fokus sessiyasida bajarilishi kerak. Fe'l bilan boshlang ("Yozish...", "O'rganish...", "Sozlash..."). Quyi vazifalar yoki murakkab tuzilmalar yaratmang. Javobni faqat JSON massiv sifatida bering: [{"title": "...", "description": "..."}, ...]. Boshqa matn qo'shmang.`
        : `You are a productivity app assistant. The user gives a project title and description. Break the project into 4-10 clear, actionable tasks. Each task should be completable in one focus session. Start with action verbs ("Write...", "Research...", "Set up..."). Do not create sub-tasks or complex structures. Respond ONLY with a JSON array: [{"title": "...", "description": "..."}, ...]. No other text.`;
      const user = `Project: ${title?.trim()}${descriptionNote}${deadlineNote}`;
      return { system, user };
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Missing Supabase configuration.' }, 500);
  }
  if (!OPENROUTER_API_KEY) {
    return jsonResponse({ error: 'AI service not configured.' }, 500);
  }

  // Authenticate user
  const authHeader = req.headers.get('Authorization') || '';
  const forwardedJwt = req.headers.get('x-user-jwt') || '';
  const jwt = forwardedJwt.trim() || authHeader.replace('Bearer ', '').trim();
  if (!jwt) {
    return jsonResponse({ error: 'Missing authorization token.' }, 401);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
  if (userError || !userData?.user?.id) {
    return jsonResponse({ error: 'Invalid or expired token.' }, 401);
  }

  const userId = userData.user.id;

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Parse request body
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const { title, mode } = body;
  // For split/clarify mode, taskTitle is required instead of project title
  const needsTitle = mode !== 'split' && mode !== 'clarify';
  if (needsTitle && (!title || typeof title !== 'string' || title.trim().length < 2)) {
    return jsonResponse({ error: 'Project title is required (min 2 characters).' }, 400);
  }
  if ((mode === 'split' || mode === 'clarify') && (!body.taskTitle || body.taskTitle.trim().length < 2)) {
    return jsonResponse({ error: 'Task title is required for split/clarify mode.' }, 400);
  }

  // Rate limiting
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('ai_calls_today, ai_calls_month, ai_last_reset')
    .eq('id', userId)
    .single();

  if (profileError) {
    return jsonResponse({ error: 'Could not check rate limits.' }, 500);
  }

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const lastReset = profile?.ai_last_reset || '';
  const lastResetMonth = lastReset.slice(0, 7);

  let callsToday = profile?.ai_calls_today || 0;
  let callsMonth = profile?.ai_calls_month || 0;

  if (lastReset !== today) callsToday = 0;
  if (lastResetMonth !== currentMonth) callsMonth = 0;

  if (callsToday >= DAILY_LIMIT) {
    return jsonResponse({
      error: 'daily_limit',
      message: `Daily AI limit reached (${DAILY_LIMIT}/day). Try again tomorrow.`,
      remaining: { daily: 0, monthly: Math.max(0, MONTHLY_LIMIT - callsMonth) },
    }, 429);
  }
  if (callsMonth >= MONTHLY_LIMIT) {
    return jsonResponse({
      error: 'monthly_limit',
      message: `Monthly AI limit reached (${MONTHLY_LIMIT}/month).`,
      remaining: { daily: 0, monthly: 0 },
    }, 429);
  }

  // Build prompt based on mode
  const { system: systemPrompt, user: userMessage } = buildPrompt(body);

  // Call OpenRouter API
  let tasks: Array<{ title: string; description?: string }>;
  try {
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://donext.uz',
        'X-Title': 'DoNext',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[ai-decompose] OpenRouter API error:', aiResponse.status, errText);
      return jsonResponse({ error: 'AI service returned an error.' }, 502);
    }

    const aiData = await aiResponse.json();
    const rawText = aiData?.choices?.[0]?.message?.content || '';

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[ai-decompose] Could not parse AI response:', rawText);
      return jsonResponse({ error: 'AI returned an unexpected format.' }, 502);
    }

    tasks = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return jsonResponse({ error: 'AI returned no tasks.' }, 502);
    }

    tasks = tasks
      .filter((t) => t && typeof t.title === 'string' && t.title.trim().length > 0)
      .slice(0, 12)
      .map((t, i) => ({
        title: t.title.trim().slice(0, 200),
        description: typeof t.description === 'string' ? t.description.trim().slice(0, 500) : '',
        sort_order: i + 1,
      }));

    if (tasks.length === 0) {
      return jsonResponse({ error: 'AI returned no valid tasks.' }, 502);
    }
  } catch (err) {
    console.error('[ai-decompose] Error calling AI:', err);
    return jsonResponse({ error: 'Failed to reach AI service.' }, 502);
  }

  // Update rate limit counters
  await adminClient
    .from('profiles')
    .update({
      ai_calls_today: callsToday + 1,
      ai_calls_month: callsMonth + 1,
      ai_last_reset: today,
    })
    .eq('id', userId);

  return jsonResponse({
    tasks,
    remaining: {
      daily: DAILY_LIMIT - callsToday - 1,
      monthly: MONTHLY_LIMIT - callsMonth - 1,
    },
  });
});
