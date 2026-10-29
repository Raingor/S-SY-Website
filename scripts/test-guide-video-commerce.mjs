// 回归：游览攻略视频商品（guideVideo ¥168）商品配置、下单、权益与签名播放 URL。
// 运行：node scripts/test-guide-video-commerce.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const temp = await mkdtemp(join(tmpdir(), 'sy-guide-video-'))
const listener = net.createServer()
await new Promise((r) => listener.listen(0, '127.0.0.1', r))
const port = listener.address().port
await new Promise((r) => listener.close(r))
const base = `http://127.0.0.1:${port}`

await mkdir(join(temp, 'seed'), { recursive: true })
for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'private-map.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs']) await cp(join(root, file), join(temp, file))
await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')
const fixture = syntheticContentFixture()
fixture.settings.miniprogramKnowledge = { products: { membership: { enabled: true, price: 0.01 } } }
fixture.attractions = fixture.attractions.map((a) => a.id === 'acropolis' ? { ...a, showGuideVideo: true } : a)
  fixture.guideVideos = [{ id: 'video-fixture', attractionId: 'acropolis', title: '雅典卫城：山顶上的古希腊文明密码', description: '合成描述', ossKey: 'video/guide-acropolis.mp4', durationSeconds: 2375, sizeBytes: 900000000, status: 'published' }]
await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))

