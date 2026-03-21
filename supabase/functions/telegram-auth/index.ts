import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {
  getTelegramPlaceholderEmail,
  getTelegramProfileDisplayName,
  getTelegramPublicProfile,
  isTelegramPlaceholderEmail,
  TELEGRAM_PLACEHOLDER_EMAIL_DOMAIN,
  type TelegramAuthSource,
  type TelegramIdentity,
  verifyTelegramLoginWidgetData,
  verifyTelegramMiniAppInitData,
} from '../_shared/telegram.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_AUTH_MAX_AGE_SECONDS = Number(Deno.env.get('TELEGRAM_AUTH_MAX_AGE_SECONDS') || '3600');
const TELEGRAM_REDIRECT_TO = Deno.env.get('TELEGRAM_AUTH_REDIRECT_TO') || 'https://donext.uz/auth/';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-jwt',
};

type JsonRecord = Record<string, unknown>;

function jsonResponse(body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Telegram auth service configuration.');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getUserClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Telegram auth anon configuration.');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireCurrentUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const forwardedJwt = req.headers.get('x-user-jwt') || '';
  const jwt = forwardedJwt.trim() || authHeader.replace('Bearer ', '').trim();
  if (!jwt) return { error: jsonResponse({ error: 'Missing authorization token.' }, 401) };

  const userClient = getUserClient();
  const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
  if (userError || !userData?.user?.id) {
    return { error: jsonResponse({ error: 'Invalid authorization token.' }, 401) };
  }

  return { user: userData.user };
}

async function resolveTelegramIdentity(body: JsonRecord) {
  if (!TELEGRAM_BOT_TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN.');

  const provider = String(body.provider || '').trim().toLowerCase() as TelegramAuthSource;
  if (provider === 'miniapp') {
    return verifyTelegramMiniAppInitData(String(body.initData || ''), TELEGRAM_BOT_TOKEN, TELEGRAM_AUTH_MAX_AGE_SECONDS);
  }

  if (provider === 'login_widget') {
    return verifyTelegramLoginWidgetData((body.authData || {}) as Record<string, unknown>, TELEGRAM_BOT_TOKEN, TELEGRAM_AUTH_MAX_AGE_SECONDS);
  }

  throw new Error('Unsupported Telegram auth provider.');
}

async function findAuthUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  const listRes = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listRes.error) throw listRes.error;
  return (listRes.data?.users || []).find((entry) => entry.email?.toLowerCase() === email.toLowerCase()) || null;
}

async function ensureTelegramBackedUser(adminClient: ReturnType<typeof createClient>, identity: TelegramIdentity) {
  const email = getTelegramPlaceholderEmail(identity.telegramUserId);
  const displayName = getTelegramProfileDisplayName(identity);

  let authUser = await findAuthUserByEmail(adminClient, email);
  if (!authUser) {
    const createdRes = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID(),
      user_metadata: {
        auth_source: 'telegram',
        full_name: displayName,
        telegram_id: identity.telegramUserId,
        telegram_linked: true,
        telegram_username: identity.username,
      },
    });
    if (createdRes.error || !createdRes.data.user) {
      throw createdRes.error || new Error('Failed to create Telegram-backed auth user.');
    }
    authUser = createdRes.data.user;
  } else {
    const updatedRes = await adminClient.auth.admin.updateUserById(authUser.id, {
      email_confirm: true,
      user_metadata: {
        ...(authUser.user_metadata || {}),
        auth_source: 'telegram',
        full_name: authUser.user_metadata?.full_name || displayName,
        telegram_id: identity.telegramUserId,
        telegram_linked: true,
        telegram_username: identity.username,
      },
    });
    if (updatedRes.error || !updatedRes.data.user) {
      throw updatedRes.error || new Error('Failed to update Telegram-backed auth user.');
    }
    authUser = updatedRes.data.user;
  }

  const profileRes = await adminClient.from('profiles').upsert(
    {
      id: authUser.id,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (profileRes.error) throw profileRes.error;

  return authUser;
}

async function getLinkedTelegramRow(adminClient: ReturnType<typeof createClient>, identity: TelegramIdentity) {
  const rowRes = await adminClient
    .from('telegram_accounts')
    .select('*')
    .eq('telegram_user_id', identity.telegramUserId)
    .maybeSingle();

  if (rowRes.error) throw rowRes.error;
  return rowRes.data;
}

async function getUserTelegramRow(adminClient: ReturnType<typeof createClient>, authUserId: string) {
  const rowRes = await adminClient
    .from('telegram_accounts')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (rowRes.error) throw rowRes.error;
  return rowRes.data;
}

async function upsertTelegramLink(
  adminClient: ReturnType<typeof createClient>,
  authUserId: string,
  identity: TelegramIdentity,
  options: { touchLastLogin?: boolean } = {}
) {
  const existingByTelegram = await getLinkedTelegramRow(adminClient, identity);
  if (existingByTelegram && existingByTelegram.auth_user_id !== authUserId) {
    throw new Error('This Telegram account is already linked to another DoNext account.');
  }

  const existingByUser = await getUserTelegramRow(adminClient, authUserId);
  if (existingByUser && existingByUser.telegram_user_id !== identity.telegramUserId) {
    throw new Error('This DoNext account is already linked to a different Telegram account.');
  }

  const payload = {
    auth_user_id: authUserId,
    created_at: existingByTelegram?.created_at || existingByUser?.created_at || new Date().toISOString(),
    first_name: identity.firstName,
    language_code: identity.languageCode,
    last_login_at: options.touchLastLogin ? new Date().toISOString() : existingByTelegram?.last_login_at || existingByUser?.last_login_at || null,
    last_name: identity.lastName,
    linked_at: existingByTelegram?.linked_at || existingByUser?.linked_at || new Date().toISOString(),
    linked_via: identity.source,
    photo_url: identity.photoUrl,
    telegram_user_id: identity.telegramUserId,
    telegram_username: identity.username,
    updated_at: new Date().toISOString(),
  };

  if (existingByTelegram || existingByUser) {
    const matchField = existingByTelegram ? 'telegram_user_id' : 'auth_user_id';
    const matchValue = existingByTelegram ? identity.telegramUserId : authUserId;
    const updateRes = await adminClient.from('telegram_accounts').update(payload).eq(matchField, matchValue).select('*').single();
    if (updateRes.error) throw updateRes.error;
    return updateRes.data;
  }

  const insertRes = await adminClient.from('telegram_accounts').insert(payload).select('*').single();
  if (insertRes.error) throw insertRes.error;
  return insertRes.data;
}

async function updateAuthMetadataWithTelegram(adminClient: ReturnType<typeof createClient>, authUserId: string, identity: TelegramIdentity) {
  const authRes = await adminClient.auth.admin.getUserById(authUserId);
  if (authRes.error || !authRes.data?.user) {
    throw authRes.error || new Error('Linked auth user was not found.');
  }

  const user = authRes.data.user;
  const nextMetadata = {
    ...(user.user_metadata || {}),
    telegram_id: identity.telegramUserId,
    telegram_linked: true,
    telegram_username: identity.username,
  };

  if (isTelegramPlaceholderEmail(user.email)) {
    nextMetadata.auth_source = 'telegram';
    nextMetadata.full_name = user.user_metadata?.full_name || getTelegramProfileDisplayName(identity);
  }

  const updateRes = await adminClient.auth.admin.updateUserById(authUserId, {
    email_confirm: isTelegramPlaceholderEmail(user.email) ? true : undefined,
    user_metadata: nextMetadata,
  });
  if (updateRes.error || !updateRes.data.user) {
    throw updateRes.error || new Error('Failed to update auth metadata.');
  }

  return updateRes.data.user;
}

async function issueTelegramSession(adminClient: ReturnType<typeof createClient>, authEmail: string) {
  const linkRes = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: authEmail,
    options: { redirectTo: TELEGRAM_REDIRECT_TO },
  });

  if (linkRes.error || !linkRes.data?.properties?.hashed_token) {
    throw linkRes.error || new Error('Failed to issue a Telegram auth session.');
  }

  return linkRes.data.properties.hashed_token;
}

