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
const option = (id, label, sort, enabled = true) => ({ id, label, sort, enabled })
// The admin only edits Simplified Chinese; 繁体 / 英文 must be derived by the server.
const simplified = (overrides = {}) => ({
  enabled: true,
  sort: 1,
  title: '在地用车资源',
  subtitle: '对接咨询',
  description: '根据出行节奏，咨询希腊本地车型与司导资源，顾问协助你完成预约对接。',
  note: '仅提供用车信息咨询与预约对接，车辆及司导劳务由客户直接与希腊本土主体签约结算。',
  disclaimer: '',
  tags: ['欧6车型信息', '中英双语咨询', '按需匹配'],
  images: [],
  form: {
    title: '说说你的用车计划', tip: '提交后，顾问将在 24 小时内联系你说明对接方式。',
    dateLabel: '用车日期', durationLabel: '用车时长', vehicleLabel: '意向车型', peopleLabel: '随行人数',
    routeLabel: '路线与用车需求', contactLabel: '联系方式', submitLabel: '提交用车咨询',
    routePlaceholder: '如：机场 → 市区酒店', phonePlaceholder: '手机号', wechatPlaceholder: '微信号',
    contactPhone: true, contactWechat: true, routeRequired: true, dateStart: 'today', dateEnd: '',
  },
  options: {
    vehicle: [option('vehicle-bmw-suv-5', '宝马 SUV / 5座', 1), option('vehicle-comfort-sedan', '舒适型轿车', 2), option('vehicle-business', '商务车型', 3)],
    duration: [option('duration-half-day', '半日', 1), option('duration-one-day', '1日', 2), option('duration-multi-day', '多日', 3)],
    people: [option('people-1-2', '1-2人', 1), option('people-3-5', '3-5人', 2), option('people-6-plus', '6人以上', 3)],
  },
  ...overrides,
})

