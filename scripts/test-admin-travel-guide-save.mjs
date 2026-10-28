import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import vm from 'node:vm'
import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const source = await readFile(join(root, 'src/admin-vue/AdminApp.vue'), 'utf8')
const sandbox = {
  window: { location: { origin: 'http://fixture.invalid' } },
  sessionStorage: { getItem() { return null } },
  VisitorGuideEditor: {}, attractionEditorFieldGroups: [], attractionFieldGroup: () => 'hidden', matchesAttractionAudio: () => true,
}
vm.runInNewContext(source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default {', 'globalThis.component = {') + '\nglobalThis.fields = fields', sandbox)
const { component, fields } = sandbox
const clone = value => JSON.parse(JSON.stringify(value))
const temp = await mkdtemp(join(tmpdir(), 'sy-admin-travel-save-'))
const listener = net.createServer()
await new Promise(resolveListen => listener.listen(0, '127.0.0.1', resolveListen))
const port = listener.address().port
await new Promise(resolveClose => listener.close(resolveClose))
const base = `http://127.0.0.1:${port}`
const fixture = syntheticContentFixture()
const entry = { id: 'fixture-travel-entry', key: 'travel-guide', enabled: true, sort: 6, title: { 'zh-CN': '合成入口', 'zh-TW': '合成入口繁體', en: 'Fixture entry' }, subtitle: { 'zh-CN': '合成入口副标题', 'zh-TW': '合成入口副標題', en: 'Fixture entry subtitle' }, iconImage: 'miniprogram-service-icons/entry-travel-guide.svg' }
fixture.miniprogramServiceEntries = [entry]
fixture.travelGuide = {
  enabled: true, kicker: 'SYNTHETIC GUIDE', title: '合成正文标题', titleTw: '合成正文繁體', titleEn: 'Fixture guide', subtitle: '合成正文副标题', subtitleTw: '繁體副標題', subtitleEn: 'Fixture subtitle',
  sections: [{ key: 'dynamic-section', kicker: 'SECTION', title: '合成分组', titleTw: '繁體分組', titleEn: 'Fixture section', intro: '合成导语', cards: [
    { key: 'dynamic-card', mark: '甲', source: 'fixture', title: '合成卡片', titleTw: '繁體卡片', titleEn: 'Fixture card', desc: '合成描述', points: ['合成要点'], pointsTw: ['繁體要點'], pointsEn: ['Fixture point'] },
  ] }], docs: {},
}
fixture.settings.travelGuideDocs = {}
await mkdir(join(temp, 'seed'))
await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))
for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'private-map.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs']) await cp(join(root, file), join(temp, file))
await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')
let child
let token
let log = ''
async function start() {
  child = spawn(process.execPath, ['server.mjs'], { cwd: temp, env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: 'synthetic-admin-save-only' }, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.on('data', chunk => { log += chunk })
  child.stderr.on('data', chunk => { log += chunk })
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(`${base}/api/health`)).ok) return } catch {}
    if (child.exitCode !== null) throw new Error(`isolated server exited: ${log.slice(-1000)}`)
    await new Promise(resolveWait => setTimeout(resolveWait, 100))
  }
  throw new Error(`isolated server not ready: ${log.slice(-1000)}`)
}
async function stop() { if (child?.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit') } }
async function request(path, options = {}) {
  const response = await fetch(`${base}/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`)
  return body
}
async function editor() {
  const calls = [], messages = { success: [], error: [], warning: [] }
  const state = {
    ...component.data.call(component.methods), ...component.methods,
    active: 'miniprogramServiceEntries', currentMenu: fields.miniprogramServiceEntries,
    $set(object, key, value) { object[key] = value }, $nextTick(callback) { callback() },
    $refs: { editForm: { validate(callback) { callback(true) }, clearValidate() {} } },
    $message: Object.fromEntries(Object.keys(messages).map(key => [key, message => messages[key].push(message)])),
    captureListPosition() {}, restoreListPosition() {}, refreshTravelDocLibrary() {},
    async loadAll() {}, async confirm() { return false },
    async request(path, options) { calls.push({ path, options }); return request(path, options) },
  }
  Object.defineProperty(state, 'editorDirty', { get() { return component.computed.editorDirty.call(state) } })
  await state.loadTravelGuide()
  state.openEditor(entry, false)
  calls.length = 0
  assert.equal(state.editorDirty, false, 'loading/opening must not mark the editor dirty')
  return { state, calls, messages }
}
try {
  await start()
  token = (await request('/auth/login', { method: 'POST', body: JSON.stringify({ password: 'synthetic-admin-save-only' }) })).token
  for (const mode of ['return', 'continue', 'dedicated']) {
    const { state, calls, messages } = await editor()
    state.form.title['zh-CN'] = `入口-${mode}`
    state.travelGuide.title = `正文-${mode}`
    state.travelGuide.sections[0].cards[0].title = `卡片-${mode}`
    state.travelGuide.sections[0].cards[0].points = [`要点-${mode}`]
    state.travelGuide.docs['dynamic-card'] = `/docs/fixture-${mode}.pdf`
    assert.equal(state.editorDirty, true)
    if (mode === 'dedicated') await state.saveTravelGuide()
    else await state.saveEditor(mode === 'continue')
    assert.deepEqual(calls.filter(call => call.options?.method === 'PATCH').map(call => call.path), ['/admin/travel-guide', '/admin/miniprogram-service-entries/fixture-travel-entry'])
    assert.equal(messages.error.length, 0, JSON.stringify(messages.error))
    assert.deepEqual(messages.success, ['入口资料、出行指南正文及文档配置已保存'])
    assert.equal(Boolean(state.editor), mode !== 'return')
    assert.equal(state.busy, false)
    if (state.editor) assert.equal(state.editorDirty, false, 'successful save updates both baselines')
    const content = await request('/content?includeAttractionDetails=false')
    assert.equal(content.travelGuide.title, `正文-${mode}`)
    assert.equal(content.travelGuide.sections[0].cards[0].title, `卡片-${mode}`)
    assert.equal(content.travelGuide.titleTw, '合成正文繁體', 'existing translations are preserved')
    assert.equal(content.travelGuide.sections[0].cards[0].titleEn, 'Fixture card')
    assert.equal(content.settings.travelGuideDocs['dynamic-card'], `/docs/fixture-${mode}.pdf`)
    assert.equal(content.miniprogramServiceEntries[0].title['zh-CN'], `入口-${mode}`)
    const disk = JSON.parse(await readFile(join(temp, 'seed/site-data.json'), 'utf8'))
    assert.equal(disk.travelGuide.title, `正文-${mode}`, 'content persisted, not just returned from memory')
    console.log(`PASS ${mode}: real HTTP saves entry + body + docs and preserves translations`)
  }
  {
    const { state, calls, messages } = await editor()
    const oldGuide = await request('/admin/travel-guide')
    state.travelGuide.sections = []
    await state.saveEditor(false)
    assert.ok(state.editor, '422 must keep the editor open')
    assert.equal(state.editorDirty, true)
    assert.equal(messages.success.length, 0)
    assert.ok(messages.error[0].includes('至少需要 1 个分组'))
    assert.deepEqual(calls.map(call => call.path), ['/admin/travel-guide'], 'entry must not be saved after guide validation fails')
    assert.deepEqual(await request('/admin/travel-guide'), oldGuide)
    assert.equal(state.busy, false)
    console.log('PASS guide validation failure keeps edits and never reports overall success')
  }
  {
    const { state, calls, messages } = await editor()
    state.$refs.editForm.validate = callback => callback(false)
    await state.saveTravelGuide()
    assert.equal(calls.length, 0, 'invalid entry must not trigger any content write')
    assert.equal(messages.success.length, 0)
    state.$refs.editForm.validate = callback => callback(true)
    state.travelGuide = null
    await state.saveEditor(false)
    assert.equal(calls.length, 0, 'unloaded guide cannot be silently skipped')
    assert.ok(messages.error[0].includes('尚未加载'))
    assert.ok(state.editor)
    console.log('PASS entry validation and guide loading guard stop every write')
  }
  {
    const { state, messages } = await editor()
    state.travelGuide.title = '部分保存正文'
    state.form.title['zh-CN'] = '失败的入口'
    const originalRequest = state.request
    state.request = async (path, options) => {
      if (path.includes('/miniprogram-service-entries/')) throw new Error('fixture entry transport failure')
      return originalRequest(path, options)
    }
    await state.saveEditor(false)
    assert.ok(state.editor)
    assert.equal(messages.success.length, 0)
    assert.ok(messages.error[0].includes('正文及文档已保存，但入口资料未确认保存'))
    assert.equal((await request('/admin/travel-guide')).title, '部分保存正文')
    state.request = originalRequest
    await state.saveEditor(true)
    assert.equal(messages.success.length, 1, 'partial failure can be safely retried')
    assert.equal(state.editorDirty, false)
    console.log('PASS partial entry failure is explicit, stays open and retries successfully')
  }
  {
    const { state } = await editor()
    const baseline = state.travelGuideBaseline
    state.travelGuide.docs['dynamic-card'] = '/docs/unsaved.pdf'
    assert.equal(state.editorDirty, true, 'document-only edits trigger discard protection')
    assert.equal(await state.canLeaveEditor(), false, 'cancelled discard keeps content')
    assert.equal(state.travelGuide.docs['dynamic-card'], '/docs/unsaved.pdf')
    state.confirm = async () => true
    await state.closeEditor()
    assert.equal(state.editor, null)
    assert.equal(JSON.stringify(state.travelGuide), baseline, 'confirmed discard restores saved content in cache')
    state.openEditor(entry, false)
    state.travelGuide.title = '切换菜单未保存'
    state.active = 'overview'
    state.resetEditor(false)
    assert.equal(JSON.stringify(state.travelGuide), baseline, 'menu navigation also discards the old cached guide')
    console.log('PASS content/docs dirty guard and confirmed discard prevent stale cached edits')
  }
  {
    const { state, calls } = await editor()
    state.form.key = 'guide'
    state.embeddedService = ''
    state.editor.rowId = 'fixture-unrelated'
    state.request = async (path, options) => { calls.push({ path, options }); return JSON.parse(options.body) }
    await state.saveEditor(false)
    assert.ok(calls.every(call => call.path !== '/admin/travel-guide'), 'unrelated service entry must not save cached guide content')
    console.log('PASS unrelated service entry never writes guide content')
  }
  await stop()
  await start()
  assert.equal((await request('/content')).travelGuide.title, '部分保存正文', 'save survives a server restart')
  console.log('PASS isolated save survives restart; no production/local payload was used')
} finally {
  await stop()
  await rm(temp, { recursive: true, force: true })
}
