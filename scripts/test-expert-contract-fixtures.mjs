import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createHmac } from 'node:crypto'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const root = fileURLToPath(new URL('..', import.meta.url))
const temp = await mkdtemp(join(tmpdir(), 'sy-expert-contract-'))
const outputIndex = process.argv.indexOf('--output')
const output = outputIndex >= 0 ? resolve(process.argv[outputIndex + 1]) : ''
const simulationSecret = 'isolated-expert-contract-secret'
const cases = []
let child
let logs = ''
const listener = net.createServer()
await new Promise((resolveListen, reject) => listener.once('error', reject).listen(0, '127.0.0.1', resolveListen))
const port = listener.address().port
await new Promise(resolveClose => listener.close(resolveClose))
const base = `http://127.0.0.1:${port}`
const renamed = new Map()
function sanitize(value, key = '') {
  if (Array.isArray(value)) return value.map(item => sanitize(item))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v, k)]))
  if (typeof value !== 'string') return value
  if (/^(accessToken|token|openid|phone|phoneFull|phoneMasked|phoneHash|verifiedPhone|testUser)$/.test(key)) return `fixture-${key}`
  if (value.startsWith('smpv1.') || value.startsWith('mpv1.')) return 'fixture-session-token'
  return value.replace(/([?&]token=)[^&]+/g, '$1fixture-signed-token').replace(/sim-phone-[a-f0-9]+|sim-order-[a-z0-9-]+/g, match => {
    if (!renamed.has(match)) renamed.set(match, `fixture-${match.startsWith('sim-phone-') ? 'user' : 'order'}-${renamed.size + 1}`)
    return renamed.get(match)
  })
}
async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = (response.headers.get('content-type') || '').includes('json') ? await response.json() : { byteLength: (await response.arrayBuffer()).byteLength }
  return { statusCode: response.status, data }
}
async function capture(name, path, options = {}) {
  const response = await request(path, options)
  cases.push({ name, request: { method: options.method || 'GET', path: sanitize(path), ...(options.body ? { body: sanitize(options.body) } : {}) }, response: sanitize(response) })
  return response
}
async function session(phone) {
  const response = await request('/api/miniprogram/simulation/session', { method: 'POST', body: { phone } })
  assert.equal(response.statusCode, 200)
  return response.data.accessToken
}
async function purchase(name, token, body) {
  const created = await capture(`${name}_order_created`, '/api/miniprogram/orders', { method: 'POST', token, body })
  assert.equal(created.statusCode, 201, JSON.stringify(created.data))
  const paid = await capture(`${name}_payment_confirmed`, `/api/miniprogram/orders/${created.data.order.id}/simulate-paid`, { method: 'POST', token })
  assert.equal(paid.statusCode, 200)
  return paid
}
async function access(name, trackId, token, expected) {
  const response = await capture(name, `/api/miniprogram/audio/${trackId}/access`, { token })
  assert.equal(response.statusCode, 200)
  assert.equal(response.data.access, expected)
  assert.equal(Boolean(response.data.fullUrl), expected === 'full')
  // Contract: access==='full' must always carry a positive expiresIn and a signed fullUrl.
  if (expected === 'full') {
    assert.ok(Number.isFinite(Number(response.data.expiresIn)) && Number(response.data.expiresIn) > 0, `${name}: full access must return positive expiresIn`)
    assert.ok(/\?token=[^"\s]+/.test(response.data.fullUrl || ''), `${name}: full access must return a token-bearing fullUrl`)
  } else {
    assert.equal(response.data.expiresIn, null)
    assert.equal(response.data.fullUrl, null)
  }
  return response
}
try {
  await mkdir(join(temp, 'seed'))
  await mkdir(join(temp, 'private-audio'))
  for (const name of ['server.mjs', 'storage.mjs', 'wechat-pay.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'attraction-ai-fill.mjs', 'package.json']) await copyFile(join(root, name), join(temp, name))
  await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')
  const audioFile = `${'e'.repeat(32)}.mp3`
  const previewFile = `${'e'.repeat(32)}-preview.m4a`
  for (const [filename, seconds] of [[audioFile, 4], [previewFile, 1]]) {
    const audio = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440', '-t', String(seconds), '-y', join(temp, 'private-audio', filename)], { encoding: 'utf8' })
    assert.equal(audio.status, 0, audio.stderr)
  }
  const revokedPhone = '+8610000000005'
  const revokedHash = createHmac('sha256', simulationSecret).update(revokedPhone).digest('hex')
  const revokedUserId = `sim-phone-${revokedHash.slice(0, 20)}`
  const fixture = Object.fromEntries(['routes', 'destinations', 'leads', 'sampleItineraries', 'customTrips', 'destinationCategories', 'destinationTypes', 'miniprogramOrders', 'homeBanners', 'miniprogramServiceEntries', 'heritageGuideBanners', 'audioRoutes'].map(key => [key, []]))
  fixture.audioAlbums = [{ id: 'fixture-album', title: 'Fixture heritage album', status: 'published', sort: 1 }]
  const uploaded = { audioFile, previewFile, durationSeconds: 4, previewSeconds: 1 }
  const track = { attractionId: 'fixture-attraction', title: 'Fixture ordinary guide', category: 'online', unlockMode: 'attraction', status: 'published', ...uploaded }
  Object.assign(fixture, {
    settings: {},
    countries: [{ id: 'greece', name: 'Fixture country', enabled: true }],
    guides: [],
    cities: [{ id: 'fixture-city', name: 'Fixture city', status: 'published', enabled: true, countryId: 'greece' }],
    attractions: [{ id: 'fixture-attraction', name: 'Fixture attraction', city: 'fixture-city', countryId: 'greece', status: 'published', guide: {}, exhibits: [], highlights: [] }],
    audioTracks: [{ ...track, id: 'fixture-online', sort: 1 }, { ...track, id: 'fixture-expert-a', title: 'Fixture teacher A', category: 'expert', unlockMode: 'expert', sort: 2 }, { ...track, id: 'fixture-expert-b', title: 'Fixture teacher B', category: 'expert', unlockMode: 'expert', sort: 3 }, { ...track, id: 'fixture-heritage-a', title: 'Fixture heritage episode', category: 'heritage', albumId: 'fixture-album', attractionId: '', unlockMode: 'membership', sort: 4 }],
    audioUploads: [uploaded],
    attractionDetailPage: {},
    miniprogramUsers: [{ id: revokedUserId, nickname: 'Fixture revoked member', phone: revokedPhone }],
    miniprogramSimulation: { orders: [{ id: 'fixture-expired-annual', testUser: 'expired', productType: 'annualMembership', status: 'paid', paidAt: '2000-01-01T00:00:00.000Z', membershipExpiresAt: '2001-01-01T00:00:00.000Z' }] },
  })
  await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))
  // Only a temporary JSON service is spawned, with no inherited DB or payment credentials.
  const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG', 'TZ'].filter(key => process.env[key]).map(key => [key, process.env[key]]))
  Object.assign(env, { SY_STORAGE: 'json', HOST: '127.0.0.1', PORT: String(port), SY_ADMIN_PASSWORD: 'isolated-contract-password', SY_ADMIN_SESSION_SECRET: 'isolated-contract-admin-secret', SY_MINIPROGRAM_SIMULATION_ENABLED: 'true', SY_MINIPROGRAM_SIMULATION_SECRET: simulationSecret, SY_AUDIO_PRIVATE_DIR: join(temp, 'private-audio') })
  child = spawn(process.execPath, ['server.mjs'], { cwd: temp, env, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.on('data', chunk => { logs += chunk })
  child.stderr.on('data', chunk => { logs += chunk })
  let ready = false
  for (let i = 0; i < 100; i += 1) {
    if (child.exitCode !== null) throw new Error(`isolated server stopped: ${logs}`)
    try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break } } catch {}
    await delay(50)
  }
  assert.ok(ready, 'isolated server did not start')
  const admin = await request('/api/auth/login', { method: 'POST', body: { password: env.SY_ADMIN_PASSWORD } })
  const adminToken = admin.data.token
  assert.ok(adminToken)
  const config = await capture('expert_product_default_disabled', '/api/miniprogram/knowledge/config')
  assert.equal(config.data.products.expertTrack.enabled, false)
  assert.equal(config.data.products.album.enabled, false, 'album single sale is retired')
  const content = await capture('public_track_metadata', '/api/content?includeAttractionDetails=false')
  assert.equal(content.data.attractions[0].audioGuides.length, 3)
  await access('anonymous_ordinary_preview', 'fixture-online', undefined, 'preview')
  await access('anonymous_expert_preview', 'fixture-expert-a', undefined, 'preview')
  const ordinary = await session('10000000001')
  const city = await session('10000000002')
  const expert = await session('10000000003')
  const annual = await session('10000000004')
  const revoked = await session(revokedPhone)
  // 真人讲解 is never sold per track any more.
  const disabled = await capture('expert_track_order_rejected', '/api/miniprogram/orders', { method: 'POST', token: expert, body: { productType: 'expertTrack', trackId: 'fixture-expert-a' } })
  assert.equal(disabled.statusCode, 422)
  await purchase('ordinary', ordinary, { productType: 'attraction', attractionId: 'fixture-attraction' })
  await access('ordinary_purchase_ordinary_full', 'fixture-online', ordinary, 'full')
  await access('ordinary_purchase_expert_preview', 'fixture-expert-a', ordinary, 'preview')
  await purchase('city', city, { productType: 'city', cityId: 'fixture-city' })
  await access('city_purchase_ordinary_full', 'fixture-online', city, 'full')
  // New rule: the city package includes 真人讲解 attached to its attractions.
  await access('city_purchase_expert_full', 'fixture-expert-a', city, 'full')
  await access('city_purchase_expert_b_full', 'fixture-expert-b', city, 'full')
  await capture('city_paid_entitlements', '/api/miniprogram/entitlements', { token: city })
  // Heritage is annual-membership only: a city package grants no heritage access.
  await access('city_purchase_heritage_preview', 'fixture-heritage-a', city, 'preview')
  const setExpert = async (enabled, price) => {
    const saved = await request('/api/admin/settings', { method: 'PATCH', token: adminToken, body: { miniprogramKnowledge: { products: { expertTrack: { enabled, price } } } } })
    assert.equal(saved.statusCode, 200)
  }
  // Even if an admin tries to re-enable and price the retired product, it stays off.
  await setExpert(true, 12.34)
  const resurrected = await capture('expert_product_cannot_be_reenabled', '/api/miniprogram/knowledge/config')
  assert.equal(resurrected.data.products.expertTrack.enabled, false)
  const stillRejected = await capture('expert_track_order_still_rejected', '/api/miniprogram/orders', { method: 'POST', token: expert, body: { productType: 'expertTrack', trackId: 'fixture-expert-a' } })
  assert.equal(stillRejected.statusCode, 422)
  await capture('retired_album_order_rejected', '/api/miniprogram/orders', { method: 'POST', token: expert, body: { productType: 'album', albumId: 'fixture-album' } })
  await access('unpaid_account_expert_preview', 'fixture-expert-a', expert, 'preview')
  await purchase('annual', annual, { productType: 'annualMembership' })
  await access('annual_purchase_expert_a_full', 'fixture-expert-a', annual, 'full')
  await access('annual_purchase_expert_b_full', 'fixture-expert-b', annual, 'full')
  await access('annual_purchase_ordinary_full', 'fixture-online', annual, 'full')
  await access('annual_purchase_heritage_full', 'fixture-heritage-a', annual, 'full')
  await capture('annual_paid_entitlements', '/api/miniprogram/entitlements', { token: annual })
  const expired = await capture('expired_annual_entitlements', '/api/miniprogram/entitlements', { token: 'sim-expired' })
  assert.equal(expired.data.member, false)
  await access('expired_annual_expert_preview', 'fixture-expert-a', 'sim-expired', 'preview')
  await purchase('revocable_annual', revoked, { productType: 'annualMembership' })
  const preRevocation = await access('before_revocation_expert_full', 'fixture-expert-a', revoked, 'full')
  const validFull = await capture('signed_full_before_revocation_available', preRevocation.data.fullUrl, { token: revoked })
  assert.equal(validFull.statusCode, 200)
  const expiredPayload = Buffer.from(JSON.stringify({ id: 'fixture-expert-a', sub: 'sim-key:annual', exp: 1 })).toString('base64url')
  const expiredSignature = createHmac('sha256', env.SY_ADMIN_SESSION_SECRET).update(expiredPayload).digest('base64url')
  const expiredFull = await capture('expired_signed_full_rejected', `/api/miniprogram/audio/fixture-expert-a/full?token=${expiredPayload}.${expiredSignature}`)
  assert.equal(expiredFull.statusCode, 401)
  const override = await request(`/api/admin/miniprogram-users/${revokedUserId}/membership`, { method: 'PATCH', token: adminToken, body: { type: 'none' } })
  assert.equal(override.statusCode, 200)
  await access('after_revocation_expert_preview', 'fixture-expert-a', revoked, 'preview')
  const rejectedFull = await capture('old_signed_full_after_revocation_rejected', preRevocation.data.fullUrl, { token: revoked })
  assert.equal(rejectedFull.statusCode, 403)
  const replayFixture = {
    schemaVersion: 1,
    provenance: 'Captured from real loopback HTTP responses of isolated Website JSON fixture; no production or real WeChat payment calls.',
    sanitization: 'Identity/session values and signed query tokens are replaced with fixture-* placeholders; they cannot authenticate or play against any server. Order IDs are remapped consistently. Private fixture paths never enter these public responses.',
    scope: '真人讲解 is bundled with the city package covering its attraction, or with annual membership; it is never sold per track. Heritage content is annual-membership only. Album single sale is retired.',
    testPriceNotice: '12.34 is an isolated test-only price used to prove the retired expert product cannot be re-enabled; no commercial price is proposed or hard-coded.',
    cases,
  }
  const serialized = JSON.stringify(replayFixture, null, 2)
  assert.ok(!/smpv1\.|mpv1\.|sy-secret|isolated-contract-password|isolated-expert-contract-secret|127\.0\.0\.1:/.test(serialized), 'fixture must not expose service credentials, identity tokens or base URL')
  assert.ok(!/token=(?!fixture-signed-token)[^&"\s]+/.test(serialized), 'signed URL tokens must be redacted')
  assert.ok(!serialized.includes(audioFile) && !serialized.includes(previewFile), 'private audio filenames must not enter response fixtures')
  if (output) {
    assert.ok(!output.startsWith(root), 'fixtures must be exported outside the repository')
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, serialized + '\n', { mode: 0o600 })
  }
  console.log(`PASS: ${cases.length} real HTTP contract cases; expert bundled with city package and annual membership (per-track sale retired), heritage annual-membership-only, album single sale retired, expired membership and revoked signed full access`)
  console.log('Storage: isolated temporary JSON and synthetic sine audio only; no production, MariaDB, persistent service, or real payment')
  if (output) console.log(`Sanitized replay fixture: ${output}`)
} catch (error) {
  console.error(error)
  if (logs) console.error(logs)
  process.exitCode = 1
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit')
    child.kill('SIGTERM')
    await Promise.race([exited, delay(2000)])
    if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited }
  }
  await rm(temp, { recursive: true, force: true })
}