const server = spawn(process.execPath, ['server.mjs'], { cwd: temp, env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: '{{SECRET_bltmqvjs}}', SY_MINIPROGRAM_SIMULATION_ENABLED: 'true', SY_MINIPROGRAM_SIMULATION_SECRET: '{{SECRET_9cr0wkpq}}', SY_OSS_ACCESS_KEY_ID: 'test-key-id', SY_OSS_ACCESS_KEY_SECRET: 'test-key-secret', SY_OSS_BUCKET: 'sy-mpapp', SY_OSS_HOST: 'oss-cn-shenzhen.aliyuncs.com' }, stdio: ['ignore', 'pipe', 'pipe'] })
let log = ''
server.stderr.on('data', (c) => { log += c })
async function waitForServer() {
  for (let i = 0; i < 100; i += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return } catch {} await sleep(100) }
  throw new Error('server not ready: ' + log.slice(-600))
}
async function json(path, options = {}, token) {
  const r = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
  const body = await r.json()
  return { status: r.status, body }
}
try {
  await waitForServer()

  // 1) Product config: fixed ¥168, enabled, CNY; other products stay disabled.
  const content = (await json('/api/content')).body
  const product = content.settings.miniprogramKnowledge.products.guideVideo
  assert.equal(product.enabled, true); assert.equal(product.price, 168); assert.equal(product.currency, 'CNY')
  assert.equal(content.settings.miniprogramKnowledge.products.annualMembership.price, 199)
  assert.equal(content.settings.miniprogramKnowledge.products.attraction.enabled, false)
  // Public list strips ossKey and includes accessUrl.
  assert.equal(content.guideVideos.length, 1)
  assert.equal(content.guideVideos[0].id, 'video-fixture')
  assert.equal(content.guideVideos[0].ossKey, undefined)
  assert.equal(content.guideVideos[0].accessUrl, '/api/miniprogram/video/video-fixture/access')
  // Opted-in attraction reveals the 游览攻略 section for the video entry; others stay locked.
  assert.deepEqual(content.attractions.find((a) => a.id === 'acropolis').hiddenSections, ['route'])
  assert.deepEqual(content.attractions.find((a) => a.id !== 'acropolis').hiddenSections, ['route', 'expert'])
  assert.deepEqual(content.attractionDetails.acropolis.hiddenSections, ['route'])

  // 2) Admin CRUD basics.
  const login = await json('/api/auth/login', { method: 'POST', body: JSON.stringify({ password: '{{SECRET_bltmqvjs}}' }) })
  const admin = login.body.token
  const created = await json('/api/admin/guideVideos', { method: 'POST', body: JSON.stringify({ id: 'video-draft', attractionId: 'acropolis', title: '草稿视频' }) }, admin)
  assert.equal(created.status, 201); assert.equal(created.body.status, 'unpublished')
  const publishMissing = await json('/api/admin/guideVideos/video-draft', { method: 'PATCH', body: JSON.stringify({ status: 'published' }) }, admin)
  assert.equal(publishMissing.status, 422, 'publish requires ossKey')
  const published = await json('/api/admin/guideVideos/video-draft', { method: 'PATCH', body: JSON.stringify({ status: 'published', ossKey: 'video/draft.mp4' }) }, admin)
  assert.equal(published.status, 200)
  const noTitle = await json('/api/admin/guideVideos', { method: 'POST', body: JSON.stringify({ title: '  ' }) }, admin)
  assert.equal(noTitle.status, 422)

  // 3) Access endpoint without login → locked.
  const anon = await json('/api/miniprogram/video/video-fixture/access')
  assert.equal(anon.status, 200); assert.equal(anon.body.access, 'locked'); assert.equal(anon.body.reason, 'MINIPROGRAM_LOGIN_REQUIRED')

  // 4) Logged-in simulation user without purchase → VIDEO_PURCHASE_REQUIRED with product info.
  const session = await json('/api/miniprogram/simulation/session', { method: 'POST', body: JSON.stringify({ phone: '+15550001111' }) })
  assert.equal(session.status, 200, JSON.stringify(session.body))
  const locked = await json('/api/miniprogram/video/video-fixture/access', {}, session.body.accessToken)
  assert.equal(locked.body.access, 'locked'); assert.equal(locked.body.reason, 'VIDEO_PURCHASE_REQUIRED')
  assert.equal(locked.body.product.price, 168)

  // 5) Missing videoId in order → clear error.
  const noVideo = await json('/api/miniprogram/orders', { method: 'POST', body: JSON.stringify({ productType: 'guideVideo' }) }, session.body.accessToken)
  assert.equal(noVideo.status, 422); assert.equal(noVideo.body.code, 'VIDEO_ID_REQUIRED')

  // 6) Purchase flow: order → simulate-paid → unlocked with signed playUrl.
  const order = await json('/api/miniprogram/orders', { method: 'POST', body: JSON.stringify({ productType: 'guideVideo', videoId: 'video-fixture' }) }, session.body.accessToken)
  assert.equal(order.status, 201, JSON.stringify(order.body))
  assert.equal(order.body.order.videoId, 'video-fixture')
  assert.equal(order.body.order.productType, 'guideVideo')
  const paid = await json(`/api/miniprogram/orders/${order.body.order.id}/simulate-paid`, { method: 'POST' }, session.body.accessToken)
  assert.equal(paid.status, 200)
  assert(paid.body.entitlements.unlockedVideos.includes('video-fixture'), 'purchase grants video entitlement')
  assert.equal(paid.body.entitlements.member, false, 'non-member purchase does not grant membership')
  const access = await json('/api/miniprogram/video/video-fixture/access', {}, session.body.accessToken)
  assert.equal(access.body.access, 'full')
  assert.match(access.body.playUrl, /^https:\/\/sy-mpapp\.oss-cn-shenzhen\.aliyuncs\.com\/video\/guide-acropolis\.mp4\?/)
  assert.match(access.body.playUrl, /OSSAccessKeyId=test-key-id/)
  assert.match(access.body.playUrl, /Signature=/)
  assert.equal(access.body.expiresIn, 600)
  assert.equal(access.body.unlockedVia, 'purchase')

  // 7) Annual member includes the video without purchase.
  const annualSession = await json('/api/miniprogram/simulation/session', { method: 'POST', body: JSON.stringify({ phone: '+15550002222' }) })
  const annualOrder = await json('/api/miniprogram/orders', { method: 'POST', body: JSON.stringify({ productType: 'annualMembership' }) }, annualSession.body.accessToken)
  assert.equal(annualOrder.status, 201)
  await json(`/api/miniprogram/orders/${annualOrder.body.order.id}/simulate-paid`, { method: 'POST' }, annualSession.body.accessToken)
  const memberAccess = await json('/api/miniprogram/video/video-fixture/access', {}, annualSession.body.accessToken)
  assert.equal(memberAccess.body.access, 'full')
  assert.equal(memberAccess.body.unlockedVia, 'membership')

  // 8) Retired products stay unavailable.
  const retired = await json('/api/miniprogram/orders', { method: 'POST', body: JSON.stringify({ productType: 'album', albumId: 'x' }) }, session.body.accessToken)
  assert.equal(retired.status, 422); assert.equal(retired.body.code, 'PAYMENT_PRODUCT_UNAVAILABLE')

  // 9) Unpublished video hidden from public list and access 404.
  await json('/api/admin/guideVideos/video-draft', { method: 'PATCH', body: JSON.stringify({ status: 'unpublished' }) }, admin)
  const contentAfter = (await json('/api/content')).body
  assert.equal(contentAfter.guideVideos.length, 1)
  const missingAccess = await json('/api/miniprogram/video/video-draft/access', {}, session.body.accessToken)
  assert.equal(missingAccess.status, 404)

  console.log('PASS guide-video commerce: fixed ¥168 product, admin CRUD guards, access entitlement (anonymous/login/purchase/annual-member), signed OSS playUrl, retired products unavailable, unpublished hidden.')
} finally {
  server.kill('SIGTERM')
  await rm(temp, { recursive: true, force: true })
}
