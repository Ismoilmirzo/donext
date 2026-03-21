import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bpyuooiriqauczahkssy.supabase.co';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ARTIFACT_DIR = path.resolve('qa-artifacts', 'telegram-auth');

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN for Telegram auth QA.');
}

mkdirSync(ARTIFACT_DIR, { recursive: true });

function loadServiceRole() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keys = JSON.parse(execSync('supabase projects api-keys -o json', { encoding: 'utf8' }));
  return keys.find((entry) => entry.id === 'service_role')?.api_key || '';
}

const admin = createClient(SUPABASE_URL, loadServiceRole(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const createdUserIds = new Set();

function buildLoginWidgetPayload({ authDate = Math.floor(Date.now() / 1000), firstName, id, lastName, photoUrl, username }) {
  const payload = {
    auth_date: authDate,
    first_name: firstName,
    id: String(id),
    last_name: lastName,
    photo_url: photoUrl,
    username,
  };
  const dataCheckString = Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => [key, String(value)])
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest();
  return {
    ...payload,
    hash: crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'),
  };
}

function buildMiniAppInitData({ authDate = Math.floor(Date.now() / 1000), user }) {
  const payload = {
    auth_date: String(authDate),
    query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
    user: JSON.stringify(user),
  };
  const dataCheckString = Object.entries(payload)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest();
  return new URLSearchParams({
    ...payload,
    hash: crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'),
  }).toString();
}

function telegramStubForInitData(initData) {
  return {
    WebApp: {
      close: () => undefined,
      expand: () => undefined,
      initData,
      initDataUnsafe: {},
      ready: () => undefined,
    },
  };
}

async function saveShot(page, name) {
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: true });
}

async function expectVisible(locator, label, timeout = 15000) {
  await locator.first().waitFor({ state: 'visible', timeout });
  console.log(`[QA] PASS: ${label}`);
}

async function waitForWidgetCallback(page) {
  await page.waitForFunction(() => Boolean(window.__donextTelegramAuthWidgetLastCallback), { timeout: 20000 });
}

async function triggerWidgetAuth(page, payload) {
  await waitForWidgetCallback(page);
  await page.evaluate((value) => {
    const callbackName = window.__donextTelegramAuthWidgetLastCallback;
    window[callbackName](value);
  }, payload);
}

async function createEmailBridgeUser() {
  const email = `tg-bridge-ui-${Date.now()}@example.com`;
  const password = 'BridgeUi123!';
  const createRes = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { full_name: 'Bridge UI User' },
  });
  if (createRes.error || !createRes.data.user) throw createRes.error || new Error('Failed to create email bridge QA user.');

  createdUserIds.add(createRes.data.user.id);
  const profileRes = await admin
    .from('profiles')
    .update({ display_name: 'Bridge UI User', onboarding_done: true, updated_at: new Date().toISOString() })
    .eq('id', createRes.data.user.id);
  if (profileRes.error) throw profileRes.error;

  return {
    email,
    password,
    userId: createRes.data.user.id,
  };
}

async function findUserByEmail(email) {
  const listRes = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listRes.error) throw listRes.error;
  return (listRes.data?.users || []).find((entry) => entry.email?.toLowerCase() === email.toLowerCase()) || null;
}

async function cleanupUsers() {
  for (const userId of createdUserIds) {
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {
      // Ignore cleanup misses.
    }

    try {
      await admin.from('profiles').delete().eq('id', userId);
    } catch {
      // Ignore cleanup misses.
    }
  }
}

