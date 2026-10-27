import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'
import { cp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createHash, createHmac } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { audioEntitled } from '../heritage-content.mjs'

async function availablePort() {
  const server = net.createServer()
  await new Promise((resolveListen, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolveListen))
  const { port } = server.address()
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
  return port
}

const root = resolve(new URL('..', import.meta.url).pathname)
const tempRoot = await mkdtemp(join(tmpdir(), 'sy-miniprogram-simulation-'))
const port = await availablePort()
const base = `http://127.0.0.1:${port}`
let child

async function prepare() {
  await mkdir(join(tempRoot, 'seed'), { recursive: true })
  await cp(join(root, 'server.mjs'), join(tempRoot, 'server.mjs'))
  await cp(join(root, 'wechat-pay.mjs'), join(tempRoot, 'wechat-pay.mjs'))
  await cp(join(root, 'storage.mjs'), join(tempRoot, 'storage.mjs'))
  await cp(join(root, 'admin-session.mjs'), join(tempRoot, 'admin-session.mjs'))
  await cp(join(root, 'heritage-content.mjs'), join(tempRoot, 'heritage-content.mjs'))
  await cp(join(root, 'private-map.mjs'), join(tempRoot, 'private-map.mjs'))
  await cp(join(root, 'attraction-ai-fill.mjs'), join(tempRoot, 'attraction-ai-fill.mjs'))
  const fixturePath = join(tempRoot, 'seed/site-data.json')
  const fixture = syntheticContentFixture()
  fixture.settings.miniprogramKnowledge = { products: { membership: { enabled: true, price: 0.01 } } }
  fixture.homeBanners = [
    { id: 'optimized-banner-test', title: 'Test optimized banner', description: '', alt: 'test', image: './images/home-test.png', enabled: true, sort: 1 },
    { id: 'fallback-banner-test', title: 'Test original banner', description: '', alt: 'test', image: './images/home-fallback.jpg', enabled: true, sort: 2 },
  ]
  fixture.heritageGuideBanners = [
    { id: 'optimized-heritage-banner', title: 'Test heritage optimized', image: './images/home-test.png', enabled: true, sort: 1 },
    { id: 'fallback-heritage-banner', title: 'Test heritage fallback', image: './images/home-fallback.jpg', enabled: true, sort: 2 },
  ]
  fixture.miniprogramUsers = [{ id: 'profile-phone-contract', phone: '+15551234567', nickname: 'Phone Contract Test', avatarUrl: '', travelers: [], documents: [], coupons: [] }]
  const athensFixture = fixture.cities.find((city) => city.id === 'athens')
  athensFixture.coverImage = './images/city-cover.png'
  athensFixture.mosaic = ['./images/mosaic-tile-1.jpg', './images/mosaic-tile-2.jpg']
  const delphiFixture = fixture.cities.find((city) => city.id === 'delphi')
  delphiFixture.coverImage = ''
  delphiFixture.mosaic = ['./images/unused-city-mosaic.jpg']
  fixture.attractions.find((attraction) => attraction.id === 'delphi').image = './images/delphi-attraction-cover.png'
  fixture.cities.push({ id: 'empty-cover-city', name: '无封面城市', countryId: 'greece', status: 'published', enabled: true, mosaic: ['./images/unrelated-mosaic.jpg'] })
  fixture.attractions.find((attraction) => attraction.id === 'acropolis').expertVideoUrl = 'https://example.com/expert.mp4'
  fixture.attractions.find((attraction) => attraction.id === 'acropolis').expertVideoCover = './images/expert-cover.png'
  fixture.attractions.find((attraction) => attraction.id === 'acropolis').expertVideoDuration = 300
  fixture.attractions.find((attraction) => attraction.id === 'acropolis').expertVideoTrialSeconds = 30
  fixture.audioAlbums = [{ id: 'album-contract', title: '测试文史专辑', status: 'published' }, { id: 'album-draft-contract', title: '未发布专辑', status: 'draft' }]
  fixture.audioTracks = [
    { id: 'album-track-contract', category: 'heritage', title: '测试节目', albumId: 'album-contract', status: 'published', unlockMode: 'album', previewSeconds: 30 },
    { id: 'expert-track-contract', category: 'expert', title: '测试真人老师节目', attractionId: 'acropolis', status: 'published', unlockMode: 'expert', previewSeconds: 30 },
  ]
  await writeFile(fixturePath, JSON.stringify(fixture))
  const imageDir = join(tempRoot, 'public/images')
  await mkdir(imageDir, { recursive: true })
  const sourceBytes = Buffer.from('test-source-banner-image')
  await writeFile(join(imageDir, 'home-test.png'), sourceBytes)
  await writeFile(join(imageDir, 'city-cover.png'), Buffer.from('city-cover-source'))
  await writeFile(join(imageDir, 'city-cover.opt.webp'), Buffer.from('optimized-city-cover-fixture'))
  await writeFile(join(imageDir, 'delphi-attraction-cover.png'), Buffer.from('delphi-attraction-cover-source'))
  await writeFile(join(imageDir, 'delphi-attraction-cover.opt.webp'), Buffer.from('optimized-delphi-attraction-cover-fixture'))
  await writeFile(join(imageDir, 'home-fallback.jpg'), Buffer.from('fallback-source'))
  await writeFile(join(imageDir, 'expert-cover.png'), Buffer.from('expert-cover-source'))
  await writeFile(join(imageDir, 'expert-cover.opt.webp'), Buffer.from('optimized-expert-cover-fixture'))
  const sourceHash = createHash('sha256').update(sourceBytes).digest('hex').slice(0, 10)
  await writeFile(join(imageDir, `home-test.mp-${sourceHash}.webp`), Buffer.from('optimized-webp-fixture'))
  await symlink(join(root, 'node_modules'), join(tempRoot, 'node_modules'), 'dir')
}

