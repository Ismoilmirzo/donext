import { supabase } from './supabase';

const PENDING_TELEGRAM_AUTH_KEY = 'donext:telegram-pending-auth';
const TELEGRAM_INTERNAL_EMAIL_DOMAIN = (import.meta.env.VITE_TELEGRAM_INTERNAL_EMAIL_DOMAIN || 'telegram.donext.invalid').toLowerCase();
export const TELEGRAM_BOT_USERNAME = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '').trim();

function getSupabaseFunctionUrl(name) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL.');
  }

  return `${supabaseUrl}/functions/v1/${name}`;
}

async function getAccessToken() {
  const sessionRes = await supabase.auth.getSession();
  return sessionRes.data?.session?.access_token || '';
}

async function invokeTelegramAuth(body, accessToken = '') {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY.');
  }

  const response = await fetch(getSupabaseFunctionUrl('telegram-auth'), {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      ...(accessToken ? { 'x-user-jwt': accessToken } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || 'Telegram authentication failed.');
    error.code = payload?.code || '';
    throw error;
  }

  return payload;
}

export function getTelegramBotUsername() {
  return TELEGRAM_BOT_USERNAME;
}

export function isTelegramMiniApp() {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData);
}

export function getTelegramMiniAppInitData() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData || '' : '';
}

export function isTelegramPlaceholderEmail(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith(`@${TELEGRAM_INTERNAL_EMAIL_DOMAIN}`);
}

export function storePendingTelegramAuth(value) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(PENDING_TELEGRAM_AUTH_KEY, JSON.stringify(value));
}

export function loadPendingTelegramAuth() {
  if (typeof window === 'undefined') return null;

  const raw = window.sessionStorage.getItem(PENDING_TELEGRAM_AUTH_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingTelegramAuth() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(PENDING_TELEGRAM_AUTH_KEY);
}

export async function resolveTelegramMiniAppLogin({ allowCreate = false } = {}) {
  const initData = getTelegramMiniAppInitData();
  if (!initData) {
    throw new Error('Telegram Mini App data is not available.');
  }

  return invokeTelegramAuth({
    action: 'sign_in',
    allowCreate,
    initData,
    provider: 'miniapp',
  });
}

export async function resolveTelegramWidgetLogin(authData, { allowCreate = false } = {}) {
  return invokeTelegramAuth({
    action: 'sign_in',
    allowCreate,
    authData,
    provider: 'login_widget',
  });
}

export async function linkTelegramMiniApp() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('No active session. Please log in again.');
  }

  const initData = getTelegramMiniAppInitData();
  if (!initData) {
    throw new Error('Telegram Mini App data is not available.');
  }

  return invokeTelegramAuth(
    {
      action: 'link',
      initData,
      provider: 'miniapp',
    },
    accessToken
  );
}

export async function linkTelegramWidget(authData) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('No active session. Please log in again.');
  }

  return invokeTelegramAuth(
    {
      action: 'link',
      authData,
      provider: 'login_widget',
    },
    accessToken
  );
}

export async function applyTelegramTokenHash(tokenHash) {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });
  if (error) throw error;
  return data;
}

export async function getTelegramLinkRecord(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('telegram_accounts')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function invokeTelegramAuthEndpoint({ accessToken = '', ...body }) {
  return invokeTelegramAuth(body, accessToken);
}

export async function completeTelegramSession(tokenHash) {
  return applyTelegramTokenHash(tokenHash);
}
