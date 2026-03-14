import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:5173';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bpyuooiriqauczahkssy.supabase.co';
const ARTIFACT_DIR = 'qa-artifacts/full-browser';
mkdirSync(ARTIFACT_DIR, { recursive: true });

const email = `qa_${Date.now()}@example.com`;
const password = 'QaTest123!';
const displayName = 'QA Runner';

function logStep(step) {
  console.log(`\n[QA] ${step}`);
}

function modal(page) {
  return page.locator('div.fixed.inset-0').last();
}

function loadKeys() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  const keys = JSON.parse(execSync('supabase projects api-keys -o json', { encoding: 'utf8' }));
  return {
    serviceRole: keys.find((entry) => entry.id === 'service_role')?.api_key,
  };
}

async function ensureQaUser() {
  const { serviceRole } = loadKeys();
  if (!serviceRole) {
    throw new Error('Missing service role key for browser QA.');
  }

  const admin = createClient(SUPABASE_URL, serviceRole, { auth: { persistSession: false } });
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) throw list.error;

  let user = (list.data?.users || []).find((entry) => entry.email?.toLowerCase() === email.toLowerCase()) || null;
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    });
    if (created.error) throw created.error;
    user = created.data.user;
  } else {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata || {}), full_name: displayName },
    });
    if (updated.error) throw updated.error;
    user = updated.data.user;
  }

  const profileRes = await admin.from('profiles').upsert(
    {
      id: user.id,
      display_name: displayName,
      onboarding_done: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (profileRes.error) throw profileRes.error;
}

async function shot(page, name) {
  await page.screenshot({ path: `${ARTIFACT_DIR}/${name}.png`, fullPage: true });
}

async function ensureVisible(locator, label, timeout = 15000) {
  await locator.first().waitFor({ state: 'visible', timeout });
  console.log(`[QA] PASS: ${label}`);
}

async function dismissBadgePopup(page) {
  const popup = page.locator('button.fixed.inset-0');
  if (await popup.isVisible().catch(() => false)) {
    await popup.click({ position: { x: 24, y: 24 } }).catch(async () => {
      await page.mouse.click(24, 24);
    });
    await page.waitForTimeout(300);
  }
}

async function authFlow(page) {
  logStep('Landing page checks');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await ensureVisible(page.getByText('Stop overthinking. Start doing.'), 'Landing headline');
  await ensureVisible(page.getByRole('link', { name: /Get Started Free/i }), 'Landing CTA');
  await shot(page, 'landing');

  logStep('Provision QA account');
  await ensureQaUser();

  logStep('Log in');
  await page.getByRole('link', { name: /Get Started Free/i }).click();
  await ensureVisible(page.getByRole('heading', { name: /Create account|Welcome back/i }), 'Auth page opens');
  await page.getByRole('button', { name: /Log In/i }).click();
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password', { exact: true }).fill(password);
  await page.locator('form').getByRole('button', { name: /^Log In$/i }).click();

  await page.waitForURL('**/habits', { timeout: 20000 });
  await ensureVisible(page.getByRole('heading', { name: /Today/i }), 'Habits home after auth');
  await shot(page, 'habits-initial');
}

async function habitsFlow(page) {
  logStep('Habits CRUD/checklist');
  await page.getByRole('button', { name: /Add Habit/i }).first().click();
  await ensureVisible(page.getByRole('heading', { name: /Add Habit/i }), 'Add habit modal opens');
  await modal(page).getByPlaceholder('Read 30 min').fill('Read 30m');
  await modal(page).getByRole('button', { name: /Save Habit/i }).click();

  await page.getByRole('button', { name: /Add Habit/i }).first().click();
  await modal(page).getByPlaceholder('Read 30 min').fill('Workout');
  await modal(page).getByRole('button', { name: /Save Habit/i }).click();

  await ensureVisible(page.getByText('Read 30m'), 'Habit 1 visible');
  await ensureVisible(page.getByText('Workout'), 'Habit 2 visible');

  await page.locator('button[aria-pressed]').filter({ hasText: 'Read 30m' }).first().click();
  await ensureVisible(page.getByText(/\d+\/\d+ habits complete/i), 'Progress updates after toggle');
  await dismissBadgePopup(page);

  const menuButton = page.getByRole('button', { name: /Open actions for Read 30m/i }).first();
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.click();
    if (await page.getByRole('button', { name: /Edit/i }).isVisible()) {
      await page.getByRole('button', { name: /Edit/i }).click();
      await ensureVisible(page.getByRole('heading', { name: /Edit Habit/i }), 'Edit habit modal opens');
      await modal(page).getByPlaceholder('Read 30 min').fill('Read 45m');
      await modal(page).getByRole('button', { name: /Save Changes/i }).click();
      await ensureVisible(page.getByText('Read 45m'), 'Habit edit persisted');
    }
  }

  await shot(page, 'habits-after-actions');
}

