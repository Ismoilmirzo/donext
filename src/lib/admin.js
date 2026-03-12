function parseAdminEmails(raw = '') {
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function getConfiguredAdminEmails() {
  return parseAdminEmails(import.meta.env.VITE_ADMIN_EMAILS || '');
}

export function isConfiguredAdmin(user) {
  const email = user?.email?.trim().toLowerCase();
  if (!email) return false;
  return getConfiguredAdminEmails().includes(email);
}
