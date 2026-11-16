// 回归：小程序分享卡（shareCards）后台 CRUD 与公开契约。
// 运行：node scripts/test-share-cards.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const temp = await mkdtemp(join(tmpdir(), 'sy-share-cards-'))
const listener = net.createServer()
await new Promise((r) => listener.listen(0, '127.0.0.1', r))
const port = listener.address().port
await new Promise((r) => listener.close(r))
const base = `http://127.0.0.1:${port}`

await mkdir(join(temp, 'seed'), { recursive: true })
for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'private-map.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs']) await cp(join(root, file), join(temp, file))
await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')

const fixture = syntheticContentFixture()
fixture.shareCards = [
  { id: 'share-index', route: '/pages/index/index', title: '希伴旅｜希腊旅行管家', titleTw: '希伴旅｜希臘旅行管家', titleEn: 'Greek Travel Butler', description: '编辑精选行程与在地服务', image: 'images/share-index.webp', sort: 1, status: 'published' },
  { id: 'share-draft', route: '/pages/vehicle/vehicle', title: '在地用车草稿', sort: 2, status: 'unpublished' },
  { id: 'share-bad-route', route: 'pages/no-leading-slash', title: '无效路径', sort: 3, status: 'published' },
]
await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))

const password = '{{SECRET_bltmqvjs}}'
const server = spawn(process.execPath, ['server.mjs'], { cwd: temp, env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: password }, stdio: ['ignore', 'pipe', 'pipe'] })
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
  const session = await json('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) })
  assert.equal(session.status, 200)
  const token = session.body.token

  // 1) 公开契约：只下发已发布且路径合法的卡片，按 sort 排序，图片转成公开 URL。
  const content = (await json('/api/content')).body
  assert.deepEqual(content.shareCards.map((card) => card.id), ['share-index'], '只下发已发布的合法路径卡片')
  const card = content.shareCards[0]
  assert.equal(card.route, '/pages/index/index')
  assert.equal(card.title, '希伴旅｜希腊旅行管家')
  assert.equal(card.titleTw, '希伴旅｜希臘旅行管家')
  assert.equal(card.titleEn, 'Greek Travel Butler')
  assert.equal(card.status, 'published')
  assert.equal(card.previewSeconds, undefined)
  assert.match(card.image, /^(?:\.\/|\/)?images\/share-index\.webp$/)

  // 2) 后台列表：草稿与非法路径都保留可编辑，不做静默删除。
  const listed = await json('/api/admin/shareCards', {}, token)
  assert.equal(listed.status, 200)
  assert.equal(listed.body.items.length, 3)
  assert.deepEqual(listed.body.items.map((item) => item.id), ['share-index', 'share-draft', 'share-bad-route'])

  // 3) 新增：路径必填且必须是 /pages/<目录>/<页面>；重复路径冲突。
  const missingRoute = await json('/api/admin/shareCards', { method: 'POST', body: JSON.stringify({ title: '缺路径', image: '', sort: 1 }) }, token)
  assert.equal(missingRoute.status, 422)
  assert.match(missingRoute.body.error, /页面路径/)
  const withQuery = await json('/api/admin/shareCards', { method: 'POST', body: JSON.stringify({ route: '/pages/index/index?from=share', title: '带查询串' }) }, token)
  assert.equal(withQuery.status, 409, '查询串被剔除后与已有页面重复')
  const malformed = await json('/api/admin/shareCards', { method: 'POST', body: JSON.stringify({ route: '/pages/only-one-segment', title: '路径格式错误' }) }, token)
  assert.equal(malformed.status, 422)
  const duplicate = await json('/api/admin/shareCards', { method: 'POST', body: JSON.stringify({ route: '/pages/index/index', title: '重复页面' }) }, token)
  assert.equal(duplicate.status, 409)
  assert.equal(duplicate.body.code, 'DUPLICATE_SHARE_ROUTE')
  const created = await json('/api/admin/shareCards', { method: 'POST', body: JSON.stringify({ route: '/pages/membership/shop/', title: '会员商店', titleTw: '會員商店', titleEn: 'Membership', image: 'images/share-shop.webp', sort: 5, status: 'published' }) }, token)
  assert.equal(created.status, 201)
  assert.equal(created.body.route, '/pages/membership/shop', '去掉末尾斜杠')
  assert.equal(created.body.id.startsWith('share-card-'), true, '自动生成 id')

  // 4) 编辑：可以清空标题与图片（小程序回退页面标题与首图），非法图片路径被拒。
  const badImage = await json(`/api/admin/shareCards/${created.body.id}`, { method: 'PATCH', body: JSON.stringify({ image: 'http://insecure.example.com/a.jpg' }) }, token)
  assert.equal(badImage.status, 422)
  const cleared = await json(`/api/admin/shareCards/${created.body.id}`, { method: 'PATCH', body: JSON.stringify({ title: '', image: '' }) }, token)
  assert.equal(cleared.status, 200)
  assert.equal(cleared.body.title, '')
  assert.equal(cleared.body.image, '')
  assert.equal(cleared.body.status, 'published', '未提交的字段保持原值')

  // 5) 公开接口按 sort 排序，且不暴露图片以外的后台字段。
  const after = (await json('/api/content')).body
  assert.deepEqual(after.shareCards.map((item) => item.route), ['/pages/index/index', '/pages/membership/shop'])
  assert.equal(after.shareCards[1].image, '')
  assert.equal(Object.prototype.hasOwnProperty.call(after.shareCards[0], 'createdAt'), false)

  // 6) 下架即不下发；删除后记录消失。
  await json(`/api/admin/shareCards/${created.body.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'unpublished' }) }, token)
  assert.deepEqual((await json('/api/content')).body.shareCards.map((item) => item.id), ['share-index'])
  const removed = await json(`/api/admin/shareCards/${created.body.id}`, { method: 'DELETE' }, token)
  assert.equal(removed.status, 204)
  assert.equal((await json('/api/admin/shareCards', {}, token)).body.items.length, 3)

  console.log('shareCards contract PASS')
} finally {
  server.kill('SIGTERM')
}