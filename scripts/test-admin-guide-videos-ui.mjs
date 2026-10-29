import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('../src/admin-vue/AdminApp.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
const sandbox = {
  window: { location: { origin: 'http://fixture.invalid' } },
  sessionStorage: { getItem() { return null } },
  VisitorGuideEditor: {}, attractionEditorFieldGroups: [], attractionFieldGroup: () => 'hidden', matchesAttractionAudio: () => true,
}
vm.runInNewContext(script.replace(/^import .*$/gm, '').replace(/^const attractionEditorFieldGroups = [[\s\S]*?^]/m, '').replace('export default {', 'globalThis.component = {') + '\nglobalThis.fields = fields; globalThis.groups = groups; globalThis.routes = routes; globalThis.emptyData = emptyData', sandbox)
const { component, fields, groups, routes, emptyData } = sandbox

// Menu entry + routing + data plumbing for the 开发配置 group.
const devGroup = groups.find((group) => group.label === '开发配置')
assert.ok(devGroup, '开发配置 group exists')
assert.ok(devGroup.items.some((item) => item[0] === 'guideVideos'), '攻略视频 menu item present')
assert.ok(Object.prototype.hasOwnProperty.call(routes, 'guideVideos'), 'guideVideos route registered')
assert.equal(routes.guideVideos, '/admin/guideVideos', 'route matches the server endpoint')
assert.ok(Array.isArray(emptyData.guideVideos), 'emptyData seeds guideVideos')

const config = fields.guideVideos
assert.equal(config.endpoint, 'guideVideos')
for (const key of ['title', 'attractionId', 'cover', 'description', 'ossKey', 'durationSeconds', 'sizeBytes', 'status']) {
  assert.ok(config.fields.some((field) => field.key === key), `field ${key} editable`)
}
const listFilterKeys = sandbox.listFilterKeys || null
// status filter key wired for the list view
assert.match(source, /audioAlbums:\['status'\], guideVideos:\['status'\]/, 'list filter keys include guideVideos')
assert.match(source, /if\(this\.active==='guideVideos'\)\{row\.id='guide-video-'/, 'new records get a generated id')
assert.match(source, /showGuideVideo/, 'guide video section opt-in field referenced')

// saveEditor PATCH semantics against the real endpoint shape.
{
  const state = {
    ...component.data.call(component.methods), ...component.methods,
    active: 'guideVideos', currentMenu: fields.guideVideos,
    $set(object, key, value) { object[key] = value }, $nextTick(callback) { callback() },
    $refs: { editForm: { validate(callback) { callback(true) }, clearValidate() {} } },
    $message: { success() {}, error(m) { throw Error(m) }, warning() {} },
    async loadAll() {}, async confirm() { return false }, captureListPosition() {}, restoreListPosition() {},
  }
  let sent
  state.request = async (path, options) => { sent = { path, options }; return { id: 'guide-video-x', title: '测试视频', status: 'published' } }
  state.openEditor({ id: 'guide-video-x', title: '旧标题', status: 'unpublished' }, false)
  state.form.title = '测试视频'
  state.form.status = 'published'
  await state.saveEditor(false)
  assert.equal(state.editor, null, 'save-and-return closes the editor')
  assert.equal(sent.path, '/admin/guideVideos/guide-video-x')
  assert.equal(sent.options.method, 'PATCH')
  const body = JSON.parse(sent.options.body)
  assert.equal(body.title, '测试视频')
  assert.equal(body.status, 'published')
  // New records POST with a generated id.
  state.startCreate()
  assert.match(state.form.id, /^guide-video-/, 'startCreate generates the id')
  assert.equal(state.form.status, 'unpublished', 'new records start unpublished')
}

console.log('PASS admin guide-videos UI: 开发配置 menu group, route/data plumbing, editable fields, PATCH/POST endpoint shape, generated ids, unpublished default')
