import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const root = resolve(new URL('..', import.meta.url).pathname)
const tempRoot = await mkdtemp(join(tmpdir(), 'sy-miniprogram-service-entries-'))
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
  for (const file of ['server.mjs', 'storage.mjs', 'wechat-pay.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'attraction-ai-fill.mjs', 'package.json']) await cp(join(root, file), join(tempRoot, file))
  for (const file of ['site-data.json', 'content-demo.json']) await cp(join(root, 'seed', file), join(tempRoot, 'seed', file))
  await symlink(join(root, 'node_modules'), join(tempRoot, 'node_modules'), 'dir')
}

function start() {
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: tempRoot,
    env: { ...process.env, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: 'test-only-admin-password', SY_ADMIN_SESSION_SECRET: 'test-only-service-entry-session-secret' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (chunk) => { logs += chunk.toString() })
  child.stderr.on('data', (chunk) => { logs += chunk.toString() })
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server exited before ready: ${logs}`)
    try { if ((await fetch(`${base}/api/health`)).ok) return } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50))
  }
  throw new Error(`server did not start: ${logs}`)
}

async function stop() {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  await new Promise((resolveExit) => child.once('exit', resolveExit))
}

const locales = (zh, tw, en) => ({ 'zh-CN': zh, 'zh-TW': tw, en })

try {
  await mkdir(join(tempRoot, 'seed'), { recursive: true })
  await prepare()
  start()
  await waitForServer()

  const initial = await request('/api/content?country=greece')
  assertStatus(initial, 200, 'public content baseline')
  assert.deepEqual(initial.data.miniprogramServiceEntries.map((entry) => entry.key), ['customization', 'guide', 'vehicle', 'knowledge', 'business', 'travel-guide'])
  assert.equal(initial.data.miniprogramServiceEntries[0].iconImage, './images/miniprogram-service-icons/entry-customization.png')
  assert.deepEqual(Object.keys(initial.data.miniprogramServiceEntries[0]).sort(), ['enabled', 'iconImage', 'id', 'key', 'sort', 'subtitle', 'title'])
  assert.ok(initial.data.home.banners.length > 0)

  assertStatus(await request('/api/admin/miniprogram-service-entries'), 401, 'admin endpoint requires authentication')
  const login = await request('/api/auth/login', { method: 'POST', body: { password: 'test-only-admin-password' } })
  assertStatus(login, 200, 'admin login')
  const admin = (path, options) => request(path, { token: login.data.token, ...options })
  const originalWebsiteBanners = (await admin('/api/admin/home-banners')).data
  const originalMiniBanners = (await admin('/api/admin/miniprogram-home-banners')).data.items
  const originalHeritageBanners = (await admin('/api/admin/heritage-guide-banners')).data.items

  const customized = { key: 'guide', title: locales('古迹讲解（更新）', '古蹟講解（更新）', 'Heritage guide updated'), subtitle: locales('预约咨询', '預約諮詢', 'Booking advice'), iconImage: 'miniprogram-service-icons/entry-guide.png', sort: 20, enabled: true }
  assertStatus(await admin('/api/admin/miniprogram-service-entries/guide', { method: 'PATCH', body: customized }), 200, 'update entry')
  assertStatus(await admin('/api/admin/miniprogram-service-entries', { method: 'POST', body: { ...customized, key: 'guide', id: 'guide-copy' } }), 409, 'duplicate fixed action key is rejected')
  assertStatus(await admin('/api/admin/miniprogram-service-entries', { method: 'POST', body: { ...customized, key: '/pages/arbitrary/arbitrary', id: 'bad-key' } }), 422, 'arbitrary route is rejected')

  let publicEntries = (await request('/api/content?country=greece')).data.miniprogramServiceEntries
  assert.equal(publicEntries.find((entry) => entry.key === 'guide').title['zh-CN'], '古迹讲解（更新）')
  assert.equal(publicEntries[0].key, 'customization', 'sort values are ascending')
  assert.equal(publicEntries.at(-1).key, 'guide', 'changed sort moves entry to end')
  assert.equal('createdAt' in publicEntries[0], false, 'public response exposes only the contract')

  assertStatus(await admin('/api/admin/miniprogram-service-entries/vehicle', { method: 'PATCH', body: { enabled: false } }), 200, 'disable entry')
  publicEntries = (await request('/api/content?country=greece')).data.miniprogramServiceEntries
  assert.equal(publicEntries.some((entry) => entry.key === 'vehicle'), false, 'disabled service entries are omitted')
  assertStatus(await admin('/api/admin/miniprogram-service-entries/knowledge', { method: 'DELETE' }), 204, 'delete entry')
  assert.equal((await admin('/api/admin/miniprogram-service-entries')).data.items.length, 5, 'admin list retains disabled records and reflects deletion')

  const contentAfter = await request('/api/content?country=greece')
  assert.deepEqual(contentAfter.data.home.banners, initial.data.home.banners, 'service entry CRUD does not alter Website home banners')
  assert.deepEqual((await admin('/api/admin/home-banners')).data, originalWebsiteBanners, 'Website banner admin collection remains unchanged')
  assert.deepEqual((await admin('/api/admin/miniprogram-home-banners')).data.items, originalMiniBanners, 'mini-program banner admin collection remains unchanged')
  assert.deepEqual((await admin('/api/admin/heritage-guide-banners')).data.items, originalHeritageBanners, 'heritage banner admin collection remains unchanged')

  const remaining = (await admin('/api/admin/miniprogram-service-entries')).data.items
  for (const entry of remaining) assertStatus(await admin(`/api/admin/miniprogram-service-entries/${encodeURIComponent(entry.id)}`, { method: 'DELETE' }), 204, `delete ${entry.key}`)
  await stop()
  start()
  await waitForServer()
  assert.deepEqual((await request('/api/content?country=greece')).data.miniprogramServiceEntries, [], 'restart preserves an explicitly empty collection rather than reseeding defaults')
  console.log('PASS mini-program service entry defaults, CRUD, fixed-key validation, multilingual public contract, ordering, enabled filtering, auth, and isolation')
} finally {
  await stop()
  await rm(tempRoot, { recursive: true, force: true })
}
