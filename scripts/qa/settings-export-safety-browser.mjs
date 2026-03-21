import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.QA_BASE_URL || 'https://donext.uz';
const ARTIFACT_DIR = path.resolve('qa-artifacts', 'settings-export');

mkdirSync(ARTIFACT_DIR, { recursive: true });

function loadEnvFile() {
  try {
    return Object.fromEntries(
      readFileSync('.env', 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          const idx = line.indexOf('=');
          return [line.slice(0, idx), line.slice(idx + 1)];
        })
    );
  } catch {
    return {};
  }
}

const fileEnv = loadEnvFile();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || fileEnv.VITE_ADMIN_EMAILS?.split(',')[0]?.trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL) {
  throw new Error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, or QA admin email for settings export QA.');
}

function loadServiceRole() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keys = JSON.parse(execSync('supabase projects api-keys -o json', { encoding: 'utf8' }));
  return keys.find((entry) => entry.id === 'service_role')?.api_key || '';
}

async function loginWithMagicLink(page, adminClient) {
  const linkRes = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: ADMIN_EMAIL,
    options: { redirectTo: `${BASE_URL}/auth/` },
  });
  if (linkRes.error) throw linkRes.error;
  await page.goto(linkRes.data.properties.action_link, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
}

async function waitForSettings(page) {
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: /Settings|Sozlamalar/i }).waitFor({ state: 'visible', timeout: 30000 });
}

async function run() {
  const adminClient = createClient(SUPABASE_URL, loadServiceRole(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });

  try {
    await loginWithMagicLink(page, adminClient);
    await waitForSettings(page);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.getByRole('button', { name: /Download my data|Ma'lumotlarimni yuklab olish/i }).click(),
    ]);
    await download.saveAs(path.join(ARTIFACT_DIR, 'donext-export.json'));
    console.log('[QA] PASS: Settings export downloads a file');

    await page.getByText(/Danger Zone|Xavfli hudud/i).click();
    await page.getByRole('button', { name: /Delete Account|Akkauntni o'chirish/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /Confirm delete|O'chirishni tasdiqlash/i }).click();
    await page.getByText(/Type DELETE to confirm account deletion|DELETE deb yozing/i).first().waitFor({ state: 'visible', timeout: 10000 });
    console.log('[QA] PASS: Account deletion is blocked without explicit DELETE confirmation');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'settings-export-safety.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('\n[QA] FAILURE:', error);
  process.exitCode = 1;
});
