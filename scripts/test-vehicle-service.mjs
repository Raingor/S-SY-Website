import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const root = resolve(new URL('..', import.meta.url).pathname)
const tempRoot = await mkdtemp(join(tmpdir(), 'sy-vehicle-service-'))
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
    env: { ...process.env, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: 'test-only-admin-password', SY_ADMIN_SESSION_SECRET: 'test-only-vehicle-service-session-secret' },
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

const clone = (value) => JSON.parse(JSON.stringify(value))

try {
  await mkdir(join(tempRoot, 'seed'), { recursive: true })
  await prepare()
  start()
  await waitForServer()

  // 1. Public baseline: seeded defaults are tri-lingual, sorted and grouped.
  const initial = await request('/api/content?country=greece')
  assertStatus(initial, 200, 'public content baseline')
  const baseline = initial.data.vehicleService
  assert.ok(baseline && typeof baseline === 'object', 'vehicleService is exposed on /api/content')
  assert.equal(baseline.enabled, true)
  assert.equal(baseline.title, '在地用车资源')
  assert.equal(baseline.titleTw, '在地用車資源')
  assert.equal(baseline.titleEn, 'Local transport')
  assert.deepEqual(baseline.tags, ['欧6车型信息', '中英双语咨询', '按需匹配'])
  assert.equal(baseline.tagsTw.length, baseline.tagsEn.length, 'tags are tri-lingual and same length')
  assert.deepEqual(baseline.images, [], 'images default to an empty array')
  for (const group of ['vehicle', 'duration', 'people']) {
    const items = baseline.options[group]
    assert.equal(items.length, 3, `${group} seeds three options`)
    assert.deepEqual(items.map((item) => item.sort), [1, 2, 3], `${group} options come back sorted`)
    for (const item of items) assert.ok(item.id && item.label && item.labelTw && item.labelEn && item.enabled === true, `${group} option carries the full contract`)
  }
  assert.equal(baseline.options.vehicle[0].label, '宝马 SUV / 5座')
  assert.equal(baseline.options.vehicle[0].labelEn, 'BMW SUV / 5 seats')
  assert.equal(baseline.options.people[2].labelEn, '6+ people')

  // 2. Admin endpoint is protected and mirrors the stored shape.
  assertStatus(await request('/api/admin/vehicle-service'), 401, 'admin endpoint requires authentication')
  const login = await request('/api/auth/login', { method: 'POST', body: { password: 'test-only-admin-password' } })
  assertStatus(login, 200, 'admin login')
  const admin = (path, options) => request(path, { token: login.data.token, ...options })
  const stored = (await admin('/api/admin/vehicle-service')).data
  assert.equal(stored.title, baseline.title)
  assert.deepEqual(stored.options.duration.map((item) => item.label), ['半日', '1日', '多日'])

  // 3. Validation: tri-lingual parity, non-empty options, unique sort.
  const broken = clone(stored)
  broken.titleEn = ''
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: broken }), 422, 'tri-lingual title parity is enforced')

  const partialNote = clone(stored)
  partialNote.noteTw = ''
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: partialNote }), 422, 'optional tri-lingual fields must be complete once started')

  const unbalancedTags = clone(stored)
  unbalancedTags.tagsEn = unbalancedTags.tagsEn.slice(0, 1)
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: unbalancedTags }), 422, 'tag arrays must be the same length in all languages')

  const emptyGroup = clone(stored)
  emptyGroup.options.people = []
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: emptyGroup }), 422, 'each option group needs at least one entry')

  const duplicateSort = clone(stored)
  duplicateSort.options.duration[1].sort = 1
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: duplicateSort }), 422, 'sort values must be unique within a group')

  const missingLabel = clone(stored)
  missingLabel.options.vehicle[1].labelEn = ''
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: missingLabel }), 422, 'each option needs all three languages')

  // 4. Successful save: rename, add an option, disable one, reorder another.
  const updated = clone(stored)
  updated.title = '在地用车资源（更新）'
  updated.titleTw = '在地用車資源（更新）'
  updated.titleEn = 'Local transport (updated)'
  updated.tags = ['欧6车型信息', '中英双语咨询', '按需匹配', '新增标签']
  updated.tagsTw = ['歐6車型資訊', '中英雙語諮詢', '按需匹配', '新增標籤']
  updated.tagsEn = ['Euro 6 vehicles', 'Chinese-English support', 'Matched to your needs', 'New tag']
  updated.options.vehicle.push({ id: 'vehicle-van-9', label: '9 座商务车', labelTw: '9 座商務車', labelEn: '9-seat van', sort: 4, enabled: true })
  updated.options.duration[0].enabled = false
  updated.options.people.reverse().forEach((item, index) => { item.sort = index + 1 })
  const saved = await admin('/api/admin/vehicle-service', { method: 'PATCH', body: updated })
  assertStatus(saved, 200, 'valid configuration saves')
  assert.equal(saved.data.titleEn, 'Local transport (updated)')

  // 5. Public output reflects the save: disabled filtered out, order by sort, new entry present.
  const after = (await request('/api/content?country=greece')).data.vehicleService
  assert.equal(after.titleEn, 'Local transport (updated)')
  assert.equal(after.tags.length, 4)
  assert.deepEqual(after.options.vehicle.map((item) => item.id), ['vehicle-bmw-suv-5', 'vehicle-comfort-sedan', 'vehicle-business', 'vehicle-van-9'])
  assert.deepEqual(after.options.duration.map((item) => item.label), ['1日', '多日'], 'disabled options are omitted from the public payload')
  assert.deepEqual(after.options.people.map((item) => item.label), ['6人以上', '3-5人', '1-2人'], 'public options follow the saved sort order')

  // 6. Top-level disable still returns the object so the client can render its own placeholder.
  const disabled = await admin('/api/admin/vehicle-service', { method: 'PATCH', body: { ...clone(saved.data), enabled: false } })
  assertStatus(disabled, 200, 'service can be disabled')
  const afterDisable = (await request('/api/content?country=greece')).data.vehicleService
  assert.equal(afterDisable.enabled, false, 'disabled service is still returned with enabled:false')
  assert.equal(afterDisable.titleEn, 'Local transport (updated)')

  // 7. Restart keeps the stored configuration instead of reseeding defaults.
  await stop()
  start()
  await waitForServer()
  const afterRestart = (await request('/api/content?country=greece')).data.vehicleService
  assert.equal(afterRestart.titleEn, 'Local transport (updated)')
  assert.equal(afterRestart.enabled, false)
  assert.equal(afterRestart.options.vehicle.length, 4)

  console.log('PASS vehicle service defaults, tri-lingual public contract, validation, option sorting, enabled filtering, auth and restart persistence')
} finally {
  await stop()
  await rm(tempRoot, { recursive: true, force: true })
}