async function testMiniAppCreateAndReturn(browser) {
  console.log('\n[QA] Mini App create + linked return');
  const idBase = Number(String(Date.now()).slice(-8));
  const telegramUser = {
    id: 900000000 + idBase,
    first_name: 'Mini',
    last_name: 'Bridge',
    username: 'mini_bridge_user',
    language_code: 'en',
    photo_url: 'https://example.com/mini-bridge.png',
  };
  const initData = buildMiniAppInitData({ user: telegramUser });
  const syntheticEmail = `tg-${telegramUser.id}@telegram.donext.invalid`;

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript((telegramValue) => {
    window.Telegram = telegramValue;
  }, telegramStubForInitData(initData));
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText('This Telegram account is not linked yet.'), 'Mini App unlinked bridge is shown');
  await page.getByRole('button', { name: /Create Telegram account/i }).click();
  await page.waitForURL(/\/welcome$/, { timeout: 30000 });
  await expectVisible(page.getByText(/Start with a clear path/i), 'Mini App account creation redirects to welcome');
  await saveShot(page, 'miniapp-created');
  await context.close();

  const syntheticUser = await findUserByEmail(syntheticEmail);
  if (!syntheticUser?.id) {
    throw new Error('Mini App creation did not create the expected Telegram-backed user.');
  }
  createdUserIds.add(syntheticUser.id);

  const secondContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await secondContext.addInitScript((telegramValue) => {
    window.Telegram = telegramValue;
  }, telegramStubForInitData(initData));
  const secondPage = await secondContext.newPage();
  await secondPage.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
  await secondPage.waitForURL(/\/welcome$/, { timeout: 30000 });
  await expectVisible(secondPage.getByText(/Start with a clear path/i), 'Linked Mini App entry signs in without bridge');
  await saveShot(secondPage, 'miniapp-linked-return');
  await secondContext.close();
}

async function testWebsiteLinkAndTelegramLogin(browser) {
  console.log('\n[QA] Website link + Telegram website login');
  const user = await createEmailBridgeUser();
  const idBase = Number(String(Date.now()).slice(-8));
  const linkedIdentity = {
    firstName: 'Website',
    id: 910000000 + idBase,
    lastName: 'Bridge',
    photoUrl: 'https://example.com/website-bridge.png',
    username: 'website_bridge_user',
  };
  const widgetPayload = buildLoginWidgetPayload(linkedIdentity);
  const miniAppInitData = buildMiniAppInitData({
    user: {
      id: linkedIdentity.id,
      first_name: linkedIdentity.firstName,
      last_name: linkedIdentity.lastName,
      username: linkedIdentity.username,
      language_code: 'en',
      photo_url: linkedIdentity.photoUrl,
    },
  });

  const loginContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await loginContext.newPage();
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Log In$/i }).click();
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder('Password', { exact: true }).fill(user.password);
  await page.locator('form').getByRole('button', { name: /^Log In$/i }).click();
  await page.waitForURL(/\/habits$/, { timeout: 30000 });
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
  await waitForWidgetCallback(page);
  await triggerWidgetAuth(page, widgetPayload);
  await expectVisible(page.getByText(/Telegram connected as @website_bridge_user/i), 'Settings link flow connects Telegram');
  await saveShot(page, 'settings-linked');
  await page.getByRole('button', { name: /Show/i }).click();
  await page.getByRole('button', { name: /Log out/i }).click();
  await page.waitForURL(/\/auth$/, { timeout: 30000 });
  await loginContext.close();

  const telegramContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const telegramPage = await telegramContext.newPage();
  await telegramPage.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
  await triggerWidgetAuth(telegramPage, widgetPayload);
  await telegramPage.waitForURL(/\/habits$/, { timeout: 30000 });
  await expectVisible(telegramPage.getByRole('heading', { name: /Today/i }), 'Website Telegram login signs into the linked account');
  await saveShot(telegramPage, 'telegram-login');
  await telegramContext.close();

  const miniAppContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await miniAppContext.addInitScript((telegramValue) => {
    window.Telegram = telegramValue;
  }, telegramStubForInitData(miniAppInitData));
  const miniAppPage = await miniAppContext.newPage();
  await miniAppPage.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
  await miniAppPage.waitForURL(/\/habits$/, { timeout: 30000 });
  await expectVisible(miniAppPage.getByRole('heading', { name: /Today/i }), 'Linked Mini App entry signs into the existing email account');
  await saveShot(miniAppPage, 'miniapp-linked-email-account');
  await miniAppContext.close();
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  try {
    await testMiniAppCreateAndReturn(browser);
    await testWebsiteLinkAndTelegramLogin(browser);
    console.log('\n[QA] Telegram auth browser pass completed successfully');
  } finally {
    await browser.close();
    await cleanupUsers();
  }
}

run().catch((error) => {
  console.error('\n[QA] FAILURE:', error);
  process.exitCode = 1;
});
