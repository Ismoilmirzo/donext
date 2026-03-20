import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:5173';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.QA_SERVICE_ROLE_KEY;
const ARTIFACT_DIR = path.resolve('qa-artifacts', 'pause-resume-auto-tracking');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or QA_SERVICE_ROLE_KEY');
}

mkdirSync(ARTIFACT_DIR, { recursive: true });

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function logStep(step) {
  console.log(`\n[QA] ${step}`);
}

async function saveShot(page, name) {
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: true });
}

async function expectVisible(locator, label, timeout = 15000) {
  await locator.first().waitFor({ state: 'visible', timeout });
  console.log(`[QA] PASS: ${label}`);
}

async function expectHidden(locator, label, timeout = 15000) {
  await locator.first().waitFor({ state: 'hidden', timeout });
  console.log(`[QA] PASS: ${label}`);
}

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

async function seedQaUser() {
  const email = `qa.pause.${Date.now()}@example.com`;
  const password = 'Pa55word!123';

  const userRes = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'QA Pause User' },
  });
  if (userRes.error) throw userRes.error;

  const userId = userRes.data.user.id;

  const profileUpdate = await admin
    .from('profiles')
    .update({
      display_name: 'QA Pause User',
      onboarding_done: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (profileUpdate.error) throw profileUpdate.error;

  const { data: projects, error: projectError } = await admin
    .from('projects')
    .insert([
      { user_id: userId, title: 'QA Solo Project', color: '#10B981', status: 'active' },
      { user_id: userId, title: 'QA Resume Project', color: '#F59E0B', status: 'active' },
      { user_id: userId, title: 'QA Secondary Project', color: '#3B82F6', status: 'active' },
    ])
    .select('*');
  if (projectError) throw projectError;

  const soloProject = projects.find((project) => project.title === 'QA Solo Project');
  const resumeProject = projects.find((project) => project.title === 'QA Resume Project');
  const secondaryProject = projects.find((project) => project.title === 'QA Secondary Project');

  const { data: tasks, error: taskError } = await admin
    .from('tasks')
    .insert([
      {
        user_id: userId,
        project_id: soloProject.id,
        title: 'Solo completion task',
        description: 'Complete this to verify the last-task project flow.',
        sort_order: 1,
        status: 'pending',
        sessions_count: 0,
        total_focus_minutes: 0,
        total_elapsed_minutes: 0,
      },
      {
        user_id: userId,
        project_id: resumeProject.id,
        title: 'Resume paused task',
        description: 'This task already has prior focus history.',
        sort_order: 1,
        status: 'pending',
        sessions_count: 2,
        total_focus_minutes: 72,
        total_elapsed_minutes: 95,
      },
      {
        user_id: userId,
        project_id: secondaryProject.id,
        title: 'Secondary queued task',
        description: 'Used to verify random and manual selection with multiple projects.',
        sort_order: 1,
        status: 'pending',
        sessions_count: 0,
        total_focus_minutes: 0,
        total_elapsed_minutes: 0,
      },
    ])
    .select('*');
  if (taskError) throw taskError;

  const resumeTask = tasks.find((task) => task.title === 'Resume paused task');
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const focusInsert = await admin.from('focus_sessions').insert([
    {
      user_id: userId,
      task_id: resumeTask.id,
      project_id: resumeProject.id,
      date: twoDaysAgo,
      duration_minutes: 30,
      total_duration_minutes: 40,
    },
    {
      user_id: userId,
      task_id: resumeTask.id,
      project_id: resumeProject.id,
      date: yesterday,
      duration_minutes: 42,
      total_duration_minutes: 55,
    },
  ]);
  if (focusInsert.error) throw focusInsert.error;

  return { email, password, userId, soloProject, resumeProject, secondaryProject };
}

async function login(page, email, password) {
  logStep('Login');
  await page.goto(`${BASE_URL}/auth/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Log In$/i }).click();
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password', { exact: true }).fill(password);
  await page.locator('form').getByRole('button', { name: /^Log In$/i }).click();
  await page.waitForURL('**/habits', { timeout: 20000 });
  await expectVisible(page.getByRole('heading', { name: /Today/i }), 'Logged into habits page');
}

async function getActiveSession(userId) {
  const { data, error } = await admin
    .from('task_sessions')
    .select('*, task:tasks(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function waitForActiveSession(userId, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const session = await getActiveSession(userId);
    if (session?.id) return session;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return getActiveSession(userId);
}

async function getTask(userId, title) {
  const { data, error } = await admin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('title', title)
    .single();

  if (error) throw error;
  return data;
}

async function waitForTaskStatus(userId, title, status, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const task = await getTask(userId, title);
    if (task.status === status) return task;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return getTask(userId, title);
}

async function waitForTask(userId, title, predicate, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const task = await getTask(userId, title);
    if (predicate(task)) return task;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return getTask(userId, title);
}

async function getFocusSessions(userId, taskId) {
  const { data, error } = await admin
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function updateActiveSessionTimeline(userId, { startMinutesAgo, segments }) {
  const activeSession = await waitForActiveSession(userId);
  assert(activeSession?.id, 'Expected an active session');

  const startedAt = minutesAgo(startMinutesAgo);
  const updateSession = await admin
    .from('task_sessions')
    .update({
      started_at: startedAt,
      segments,
    })
    .eq('id', activeSession.id);
  if (updateSession.error) throw updateSession.error;

  const updateTask = await admin
    .from('tasks')
    .update({
      started_at: startedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', activeSession.task_id);
  if (updateTask.error) throw updateTask.error;

  return activeSession.id;
}

async function verifyResumeFlow(page, seeded) {
  logStep('Resume flow: start, toggle, pause, resume, complete');
  await page.goto(`${BASE_URL}/focus`, { waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByRole('button', { name: /Start a Task/i }), 'Focus ready state is visible');
  await saveShot(page, 'focus-ready');

  await page.getByRole('button', { name: /or pick manually/i }).click();
  await page.getByRole('button', { name: /Resume paused task/i }).click();
  await expectVisible(page.getByText(/Session 3/), 'Paused task pre-start shows the next session number');
  await expectVisible(page.getByText(/1h 12m focused so far/i), 'Paused task pre-start shows accumulated focus');
  await saveShot(page, 'resume-prestart');

  await page.getByRole('button', { name: /Let's Go/i }).click();
  await expectVisible(page.getByText(/^Working$/i), 'Active working state is visible');
  await expectVisible(page.getByRole('button', { name: /Pause task/i }), 'Pause action is visible');

  const workBreakWorkSegments = [
    { type: 'work', start: minutesAgo(10), end: minutesAgo(5) },
    { type: 'break', start: minutesAgo(5), end: minutesAgo(3) },
    { type: 'work', start: minutesAgo(3), end: null },
  ];
  await updateActiveSessionTimeline(seeded.userId, {
    startMinutesAgo: 10,
    segments: workBreakWorkSegments,
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText(/^Working$/i), 'Reload preserves the active session without a recovery prompt');
  assert((await page.title()).startsWith('⏱'), 'Document title should show working icon');

  await page.getByRole('button', { name: /Take a break/i }).click();
  await expectVisible(page.getByText(/^On Break$/i), 'Break state is visible');
  await expectVisible(page.getByText(/Focus paused at/i), 'Break state shows frozen focus text');
  assert((await page.title()).startsWith('☕'), 'Document title should show break icon');
  await saveShot(page, 'resume-break-state');

  await page.getByRole('button', { name: /Back to work/i }).click();
  await expectVisible(page.getByText(/^Working$/i), 'Returning from break restores working state');
  assert((await page.title()).startsWith('⏱'), 'Document title should switch back to working icon');

  await page.getByRole('button', { name: /Pause task/i }).click();
  await expectVisible(page.getByText(/Pause this task\?/i), 'Pause confirmation opens');
  await page.getByRole('button', { name: /Keep working/i }).click();
  await expectHidden(page.getByText(/Pause this task\?/i), 'Keep working dismisses the pause confirmation');

  await page.getByRole('button', { name: /Pause task/i }).click();
  await page.getByRole('button', { name: /Pause & save/i }).click();
  await expectVisible(page.getByRole('button', { name: /Start a Task/i }), 'Pausing returns to the focus ready state');

  const pausedTask = await getTask(seeded.userId, 'Resume paused task');
  assert(pausedTask.status === 'pending', 'Paused task should return to pending status');
  assert(pausedTask.sessions_count === 3, 'Paused task should keep the incremented session count');
  assert(pausedTask.total_focus_minutes === 80, 'Paused task should accumulate focus minutes from the paused session');
  assert(pausedTask.total_elapsed_minutes === 105, 'Paused task should accumulate total minutes from the paused session');
  assert((await getFocusSessions(seeded.userId, pausedTask.id)).length >= 3, 'Paused session should create a compatibility focus session');

  await page.getByRole('button', { name: /or pick manually/i }).click();
  await page.getByRole('button', { name: /Resume paused task/i }).click();
  await expectVisible(page.getByText(/Session 4/), 'Paused task resumes as a fresh session');
  await expectVisible(page.getByText(/1h 20m focused so far/i), 'Paused task pre-start shows updated accumulated focus');
  await saveShot(page, 'resume-second-prestart');

  await page.getByRole('button', { name: /Let's Go/i }).click();
  await page.getByRole('button', { name: /Take a break/i }).click();
  await expectVisible(page.getByText(/^On Break$/i), 'Break state can be entered before completion');

  const workBreakSegments = [
    { type: 'work', start: minutesAgo(7), end: minutesAgo(1) },
    { type: 'break', start: minutesAgo(1), end: null },
  ];
  await updateActiveSessionTimeline(seeded.userId, {
    startMinutesAgo: 7,
    segments: workBreakSegments,
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText(/^On Break$/i), 'Break state survives reload');
  await page.getByRole('button', { name: /I'm Done/i }).click();

  await expectVisible(page.getByText(/Task complete!/i), 'Completion summary opens automatically');
  await expectHidden(page.getByText(/How much focused time did you spend\?/i), 'Manual time entry prompt is gone');
  await expectVisible(page.getByText(/Focus: 6m/i), 'Completion summary shows auto-calculated focus');
  await expectVisible(page.getByText(/Breaks: 1m/i), 'Completion summary shows break duration');
  await expectVisible(page.getByText(/Total: 7m/i), 'Completion summary shows total duration');
  await expectVisible(page.getByText(/Sessions: 4/i), 'Completion summary shows accumulated session count');
  await saveShot(page, 'resume-complete-summary');

  const completedTask = await getTask(seeded.userId, 'Resume paused task');
  assert(completedTask.status === 'completed', 'Completed task should have completed status');
  assert(completedTask.sessions_count === 4, 'Completed resumed task should end with four sessions');
  assert(completedTask.total_focus_minutes === 86, 'Completed resumed task should accumulate focus across all sessions');
  assert(completedTask.total_elapsed_minutes === 112, 'Completed resumed task should accumulate elapsed time across all sessions');
  assert((await getFocusSessions(seeded.userId, completedTask.id)).length >= 4, 'Completed session should also create a compatibility focus session');

  await page.getByRole('button', { name: /Done for Now/i }).click();
  await expectVisible(page.getByText(/All tasks in this project are done/i), 'Last-task project prompt appears after completion');

  await page.goto(`${BASE_URL}/projects/${seeded.resumeProject.id}`, { waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText(/1h 26m/), 'Project detail shows accumulated focus time from all sessions');
  await expectVisible(page.getByText(/4 session/), 'Project detail shows accumulated session count');
  await saveShot(page, 'resume-project-detail');
}

async function verifyRecoveryFlow(page, seeded) {
  logStep('Recovery flow: discard, save progress, finish task');

  await page.goto(`${BASE_URL}/focus`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /or pick manually/i }).click();
  await page.getByRole('button', { name: /Solo completion task/i }).click();
  await expectVisible(page.getByText(/Session 1/), 'Fresh task starts on session 1');
  assert(!(await page.getByText(/focused so far/i).isVisible().catch(() => false)), 'Fresh task should not show prior focus text');
  await page.getByRole('button', { name: /Let's Go/i }).click();
  await expectVisible(page.getByText(/^Working$/i), 'Fresh task starts in working state');

  await updateActiveSessionTimeline(seeded.userId, {
    startMinutesAgo: 4,
    segments: [{ type: 'work', start: minutesAgo(4), end: null }],
  });
  await page.evaluate(() => window.sessionStorage.removeItem('donext:active-task-session'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText(/You have an unfinished session/i), 'Recovery prompt appears for orphaned sessions');
  await page.getByRole('button', { name: /Discard this session/i }).click();
  await expectVisible(page.getByText(/Session discarded/i), 'Discard path confirms the session was removed');
  await expectHidden(page.getByText(/You have an unfinished session/i), 'Recovery prompt closes after discard');

  let soloTask = await waitForTaskStatus(seeded.userId, 'Solo completion task', 'pending');
  assert(soloTask.status === 'pending', 'Discarded task returns to pending');
  assert(soloTask.sessions_count === 0, 'Discarded task decrements the session count');

  await page.getByRole('button', { name: /or pick manually/i }).click();
  await page.getByRole('button', { name: /Solo completion task/i }).click();
  await page.getByRole('button', { name: /Let's Go/i }).click();

  await updateActiveSessionTimeline(seeded.userId, {
    startMinutesAgo: 3,
    segments: [
      { type: 'work', start: minutesAgo(3), end: minutesAgo(1) },
      { type: 'break', start: minutesAgo(1), end: null },
    ],
  });
  await page.evaluate(() => window.sessionStorage.removeItem('donext:active-task-session'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText(/You have an unfinished session/i), 'Recovery prompt appears again after reload');
  await page.getByRole('button', { name: /I stopped, save progress/i }).click();
  await expectVisible(page.getByRole('button', { name: /Start a Task/i }), 'Save progress path returns to ready state');

  soloTask = await waitForTask(
    seeded.userId,
    'Solo completion task',
    (task) => task.status === 'pending' && task.sessions_count === 1 && task.total_focus_minutes === 2,
  );
  assert(soloTask.status === 'pending', 'Recovery save-progress keeps the task pending');
  assert(soloTask.sessions_count === 1, 'Save-progress keeps the session count incremented');
  assert(soloTask.total_focus_minutes === 2, 'Save-progress accumulates only the tracked work');

  await page.getByRole('button', { name: /or pick manually/i }).click();
  await page.getByRole('button', { name: /Solo completion task/i }).click();
  await expectVisible(page.getByText(/Session 2/), 'Saved progress shows the next session number');
  await expectVisible(page.getByText(/2m focused so far/i), 'Saved progress shows tracked focus so far');
  await page.getByRole('button', { name: /Let's Go/i }).click();

  await updateActiveSessionTimeline(seeded.userId, {
    startMinutesAgo: 5,
    segments: [
      { type: 'work', start: minutesAgo(5), end: minutesAgo(2) },
      { type: 'break', start: minutesAgo(2), end: null },
    ],
  });
  await page.evaluate(() => window.sessionStorage.removeItem('donext:active-task-session'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText(/You have an unfinished session/i), 'Recovery prompt appears for completion path');
  await page.getByRole('button', { name: /I finished the task/i }).click();
  await expectVisible(page.getByText(/Task complete!/i), 'Recovery complete path opens completion summary');
  await expectVisible(page.getByText(/Focus: 3m/i), 'Recovery completion only counts closed work segments');
  await expectHidden(page.getByText(/How much focused time did you spend\?/i), 'Recovery completion still avoids manual time entry');
  await saveShot(page, 'recovery-complete-summary');

  soloTask = await waitForTask(
    seeded.userId,
    'Solo completion task',
    (task) => task.status === 'completed' && task.sessions_count === 2 && task.total_focus_minutes === 5,
  );
  assert(soloTask.status === 'completed', 'Recovery completion marks the task complete');
  assert(soloTask.sessions_count === 2, 'Recovery completion preserves accumulated session count');
  assert(soloTask.total_focus_minutes === 5, 'Recovery completion adds only proven tracked work');

  await page.getByRole('button', { name: /Done for Now/i }).click();
}

async function verifyStats(page) {
  logStep('Stats overview');
  await page.goto(`${BASE_URL}/stats`, { waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText(/^Stats$/i), 'Stats page opens', 30000);
  await expectVisible(page.getByText(/Avg sessions\/task/i), 'Stats page includes average sessions per task');
  await expectVisible(page.getByText(/Focus Time/i), 'Stats focus chart header renders');
  await saveShot(page, 'stats-overview');
}

async function run() {
  const seeded = await seedQaUser();
  console.log(`[QA] Seeded user ${seeded.email}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();

  try {
    await login(page, seeded.email, seeded.password);
    await verifyResumeFlow(page, seeded);
    await verifyRecoveryFlow(page, seeded);
    await verifyStats(page);
    console.log('\n[QA] Pause/resume auto-tracking browser pass completed successfully');
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error('\n[QA] FAILURE:', error);
  process.exitCode = 1;
});
