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
  fixture.guideVideos = [{ id: 'video-fixture', attractionId: 'acropolis', title: '雅典卫城：山顶上的古希腊文明密码', description: '合成描述', cover: '/images/guide-cover-fixture.webp', ossKey: 'video/guide-acropolis.mp4', durationSeconds: 2375, sizeBytes: 900000000, status: 'published' }]
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
  const body = r.status === 204 ? null : await r.json()
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
  assert.equal(content.guideVideos[0].category, 'attraction', 'legacy videos default to attraction category')
  assert.equal(content.guideVideos[0].sort, 0, 'legacy videos default to stable insertion order')
  assert.equal(content.guideVideos[0].cover, '/images/guide-cover-fixture.webp', 'anonymous public content includes the configured cover')
  for (const key of ['playUrl', 'fullUrl', 'sizeBytes']) assert.equal(content.guideVideos[0][key], undefined, 'public cover must not expose ' + key)
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

  // Humanities publish without an attraction; category, languages and sorting survive readback.
  const humanVideo = { id: 'humanities-main', category: 'humanities', sort: 20, title: '希腊人文影集', titleTw: '希臘人文影集', titleEn: 'Greek Humanities', description: '人文课程', descriptionTw: '人文課程', descriptionEn: 'A humanities course', cover: '/images/humanities.webp', durationSeconds: 3600, ossKey: 'video/humanities.mp4', status: 'published' }
  const humanCreated = await json('/api/admin/guideVideos', { method: 'POST', body: JSON.stringify(humanVideo) }, admin)
  assert.equal(humanCreated.status, 201, JSON.stringify(humanCreated.body))
  assert.equal(humanCreated.body.attractionId, '')
  const humanFirst = await json('/api/admin/guideVideos', { method: 'POST', body: JSON.stringify({ ...humanVideo, id: 'humanities-first', sort: 10 }) }, admin)
  assert.equal(humanFirst.status, 201)
  const humanTied = await json('/api/admin/guideVideos', { method: 'POST', body: JSON.stringify({ ...humanVideo, id: 'humanities-tied' }) }, admin)
  assert.equal(humanTied.status, 201)
  const humanDraft = await json('/api/admin/guideVideos', { method: 'POST', body: JSON.stringify({ id: 'humanities-draft', category: 'humanities', title: '未发布人文课程' }) }, admin)
  assert.equal(humanDraft.status, 201)
  const humanMissingFile = await json('/api/admin/guideVideos/humanities-draft', { method: 'PATCH', body: JSON.stringify({ status: 'published' }) }, admin)
  assert.equal(humanMissingFile.status, 422, 'humanities still require private video media before publishing')
  const humanPublished = await json('/api/admin/guideVideos/humanities-draft', { method: 'PATCH', body: JSON.stringify({ status: 'published', ossKey: 'video/humanities-draft.mp4' }) }, admin)
  assert.equal(humanPublished.status, 200, 'humanities can publish without an attraction via PATCH')
  await json('/api/admin/guideVideos/humanities-draft', { method: 'PATCH', body: JSON.stringify({ status: 'unpublished' }) }, admin)
  const attractionMissing = await json('/api/admin/guideVideos', { method: 'POST', body: JSON.stringify({ title: '无关联景点', status: 'published', ossKey: 'video/test.mp4' }) }, admin)
  assert.equal(attractionMissing.status, 422, 'attraction videos still require an association')
  const changedCategory = await json('/api/admin/guideVideos/humanities-main', { method: 'PATCH', body: JSON.stringify({ category: 'attraction' }) }, admin)
  assert.equal(changedCategory.status, 422, 'switching category cannot bypass the attraction requirement')
  const invalidCategory = await json('/api/admin/guideVideos', { method: 'POST', body: JSON.stringify({ title: '错误分类', category: 'humanity' }) }, admin)
  assert.equal(invalidCategory.status, 422, 'category typos are rejected')
  const adminVideos = (await json('/api/admin/guideVideos', {}, admin)).body
  assert.equal(adminVideos.find((video) => video.id === 'video-fixture').category, 'attraction')
  for (const key of Object.keys(humanVideo)) assert.equal(adminVideos.find((video) => video.id === humanVideo.id)[key], humanVideo[key], 'admin readback retains ' + key)
  const humanPublic = (await json('/api/content')).body.guideVideos.filter((video) => video.category === 'humanities')
  assert.deepEqual(humanPublic.map((video) => video.id), ['humanities-first', 'humanities-main', 'humanities-tied'], 'humanities sorted ascending with stable ties; drafts hidden')
  const publicCourse = humanPublic.find((video) => video.id === humanVideo.id)
  for (const key of ['titleTw', 'titleEn', 'descriptionTw', 'descriptionEn', 'cover', 'durationSeconds', 'sort']) assert.equal(publicCourse[key], humanVideo[key])
  assert.equal(publicCourse.accessUrl, '/api/miniprogram/video/humanities-main/access')
  for (const key of ['ossKey', 'playUrl', 'fullUrl', 'sizeBytes']) assert.equal(publicCourse[key], undefined, 'public humanities must not expose ' + key)

  // 3) Access endpoint without login → locked.
  const anon = await json('/api/miniprogram/video/video-fixture/access')
  assert.equal(anon.status, 200); assert.equal(anon.body.access, 'locked'); assert.equal(anon.body.reason, 'MINIPROGRAM_LOGIN_REQUIRED')
  assert.equal(anon.body.playUrl, undefined, 'public cover does not expose anonymous playback')

  // 4) Logged-in simulation user without purchase → VIDEO_PURCHASE_REQUIRED with product info.
  const session = await json('/api/miniprogram/simulation/session', { method: 'POST', body: JSON.stringify({ phone: '+15550001111' }) })
  assert.equal(session.status, 200, JSON.stringify(session.body))
  const locked = await json('/api/miniprogram/video/video-fixture/access', {}, session.body.accessToken)
  assert.equal(locked.body.access, 'locked'); assert.equal(locked.body.reason, 'VIDEO_PURCHASE_REQUIRED')
  assert.equal(locked.body.product.price, 168)
  assert.equal(locked.body.playUrl, undefined, 'unpaid users still cannot obtain playback')

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

  const humanitiesAnon = await json(publicCourse.accessUrl)
  assert.equal(humanitiesAnon.body.reason, 'MINIPROGRAM_LOGIN_REQUIRED')
  assert.equal(humanitiesAnon.body.playUrl, undefined)
  const humanLocked = await json(publicCourse.accessUrl, {}, session.body.accessToken)
  assert.equal(humanLocked.body.reason, 'VIDEO_PURCHASE_REQUIRED', 'a different video purchase does not unlock humanities')
  const humanOrder = await json('/api/miniprogram/orders', { method: 'POST', body: JSON.stringify({ productType: 'guideVideo', videoId: humanVideo.id, price: 1 }) }, session.body.accessToken)
  assert.equal(humanOrder.status, 201)
  assert.equal(humanOrder.body.order.price, 168, 'humanities use fixed video pricing')
  await json(`/api/miniprogram/orders/${humanOrder.body.order.id}/simulate-paid`, { method: 'POST' }, session.body.accessToken)
  const humanAccess = await json(publicCourse.accessUrl, {}, session.body.accessToken)
  assert.equal(humanAccess.body.access, 'full')
  assert.match(humanAccess.body.playUrl, /\/video\/humanities\.mp4\?/)
  assert.equal(humanAccess.body.unlockedVia, 'purchase')
  const otherHumanAccess = await json('/api/miniprogram/video/humanities-first/access', {}, session.body.accessToken)
  assert.equal(otherHumanAccess.body.reason, 'VIDEO_PURCHASE_REQUIRED', 'a humanities purchase unlocks only that course')

  // 7) 2026-10-29 rule change: annual members must also purchase the video.
  const annualSession = await json('/api/miniprogram/simulation/session', { method: 'POST', body: JSON.stringify({ phone: '+15550002222' }) })
  const annualOrder = await json('/api/miniprogram/orders', { method: 'POST', body: JSON.stringify({ productType: 'annualMembership' }) }, annualSession.body.accessToken)
  assert.equal(annualOrder.status, 201)
  const annualPaid = await json(`/api/miniprogram/orders/${annualOrder.body.order.id}/simulate-paid`, { method: 'POST' }, annualSession.body.accessToken)
  assert.equal(annualPaid.body.entitlements.member, true)
  assert.equal(annualPaid.body.entitlements.unlockedVideos.includes('video-fixture'), false, 'membership alone does not unlock the video')
  const memberLocked = await json('/api/miniprogram/video/video-fixture/access', {}, annualSession.body.accessToken)
  assert.equal(memberLocked.body.access, 'locked')
  assert.equal(memberLocked.body.reason, 'VIDEO_PURCHASE_REQUIRED')
  const annualHumanLocked = await json(publicCourse.accessUrl, {}, annualSession.body.accessToken)
  assert.equal(annualHumanLocked.body.reason, 'VIDEO_PURCHASE_REQUIRED', 'annual membership does not include humanities')
  const memberPurchase = await json('/api/miniprogram/orders', { method: 'POST', body: JSON.stringify({ productType: 'guideVideo', videoId: 'video-fixture' }) }, annualSession.body.accessToken)
  await json(`/api/miniprogram/orders/${memberPurchase.body.order.id}/simulate-paid`, { method: 'POST' }, annualSession.body.accessToken)
  const memberAccess = await json('/api/miniprogram/video/video-fixture/access', {}, annualSession.body.accessToken)
  assert.equal(memberAccess.body.access, 'full')
  assert.equal(memberAccess.body.unlockedVia, 'purchase')

  // 8) Retired products stay unavailable.
  const retired = await json('/api/miniprogram/orders', { method: 'POST', body: JSON.stringify({ productType: 'album', albumId: 'x' }) }, session.body.accessToken)
  assert.equal(retired.status, 422); assert.equal(retired.body.code, 'PAYMENT_PRODUCT_UNAVAILABLE')

  // 9) Unpublished video hidden from public list and access 404.
  for (const id of ['humanities-main', 'humanities-first', 'humanities-tied', 'humanities-draft']) {
    const deleted = await json(`/api/admin/guideVideos/${id}`, { method: 'DELETE' }, admin)
    assert.equal(deleted.status, 204)
  }
  await json('/api/admin/guideVideos/video-draft', { method: 'PATCH', body: JSON.stringify({ status: 'unpublished' }) }, admin)
  const contentAfter = (await json('/api/content')).body
  assert.equal(contentAfter.guideVideos.length, 1)
  const missingAccess = await json('/api/miniprogram/video/video-draft/access', {}, session.body.accessToken)
  assert.equal(missingAccess.status, 404)

  // Banner link passthrough for the mini-program jump target.
  const banner = await json('/api/admin/miniprogram-home-banners', { method: 'POST', body: JSON.stringify({ id: 'banner-link-test', title: '跳转测试', description: 'desc', alt: 'alt', image: './images/home-test.png', link: 'attraction:acropolis' }) }, admin)
  assert.equal(banner.status, 201)
  const pubBanners = (await json('/api/content')).body.settings.homeBanners || []
  assert.equal(pubBanners.find((b) => b.id === 'banner-link-test')?.link, 'attraction:acropolis')

  console.log('PASS guide-video commerce: fixed ¥168 product, admin CRUD guards, access entitlement (anonymous/login/purchase/annual-member), signed OSS playUrl, retired products unavailable, unpublished hidden.')
} finally {
  server.kill('SIGTERM')
  await rm(temp, { recursive: true, force: true })
}
