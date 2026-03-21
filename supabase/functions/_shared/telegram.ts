const encoder = new TextEncoder();

export const TELEGRAM_PLACEHOLDER_EMAIL_DOMAIN = 'telegram.donext.invalid';

export type TelegramAuthSource = 'miniapp' | 'login_widget';

export type TelegramIdentity = {
  authDate: number;
  firstName: string | null;
  languageCode: string | null;
  lastName: string | null;
  photoUrl: string | null;
  source: TelegramAuthSource;
  telegramUserId: string;
  username: string | null;
};

type TelegramLoginWidgetPayload = {
  auth_date?: number | string;
  first_name?: string | null;
  hash?: string;
  id?: number | string;
  last_name?: string | null;
  photo_url?: string | null;
  username?: string | null;
};

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseTimestamp(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('Telegram payload is missing a valid auth timestamp.');
  }
  return Math.floor(numeric);
}

function compareHex(expected: string, received: string) {
  if (expected.length !== received.length) return false;

  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) {
    diff |= expected.charCodeAt(index) ^ received.charCodeAt(index);
  }

  return diff === 0;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(input: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return new Uint8Array(digest);
}

async function hmacSha256(key: string | Uint8Array, input: string) {
  const rawKey = typeof key === 'string' ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey('raw', rawKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(input));
  return new Uint8Array(digest);
}

function ensureFresh(authDate: number, maxAgeSeconds: number) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (authDate > nowSeconds + 60) {
    throw new Error('Telegram payload timestamp is in the future.');
  }

  if (nowSeconds - authDate > maxAgeSeconds) {
    throw new Error('Telegram payload has expired. Please try again from Telegram.');
  }
}

function buildIdentityDisplayName(identity: TelegramIdentity) {
  const parts = [identity.firstName, identity.lastName].filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (identity.username) return `@${identity.username}`;
  return `Telegram ${identity.telegramUserId}`;
}

export function getTelegramPlaceholderEmail(telegramUserId: string) {
  return `tg-${telegramUserId}@${TELEGRAM_PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isTelegramPlaceholderEmail(email: string | null | undefined) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .endsWith(`@${TELEGRAM_PLACEHOLDER_EMAIL_DOMAIN}`);
}

export function getTelegramProfileDisplayName(identity: TelegramIdentity) {
  return buildIdentityDisplayName(identity);
}

export function getTelegramPublicProfile(identity: TelegramIdentity) {
  return {
    first_name: identity.firstName,
    language_code: identity.languageCode,
    last_name: identity.lastName,
    photo_url: identity.photoUrl,
    telegram_user_id: identity.telegramUserId,
    username: identity.username,
  };
}

export async function verifyTelegramMiniAppInitData(initData: string, botToken: string, maxAgeSeconds: number) {
  const rawInitData = normalizeString(initData);
  if (!rawInitData) throw new Error('Missing Telegram Mini App initData.');

  const params = new URLSearchParams(rawInitData);
  const hash = normalizeString(params.get('hash'));
  if (!hash) throw new Error('Telegram Mini App payload is missing a hash.');

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = await hmacSha256('WebAppData', botToken);
  const expectedHash = bytesToHex(await hmacSha256(secretKey, dataCheckString));
  if (!compareHex(expectedHash, hash)) {
    throw new Error('Telegram Mini App payload failed verification.');
  }

  const userValue = params.get('user');
  if (!userValue) throw new Error('Telegram Mini App payload is missing user data.');

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(userValue);
  } catch {
    throw new Error('Telegram Mini App user data is invalid JSON.');
  }

  const telegramUserId = normalizeString(String(user.id || ''));
  if (!telegramUserId) throw new Error('Telegram Mini App payload is missing a user id.');

  const authDate = parseTimestamp(params.get('auth_date'));
  ensureFresh(authDate, maxAgeSeconds);

  return {
    authDate,
    firstName: normalizeString(user.first_name),
    languageCode: normalizeString(user.language_code),
    lastName: normalizeString(user.last_name),
    photoUrl: normalizeString(user.photo_url),
    source: 'miniapp' as const,
    telegramUserId,
    username: normalizeString(user.username),
  };
}

export async function verifyTelegramLoginWidgetData(payload: TelegramLoginWidgetPayload, botToken: string, maxAgeSeconds: number) {
  const hash = normalizeString(payload.hash);
  if (!hash) throw new Error('Telegram login payload is missing a hash.');

  const normalizedEntries = Object.entries(payload)
    .filter(([key, value]) => key !== 'hash' && value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([left], [right]) => left.localeCompare(right));

  const telegramUserId = normalizeString(String(payload.id || ''));
  if (!telegramUserId) throw new Error('Telegram login payload is missing a user id.');

  const authDate = parseTimestamp(payload.auth_date);
  ensureFresh(authDate, maxAgeSeconds);

  const dataCheckString = normalizedEntries.map(([key, value]) => `${key}=${value}`).join('\n');
  const secretKey = await sha256(botToken);
  const expectedHash = bytesToHex(await hmacSha256(secretKey, dataCheckString));
  if (!compareHex(expectedHash, hash)) {
    throw new Error('Telegram login payload failed verification.');
  }

  return {
    authDate,
    firstName: normalizeString(payload.first_name),
    languageCode: null,
    lastName: normalizeString(payload.last_name),
    photoUrl: normalizeString(payload.photo_url),
    source: 'login_widget' as const,
    telegramUserId,
    username: normalizeString(payload.username),
  };
}
