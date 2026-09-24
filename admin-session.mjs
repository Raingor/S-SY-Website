import crypto from 'node:crypto'

const TOKEN_VERSION = 'sy-admin-v1'
const MAX_TOKEN_LENGTH = 2048

export function createAdminSessionToken(secret, ttlMs, now = Date.now()) {
  if (!secret) throw new TypeError('Admin session secret is required')
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) throw new TypeError('A positive session lifetime is required')
  const payload = Buffer.from(JSON.stringify({
    iat: now,
    exp: now + ttlMs,
    jti: crypto.randomBytes(16).toString('base64url'),
  })).toString('base64url')
  const signed = `${TOKEN_VERSION}.${payload}`
  const signature = crypto.createHmac('sha256', secret).update(signed).digest('base64url')
  return `${signed}.${signature}`
}

export function verifyAdminSessionToken(token, secret, ttlMs, now = Date.now()) {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH || !secret) return false
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) return false

  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return false
  const [version, payload, encodedSignature] = parts
  if (!payload || !encodedSignature) return false

  let signature
  let claims
  try {
    signature = Buffer.from(encodedSignature, 'base64url')
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return false
  }
  if (signature.length !== 32) return false

  const signed = `${version}.${payload}`
  const expected = crypto.createHmac('sha256', secret).update(signed).digest()
  if (!crypto.timingSafeEqual(signature, expected)) return false

  if (!Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp)) return false
  if (typeof claims.jti !== 'string' || claims.jti.length < 16 || claims.jti.length > 64) return false
  if (claims.iat > now + 60_000 || claims.exp <= now) return false
  if (claims.exp <= claims.iat || claims.exp - claims.iat > ttlMs) return false
  return true
}