async function projectsFlow(page) {
  logStep('Projects and task management');
  await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
  await ensureVisible(page.getByRole('heading', { name: /^Projects$/i }), 'Projects page opens');

  await page.getByRole('button', { name: /New Project/i }).click();
  await ensureVisible(page.getByRole('heading', { name: /Create Project/i }), 'Create project modal opens');
  await modal(page).getByPlaceholder('DoNext MVP').fill('QA Project');
  await modal(page).getByPlaceholder('Optional').fill('Project created by automated QA.');
  await modal(page).getByRole('button', { name: /Create Project/i }).click();

  await ensureVisible(page.getByRole('link', { name: /QA Project/i }), 'Project card appears');
  await page.getByRole('link', { name: /QA Project/i }).click();
  await ensureVisible(page.getByRole('heading', { name: /QA Project/i }), 'Project detail opens');

  await page.getByRole('button', { name: /\+ Add Task/i }).first().click();
  await ensureVisible(page.getByRole('heading', { name: /Add Task/i }), 'Add task modal opens');
  await modal(page).getByPlaceholder('Implement auth flow').fill('Task One');
  await modal(page).getByRole('button', { name: /Add to End/i }).click();

  await page.getByRole('button', { name: /\+ Add Task/i }).first().click();
  await modal(page).getByPlaceholder('Implement auth flow').fill('Task Two');
  await modal(page).getByRole('button', { name: /Add After Current Task/i }).click();

  await ensureVisible(page.getByText('Task One'), 'Task One visible');
  await ensureVisible(page.getByText('Task Two'), 'Task Two visible');

  if (await page.getByRole('button', { name: /Task One/i }).first().isVisible()) {
    await page.getByRole('button', { name: /Task One/i }).first().click();
    await ensureVisible(page.getByRole('heading', { name: /Edit Task/i }), 'Task edit modal opens');
    await modal(page).getByPlaceholder('Implement auth flow').fill('Task One Edited');
    await modal(page).getByRole('button', { name: /Save Changes/i }).click();
    await ensureVisible(page.getByText('Task One Edited'), 'Task edit persisted');
  }

  await shot(page, 'project-detail');
}

