import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import Vue from 'vue'
import { adminAssetUrl } from '../src/admin-vue/asset-url.mjs'
import { attractionEditorFieldGroups, attractionFieldGroup, matchesAttractionAudio } from '../src/admin-vue/visitor-guide-editor.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const temp = await mkdtemp(join(tmpdir(), 'sy-audio-pinning-'))
const fixturePath = join(temp, 'seed/site-data.json')
const audioFile = `${'a'.repeat(32)}.mp3`
const previewFile = `${'a'.repeat(32)}-preview.m4a`
const uploaded = { audioFile, previewFile, durationSeconds: 20, previewSeconds: 10 }
const track = { title: 'Fixture guide', attractionId: 'fixture-attraction', exhibitId: 'point-a', category: 'online', unlockMode: 'free', status: 'published', ...uploaded }
const fixture = Object.fromEntries(['routes','destinations','leads','miniprogramUsers','sampleItineraries','customTrips','destinationCategories','destinationTypes','miniprogramOrders','homeBanners','miniprogramServiceEntries','heritageGuideBanners','audioAlbums'].map(key => [key, []]))
Object.assign(fixture, {
  miniprogramUsers: [{ id: 'fixture-user', nickname: 'Synthetic user' }],
  settings: { siteName: 'Fixture only', siteUrl: 'https://fixture.invalid' },
  countries: [{ id: 'greece', name: 'Fixture country', enabled: true }],
  guides: [{ id: 'fixture-guide', name: 'Fixture guide', enabled: true }],
  cities: [{ id: 'fixture-city', countryId: 'greece', name: 'Fixture city' }],
  attractions: [{ id: 'fixture-attraction', countryId: 'greece', city: 'fixture-city', name: 'Fixture attraction', summary: 'Synthetic only', status: 'published', highlights: [], guide: {}, exhibits: [{ id: 'point-a', name: 'Point A', sort: 1 }, { id: 'point-b', name: 'Point B', sort: 2 }] }],
  audioRoutes: [{ id: 'fixture-route', attractionId: 'fixture-attraction', title: 'Fixture route', status: 'published', pointIds: ['point-b', 'point-a'], sort: 1 }],
  audioTracks: [{ ...track, id: 'legacy-online', sort: 1 }, { ...track, id: 'pinned-online', sort: 2, isPinned: true }, { ...track, id: 'expert-guide', category: 'expert', unlockMode: 'expert', sort: 3 }, { ...track, id: 'route-guide', category: 'route', routeId: 'fixture-route', sort: 4, isPinned: true }],
  audioUploads: [uploaded],
  attractionDetailPage: {},
})
let server
let logs = ''
let admin
const errors = []
const portServer = net.createServer()
await new Promise((resolvePort, reject) => { portServer.once('error', reject); portServer.listen(0, '127.0.0.1', resolvePort) })
const port = portServer.address().port
await new Promise(resolvePort => portServer.close(resolvePort))
const base = `http://127.0.0.1:${port}`
async function jsonRequest(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } })
  const data = await response.json()
  return { response, data }
}
async function stopServer() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return
  const exited = once(server, 'exit')
  server.kill('SIGTERM')
  await Promise.race([exited, delay(2000)])
  if (server.exitCode === null && server.signalCode === null) { server.kill('SIGKILL'); await exited }
}
try {
  await mkdir(join(temp, 'seed'))
  await mkdir(join(temp, 'private-audio'), { mode: 0o700 })
  await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 })
  for (const name of ['server.mjs','storage.mjs','wechat-pay.mjs','admin-session.mjs','heritage-content.mjs', 'private-map.mjs','attraction-ai-fill.mjs','package.json']) await copyFile(join(root, name), join(temp, name))
  for (const name of [audioFile, previewFile]) await writeFile(join(temp, 'private-audio', name), 'synthetic audio fixture', { mode: 0o600 })
  await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')
  // Only the loopback JSON fixture receives writes; inherit no DB/payment/service credentials.
  const env = Object.fromEntries(['PATH','HOME','TMPDIR','LANG','TZ'].filter(key => process.env[key]).map(key => [key, process.env[key]]))
  Object.assign(env, { SY_STORAGE: 'json', PORT: String(port), SY_ADMIN_PASSWORD: 'fixture-audio-pinning-password', SY_ADMIN_SESSION_SECRET: 'fixture-audio-pinning-session', SY_AUDIO_PRIVATE_DIR: join(temp, 'private-audio') })
  async function startServer() {
    server = spawn(process.execPath, ['server.mjs'], { cwd: temp, env, stdio: ['ignore', 'pipe', 'pipe'] })
    server.stdout.on('data', chunk => { logs += chunk })
    server.stderr.on('data', chunk => { logs += chunk })
    for (let i = 0; i < 100; i += 1) {
      if (server.exitCode !== null) throw new Error(`fixture server exited: ${logs}`)
      try { if ((await fetch(base + '/api/health')).ok) return } catch {}
      await delay(50)
    }
    throw new Error('fixture server did not start')
  }
  await startServer()
  const login = await jsonRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ password: env.SY_ADMIN_PASSWORD }) })
  assert.equal(login.response.status, 200)
  const token = login.data.token
  const auth = { Authorization: `Bearer ${token}` }
  const getTracks = async () => (await jsonRequest('/api/admin/audioTracks', { headers: auth })).data
  const getPublic = async () => (await jsonRequest('/api/content?country=greece')).data
  let rows = await getTracks()
  assert.equal(rows.find(row => row.id === 'legacy-online').isPinned, false, 'legacy admin reads default to false')
  let content = await getPublic()
  const initialDetail = content.attractionDetails['fixture-attraction']
  assert.equal(initialDetail.audioGuides.find(row => row.id === 'legacy-online').isPinned, false)
  assert.equal(initialDetail.audioGuides.find(row => row.id === 'pinned-online').isPinned, true)
  const originalOrder = initialDetail.audioGuides.map(row => row.id)
  const originalRoutes = initialDetail.routes
  const originalExhibits = initialDetail.exhibits
  assert.deepEqual(originalOrder, ['legacy-online', 'pinned-online', 'expert-guide', 'route-guide'], 'public API retains original order')

  const defaultCreated = await jsonRequest('/api/admin/audioTracks', { method: 'POST', headers: auth, body: JSON.stringify({ ...track, id: 'default-unpinned-draft', status: 'unpublished' }) })
  assert.equal(defaultCreated.response.status, 201)
  assert.equal(defaultCreated.data.isPinned, false, 'API creation without the flag persists false')

  // Instantiate the real Vue component; its save and inline toggle call the fixture HTTP APIs.
  const source = await readFile(join(root, 'src/admin-vue/AdminApp.vue'), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace("import { adminAssetUrl } from './asset-url.mjs'", '').replace("import VisitorGuideEditor from './VisitorGuideEditor.vue'", '').replace("import { attractionEditorFieldGroups, attractionFieldGroup, matchesAttractionAudio } from './visitor-guide-editor.mjs'", '').replace('export default {', 'globalThis.adminComponent = {')
  const storage = new Map([['sy-greece-admin-token', token]])
  const context = { adminAssetUrl, attractionEditorFieldGroups, attractionFieldGroup, matchesAttractionAudio, VisitorGuideEditor: {}, sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }, window: { location: { origin: base }, addEventListener() {}, removeEventListener() {} }, fetch: (url, options) => fetch(new URL(url, base), options), Blob, URL, AbortController, console, setTimeout, clearTimeout }
  vm.runInNewContext(script, context, { filename: 'AdminApp.vue' })
  admin = new Vue({ ...context.adminComponent, created: undefined, mounted: undefined })
  // This harness does not mount a DOM; editor scroll-position capture may
  // safely report that no list-page element is present.
  admin.$el = { querySelector: () => null }
  admin.$message = { error: message => errors.push(message), success() {}, warning: message => errors.push(message), info() {} }
  admin.$refs.editForm = { validate: callback => callback(true), clearValidate() {} }
  admin.active = 'audioTracks'
  await admin.loadAll()
  assert.deepEqual(errors, [])
  admin.active = 'audioRoutes'
  assert.ok(!admin.currentMenu.fields.some(item => item.key === 'isPinned'), 'route editor has no pinning control')
  admin.active = 'audioTracks'
  const field = admin.currentMenu.fields.find(item => item.key === 'isPinned')
  assert.equal(field.type, 'switch')
  assert.deepEqual(Array.from(field.categories), ['online', 'expert'])
  assert.ok(admin.currentMenu.columns.some(item => item.key === 'isPinned'))
  assert.ok(admin.currentMenu.editorGroups.find(item => item.key === 'access').fields.includes('isPinned'))
  admin.openEditor({ ...rows.find(row => row.id === 'legacy-online'), isPinned: undefined }, false)
  assert.equal(admin.form.isPinned, false)
  admin.form.isPinned = true
  await admin.saveEditor(true)
  assert.deepEqual(errors, [])
  assert.equal(admin.form.isPinned, true, 'editor save-and-continue retains the flag')
  rows = await getTracks()
  assert.equal(rows.find(row => row.id === 'legacy-online').isPinned, true, 'editor changes persist through HTTP readback')
  await admin.changeAudioPin(rows.find(row => row.id === 'legacy-online'), false)
  assert.deepEqual(errors, [])
  assert.equal((await getTracks()).find(row => row.id === 'legacy-online').isPinned, false, 'inline action cancels pinning')
  await admin.changeAudioPin(rows.find(row => row.id === 'expert-guide'), true)
  assert.deepEqual(errors, [])
  assert.equal((await getTracks()).find(row => row.id === 'expert-guide').isPinned, true, 'expert guides also support inline pinning')
  admin.startCreate()
  assert.equal(admin.form.isPinned, false, 'new audio is not pinned by default')
  Object.assign(admin.form, { ...track, title: 'Created in Vue fixture', isPinned: true })
  await admin.saveEditor(true)
  assert.deepEqual(errors, [])
  const createdId = admin.form.id
  assert.ok(createdId)
  assert.equal((await getTracks()).find(row => row.id === createdId).isPinned, true, 'new editor record persists pinning')
  admin.form.isPinned = false
  await admin.saveEditor(true)
  assert.deepEqual(errors, [])
  assert.equal(admin.form.isPinned, false)

  const bad = await jsonRequest('/api/admin/audioTracks/pinned-online', { method: 'PATCH', headers: auth, body: JSON.stringify({ isPinned: 'true' }) })
  assert.equal(bad.response.status, 422, 'non-boolean flag is rejected')
  assert.equal((await getTracks()).find(row => row.id === 'pinned-online').isPinned, true)
  const persisted = JSON.parse(await readFile(fixturePath, 'utf8'))
  assert.equal(persisted.audioTracks.find(row => row.id === createdId).isPinned, false)
  assert.equal(persisted.audioTracks.find(row => row.id === 'expert-guide').isPinned, true)
  await stopServer()
  await startServer()
  content = await getPublic()
  const detail = content.attractionDetails['fixture-attraction']
  for (const records of [detail.audioGuides, content.attractions.find(row => row.id === 'fixture-attraction').audioGuides]) {
    assert.equal(records.find(row => row.id === 'legacy-online').isPinned, false)
    assert.equal(records.find(row => row.id === 'expert-guide').isPinned, true)
    assert.equal(records.find(row => row.id === createdId).isPinned, false)
    assert.ok(records.every(row => typeof row.isPinned === 'boolean'))
    assert.deepEqual(records.filter(row => row.id !== createdId).map(row => row.id), originalOrder, 'pinning does not reorder the public API')
  }
  // Exercise the actual settings/detail/attraction/member forms against HTTP storage.
  admin.settings.miniprogramKnowledge.products.annualMembership.price = 0.01
  admin.settings.miniprogramKnowledge.products.annualMembership.enabled = false
  admin.settings.miniprogramKnowledge.products.city.enabled = true
  await admin.saveSettings('Fixture annual policy')
  assert.deepEqual(errors, [])
  assert.equal(admin.settings.miniprogramKnowledge.products.annualMembership.price, 199)
  assert.equal(admin.settings.miniprogramKnowledge.products.annualMembership.enabled, true)
  assert.equal(admin.settings.miniprogramKnowledge.products.city.enabled, false)
  await admin.loadDetailPage()
  assert.equal(admin.detailPage.sections.online.visible, true)
  assert.equal(admin.detailPage.sections.route.visible, false)
  admin.detailPage.sections.online.visible = false
  admin.detailPage.sections.expert.visible = true
  await admin.saveDetailPage()
  assert.equal(admin.detailPage.sections.online.visible, true)
  assert.equal(admin.detailPage.sections.expert.visible, false)
  admin.active = 'attractions'
  admin.openEditor(admin.data.attractions.find(row => row.id === 'fixture-attraction'), false)
  admin.form.__hideOnline = true
  await admin.saveEditor(true)
  assert.deepEqual(errors, [])
  assert.equal(admin.form.__hideOnline, false)
  assert.equal(admin.form.__hideRoute, true)
  assert.equal(admin.form.__hideExpert, true)
  const savedAttractions = (await jsonRequest('/api/admin/attractions', { headers: auth })).data
  assert.deepEqual(savedAttractions[0].sectionOverrides, { route: true, expert: true })
  admin.active = 'miniprogramUsers'
  const user = admin.data.miniprogramUsers.find(row => row.id === 'fixture-user')
  admin.editMembership(user)
  admin.membershipForm.type = 'annualMembership'
  admin.membershipForm.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0,10)
  await admin.saveMembershipOverride()
  assert.deepEqual(errors, [])
  const granted = admin.data.miniprogramUsers.find(row => row.id === 'fixture-user')
  assert.equal(granted.member, true)
  assert.equal(granted.memberLabel, '年会员')
  admin.editMembership(granted)
  assert.equal(admin.membershipForm.type, 'annualMembership')
  assert.equal(admin.membershipForm.expiresAt, granted.memberExpiresAt.slice(0,10))
  const savedFixture = JSON.parse(await readFile(fixturePath,'utf8'))
  assert.equal(savedFixture.settings.miniprogramKnowledge.products.annualMembership.price, 199)
  assert.deepEqual(savedFixture.attractions[0].sectionOverrides, { route: true, expert: true })
  assert.equal(savedFixture.miniprogramUsers[0].membershipOverride.type, 'annualMembership')
  assert.deepEqual(detail.hiddenSections, ['route','expert'])
  assert.ok(detail.audioGuides.every(track => track.unlockMode === 'membership'))
  assert.deepEqual(detail.routes, originalRoutes, 'route point IDs and their order stay unchanged')
  assert.deepEqual(detail.exhibits, originalExhibits, 'exhibit order stays unchanged')
  assert.equal(detail.audioGuides.find(row => row.id === 'route-guide').sort, 4)
  console.log('PASS: Vue create/edit/reopen and inline pin/unpin, annual settings/detail/attraction/member form saves and readback, boolean validation, restart persistence, public membership modes, unchanged route/exhibit/API order; isolated JSON fixture only')
} catch (error) {
  console.error(logs)
  throw error
} finally {
  try { if (admin) admin.$destroy() } finally {
    await stopServer()
    await rm(temp, { recursive: true, force: true })
  }
}
