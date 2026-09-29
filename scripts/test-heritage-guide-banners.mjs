import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const root = resolve(new URL('..', import.meta.url).pathname)
const tempRoot = await mkdtemp(join(tmpdir(), 'sy-heritage-guide-banners-'))
const portServer = net.createServer()
await new Promise((resolveListen, reject) => portServer.once('error', reject).listen(0, '127.0.0.1', resolveListen))
const { port } = portServer.address()
await new Promise((resolveClose, reject) => portServer.close((error) => error ? reject(error) : resolveClose()))
const base = `http://127.0.0.1:${port}`
let child
let logs = ''

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = response.status === 204 ? null : await response.json()
  return { response, data }
}

function assertStatus(result, status, label) {
  assert.equal(result.response.status, status, `${label}: expected HTTP ${status}, got ${result.response.status}: ${JSON.stringify(result.data)}`)
}

async function prepare() {
  await cp(join(root, 'server.mjs'), join(tempRoot, 'server.mjs'))
  await cp(join(root, 'storage.mjs'), join(tempRoot, 'storage.mjs'))
  await cp(join(root, 'wechat-pay.mjs'), join(tempRoot, 'wechat-pay.mjs'))
  await cp(join(root, 'admin-session.mjs'), join(tempRoot, 'admin-session.mjs'))
  await cp(join(root, 'heritage-content.mjs'), join(tempRoot, 'heritage-content.mjs'))
  await cp(join(root, 'attraction-ai-fill.mjs'), join(tempRoot, 'attraction-ai-fill.mjs'))
  await cp(join(root, 'package.json'), join(tempRoot, 'package.json'))
  await cp(join(root, 'seed', 'site-data.json'), join(tempRoot, 'seed', 'site-data.json'))
  await cp(join(root, 'seed', 'content-demo.json'), join(tempRoot, 'seed', 'content-demo.json'))
  await symlink(join(root, 'node_modules'), join(tempRoot, 'node_modules'), 'dir')
}

function start() {
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: tempRoot,
    env: { ...process.env, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: 'test-only-admin-password', SY_ADMIN_SESSION_SECRET: 'test-only-heritage-banner-session-secret' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (chunk) => { logs += chunk.toString() })
  child.stderr.on('data', (chunk) => { logs += chunk.toString() })
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server exited before ready: ${logs}`)
    try {
      if ((await fetch(`${base}/api/health`)).ok) return
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50))
  }
  throw new Error(`server did not start: ${logs}`)
}

async function stop() {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  await new Promise((resolveExit) => child.once('exit', resolveExit))
}

try {
  await mkdir(join(tempRoot, 'seed'), { recursive: true })
  await prepare()
  start()
  await waitForServer()

  const baseline = await request('/api/content?country=greece')
  assertStatus(baseline, 200, 'public content baseline')
  assert.deepEqual(baseline.data.heritageGuideBanners, [], 'new independent collection should start empty')
  assert.ok(baseline.data.home.banners.length > 0, 'fixture should include Website home banners')
  const originalHomeBanners = baseline.data.home.banners
  const login = await request('/api/auth/login', { method: 'POST', body: { password: 'test-only-admin-password' } })
  assertStatus(login, 200, 'admin login')
  const token = login.data.token
  assertStatus(await request('/api/admin/heritage-guide-banners'), 401, 'admin endpoint must require auth')
  const admin = (path, options) => request(path, { token, ...options })
  const websiteBefore = await admin('/api/admin/home-banners')
  assertStatus(websiteBefore, 200, 'Website home banner baseline')
  const originalWebsiteBanners = websiteBefore.data
  const miniBefore = await admin('/api/admin/miniprogram-home-banners')
  assertStatus(miniBefore, 200, 'mini-program home banner baseline')
  const originalMiniBanners = miniBefore.data.items

  assertStatus(await admin('/api/admin/heritage-guide-banners', { method: 'POST', body: { id: 'heritage-late', image: 'late.webp', title: '较后内容', description: '后排描述', alt: '后排图片', sort: 8, enabled: true } }), 201, 'create later banner')
  assertStatus(await admin('/api/admin/heritage-guide-banners', { method: 'POST', body: { id: 'heritage-first', image: 'first.webp', title: '首条内容', description: '首条描述', alt: '首条图片', sort: 2, enabled: true } }), 201, 'create first banner')
  assertStatus(await admin('/api/admin/heritage-guide-banners', { method: 'POST', body: { id: 'heritage-disabled', image: 'disabled.webp', title: '停用内容', sort: 1, enabled: false } }), 201, 'create disabled banner')
  assertStatus(await admin('/api/admin/heritage-guide-banners', { method: 'POST', body: { id: 'heritage-no-image', title: '缺图内容' } }), 422, 'reject missing image')

  const publicWithBanners = await request('/api/content?country=greece')
  assertStatus(publicWithBanners, 200, 'public content with heritage banners')
  assert.deepEqual(publicWithBanners.data.heritageGuideBanners.map((item) => item.id), ['heritage-first', 'heritage-late'], 'public contract filters disabled records and sorts ascending')
  assert.deepEqual(Object.keys(publicWithBanners.data.heritageGuideBanners[0]).sort(), ['alt', 'description', 'enabled', 'id', 'image', 'sort', 'title'])
  assert.equal(publicWithBanners.data.heritageGuideBanners[0].image, './images/first.webp')
  assert.equal(publicWithBanners.data.heritageGuideBanners[0].enabled, true)

  assertStatus(await admin('/api/admin/heritage-guide-banners/heritage-first', { method: 'PATCH', body: { enabled: false } }), 200, 'disable banner')
  assert.deepEqual((await request('/api/content')).data.heritageGuideBanners.map((item) => item.id), ['heritage-late'], 'disabled item is omitted from public list')
  assertStatus(await admin('/api/admin/heritage-guide-banners/heritage-late', { method: 'DELETE' }), 204, 'delete banner')
  assertStatus(await admin('/api/admin/heritage-guide-banners/heritage-first'), 200, 'read retained disabled banner')

  const after = await request('/api/content?country=greece')
  assert.deepEqual(after.data.home.banners, originalHomeBanners, 'heritage CRUD must not mutate Website home banners')
  const websiteAfter = await admin('/api/admin/home-banners')
  assert.deepEqual(websiteAfter.data, originalWebsiteBanners, 'heritage CRUD must not mutate Website home banner admin collection')
  const miniAfter = await admin('/api/admin/miniprogram-home-banners')
  assert.deepEqual(miniAfter.data.items, originalMiniBanners, 'heritage CRUD must not mutate mini-program home banner records')
  console.log('PASS heritage guide banner CRUD, public contract, filters/order, auth, and collection isolation')
} finally {
  await stop()
  await rm(tempRoot, { recursive: true, force: true })
}