async function focusFlow(page) {
  logStep('Focus random picker and completion flow');
  await page.goto(`${BASE_URL}/focus`, { waitUntil: 'domcontentloaded' });
  await ensureVisible(page.getByRole('heading', { name: /^Focus$/i }), 'Focus page opens');

  await page.getByRole('button', { name: /Start a Task/i }).click();
  await ensureVisible(page.getByRole('button', { name: /Let's Go/i }), 'Random selection card shown');

  const rerollBtn = page.getByRole('button', { name: /Pick a different one/i });
  if (await rerollBtn.isVisible()) {
    await rerollBtn.click();
    await ensureVisible(page.getByRole('button', { name: /Let's Go/i }), 'Reroll still presents task');
  }

  await page.getByRole('button', { name: /Let's Go/i }).click();
  await ensureVisible(page.getByRole('button', { name: /I'm Done/i }), 'Active task screen shown');
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /I'm Done/i }).click();

  await ensureVisible(page.getByRole('heading', { name: /Nice work!/i }), 'Complete task modal opens');
  const hourInput = modal(page).locator('input[type="number"]').first();
  const minuteInput = modal(page).locator('input[type="number"]').nth(1);
  await hourInput.fill('0');
  await minuteInput.fill('5');
  await modal(page).getByRole('button', { name: /Save & Continue/i }).click();

  await ensureVisible(page.getByRole('button', { name: /Done For Now|Go to Project|Start Another Task/i }), 'Post-completion actions shown');
  await shot(page, 'focus-after-complete');
}

async function statsFlow(page) {
  logStep('Stats checks');
  await page.goto(`${BASE_URL}/stats`, { waitUntil: 'domcontentloaded' });
  await ensureVisible(page.getByRole('heading', { name: /^Stats$/i }), 'Stats page opens');
  await ensureVisible(page.getByText(/Focus time/i), 'Summary metric visible');
  await ensureVisible(page.getByRole('button', { name: /Overview/i }), 'Stats tabs visible');
  await ensureVisible(page.getByRole('button', { name: /Open achievements/i }), 'Achievements preview visible');
  await shot(page, 'stats');
}

async function settingsFlow(page) {
  logStep('Settings checks, archive/restore, logout/login');
  await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /QA Project/i }).click();
  await page.getByRole('button', { name: /^Archive$/i }).click();
  await ensureVisible(page.getByRole('heading', { name: /Archive project/i }), 'Archive confirmation opens');
  await page.getByRole('button', { name: /^Archive$/i }).last().click();
  await page.waitForURL('**/projects', { timeout: 10000 });

  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
  await ensureVisible(page.getByRole('heading', { name: /^Settings$/i }), 'Settings page opens');

  const profileInput = page.locator('input').first();
  await profileInput.fill('QA Runner Updated');
  await profileInput.blur();
  await ensureVisible(page.getByText('Saved'), 'Profile save message appears');

  const restoreBtn = page.getByRole('button', { name: /^Restore$/i }).first();
  if (await restoreBtn.isVisible()) {
    await restoreBtn.click();
    await ensureVisible(page.getByRole('heading', { name: /Restore project/i }), 'Restore confirmation opens');
    await page.getByRole('button', { name: /^Restore$/i }).last().click();
    await page.getByRole('heading', { name: /Restore project/i }).waitFor({ state: 'hidden', timeout: 10000 });
    console.log('[QA] PASS: Project restore flow works');
  }

  await page.getByRole('button', { name: /Show/i }).click();
  await page.getByRole('button', { name: /Log out/i }).click();
  await page.waitForURL('**/auth', { timeout: 10000 });
  await ensureVisible(page.getByRole('heading', { name: /Create account|Welcome back/i }), 'Logout redirects to auth');

  await page.getByRole('button', { name: /Log In/i }).click();
  await page.getByPlaceholder('Email').fill(email);
  await page.getByRole('button', { name: /Forgot password/i }).click();
  const resetMessage = page.getByText(/Password reset link sent/i);
  const resetError = page.locator('p.text-sm.text-red-400');
  await Promise.race([
    resetMessage.first().waitFor({ state: 'visible', timeout: 10000 }),
    resetError.first().waitFor({ state: 'visible', timeout: 10000 }),
  ]);
  console.log('[QA] PASS: Forgot password request handled');

  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password', { exact: true }).fill(password);
  await page.locator('form').getByRole('button', { name: /^Log In$/i }).click();
  await page.waitForURL('**/habits', { timeout: 20000 });
  await ensureVisible(page.getByRole('heading', { name: /Today/i }), 'Login back works');
  await shot(page, 'settings-logout-login');
}

async function deleteAccountFlow(page) {
  logStep('Delete account flow');
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
  await ensureVisible(page.getByRole('heading', { name: /^Settings$/i }), 'Settings open before delete');

  await page.getByRole('button', { name: /Show/i }).click();
  await page.getByRole('button', { name: /Delete account/i }).click();
  await ensureVisible(page.getByRole('heading', { name: /Delete account/i }), 'Delete account modal opens');
  await modal(page).getByPlaceholder('Type DELETE').fill('DELETE');
  await modal(page).getByRole('button', { name: /Confirm delete/i }).click();

  await page.waitForURL('**/auth', { timeout: 20000 });
  await ensureVisible(page.getByRole('heading', { name: /Create account|Welcome back/i }), 'Account deletion signs out');

  await page.getByRole('button', { name: /Log In/i }).click();
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password', { exact: true }).fill(password);
  await page.locator('form').getByRole('button', { name: /^Log In$/i }).click();
  await ensureVisible(page.getByText(/Invalid login credentials|Email not confirmed|user not found/i), 'Deleted account cannot log in');
  await shot(page, 'deleted-account-auth-check');
}

async function mobileVisualPass(storageStatePath) {
  logStep('Mobile visual pass');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    storageState: storageStatePath,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  const routes = ['habits', 'projects', 'focus', 'stats', 'settings'];
  for (const route of routes) {
    await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    }));
    console.log(`[QA] MOBILE ${route}:`, metrics);
    await shot(page, `mobile-${route}`);
  }

  await context.close();
  await browser.close();
}

(async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await authFlow(page);
    await habitsFlow(page);
    await projectsFlow(page);
    await focusFlow(page);
    await statsFlow(page);
    await settingsFlow(page);

    const storageStatePath = `${ARTIFACT_DIR}/storage-state.json`;
    await context.storageState({ path: storageStatePath });
    await mobileVisualPass(storageStatePath);
    await deleteAccountFlow(page);

    console.log('\n[QA] ALL TEST FLOWS PASSED');
  } catch (error) {
    console.error('\n[QA] FAILURE:', error);
    await shot(page, 'failure');
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
})();
