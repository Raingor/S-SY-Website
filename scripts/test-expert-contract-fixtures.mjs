import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createHash, createHmac } from 'node:crypto'
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
const yearMs = 365 * 24 * 60 * 60 * 1000
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
  for (const name of ['server.mjs', 'storage.mjs', 'wechat-pay.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'private-map.mjs', 'attraction-ai-fill.mjs', 'package.json']) await copyFile(join(root, name), join(temp, name))
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
    attractions: [{ id: 'fixture-attraction', name: 'Fixture attraction', city: 'fixture-city', countryId: 'greece', status: 'published', guide: {}, exhibits: [], highlights: [], sectionOverrides: { online: true } }, { id: 'fixture-empty', name: 'Empty synthetic attraction', countryId: 'greece', city: 'fixture-city', status: 'published', sectionOverrides: { online: true }, guide: {}, exhibits: [], highlights: [] }],
    audioTracks: [{ ...track, id: 'fixture-online', sort: 1 }, { ...track, id: 'fixture-expert-a', title: 'Fixture teacher A', category: 'expert', unlockMode: 'expert', sort: 2 }, { ...track, id: 'fixture-expert-b', title: 'Fixture teacher B', category: 'expert', unlockMode: 'expert', sort: 3 }, { ...track, id: 'fixture-heritage-a', title: 'Fixture heritage episode', category: 'heritage', albumId: 'fixture-album', attractionId: '', unlockMode: 'membership', sort: 4 }],
    audioUploads: [uploaded],
    attractionDetailPage: { sections: { online: { hidden: true }, route: { hidden: false }, expert: { hidden: false } } },
    miniprogramUsers: [{ id: revokedUserId, nickname: 'Fixture revoked member', phone: revokedPhone }],
    miniprogramSimulation: { orders: [{ id: 'fixture-expired-annual', testUser: 'expired', productType: 'annualMembership', status: 'paid', paidAt: '2000-01-01T00:00:00.000Z', membershipExpiresAt: '2001-01-01T00:00:00.000Z' }] },
  })
  for (const productType of ['attraction','city','album','expertTrack','membership']) fixture.miniprogramSimulation.orders.push({ id: `legacy-${productType}`, testUser: `legacy-${productType.toLowerCase()}`, productType, status: 'paid', attractionId: 'fixture-attraction', cityId: 'fixture-city', albumId: 'fixture-album', trackId: 'fixture-expert-a', paidAt: new Date().toISOString() })
  for (const mode of ['free','locked','attraction','album','expert']) fixture.audioTracks.push({ ...track, id: `legacy-mode-${mode}`, unlockMode: mode })
  fixture.miniprogramSimulation.orders.push({ id: 'pending-annual', testUser: 'pending', productType: 'annualMembership', status: 'pending', membershipExpiresAt: new Date(Date.now() + yearMs).toISOString() })
  fixture.miniprogramUsers.push({ id: 'fixture-real-paid' }, { id: 'fixture-real-revoked', membershipOverride: { type: 'none' } }, { id: 'fixture-real-annual', membershipOverride: { type: 'annualMembership', expiresAt: new Date(Date.now() + yearMs).toISOString() } }, { id: 'fixture-real-lifetime', membershipOverride: { type: 'membership' } }, { id: 'fixture-real-expired', membershipOverride: { type: 'annualMembership', expiresAt: '2001-01-01T00:00:00Z' } })
  fixture.miniprogramOrders.push({ id: 'real-legacy-paid', userId: 'fixture-real-lifetime', productType: 'membership', status: 'paid' })
  for (const userId of ['fixture-real-paid','fixture-real-revoked']) fixture.miniprogramOrders.push({ id: `annual-${userId}`, userId, productType: 'annualMembership', status: 'paid', paidAt: new Date().toISOString(), membershipExpiresAt: new Date(Date.now() + yearMs).toISOString() })
  await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))
  // Only a temporary JSON service is spawned, with no inherited DB or payment credentials.
  const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG', 'TZ'].filter(key => process.env[key]).map(key => [key, process.env[key]]))
  Object.assign(env, { SY_STORAGE: 'json', HOST: '127.0.0.1', PORT: String(port), SY_ADMIN_PASSWORD: 'isolated-contract-password', SY_ADMIN_SESSION_SECRET: 'isolated-contract-admin-secret', SY_MINIPROGRAM_SIMULATION_ENABLED: 'true', SY_MINIPROGRAM_SIMULATION_SECRET: simulationSecret, SY_AUDIO_PRIVATE_DIR: join(temp, 'private-audio'), SY_MINIPROGRAM_TOKEN_SECRET: 'fixture-real-session-secret' })
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
  const config = await capture('annual_only_config', '/api/miniprogram/knowledge/config')
  // 2026-10-29 policy: annual membership plus the fixed-price guide video (no trial, purchase to watch).
  assert.deepEqual(Object.entries(config.data.products).filter(([, product]) => product.enabled).map(([key]) => key), ['annualMembership', 'guideVideo'])
  assert.equal(config.data.products.annualMembership.price, 199)
  assert.equal(config.data.products.annualMembership.durationDays, 365)
  assert.equal(config.data.products.guideVideo.price, 168)
  assert.equal(config.data.products.guideVideo.currency, 'CNY')
  const content = await capture('public_track_metadata', '/api/content')
  for (const attraction of content.data.attractions) {
    assert.deepEqual(attraction.hiddenSections, ['route','expert'])
    assert.deepEqual(content.data.attractionDetails[attraction.id].hiddenSections, ['route','expert'])
    assert.deepEqual(attraction.sectionOverrides, { route: true, expert: true })
    assert.ok(attraction.audioGuides.every(track => track.unlockMode === 'membership' && track.fullUrl === null))
  }
  assert.equal(content.data.attractionDetailPage.sections.route.hidden, true)
  assert.equal(content.data.attractionDetailPage.sections.expert.hidden, true)
  assert.notEqual(content.data.attractionDetailPage.sections.online.hidden, true)
  const annual = await session('10000000004')
  const revoked = await session(revokedPhone)
  for (const track of fixture.audioTracks) await access(`anonymous_${track.id}_preview`, track.id, undefined, 'preview')
  for (const productType of ['attraction','city','album','expertTrack','membership']) {
    const disabled = await capture(`${productType}_order_rejected`, '/api/miniprogram/orders', { method: 'POST', token: annual, body: { productType, attractionId: 'fixture-attraction', cityId: 'fixture-city', albumId: 'fixture-album', trackId: 'fixture-expert-a' } })
    assert.equal(disabled.statusCode, 422)
    assert.equal(disabled.data.code, 'PAYMENT_PRODUCT_UNAVAILABLE')
    const legacyToken = `sim-legacy-${productType.toLowerCase()}`
    const entitlements = await capture(`legacy_${productType}_entitlements`, '/api/miniprogram/entitlements', { token: legacyToken })
    assert.equal(entitlements.data.member, false)
    for (const field of ['unlockedAttractions','unlockedCities','unlockedAlbums','unlockedExpertTracks']) assert.deepEqual(entitlements.data[field], [])
    assert.equal(entitlements.data.orders.length, 1, 'historical orders remain queryable')
    await access(`legacy_${productType}_online_preview`, 'fixture-online', legacyToken, 'preview')
    await access(`legacy_${productType}_expert_preview`, 'fixture-expert-a', legacyToken, 'preview')
  }
  const tamper = Object.fromEntries(Object.keys(config.data.products).map(key => [key, { enabled: !['annualMembership', 'guideVideo'].includes(key), price: 0.01, currency: 'USD', durationDays: 99999 }]))
  const saved = await capture('admin_product_policy_save', '/api/admin/settings', { method: 'PATCH', token: adminToken, body: { miniprogramKnowledge: { products: tamper } } })
  assert.equal(saved.statusCode, 200)
  assert.deepEqual(Object.entries(saved.data.miniprogramKnowledge.products).filter(([, p]) => p.enabled).map(([key]) => key), ['annualMembership', 'guideVideo'])
  for (const path of ['/api/admin/settings','/api/miniprogram/knowledge/config']) {
    const read = await capture(`normalized_config_${path.split('/').at(-1)}`, path, { token: adminToken })
    const product = (read.data.miniprogramKnowledge || read.data).products.annualMembership
    assert.equal(product.price, 199); assert.equal(product.currency, 'CNY'); assert.equal(product.durationDays, 365)
  }
  const fixedOrder = await capture('annual_order_client_price_ignored', '/api/miniprogram/orders', { method: 'POST', token: annual, body: { productType: 'annualMembership', price: 0.01, amountTotal: 1, durationDays: 99999, currency: 'USD' } })
  assert.equal(fixedOrder.statusCode, 201)
  assert.equal(fixedOrder.data.order.amountTotal, 19900)
  assert.equal(fixedOrder.data.order.price, 199)
  assert.equal(fixedOrder.data.order.currency, 'CNY')
  await access('pending_annual_preview', 'fixture-online', annual, 'preview')
  const paid = await capture('annual_payment_confirmed', `/api/miniprogram/orders/${fixedOrder.data.order.id}/simulate-paid`, { method: 'POST', token: annual })
  assert.equal(paid.statusCode, 200)
  assert.equal(Date.parse(paid.data.order.membershipExpiresAt) - Date.parse(paid.data.order.membershipStartsAt), yearMs)
  const expiresAt = paid.data.order.membershipExpiresAt
  const repeated = await capture('annual_payment_idempotent', `/api/miniprogram/orders/${fixedOrder.data.order.id}/simulate-paid`, { method: 'POST', token: annual })
  assert.equal(repeated.data.order.membershipExpiresAt, expiresAt)
  const renewed = await purchase('renewal', annual, { productType: 'annualMembership' })
  assert.equal(Date.parse(renewed.data.order.membershipStartsAt), Date.parse(expiresAt))
  assert.equal(Date.parse(renewed.data.order.membershipExpiresAt) - Date.parse(expiresAt), yearMs)
  for (const track of fixture.audioTracks) await access(`annual_${track.id}_full`, track.id, annual, 'full')
  await access('pending_seed_annual_preview', 'fixture-online', 'sim-pending', 'preview')
  await access('expired_annual_preview', 'fixture-online', 'sim-expired', 'preview')
  const unavailable = await capture('unpublished_track_not_playable', '/api/miniprogram/audio/not-published/access', { token: annual })
  assert.equal(unavailable.statusCode, 404)
  const derivedSecret = createHash('sha256').update('sy-greece-admin-session-v1\0' + env.SY_ADMIN_SESSION_SECRET + '\0' + env.SY_ADMIN_PASSWORD).digest()
  function signedUrl(trackId, subject, exp = Math.floor(Date.now() / 1000) + 300) {
    const payload = Buffer.from(JSON.stringify({ id: trackId, sub: subject, exp })).toString('base64url')
    return `/api/miniprogram/audio/${trackId}/full?token=${payload}.${createHmac('sha256', derivedSecret).update(payload).digest('base64url')}`
  }
  for (const subject of ['anonymous','sim-key:legacy-membership','sim-key:legacy-city','sim-key:expired']) {
    const old = await capture(`legacy_signed_${subject}_rejected`, signedUrl('legacy-mode-free', subject))
    assert.equal(old.statusCode, 403, 'previously issued valid signatures must recheck the current annual policy')
  }
  const expiredFull = await capture('expired_signed_full_rejected', signedUrl('fixture-online','sim-key:annual',1))
  assert.equal(expiredFull.statusCode, 401)
  await purchase('revocable_annual', revoked, { productType: 'annualMembership' })
  const preRevocation = await access('before_revocation_full', 'fixture-expert-a', revoked, 'full')
  const validFull = await capture('signed_full_available', preRevocation.data.fullUrl)
  assert.equal(validFull.statusCode, 200)
  const range = await request(preRevocation.data.fullUrl)
  assert.ok(range.data.byteLength > 0)
  const override = await capture('revoke_member', `/api/admin/miniprogram-users/${revokedUserId}/membership`, { method: 'PATCH', token: adminToken, body: { type: 'none' } })
  assert.equal(override.statusCode, 200)
  await access('after_revocation_preview', 'fixture-expert-a', revoked, 'preview')
  assert.equal((await capture('old_signed_after_revocation_rejected', preRevocation.data.fullUrl)).statusCode, 403)
  const lifetimeGrant = await capture('admin_lifetime_grant_rejected', `/api/admin/miniprogram-users/${revokedUserId}/membership`, { method: 'PATCH', token: adminToken, body: { type: 'membership' } })
  assert.equal(lifetimeGrant.statusCode, 422)
  const adminMembers = await capture('admin_active_members_consistent', '/api/admin/miniprogram-orders', { token: adminToken })
  assert.deepEqual(adminMembers.data.members.map(user => user.id).sort(), ['fixture-real-annual','fixture-real-paid'])
  const invalidMode = await capture('unknown_unlock_mode_rejected', '/api/admin/audioTracks/fixture-online', { method: 'PATCH', token: adminToken, body: { unlockMode: 'unknown' } })
  assert.equal(invalidMode.statusCode, 422)
  const normalPage = await capture('admin_visibility_save', '/api/admin/attraction-detail-page', { method: 'PATCH', token: adminToken, body: { sections: { route: { hidden: false }, expert: { hidden: false }, online: { hidden: true } } } })
  assert.equal(normalPage.data.sections.route.hidden, true)
  assert.notEqual(normalPage.data.sections.online.hidden, true)
  const normalAttraction = await capture('admin_attraction_visibility_save', '/api/admin/attractions/fixture-attraction', { method: 'PATCH', token: adminToken, body: { sectionOverrides: { online: true, route: false, expert: false } } })
  assert.deepEqual(normalAttraction.data.sectionOverrides, { route: true, expert: true })
  const scan = await capture('admin_normalize_all_visibility', '/api/admin/attractions/scan-section-overrides', { method: 'POST', token: adminToken })
  assert.equal(scan.statusCode, 200)
  const disk = JSON.parse(await readFile(join(temp,'seed/site-data.json'), 'utf8'))
  assert.ok(disk.attractions.every(attraction => attraction.sectionOverrides.route === true && attraction.sectionOverrides.expert === true && attraction.sectionOverrides.online !== true))
  for (const action of ['preview','apply']) assert.equal((await capture(`retired_bulk_${action}`, `/api/admin/audioTracks/bulk-attraction-unlock/${action}`, { method: 'POST', token: adminToken, body: { confirmed: true } })).statusCode, 410)
  // The production authentication path uses the same policy (no live payment calls).
  async function stopChild() {
    const exited = once(child,'exit'); child.kill('SIGTERM'); await Promise.race([exited,delay(2000)])
    if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited }
  }
  await stopChild()
  env.SY_MINIPROGRAM_SIMULATION_ENABLED = 'false'
  child = spawn(process.execPath, ['server.mjs'], { cwd: temp, env, stdio: ['ignore','pipe','pipe'] })
  child.stdout.on('data', chunk => { logs += chunk }); child.stderr.on('data', chunk => { logs += chunk })
  let realReady = false
  for (let i=0;i<100;i++) { try { if ((await fetch(base + '/api/health')).ok) { realReady=true; break } } catch {} await delay(50) }
  assert.ok(realReady)
  for (const [userId,expected] of [['fixture-real-annual','full'],['fixture-real-paid','full'],['fixture-real-lifetime','preview'],['fixture-real-expired','preview'],['fixture-real-revoked','preview']]) {
    const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now()/1000)+300 })).toString('base64url')
    const token = `mpv1.${payload}.${createHmac('sha256',env.SY_MINIPROGRAM_TOKEN_SECRET).update(payload).digest('base64url')}`
    const result = await access(`real_auth_${userId}_${expected}`, 'legacy-mode-free', token, expected)
    if (expected === 'full') assert.equal((await capture(`real_auth_signed_media_${userId}_available`,result.data.fullUrl)).statusCode,200)
  }
  const replayFixture = {
    schemaVersion: 3,
    provenance: 'Captured from real loopback HTTP responses of isolated Website JSON fixture; no production or real WeChat payment calls.',
    sanitization: 'Identity/session values and signed query tokens are replaced with fixture-* placeholders; they cannot authenticate or play against any server. Order IDs are remapped consistently. Private fixture paths never enter these public responses.',
    scope: 'Only active annual membership grants full playback across all published audio. Historical lifetime/city/attraction/album/expert purchases confer no rights. The only content product is CNY 199 / 365 days. Route and expert sections are hidden; online is visible even with historical overrides.',
    normalisation: 'Every public/admin track and access response uses unlockMode=membership regardless of stored legacy mode or category. member=true requires future memberExpiresAt. Full access always supplies a server-signed fullUrl and positive expiresIn; previews supply null. Signed media rechecks current annual membership on every request. Never fabricate fullUrl.',
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
  console.log(`PASS: ${cases.length} real HTTP contract cases; annual-only policy, historical rights revoked, fixed product, renewal, visibility, retired sales/bulk, signed media and real authentication path`)
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