try {
  await mkdir(join(tempRoot, 'seed'), { recursive: true })
  await prepare()
  start()
  await waitForServer()

  // 1. Public baseline: seeded defaults are complete and grouped.
  const initial = await request('/api/content?country=greece')
  assertStatus(initial, 200, 'public content baseline')
  const baseline = initial.data.vehicleService
  assert.ok(baseline && typeof baseline === 'object', 'vehicleService is exposed on /api/content')
  assert.equal(baseline.enabled, true)
  assert.equal(baseline.title, '在地用车资源')
  assert.equal(baseline.titleTw, '在地用車資源')
  assert.equal(baseline.titleEn, 'Local transport')
  assert.deepEqual(baseline.tags, ['欧6车型信息', '中英双语咨询', '按需匹配'])
  assert.deepEqual(baseline.images, [], 'images default to an empty array')
  assert.equal(baseline.form.title, '说说你的用车计划')
  assert.equal(baseline.form.routeRequired, true)
  assert.equal(baseline.form.contactPhone, true)
  assert.equal(baseline.form.contactWechat, true)
  assert.equal(baseline.form.dateStart, 'today')
  assert.equal(baseline.form.dateEnd, '')
  for (const group of ['vehicle', 'duration', 'people']) {
    const items = baseline.options[group]
    assert.equal(items.length, 3, `${group} seeds three options`)
    assert.deepEqual(items.map((item) => item.sort), [1, 2, 3], `${group} options come back sorted`)
    for (const item of items) assert.ok(item.id && item.label && item.labelTw && item.labelEn && item.enabled === true, `${group} option carries the full contract`)
  }
  assert.equal(baseline.options.vehicle[0].label, '宝马 SUV / 5座')
  assert.equal(baseline.options.vehicle[0].labelEn, 'BMW SUV / 5 seats')
  assert.equal(baseline.options.people[2].labelEn, '6+ people')

  // 2. Admin endpoint is protected.
  assertStatus(await request('/api/admin/vehicle-service'), 401, 'admin endpoint requires authentication')
  const login = await request('/api/auth/login', { method: 'POST', body: { password: 'test-only-admin-password' } })
  assertStatus(login, 200, 'admin login')
  const admin = (path, options) => request(path, { token: login.data.token, ...options })

  // 3. Validation: Simplified Chinese is the source of truth.
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: simplified({ title: '' }) }), 422, 'Simplified title is required')
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: simplified({ description: '' }) }), 422, 'Simplified description is required')
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: simplified({ options: { ...simplified().options, people: [] } }) }), 422, 'each option group needs at least one entry')
  const duplicateSort = simplified()
  duplicateSort.options.duration[1].sort = 1
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: duplicateSort }), 422, 'sort values must be unique within a group')
  const missingLabel = simplified()
  missingLabel.options.vehicle[1].label = ''
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: missingLabel }), 422, 'each option needs a Simplified name')
  const noContact = simplified()
  noContact.form.contactPhone = false
  noContact.form.contactWechat = false
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: noContact }), 422, 'at least one contact method must stay enabled')
  const badDate = simplified()
  badDate.form.dateStart = '2026/10/01'
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: badDate }), 422, 'dateStart must be today or YYYY-MM-DD')
  const reversed = simplified()
  reversed.form.dateStart = '2026-10-10'
  reversed.form.dateEnd = '2026-10-01'
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: reversed }), 422, 'dateEnd must not precede dateStart')

  // 4. Simplified-only save: 繁体 / 英文 are mirrored by the server.
  const formUpdated = simplified({ title: '在地用车资源（更新）', tags: ['欧6车型信息', '新增标签'] })
  formUpdated.form.title = '填写用车需求'
  formUpdated.form.routeRequired = false
  formUpdated.form.contactWechat = false
  formUpdated.form.dateStart = '2026-10-01'
  formUpdated.form.dateEnd = '2026-10-05'
  const saved = await admin('/api/admin/vehicle-service', { method: 'PATCH', body: formUpdated })
  assertStatus(saved, 200, 'Simplified-only configuration saves')
  assert.equal(saved.data.titleTw, '在地用车资源（更新）', 'Traditional Chinese falls back to Simplified')
  assert.equal(saved.data.titleEn, '在地用车资源（更新）', 'English falls back to Simplified')
  assert.equal(saved.data.titleTw, saved.data.title)
  assert.deepEqual(saved.data.tagsTw, ['欧6车型信息', '新增标签'], 'tag arrays are mirrored to the Simplified length')
  assert.deepEqual(saved.data.tagsEn, saved.data.tagsTw)
  assert.equal(saved.data.options.vehicle[0].labelTw, saved.data.options.vehicle[0].label)
  assert.equal(saved.data.form.title, '填写用车需求')
  assert.equal(saved.data.form.titleTw, '填写用车需求', 'form labels mirror Simplified')
  assert.equal(saved.data.form.routeRequired, false)
  assert.equal(saved.data.form.contactWechat, false)
  assert.equal(saved.data.form.dateStart, '2026-10-01')
  assert.equal(saved.data.form.dateEnd, '2026-10-05')

  // 5. Public output reflects the save (sorted, mirrored).
  const after = (await request('/api/content?country=greece')).data.vehicleService
  assert.equal(after.title, '在地用车资源（更新）')
  assert.equal(after.titleEn, '在地用车资源（更新）')
  assert.equal(after.form.title, '填写用车需求', 'public payload exposes the configured form copy')
  assert.equal(after.form.routeRequired, false)
  assert.equal(after.tags.length, 2)
  assert.deepEqual(after.options.vehicle.map((item) => item.label), ['宝马 SUV / 5座', '舒适型轿车', '商务车型'])

  // 6. Enabled filtering + ordering still apply.
  const reordered = simplified()
  reordered.options.vehicle[0].enabled = false
  reordered.options.people.reverse().forEach((item, index) => { item.sort = index + 1 })
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: reordered }), 200, 'disabled option saves')
  const filtered = (await request('/api/content?country=greece')).data.vehicleService
  assert.deepEqual(filtered.options.vehicle.map((item) => item.id), ['vehicle-comfort-sedan', 'vehicle-business'], 'disabled options are omitted from the public payload')
  assert.deepEqual(filtered.options.people.map((item) => item.label), ['6人以上', '3-5人', '1-2人'], 'public options follow the saved sort order')

  // 7. Top-level disable still returns the object for client-side placeholders.
  assertStatus(await admin('/api/admin/vehicle-service', { method: 'PATCH', body: simplified({ enabled: false }) }), 200, 'service can be disabled')
  assert.equal((await request('/api/content?country=greece')).data.vehicleService.enabled, false, 'disabled service is still returned with enabled:false')

  // 8. Vehicle inquiries reach the admin list (same leadType the mini program submits).
  const inquiry = await request('/api/leads', {
    method: 'POST',
    body: { leadType: 'vehicle-consultation', contact: 'qa-contact', vehicleDate: '2026-10-01', vehicleNeed: '机场 / 港口接送', travelers: '2 人 + 行李', durationId: 'duration-one-day', vehicleTypeId: 'vehicle-bmw-suv-5', peopleId: 'people-1-2' },
  })
  assertStatus(inquiry, 201, 'vehicle inquiry is accepted')
  const leads = (await admin('/api/admin/leads')).data
  const stored = leads.find((lead) => lead.id === inquiry.data.id)
  assert.ok(stored, 'vehicle inquiry appears in the admin leads list')
  assert.equal(stored.leadType, 'vehicle-consultation')
  assert.equal(stored.vehicleDate, '2026-10-01')
  assert.equal(stored.durationId, 'duration-one-day', 'option ids submitted by the client are persisted')
  assert.equal(leads.filter((lead) => lead.leadType === 'vehicle-consultation').length >= 1, true)

  // 8b. Mini-program style key names are normalized on ingest so no column is empty.
  const mpInquiry = await request('/api/leads', {
    method: 'POST',
    body: { leadType: 'vehicle-consultation', contact: 'mp-contact', bookingDate: '2026-10-05', route: '机场 → 市区', vehicleType: '宝马 SUV / 5座', duration: '1日', people: '3-5人' },
  })
  assertStatus(mpInquiry, 201, 'mini-program style vehicle inquiry is accepted')
  const mpStored = (await admin('/api/admin/leads')).data.find((lead) => lead.id === mpInquiry.data.id)
  assert.ok(mpStored, 'normalized inquiry appears in the admin list')
  assert.equal(mpStored.vehicleDate, '2026-10-05', 'bookingDate is normalized to vehicleDate')
  assert.equal(mpStored.vehicleNeed, '宝马 SUV / 5座 · 1日 · 机场 → 市区', 'vehicle type / duration / route are combined into vehicleNeed')
  assert.equal(mpStored.travelers, '3-5人', 'people is normalized to travelers')
  assert.equal(mpStored.bookingDate, '2026-10-05', 'original client keys are preserved')
  assert.equal(mpStored.route, '机场 → 市区')

  // 9. Restart keeps the stored configuration instead of reseeding defaults.
  await stop()
  start()
  await waitForServer()
  const afterRestart = (await request('/api/content?country=greece')).data.vehicleService
  assert.equal(afterRestart.enabled, false)
  assert.equal(afterRestart.title, '在地用车资源')
  assert.equal(afterRestart.titleEn, '在地用车资源')

  console.log('PASS vehicle service defaults, Simplified-only admin with 繁/英 fallback, validation, sorting, enabled filtering, inquiry list, auth and restart persistence')
} finally {
  await stop()
  await rm(tempRoot, { recursive: true, force: true })
}
