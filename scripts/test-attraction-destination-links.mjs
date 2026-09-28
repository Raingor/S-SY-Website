import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const adminSource = readFileSync(join(root, 'src/admin-vue/AdminApp.vue'), 'utf8')
const adminStyles = readFileSync(join(root, 'src/admin-vue/admin-element.css'), 'utf8')
const destinationGroupTable = adminSource.split('class="attraction-destination-groups"')[1]?.split('class="admin-table-scroll"')[0] || ''
assert.ok(destinationGroupTable, 'destination-group attraction table should be present')
assert.doesNotMatch(destinationGroupTable, /label="景点 ID"/, 'internal attraction IDs should not be displayed in destination-group tables')
assert.match(destinationGroupTable, /label="关联目的地"[\s\S]*?class="attraction-link-select"[\s\S]*?changeAttractionDestinationLinks/, 'each grouped attraction row should support live destination association editing')
assert.match(adminStyles, /\.el-admin \.status-inline\s*\{\s*width:\s*100%;\s*\}/, 'inline status selectors must fit their table cell without overflow ellipses')
assert.match(adminStyles, /\.el-admin \.admin-data-table \.status-inline\s*\{\s*width:\s*100%;\s*\}/, 'Element admin table status selectors must not overflow table cells')
const temp = mkdtempSync(join(tmpdir(), 'sy-attraction-links-'))
const password = 'test-only-attraction-links-password'
const secret = 'test-only-attraction-links-session-secret'
const files = ['server.mjs', 'storage.mjs', 'wechat-pay.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'attraction-ai-fill.mjs', 'package.json']
let child

async function availablePort() {
  const server = net.createServer()
  await new Promise((resolveListen, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolveListen))
  const port = server.address().port
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
  return port
}

try {
  mkdirSync(join(temp, 'seed'))
  for (const file of files) copyFileSync(join(root, file), join(temp, file))
  const fixturePath = join(temp, 'seed/site-data.json')
  copyFileSync(join(root, 'seed/site-data.json'), fixturePath)
  copyFileSync(join(root, 'seed/content-demo.json'), join(temp, 'seed/content-demo.json'))
  symlinkSync(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')

  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
  assert.ok(fixture.destinations.length && fixture.attractions.length, 'isolated test fixture must contain destination and attraction records')
  const destination = fixture.destinations[0]
  const attraction = fixture.attractions[0]
  attraction.summaryTw = '【TEST ONLY】隐藏的繁体简介'
  writeFileSync(fixturePath, JSON.stringify(fixture))
  const legacySummaryTw = attraction.summaryTw
  const port = await availablePort()
  const base = `http://127.0.0.1:${port}`
  child = spawn(process.execPath, [join(temp, 'server.mjs')], {
    cwd: temp,
    env: { ...process.env, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: password, SY_ADMIN_SESSION_SECRET: secret },
    stdio: 'ignore',
  })
  const request = async (path, token, options = {}) => fetch(base + path, {
    ...options,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  let ready = false
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break } } catch {}
    await delay(50)
  }
  assert.ok(ready, 'isolated test server should start')
  const login = await request('/api/auth/login', null, { method: 'POST', body: JSON.stringify({ password }) })
  assert.equal(login.status, 200)
  const token = (await login.json()).token

  const addExisting = await request(`/api/admin/destinations/${encodeURIComponent(destination.id)}`, token, {
    method: 'PATCH', body: JSON.stringify({ attractionIds: [attraction.id], attractionId: attraction.id }),
  })
  assert.equal(addExisting.status, 200)
  const destinationAfterAdd = await addExisting.json()
  assert.deepEqual(destinationAfterAdd.attractionIds, [attraction.id])
  assert.equal(destinationAfterAdd.attractionId, attraction.id, 'legacy single-id field stays synchronized')

  const removeExisting = await request(`/api/admin/destinations/${encodeURIComponent(destination.id)}`, token, {
    method: 'PATCH', body: JSON.stringify({ attractionIds: [], attractionId: '' }),
  })
  assert.equal(removeExisting.status, 200)
  const destinationAfterRemove = await removeExisting.json()
  assert.deepEqual(destinationAfterRemove.attractionIds, [])
  assert.equal(destinationAfterRemove.attractionId, '')

  const created = await request('/api/admin/attractions', token, {
    method: 'POST', body: JSON.stringify({ name: '【TEST ONLY】关联回归景点', city: '', summary: '仅存在于隔离测试数据。' }),
  })
  assert.equal(created.status, 201)
  const createdAttraction = await created.json()
  const addCreated = await request(`/api/admin/destinations/${encodeURIComponent(destination.id)}`, token, {
    method: 'PATCH', body: JSON.stringify({ attractionIds: [createdAttraction.id] }),
  })
  assert.equal(addCreated.status, 200)
  assert.deepEqual((await addCreated.json()).attractionIds, [createdAttraction.id])
  const storedAttractions = await request('/api/admin/attractions', token)
  const storedRows = await storedAttractions.json()
  assert.ok(!Object.hasOwn(storedRows.find(row => row.id === createdAttraction.id), 'linkedDestinationIds'), 'UI-only reverse association must not leak into attraction storage')

  const partialUpdate = await request(`/api/admin/attractions/${encodeURIComponent(attraction.id)}`, token, {
    method: 'PATCH', body: JSON.stringify({ name: attraction.name }),
  })
  assert.equal(partialUpdate.status, 200)
  assert.equal((await partialUpdate.json()).summaryTw, legacySummaryTw, 'hidden legacy translations survive partial edits')
  console.log('PASS: attraction/destination relation updates, legacy field synchronization, UI-only reverse relation, and legacy narrative preservation')
} finally {
  if (child && child.exitCode === null) {
    await new Promise(resolveExit => {
      const timeout = setTimeout(() => { child.kill('SIGKILL'); resolveExit() }, 3000)
      child.once('exit', () => { clearTimeout(timeout); resolveExit() })
      child.kill('SIGTERM')
    })
  }
  rmSync(temp, { recursive: true, force: true })
}
