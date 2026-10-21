// 隔离回归：目的地角标后台普通表单、图片上传及 settings 公开透传。
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import vm from 'node:vm'
import sharp from 'sharp'

const root = fileURLToPath(new URL('..', import.meta.url))
const source = await readFile(join(root, 'src/admin-vue/AdminApp.vue'), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
const sandbox = {
  window: { location: { origin: 'http://fixture.invalid' } },
  sessionStorage: { getItem() { return null } },
  FileReader: class { readAsDataURL() { this.result = 'data:image/png;base64,fixture'; this.onload() } },
}
vm.runInNewContext(script.replace(/^import .*$/gm, '').replace('export default {', 'globalThis.component = {'), sandbox)
const { component } = sandbox
const plain = value => JSON.parse(JSON.stringify(value))
const blank = { featured: { text: '', textTw: '', textEn: '', icon: '' }, hiddenGem: { text: '', textTw: '', textEn: '', icon: '' } }
const state = () => ({
  ...component.data.call(component.methods), ...component.methods, token: 'fixture',
  $set(object, key, value) { object[key] = value },
  $message: { success() {}, error(message) { throw Error(message) } },
})
const fields = state()
assert(fields.settingTabs.some(tab => tab.name === 'destinationBadges' && tab.label === '目的地角标'))
assert(source.includes("v-else-if=\"tab.name==='destinationBadges'\""))
assert(source.includes(`:label="badge.label+'简体文案'"`), 'Element UI input label prop must reach native aria-label')
for (const key of ['text', 'textTw', 'textEn', 'icon']) assert(source.includes(`settings.destinationBadges[badge.key].${key}`), `${key} has a visible standard field`)
for (const legacy of [undefined, null, [], '', { featured: null, hiddenGem: [] }]) assert.deepEqual(plain(fields.destinationBadgeSettings(legacy)), blank)
const partial = { featured: { text: '推荐', textEn: null, extra: 'keep' }, future: { marker: true } }
const original = JSON.stringify(partial)
const normalized = fields.destinationBadgeSettings(partial)
assert.equal(normalized.featured.text, '推荐')
assert.equal(normalized.featured.textEn, '')
assert.equal(normalized.featured.extra, 'keep')
assert.equal(normalized.future.marker, true)
assert.equal(JSON.stringify(partial), original, 'hydration must not mutate API objects')
const hydration = state()
const requests = []
hydration.request = async (path, options) => { requests.push({ path, options }); return path === '/admin/settings' ? { siteName: 'fixture', destinationBadges: partial } : { items: [] } }
await hydration.loadAll()
assert.equal(hydration.settings.destinationBadges.featured.text, '推荐')
assert.equal(hydration.settings.destinationBadges.hiddenGem.icon, '')
assert(requests.every(request => !request.options?.method), 'opening settings must only read')
console.log('PASS visible fields, legacy/partial defaults and read-only hydration')

const upload = state()
const posted = []
upload.request = async (path, options) => { posted.push({ path, input: JSON.parse(options.body) }); return { path: 'images/uploaded.webp', url: '/images/uploaded.webp' } }
const req = () => ({ file: { type: 'image/png', name: 'icon.png', size: 10 }, onSuccess() {}, onError(error) { throw error } })
upload.settings.ogImage = 'images/original-og.webp'
await upload.uploadImage(req(), 'destination-badge-featured', upload.settings.destinationBadges.featured, 'icon')
assert.equal(upload.settings.destinationBadges.featured.icon, '/images/uploaded.webp')
assert.equal(posted[0].input.updateSettings, false)
assert.equal(posted[0].input.prefix, 'destination-badge-featured')
assert.equal(upload.settings.ogImage, 'images/original-og.webp')
assert.deepEqual(plain(upload.form), {})
await upload.uploadImage(req(), 'image')
assert.equal(upload.form.image, 'images/uploaded.webp', 'existing form uploads unchanged')
await upload.uploadImage(req(), 'og')
assert.equal(upload.settings.ogImage, 'images/uploaded.webp', 'existing OG upload unchanged')
console.log('PASS badge upload target isolation, canonical URL and existing image upload behavior')

const tempRoot = await mkdtemp(join(tmpdir(), 'sy-destination-badges-'))
await mkdir(join(tempRoot, 'seed'))
for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs', 'seed/content-demo.json']) await cp(join(root, file), join(tempRoot, file))
await symlink(join(root, 'node_modules'), join(tempRoot, 'node_modules'), 'dir')
const fixture = { settings: { siteName: 'Badge fixture', ogImage: 'images/original-og.webp', unrelatedFixture: { keep: true } }, countries: [{ id: 'greece', name: '希腊', enabled: true }] }
for (const key of ['cities', 'destinations', 'attractions', 'routes', 'audioRoutes', 'audioTracks', 'audioAlbums', 'sampleItineraries', 'customTrips', 'leads', 'guides', 'destinationTypes', 'guideBookings', 'miniProgramBookings', 'miniprogramUsers', 'miniprogramOrders', 'miniprogramTravelers', 'miniprogramDocuments', 'miniprogramCoupons', 'homeBanners', 'miniprogramBanners', 'miniprogramServiceEntries', 'heritageGuideBanners']) fixture[key] = []
await writeFile(join(tempRoot, 'seed/site-data.json'), JSON.stringify(fixture), { mode: 0o600 })
const port = await new Promise((resolve, reject) => {
  const socket = net.createServer()
  socket.once('error', reject)
  socket.listen(0, '127.0.0.1', () => { const { port } = socket.address(); socket.close(error => error ? reject(error) : resolve(port)) })
})
const base = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['server.mjs'], { cwd: tempRoot, env: { ...process.env, PORT: String(port), SY_STORAGE: 'json', SY_SKIP_STARTUP_SAVE: '1', SY_ADMIN_PASSWORD: 'badge-fixture-password' }, stdio: ['ignore', 'pipe', 'pipe'] })
let log = ''
server.stdout.on('data', chunk => { log += chunk })
server.stderr.on('data', chunk => { log += chunk })
try {
  let ready = false
  for (let i = 0; i < 80; i += 1) { try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break } } catch {} await sleep(100) }
  assert(ready, `isolated JSON server failed: ${log}`)
  const initial = await (await fetch(`${base}/api/content`)).json()
  assert.equal(initial.settings.destinationBadges, undefined, 'legacy API remains compatible without writing defaults')
  const unauthorized = await fetch(`${base}/api/admin/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  assert.equal(unauthorized.status, 401)
  const login = await (await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'badge-fixture-password' }) })).json()
  assert(login.token)
  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` }
  const patch = async value => {
    const response = await fetch(`${base}/api/admin/settings`, { method: 'PATCH', headers: auth, body: JSON.stringify(value) })
    assert.equal(response.status, 200)
    return response.json()
  }
  const config = { featured: { text: '人气推荐', textTw: '人氣推薦', textEn: 'Popular', icon: '' }, hiddenGem: { text: '私藏秘境', textTw: '私藏秘境', textEn: 'Hidden gem', icon: './images/gem.webp' } }
  await patch({ destinationBadges: config })
  const saved = await (await fetch(`${base}/api/admin/settings`, { headers: auth })).json()
  assert.deepEqual(saved.destinationBadges, config)
  assert.equal(saved.siteName, 'Badge fixture')
  assert.deepEqual(saved.unrelatedFixture, { keep: true })
  for (const language of ['zh-CN', 'zh-TW', 'en']) {
    const content = await (await fetch(`${base}/api/content?country=greece&lang=${language}`)).json()
    assert.deepEqual(content.settings.destinationBadges, config, 'public settings preserve all locales and relative image path')
  }
  const png = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 220, g: 165, b: 50, alpha: 1 } } }).png().toBuffer()
  const imageResponse = await fetch(`${base}/api/admin/upload-image`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'badge.png', type: 'image/png', data: `data:image/png;base64,${png.toString('base64')}`, prefix: 'destination-badge-featured', updateSettings: false }) })
  assert.equal(imageResponse.status, 201)
  const image = await imageResponse.json()
  assert(image.url.startsWith('/images/'))
  const beforeSave = await (await fetch(`${base}/api/admin/settings`, { headers: auth })).json()
  assert.equal(beforeSave.ogImage, 'images/original-og.webp', 'badge upload must not replace OG image')
  assert.deepEqual(beforeSave.destinationBadges, config, 'upload must not persist settings before explicit save')
  config.featured.icon = image.url
  await patch({ destinationBadges: config })
  const icon = await fetch(`${base}${image.url}`)
  assert.equal(icon.status, 200)
  assert.match(icon.headers.get('content-type'), /^image\//)
  assert((await icon.arrayBuffer()).byteLength > 0)
  config.hiddenGem.icon = 'https://example.invalid/icon.png'
  await patch({ destinationBadges: config })
  assert.deepEqual((await (await fetch(`${base}/api/content`)).json()).settings.destinationBadges, config, 'HTTPS icons pass through without backend fetching')
  await patch({ siteName: 'Unrelated settings update' })
  assert.deepEqual((await (await fetch(`${base}/api/admin/settings`, { headers: auth })).json()).destinationBadges, config, 'unrelated updates preserve badges')
  const cleared = plain(blank)
  await patch({ destinationBadges: cleared })
  assert.deepEqual((await (await fetch(`${base}/api/content`)).json()).settings.destinationBadges, cleared, 'clear resets locale/icon fields for client fallback')
  assert.deepEqual(JSON.parse(await readFile(join(tempRoot, 'seed/site-data.json'), 'utf8')).settings.destinationBadges, cleared, 'settings persisted only in isolated fixture')
  console.log('PASS isolated JSON auth, save/readback, 3 locales, relative/HTTPS icons, upload, clear and public passthrough')
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    const exited = once(server, 'exit')
    server.kill('SIGTERM')
    await exited
  }
  await rm(tempRoot, { recursive: true, force: true })
}
