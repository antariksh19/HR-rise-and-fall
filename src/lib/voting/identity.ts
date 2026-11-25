import crypto from 'crypto';

export function normalizeContact(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? `email:${value}` : null;
  }

  if (!/^[+\d\s().-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, '');
  const phone =
    digits.length === 10
      ? digits
      : digits.length === 12 && digits.startsWith('91')
        ? digits.slice(2)
        : null;
  return phone ? `phone:${phone}` : null;
}

export function hashVoteIdentity(eventId: string, namespace: string, value: string): string {
  const salt = process.env.VOTER_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!salt) throw new Error('A stable voter identity salt is required.');

  return crypto
    .createHash('sha256')
    .update(`${salt}:${eventId}:${namespace}:${value}`)
    .digest('hex');
}