function start(simulationEnabled) {
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: tempRoot,
    env: {
      ...Object.fromEntries(['PATH','HOME','TMPDIR','LANG','TZ'].filter(key => process.env[key]).map(key => [key, process.env[key]])),
      PORT: String(port),
      SY_STORAGE: 'json',
      SY_ADMIN_PASSWORD: 'test-admin-password',
      WX_APPID: 'test-appid',
      WX_APP_SECRET: 'test-secret',
      SY_MINIPROGRAM_TOKEN_SECRET: 'test-token-secret',
      SY_MINIPROGRAM_SIMULATION_ENABLED: simulationEnabled ? 'true' : 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (chunk) => process.stdout.write(String(chunk)))
  child.stderr.on('data', (chunk) => process.stderr.write(String(chunk)))
  return child
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server exited before ready (${child.exitCode})`)
    try {
      const response = await fetch(`${base}/api/health`)
      if (response.ok) return
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
  }
  throw new Error('server did not start')
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } })
  const data = response.status === 204 ? null : await response.json()
  return { status: response.status, data }
}

function assert(condition, message) { if (!condition) throw new Error(message) }
function auth(user) { return { Authorization: `Bearer sim-${user}` } }
function miniProgramAuth(userId) {
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + 3600 })).toString('base64url')
  const signature = createHmac('sha256', 'test-token-secret').update(payload).digest('base64url')
  return { Authorization: `Bearer mpv1.${payload}.${signature}` }
}
async function createSession(phone) {
  const result = await request('/api/miniprogram/simulation/session', { method: 'POST', body: JSON.stringify({ phone }) })
  const rawPhone = String(phone).replace(/[\s()-]/g, '')
  const expectedPhone = rawPhone.startsWith('+') ? rawPhone : (/^1\d{10}$/.test(rawPhone) ? `+86${rawPhone}` : `+${rawPhone}`)
  assert(result.status === 200 && result.data.simulation === true && result.data.user.phoneBound === true && result.data.user.phoneFull === expectedPhone, 'phone simulation session must return the full self-entered number')
  return { Authorization: `Bearer ${result.data.accessToken}` }
}

async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  child.kill('SIGTERM')
  await new Promise((resolveExit) => child.once('exit', resolveExit))
  child = null
}

try {
  await prepare()
  start(true)
  await waitForServer()

  let result = await request('/api/miniprogram/auth/me', { headers: miniProgramAuth('profile-phone-contract') })
  assert(result.status === 200 && result.data.user.phoneFull === '+15551234567' && result.data.user.phoneMasked === '+15****4567', 'authenticated self profile must return both full and masked phone fields')

  let bannerHome = await request('/api/miniprogram/home')
  const expectedOptimizedBanner = `./images/home-test.mp-${createHash('sha256').update(Buffer.from('test-source-banner-image')).digest('hex').slice(0, 10)}.webp`
  assert(bannerHome.status === 200 && bannerHome.data.home.banners[0].image === expectedOptimizedBanner, 'mini-program home should prefer a versioned optimized banner when present')
  assert(bannerHome.data.home.banners[1].image === './images/home-fallback.jpg', 'mini-program home should fall back to original banner when no optimized file exists')
  let bannerContent = await request('/api/content')
  assert(bannerContent.status === 200 && bannerContent.data.home.banners[0].image === expectedOptimizedBanner, 'content home should expose the same optimized banner path')
  assert(bannerContent.data.settings.homeBanners[0].image === expectedOptimizedBanner, 'legacy homeBanners alias should match optimized banner path')
  assert(bannerContent.data.heritageGuideBanners[0].image === expectedOptimizedBanner, 'heritage guide banners should reuse optimized sidecars')
  assert(bannerContent.data.heritageGuideBanners[1].image === './images/home-fallback.jpg', 'heritage banner should fall back when its optimized sidecar is missing')
  assert(Object.hasOwn(bannerContent.data, 'attractionDetails'), 'default content contract must retain attractionDetails')
  const slimContent = await request('/api/content?includeAttractionDetails=false')
  assert(slimContent.status === 200 && !Object.hasOwn(slimContent.data, 'attractionDetails'), 'includeAttractionDetails=false must omit only the duplicated top-level attractionDetails field')
  const athensCity = slimContent.data.cities.find((city) => city.id === 'athens')
  const athensMosaic = athensCity?.mosaic || []
  assert(athensCity.coverImage === './images/city-cover.opt.webp', 'dedicated city coverImage must win over the multi-image mosaic')
  assert(athensMosaic.length === 1 && athensMosaic[0] === athensCity.coverImage, 'city mosaic compatibility field should contain only the effective single cover image')
  assert(JSON.stringify(athensCity.mosaic) === JSON.stringify(bannerContent.data.cities.find((city) => city.id === 'athens').mosaic), 'city coverImage must not replace or rewrite the mosaic field between content variants')
  const delphiCity = slimContent.data.cities.find((city) => city.id === 'delphi')
  assert(delphiCity.coverImage === './images/delphi-attraction-cover.opt.webp', 'city without a dedicated cover must use its first published associated attraction main image, not its mosaic')
  assert(JSON.stringify(delphiCity.mosaic) === JSON.stringify([delphiCity.coverImage]), 'city mosaic compatibility output must not leak a multi-image collage to the Mini Program')
  const emptyCoverCity = slimContent.data.cities.find((city) => city.id === 'empty-cover-city')
  assert(emptyCoverCity.coverImage === '' && emptyCoverCity.mosaic.length === 0, 'without a dedicated cover or associated attraction, do not use a mosaic or unrelated country image')
  assert(slimContent.data.attractions.length === bannerContent.data.attractions.length && slimContent.data.attractionDetailPage && slimContent.data.home.banners[0].image === expectedOptimizedBanner, 'slim content contract must retain all other client content fields')
  assert(Buffer.byteLength(JSON.stringify(slimContent.data)) < Buffer.byteLength(JSON.stringify(bannerContent.data)), 'slim content response must be smaller than the backward-compatible default')
  const explicitFullContent = await request('/api/content?includeAttractionDetails=true')
  assert(explicitFullContent.status === 200 && Object.hasOwn(explicitFullContent.data, 'attractionDetails'), 'includeAttractionDetails=true must preserve the full content contract')
  const acropolisPublic = slimContent.data.attractions.find((item) => item.id === 'acropolis')
  assert(acropolisPublic && acropolisPublic.expertVideoUrl === undefined, 'hidden expert section must not expose an unguarded full video URL')
  assert(acropolisPublic.expertVideoCover === './images/expert-cover.opt.webp', 'expert video cover should use the optimized public image url')
  assert(acropolisPublic.expertVideoDuration === 300 && acropolisPublic.expertVideoTrialSeconds === 30, 'expert video duration and trial seconds should pass through from source')

  result = await request('/api/miniprogram/knowledge/config')
  assert(result.status === 200 && result.data.simulation === true && result.data.trialSeconds === 60 && result.data.products.attraction.price === 9.9 && result.data.products.city.price === 69.9 && result.data.products.album.price === 9.9 && result.data.products.annualMembership.price === 199 && result.data.products.membership.price === 0.01 && result.data.products.expertTrack.enabled === false && result.data.products.expertTrack.price === 0, 'config contract failed')
  assert(result.data.products.attraction.productType === 'attraction' && result.data.products.membership.productType === 'membership', 'product config failed')
  assert(result.data.products.city.enabled === false && result.data.products.city.productType === 'city' && result.data.products.city.name === '城市景点通行' && result.data.products.city.currency === 'CNY', 'city product config must be present and complete when omitted from stored settings')

  result = await request('/api/miniprogram/entitlements', { headers: auth('regular') })
  assert(result.status === 200 && result.data.member === false && result.data.orders.length === 0, 'regular fixture failed')

  const phoneAuth = await createSession('13800138000')
  result = await request('/api/miniprogram/entitlements', { headers: phoneAuth })
  assert(result.status === 200 && result.data.user.phoneBound === true && !Object.hasOwn(result.data.user, 'phoneFull') && result.data.orders.length === 0, 'phone entitlement should keep its shared user projection masked')

  for (const productType of ['attraction','city','album','expertTrack','membership']) {
    result = await request('/api/miniprogram/orders', { method: 'POST', headers: phoneAuth, body: JSON.stringify({ productType, attractionId: 'acropolis', cityId: 'athens' }) })
    assert(result.status === 422 && result.data.code === 'PAYMENT_PRODUCT_UNAVAILABLE', `${productType} must be retired`)
  }
  result = await request('/api/miniprogram/orders', { method: 'POST', headers: phoneAuth, body: JSON.stringify({ productType: 'annualMembership', price: 0.01, amountTotal: 1, durationDays: 99999 }) })
  assert(result.status === 201 && result.data.order.price === 199 && result.data.order.amountTotal === 19900, 'annual price cannot be selected by the client')
  const annualOrderId = result.data.order.id
  result = await request('/api/miniprogram/orders', { headers: phoneAuth })
  assert(result.status === 200 && result.data.items.length === 1 && result.data.items[0].phone === '+8613800138000', 'order query contract failed')
  result = await request(`/api/miniprogram/orders/${annualOrderId}/simulate-paid`, { method: 'POST', headers: phoneAuth })
  assert(result.status === 200 && result.data.entitlements.member === true, 'paid annual grants membership')
  result = await request(`/api/miniprogram/orders/${annualOrderId}/simulate-paid`, { method: 'POST', headers: phoneAuth })
  assert(result.status === 200 && result.data.idempotent === true, 'paid idempotency failed')
  result = await request('/api/miniprogram/orders', { method: 'POST', headers: phoneAuth, body: JSON.stringify({ productType: 'annualMembership' }) })
  const failedOrderId = result.data.order.id
  result = await request(`/api/miniprogram/orders/${failedOrderId}/simulate-failed`, { method: 'POST', headers: phoneAuth })
  assert(result.status === 200 && result.data.order.status === 'failed' && result.data.entitlements.member === true, 'failed renewal preserves existing membership')
  result = await request(`/api/miniprogram/orders/${failedOrderId}/simulate-failed`, { method: 'POST', headers: phoneAuth })
  assert(result.status === 200 && result.data.idempotent === true, 'failed idempotency failed')

  const otherPhoneAuth = await createSession('13900139000')
  result = await request('/api/miniprogram/entitlements', { headers: otherPhoneAuth })
  assert(result.status === 200 && result.data.orders.length === 0 && result.data.unlockedAttractions.length === 0, 'phone order isolation failed')

  result = await request('/api/miniprogram/entitlements', { headers: auth('attraction') })
  assert(result.status === 200 && result.data.member === false && result.data.unlockedAttractions.length === 0, 'historical attraction fixture grants no rights')
  result = await request('/api/miniprogram/entitlements', { headers: auth('membership') })
  assert(result.status === 200 && result.data.member === false && result.data.unlockedAttractions.length === 0, 'historical lifetime fixture grants no rights')

  const annualMemberAuth = await createSession('13700137000')
  result = await request('/api/miniprogram/orders', { method: 'POST', headers: annualMemberAuth, body: JSON.stringify({ productType: 'annualMembership' }) })
  assert(result.status === 201 && result.data.order.price === 199 && result.data.order.amountTotal === 19900, 'annual membership order should use the configured annual price')
  result = await request(`/api/miniprogram/orders/${result.data.order.id}/simulate-paid`, { method: 'POST', headers: annualMemberAuth })
  assert(result.status === 200 && result.data.entitlements.member === true, 'paid annual membership should grant member status')
  const memberContent = await request('/api/content?includeAttractionDetails=false')
  const expectedMemberCities = memberContent.data.cities.filter((city) => city.status === 'published' && city.enabled !== false && memberContent.data.attractions.some((attraction) => attraction.city === city.id && attraction.status === 'published')).map((city) => city.id).sort()
  assert(JSON.stringify([...result.data.entitlements.unlockedCities].sort()) === JSON.stringify(expectedMemberCities), 'annual membership should unlock all eligible published cities')
  assert(result.data.entitlements.unlockedAlbums.includes('album-contract') && !result.data.entitlements.unlockedAlbums.includes('album-draft-contract'), 'annual membership should unlock all published albums only')
  assert(audioEntitled({ category: 'heritage', unlockMode: 'membership', albumId: 'album-contract' }, result.data.entitlements), 'annual membership should authorize full heritage audio playback')
  assert(result.data.entitlements.unlockedExpertTracks.includes('expert-track-contract'), 'annual membership should enumerate all published expert tracks')
  assert(audioEntitled({ id: 'expert-track-contract', category: 'expert', unlockMode: 'expert' }, result.data.entitlements), 'annual membership should authorize expert audio')
  assert(!audioEntitled({ id: 'expert-track-contract', category: 'expert', attractionId: 'acropolis', unlockMode: 'expert' }, { member: false, unlockedAttractions: ['acropolis'], unlockedExpertTracks: [] }), 'ordinary attraction entitlement must not unlock expert audio')
  assert(!audioEntitled({ id: 'expert-track-contract', category: 'expert', attractionId: 'acropolis', unlockMode: 'expert' }, { member: false, unlockedCities: ['athens'], unlockedAttractions: ['acropolis'], unlockedExpertTracks: [] }), 'city entitlement must not unlock expert audio')

  result = await request('/api/miniprogram/simulation/reset', { method: 'POST', headers: phoneAuth })
  assert(result.status === 200 && result.data.reset === true && result.data.entitlements.orders.length === 0, 'simulation reset failed')

  result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ password: 'test-admin-password' }) })
  const adminToken = result.data.token
  result = await request('/api/admin/settings', { method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ miniprogramKnowledge: { trialSeconds: 90, products: { attraction: { enabled: true, name: '测试景点讲解', price: 0.01, currency: 'CNY' }, city: { enabled: true, name: '测试城市', price: 73.25, currency: 'CNY' }, album: { enabled: true, name: '测试专辑', price: 9.9, currency: 'CNY' }, membership: { enabled: true, name: '测试终身会员', price: 0.01, currency: 'CNY' } } } }) })
  assert(result.status === 200, 'knowledge config settings update failed')
  result = await request('/api/miniprogram/knowledge/config')
  assert(result.status === 200 && result.data.trialSeconds === 90 && result.data.products.attraction.price === 0.01 && result.data.products.city.name === '测试城市' && result.data.products.city.price === 73.25, 'knowledge config endpoint must return the city name and price saved in Website membership settings')
  result = await request('/api/admin/settings', { method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ miniprogramAccess: false }) })
  assert(result.status === 200, 'legacy maintenance setting update failed')
  result = await request('/api/miniprogram/access')
  assert(result.status === 200 && result.data.accessEnabled === true, 'legacy miniprogramAccess=false must not disable mini program access')
  result = await request('/api/miniprogram/knowledge/config')
  assert(result.status === 200 && result.data.trialSeconds === 90, 'mini program APIs must remain available when legacy maintenance flag is false')
  for (const headers of [{}, { 'X-Mini-Program-Env': 'develop' }, { 'X-Mini-Program-Env': 'trial' }, { 'X-Mini-Program-Env': 'release' }, { 'X-Mini-Program-Env': 'unknown' }]) {
    result = await request('/api/miniprogram/auth/wx-login', { method: 'POST', headers, body: JSON.stringify({}) })
    assert(result.status === 422 && result.data.code === 'WX_LOGIN_CODE_REQUIRED', 'wx-login without code must reach application validation regardless of environment header (no upstream call is made)')
  }
  for (const [path, method] of [
    ['/api/miniprogram/auth/me', 'GET'],
    ['/api/miniprogram/auth/phone', 'POST'],
    ['/api/miniprogram/profile', 'GET'],
    ['/api/miniprogram/profile', 'PATCH'],
    ['/api/miniprogram/profile/avatar', 'POST'],
  ]) {
    result = await request(path, { method, ...(method === 'PATCH' ? { body: JSON.stringify({ nickname: 'test' }) } : {}) })
    assert(result.status === 401 && result.data.code === 'MINIPROGRAM_LOGIN_REQUIRED', `${method} ${path} must retain its normal login authentication`)
  }
  result = await request('/api/miniprogram/knowledge/config', { headers: { 'X-Mini-Program-Env': 'release' } })
  assert(result.status === 200 && result.data.trialSeconds === 90, 'mini program content APIs must not depend on the client environment header')
  result = await request('/api/leads', { method: 'POST', body: JSON.stringify({ platform: 'miniprogram', leadType: 'customization' }) })
  assert(result.status === 401 && result.data.code === 'MINIPROGRAM_LOGIN_REQUIRED', 'mini program leads must retain authentication when the maintenance gate is removed')
  result = await request('/api/content')
  assert(result.status === 200, 'website content should remain available')
  await stop()

  start(false)
  await waitForServer()
  result = await request('/api/miniprogram/knowledge/config')
  assert(result.status === 200 && result.data.simulation === false && result.data.payment === null && result.data.products.city.name === '测试城市' && result.data.products.city.price === 73.25, 'read-only product config must still return the admin city price when payment is unavailable')
  result = await request('/api/miniprogram/orders')
  assert(result.status === 503 && result.data.code === 'MINIPROGRAM_PAYMENT_NOT_CONFIGURED', 'orders must remain unavailable when payment is not configured')
  console.log('PASS: fixed annual product and retired sales, synthetic city cover fallback, historical rights removed, annual entitlements, order isolation/idempotency, content and authentication')
} finally {
  await stop()
  await rm(tempRoot, { recursive: true, force: true })
}
