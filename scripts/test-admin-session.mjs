import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createAdminSessionToken, verifyAdminSessionToken } from '../admin-session.mjs'

const ttlMs = 8 * 60 * 60 * 1000
const now = 1_800_000_000_000
const secret = crypto.randomBytes(32)
const token = createAdminSessionToken(secret, ttlMs, now)

assert.equal(verifyAdminSessionToken(token, secret, ttlMs, now), true, 'a newly issued session should verify')
assert.equal(verifyAdminSessionToken(token, secret, ttlMs, now + ttlMs - 1), true, 'a session remains valid until expiry')
assert.equal(verifyAdminSessionToken(token, secret, ttlMs, now + ttlMs), false, 'an expired session must be rejected')
assert.equal(verifyAdminSessionToken(token, crypto.randomBytes(32), ttlMs, now), false, 'a session signed with another key must be rejected')
assert.equal(verifyAdminSessionToken(`${token}x`, secret, ttlMs, now), false, 'a tampered signature must be rejected')
assert.equal(verifyAdminSessionToken('invalid', secret, ttlMs, now), false, 'malformed tokens must be rejected')

console.log('Admin session tests passed (validity, expiry, key rotation, tampering, malformed token).')
