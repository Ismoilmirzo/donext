export const ACCOUNT_ARCHIVE_BUCKET = 'deleted-account-archives';
export const SNAPSHOT_VERSION = '1.1';

type ExportSpec = {
  key: string;
  table: string;
  filterField: 'user_id' | 'auth_user_id';
  orderBy?: string;
  ascending?: boolean;
  single?: boolean;
};

const EXPORT_SPECS: ExportSpec[] = [
  { key: 'telegram_account', table: 'telegram_accounts', filterField: 'auth_user_id', single: true },
  { key: 'habits', table: 'habits', filterField: 'user_id', orderBy: 'sort_order' },
  { key: 'habit_logs', table: 'habit_logs', filterField: 'user_id', orderBy: 'date' },
  { key: 'projects', table: 'projects', filterField: 'user_id', orderBy: 'created_at' },
  { key: 'tasks', table: 'tasks', filterField: 'user_id', orderBy: 'created_at' },
  { key: 'focus_sessions', table: 'focus_sessions', filterField: 'user_id', orderBy: 'date' },
  { key: 'task_sessions', table: 'task_sessions', filterField: 'user_id', orderBy: 'created_at' },
  { key: 'badges', table: 'badges', filterField: 'user_id', orderBy: 'unlocked_at' },
  { key: 'weekly_goals', table: 'weekly_goals', filterField: 'user_id', orderBy: 'week_start' },
  { key: 'streak_freezes', table: 'streak_freezes', filterField: 'user_id', orderBy: 'date' },
];

const RESTORE_SPECS: ExportSpec[] = [
  { key: 'telegram_account', table: 'telegram_accounts', filterField: 'auth_user_id', single: true },
  { key: 'habits', table: 'habits', filterField: 'user_id' },
  { key: 'projects', table: 'projects', filterField: 'user_id' },
  { key: 'tasks', table: 'tasks', filterField: 'user_id' },
  { key: 'habit_logs', table: 'habit_logs', filterField: 'user_id' },
  { key: 'focus_sessions', table: 'focus_sessions', filterField: 'user_id' },
  { key: 'task_sessions', table: 'task_sessions', filterField: 'user_id' },
  { key: 'badges', table: 'badges', filterField: 'user_id' },
  { key: 'weekly_goals', table: 'weekly_goals', filterField: 'user_id' },
  { key: 'streak_freezes', table: 'streak_freezes', filterField: 'user_id' },
];

const CLEAR_SPECS = [...RESTORE_SPECS].reverse();

function toArray<T>(value: T | T[] | null | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeEmailForPath(email: string | null | undefined) {
  return String(email || 'unknown-email')
    .trim()
    .toLowerCase()
    .replace(/@/g, '_at_')
    .replace(/\./g, '_dot_')
    .replace(/[^a-z0-9_\-]/g, '-');
}

function isBucketAlreadyPresent(error: { message?: string; statusCode?: string | number } | null) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('already exists') || String(error?.statusCode || '') === '409';
}

