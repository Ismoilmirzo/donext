import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const EMAIL = process.env.QA_EMAIL || 'onlyforbspass@gmail.com';
const PASSWORD = process.env.QA_PASSWORD || 'Ismoilmirzo$2007';
const ARTIFACT_DIR = path.resolve('qa-artifacts', 'features-10-14');

mkdirSync(ARTIFACT_DIR, { recursive: true });

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

async function dismissBadgePopups(page) {
  let quietChecks = 0;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const popup = page.getByText(/badge unlocked/i);
    if (!(await popup.isVisible().catch(() => false))) {
      quietChecks += 1;
      if (quietChecks >= 4) return;
      await page.waitForTimeout(250);
      continue;
    }
    quietChecks = 0;
    await page.mouse.click(24, 24);
    await page.waitForTimeout(250);
  }
}

async function login(page) {
  logStep('Login');
  await page.goto(`${BASE_URL}/auth/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Log In$/i }).click();
  await page.getByPlaceholder('Email').fill(EMAIL);
  await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /^Log In$/i }).click();
  await page.waitForURL('**/habits', { timeout: 20000 });
  await expectVisible(page.getByRole('heading', { name: /Today/i }), 'Logged into habits page');
}

async function verifyWeeklyGoalPrompt(page) {
  logStep('Weekly goal prompt');
  await page.goto(`${BASE_URL}/habits`, { waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText('Set your focus goal for this week'), 'Weekly goal prompt is visible');
  await page.locator('input[placeholder="7.5"]').fill('4');
  await page.getByRole('button', { name: /^Set Goal$/i }).click();
  await page.getByText('Set your focus goal for this week').waitFor({ state: 'hidden', timeout: 15000 });
  console.log('[QA] PASS: Weekly goal prompt closes after save');
  await saveShot(page, 'habits-weekly-goal');
}

async function verifyHabitTrends(page) {
  logStep('Habit trends');
  await page.goto(`${BASE_URL}/habits`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Trends$/i }).click();
  await expectVisible(page.getByText('Show all habits'), 'Show all toggle is visible', 30000);
  await page.getByRole('button', { name: /Show all habits/i }).click();
  const mondayResetRow = page.locator('div').filter({ hasText: /^Monday Reset/ }).first();
  await expectVisible(mondayResetRow, 'Monday-only habit row is visible in expanded trends');
  await expectVisible(page.getByText(/20%|17%|14%/), 'Trend percentages render');
  await saveShot(page, 'habits-trends-desktop');
}

async function completeFocusTask(page) {
  logStep('Focus completion and badges');
  await page.goto(`${BASE_URL}/focus`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Start a Task/i }).click();
  await expectVisible(page.getByRole('button', { name: /Let's Go/i }), 'Random pick is shown');
  await page.getByRole('button', { name: /Let's Go/i }).click();
  await expectVisible(page.getByRole('button', { name: /I'm Done/i }), 'Active task screen is shown');
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /I'm Done/i }).click();
  await expectVisible(page.getByRole('heading', { name: /Nice work!/i }), 'Complete task modal opens');
  const hourInput = page.locator('input[type="number"]').first();
  const minuteInput = page.locator('input[type="number"]').nth(1);
  await hourInput.fill('0');
  await minuteInput.fill('40');
  await page.getByRole('button', { name: /Save & Continue/i }).click();
  await expectVisible(page.getByText(/Task complete|All tasks/i), 'Completion feedback is visible');
  await expectVisible(page.getByText(/badge unlocked/i), 'Badge popup appears after completion', 20000);
  await saveShot(page, 'focus-badge-popup');
  await dismissBadgePopups(page);
}

async function verifyStatsShareAndHistory(page) {
  logStep('Stats, share card, and history');
  await page.goto(`${BASE_URL}/stats`, { waitUntil: 'domcontentloaded' });
  await dismissBadgePopups(page);
  await expectVisible(page.getByRole('heading', { name: /^Stats$/i }), 'Stats page opens');
  await expectVisible(page.getByText('Share My Week'), 'Share card section is visible');

  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await page.getByRole('button', { name: /Share my week/i }).click();
  const shareDownload = await downloadPromise;
  const sharePath = path.join(ARTIFACT_DIR, await shareDownload.suggestedFilename());
  await shareDownload.saveAs(sharePath);
  console.log(`[QA] PASS: Share download saved to ${path.basename(sharePath)}`);

  await page.getByRole('button', { name: /^This Month$/i }).click();
  await expectVisible(page.getByText('Week of'), 'Weekly goal history table is visible');
  await expectVisible(page.getByText(/Mar 2 - Mar 8|Mar 2 – Mar 8/), 'History week labels are rendered correctly');
  await expectVisible(page.getByText(/210m|3h 30m/), 'History actual focus values are present');
  await expectVisible(page.getByText('Achievements'), 'Badge grid is visible');
  await saveShot(page, 'stats-month-history');
}

async function verifyExport(page) {
  logStep('Export data');
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
  await dismissBadgePopups(page);
  await expectVisible(page.getByRole('heading', { name: /^Settings$/i }), 'Settings page opens');
  const dataPrivacyHeading = page.getByText('Data & Privacy');
  await dataPrivacyHeading.scrollIntoViewIfNeeded();
  await expectVisible(dataPrivacyHeading, 'Data & Privacy section is visible');
  const downloadButton = page.getByRole('button', { name: /Download my data/i });
  await expectVisible(downloadButton, 'Download button is visible');
  let download = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await downloadButton.click({ force: true });
    download = await downloadPromise;

    const successVisible = await page.getByText('Your export is ready.').isVisible().catch(() => false);
    const cooldownVisible = await page.getByRole('button', { name: /Download available in 1 min/i }).isVisible().catch(() => false);
    if (download || successVisible || cooldownVisible) break;

    await page.waitForTimeout(1500);
  }

  if (download) {
    const exportPath = path.join(ARTIFACT_DIR, await download.suggestedFilename());
    await download.saveAs(exportPath);
    const exportJson = JSON.parse(readFileSync(exportPath, 'utf8'));
    const requiredKeys = ['habits', 'habit_logs', 'projects', 'tasks', 'focus_sessions', 'badges', 'weekly_goals'];
    for (const key of requiredKeys) {
      if (!(key in exportJson)) {
        throw new Error(`Export is missing key: ${key}`);
      }
    }
    console.log('[QA] PASS: Export download saved and JSON contains expected keys');
  } else {
    console.log('[QA] INFO: Browser did not emit a download event for the blob URL; validating visible success state instead');
  }
  await expectVisible(page.getByText('Your export is ready.'), 'Export success message is shown', 30000);
  await expectVisible(page.getByRole('button', { name: /Download available in 1 min/i }), 'Export cooldown starts', 30000);
}

async function verifyMobile(browser) {
  logStep('Mobile pass');
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    timezoneId: 'America/New_York',
  });
  const page = await context.newPage();
  await login(page);

  for (const route of ['habits', 'focus', 'stats', 'settings']) {
    await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await saveShot(page, `mobile-${route}`);
    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    }));
    console.log(`[QA] MOBILE ${route}:`, metrics);
  }

  await context.close();
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    timezoneId: 'America/New_York',
  });
  const page = await context.newPage();

  try {
    await login(page);
    await verifyWeeklyGoalPrompt(page);
    await verifyHabitTrends(page);
    await completeFocusTask(page);
    await verifyStatsShareAndHistory(page);
    await verifyExport(page);
    await saveShot(page, 'settings-export');
    await verifyMobile(browser);
    console.log('\n[QA] Feature 10-14 pass completed successfully');
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch(async (error) => {
  console.error('\n[QA] FAILURE:', error);
  process.exitCode = 1;
});