async function handleSignIn(adminClient: ReturnType<typeof createClient>, identity: TelegramIdentity, allowCreate: boolean) {
  const existingLink = await getLinkedTelegramRow(adminClient, identity);

  if (!existingLink && !allowCreate) {
    return {
      status: 'unlinked',
      telegram: getTelegramPublicProfile(identity),
    };
  }

  let authUserId = existingLink?.auth_user_id || '';
  let authEmail = '';
  let created = false;

  if (!existingLink) {
    const createdUser = await ensureTelegramBackedUser(adminClient, identity);
    authUserId = createdUser.id;
    authEmail = createdUser.email || getTelegramPlaceholderEmail(identity.telegramUserId);
    created = true;
  } else {
    const authRes = await adminClient.auth.admin.getUserById(existingLink.auth_user_id);
    if (authRes.error || !authRes.data?.user) {
      throw authRes.error || new Error('Linked DoNext account was not found.');
    }

    authUserId = authRes.data.user.id;
    authEmail = authRes.data.user.email || '';
    if (!authEmail) {
      throw new Error('Linked DoNext account does not have a sign-in email.');
    }
  }

  await upsertTelegramLink(adminClient, authUserId, identity, { touchLastLogin: true });
  await updateAuthMetadataWithTelegram(adminClient, authUserId, identity);

  return {
    created,
    status: 'ok',
    telegram: getTelegramPublicProfile(identity),
    tokenHash: await issueTelegramSession(adminClient, authEmail),
  };
}

async function handleLink(adminClient: ReturnType<typeof createClient>, authUserId: string, identity: TelegramIdentity) {
  await upsertTelegramLink(adminClient, authUserId, identity);
  await updateAuthMetadataWithTelegram(adminClient, authUserId, identity);

  return {
    status: 'linked',
    telegram: getTelegramPublicProfile(identity),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY || !TELEGRAM_BOT_TOKEN) {
    return jsonResponse({ error: 'Missing Telegram auth configuration.' }, 500);
  }

  const body = (await req.json().catch(() => null)) as JsonRecord | null;
  const action = String(body?.action || '').trim().toLowerCase();
  if (!body || !action) {
    return jsonResponse({ error: 'Missing Telegram auth action.' }, 400);
  }

  let identity: TelegramIdentity;
  try {
    identity = await resolveTelegramIdentity(body);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Telegram auth validation failed.' }, 400);
  }

  try {
    const adminClient = getAdminClient();

    if (action === 'sign_in') {
      return jsonResponse(await handleSignIn(adminClient, identity, Boolean(body.allowCreate)));
    }

    if (action === 'link') {
      const currentUser = await requireCurrentUser(req);
      if ('error' in currentUser) return currentUser.error;
      return jsonResponse(await handleLink(adminClient, currentUser.user.id, identity));
    }

    return jsonResponse({ error: 'Unsupported Telegram auth action.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Telegram auth failed.';
    const status = /already linked/i.test(message) ? 409 : 500;
    return jsonResponse({ error: message }, status);
  }
});