export function formatDateStamp(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function ensureArchiveBucket(adminClient: any) {
  const bucketListRes = await adminClient.storage.listBuckets();
  if (bucketListRes.error) throw bucketListRes.error;

  const existing = (bucketListRes.data || []).find((bucket: { name?: string }) => bucket.name === ACCOUNT_ARCHIVE_BUCKET);
  if (existing) return;

  const createRes = await adminClient.storage.createBucket(ACCOUNT_ARCHIVE_BUCKET, {
    public: false,
    fileSizeLimit: '10MB',
    allowedMimeTypes: ['application/json'],
  });

  if (createRes.error && !isBucketAlreadyPresent(createRes.error)) {
    throw createRes.error;
  }
}

function buildArchivePath(email: string | null | undefined, authUserId: string, deletedVia: 'self_service' | 'admin') {
  const datePart = new Date().toISOString().replace(/[:]/g, '-');
  return `${deletedVia}/${normalizeEmailForPath(email)}/${datePart}__${authUserId}.json`;
}

async function loadExportSpec(adminClient: any, userId: string, spec: ExportSpec) {
  let query = adminClient.from(spec.table).select('*').eq(spec.filterField, userId);
  if (spec.orderBy) {
    query = query.order(spec.orderBy, { ascending: spec.ascending ?? true });
  }

  const response = spec.single ? await query.maybeSingle() : await query;
  if (response.error) throw response.error;

  return response.data || (spec.single ? null : []);
}

export async function buildUserSnapshot(adminClient: any, authUser: { id: string; email?: string | null; created_at?: string | null }) {
  const userId = authUser.id;
  const profileRes = await adminClient.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (profileRes.error) throw profileRes.error;

  const loadedEntries = await Promise.all(
    EXPORT_SPECS.map(async (spec) => [spec.key, await loadExportSpec(adminClient, userId, spec)] as const)
  );

  const snapshotEntries = Object.fromEntries(loadedEntries);
  const profile = profileRes.data || null;
  const focusSessions = toArray(snapshotEntries.focus_sessions);
  const taskSessions = toArray(snapshotEntries.task_sessions);
  const telegramAccount =
    snapshotEntries.telegram_account && !Array.isArray(snapshotEntries.telegram_account) ? snapshotEntries.telegram_account : null;

  return {
    exported_at: new Date().toISOString(),
    app: 'DoNext',
    version: SNAPSHOT_VERSION,
    profile,
    user: {
      id: userId,
      email: authUser.email || null,
      display_name: profile?.display_name || null,
      created_at: profile?.created_at || authUser.created_at || null,
      random_without_reroll_count: profile?.random_without_reroll_count || 0,
      onboarding_done: Boolean(profile?.onboarding_done),
      timezone: profile?.timezone || null,
      telegram: telegramAccount
        ? {
            linked_at: telegramAccount.linked_at,
            telegram_user_id: telegramAccount.telegram_user_id,
            username: telegramAccount.telegram_username,
          }
        : null,
    },
    ...snapshotEntries,
    summary: {
      total_habits: toArray(snapshotEntries.habits).length,
      total_habit_logs: toArray(snapshotEntries.habit_logs).length,
      total_projects: toArray(snapshotEntries.projects).length,
      total_tasks: toArray(snapshotEntries.tasks).length,
      total_focus_sessions: focusSessions.length,
      total_task_sessions: taskSessions.length,
      total_focus_minutes: focusSessions.reduce(
        (sum: number, session: { duration_minutes?: number | null }) => sum + Number(session.duration_minutes || 0),
        0
      ),
      total_badges_unlocked: toArray(snapshotEntries.badges).length,
      total_weekly_goals: toArray(snapshotEntries.weekly_goals).length,
      total_streak_freezes: toArray(snapshotEntries.streak_freezes).length,
    },
  };
}

export async function archiveUserSnapshot(
  adminClient: any,
  options: {
    authUser: { id: string; email?: string | null; created_at?: string | null };
    deletedVia: 'self_service' | 'admin';
    deletedById?: string | null;
    deletedByEmail?: string | null;
  }
) {
  const snapshot = await buildUserSnapshot(adminClient, options.authUser);
  const archivePath = buildArchivePath(options.authUser.email, options.authUser.id, options.deletedVia);
  await ensureArchiveBucket(adminClient);

  const archivePayload = {
    ...snapshot,
    archive: {
      archived_at: new Date().toISOString(),
      deleted_via: options.deletedVia,
      deleted_by_user_id: options.deletedById || null,
      deleted_by_email: options.deletedByEmail || null,
      source_auth_user_id: options.authUser.id,
    },
  };

  const uploadRes = await adminClient.storage
    .from(ACCOUNT_ARCHIVE_BUCKET)
    .upload(archivePath, new Blob([JSON.stringify(archivePayload, null, 2)], { type: 'application/json' }), {
      contentType: 'application/json',
      upsert: false,
    });

  if (uploadRes.error) throw uploadRes.error;
  return { archivePath, snapshot: archivePayload };
}

export async function findLatestArchivePathForEmail(adminClient: any, email: string) {
  await ensureArchiveBucket(adminClient);
  const folder = normalizeEmailForPath(email);
  const prefixes = ['self_service', 'admin'];
  const candidates: string[] = [];

  for (const prefix of prefixes) {
    const listRes = await adminClient.storage.from(ACCOUNT_ARCHIVE_BUCKET).list(`${prefix}/${folder}`, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'desc' },
    });

    if (listRes.error) {
      const message = String(listRes.error.message || '').toLowerCase();
      if (message.includes('not found')) continue;
      throw listRes.error;
    }

    for (const entry of listRes.data || []) {
      if (!entry?.name?.endsWith('.json')) continue;
      candidates.push(`${prefix}/${folder}/${entry.name}`);
    }
  }

  return candidates.sort().at(-1) || null;
}

