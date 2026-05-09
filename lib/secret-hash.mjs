import { createHmac } from 'crypto';

export const SECRET_HASH_PREFIX = 'hmac-sha256:v1';
const SECRET_HASH_PATTERN = /^hmac-sha256:v1:[a-f0-9]{64}$/;

export function normalizeSecretKey(secretKey) {
  return typeof secretKey === 'string' ? secretKey.trim() : '';
}

export function getSecretHashPepper() {
  const pepper = process.env.SECRET_HASH_PEPPER;
  if (!pepper || !pepper.trim()) {
    throw new Error('SECRET_HASH_PEPPER is required');
  }
  return pepper;
}

export function hashSecretKey(secretKey, pepper = getSecretHashPepper()) {
  const normalizedSecret = normalizeSecretKey(secretKey);
  if (!normalizedSecret) {
    throw new Error('Secret key is required');
  }

  const digest = createHmac('sha256', pepper)
    .update(normalizedSecret, 'utf8')
    .digest('hex');

  return `${SECRET_HASH_PREFIX}:${digest}`;
}

export function isSecretKeyHash(value) {
  return typeof value === 'string' && SECRET_HASH_PATTERN.test(value);
}

export function removeSecretFields(user) {
  if (!user) return user;

  const { secret_key, secret_key_hash, ...safeUser } = user;
  return safeUser;
}