export async function downloadArchiveSnapshot(adminClient: any, archivePath: string) {
  await ensureArchiveBucket(adminClient);
  const downloadRes = await adminClient.storage.from(ACCOUNT_ARCHIVE_BUCKET).download(archivePath);
  if (downloadRes.error) throw downloadRes.error;
  return JSON.parse(await downloadRes.data.text());
}

export async function getExistingUserDataCounts(adminClient: any, userId: string) {
  const counts: Record<string, number> = {};

  for (const spec of RESTORE_SPECS) {
    const response = await adminClient
      .from(spec.table)
      .select('id', { count: 'exact', head: true })
      .eq(spec.filterField, userId);

    if (response.error) throw response.error;
    counts[spec.key] = response.count || 0;
  }

  return counts;
}

async function clearUserOwnedData(adminClient: any, userId: string) {
  for (const spec of CLEAR_SPECS) {
    const deleteRes = await adminClient.from(spec.table).delete().eq(spec.filterField, userId);
    if (deleteRes.error) throw deleteRes.error;
  }
}

function rewriteOwnerField(row: Record<string, unknown>, field: 'user_id' | 'auth_user_id', userId: string) {
  return {
    ...row,
    [field]: userId,
  };
}

async function insertRows(adminClient: any, table: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const insertRes = await adminClient.from(table).insert(rows);
  if (insertRes.error) throw insertRes.error;
}

export async function restoreUserSnapshot(
  adminClient: any,
  snapshot: Record<string, any>,
  targetAuthUser: { id: string; email?: string | null; created_at?: string | null },
  options: { force?: boolean } = {}
) {
  const targetUserId = targetAuthUser.id;
  const existingCounts = await getExistingUserDataCounts(adminClient, targetUserId);
  const occupiedKeys = Object.entries(existingCounts)
    .filter(([, count]) => count > 0)
    .map(([key]) => key);

  if (occupiedKeys.length && !options.force) {
    throw new Error(`Target user already has data in: ${occupiedKeys.join(', ')}.`);
  }

  if (occupiedKeys.length) {
    await clearUserOwnedData(adminClient, targetUserId);
  }

  const sourceProfile = snapshot.profile || {};
  const sourceUser = snapshot.user || {};
  const nowIso = new Date().toISOString();

  const profilePayload = {
    ...sourceProfile,
    id: targetUserId,
    display_name: sourceProfile.display_name ?? sourceUser.display_name ?? targetAuthUser.email ?? 'User',
    timezone: sourceProfile.timezone ?? sourceUser.timezone ?? 'Asia/Tashkent',
    onboarding_done: sourceProfile.onboarding_done ?? sourceUser.onboarding_done ?? true,
    random_without_reroll_count: sourceProfile.random_without_reroll_count ?? sourceUser.random_without_reroll_count ?? 0,
    created_at: sourceProfile.created_at ?? sourceUser.created_at ?? targetAuthUser.created_at ?? nowIso,
    updated_at: nowIso,
  };

  const profileRes = await adminClient.from('profiles').upsert(profilePayload, { onConflict: 'id' });
  if (profileRes.error) throw profileRes.error;

  for (const spec of RESTORE_SPECS) {
    const rawRows = toArray(snapshot[spec.key]);
    const rewrittenRows = rawRows.map((row: Record<string, unknown>) => rewriteOwnerField(row, spec.filterField, targetUserId));
    await insertRows(adminClient, spec.table, rewrittenRows);
  }

  return {
    restored_to_user_id: targetUserId,
    counts: Object.fromEntries(RESTORE_SPECS.map((spec) => [spec.key, toArray(snapshot[spec.key]).length])),
  };
}
