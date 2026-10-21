import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('../src/admin-vue/AdminApp.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
const window = { location: { origin: 'http://fixture.invalid' }, scrollX: 0, scrollY: 0, scrollTo({ left, top }) { this.scrollX = left; this.scrollY = top } }
const sandbox = { window, sessionStorage: { getItem() { return null } } }
vm.runInNewContext(script.replace(/^import .*$/gm, '').replace('export default {', 'globalThis.component = {') + '\nglobalThis.fields = fields', sandbox)
const { component, fields } = sandbox
for (const key of ['sort', 'badgeType']) {
  assert.ok(fields.destinations.fields.some(field => field.key === key), `${key} must be an editable destination field`)
  assert.ok(fields.destinations.editorGroups.find(group => group.key === 'basic').fields.includes(key), `${key} must be visible in the destination basic tab`)
}
console.log('PASS destination sort and featured controls belong to a visible editor tab')

function fixture() {
  const ticks = []
  window.requestAnimationFrame = callback => ticks.push(callback)
  const state = {
    ...component.data.call(component.methods),
    ...component.methods,
    active: 'attractions',
    currentMenu: { label: '景点管理', endpoint: 'attractions', fields: [] },
    page: 4,
    pageSize: 20,
    filterText: '古城',
    filters: { status: 'published' },
    attractionView: 'destination',
    groupPages: { 'destination:athens': 3 },
    $set(object, key, value) { object[key] = value },
    $nextTick(callback) { ticks.push(callback) },
    $refs: { editForm: { clearValidate() {}, validate(callback) { callback(true) } } },
    $message: { success() {}, warning() {}, error(message) { throw Error(message) } },
    linkedDestinationIdsForAttraction() { return [] },
    async request() { return { id: 'fixture-attraction', name: '已修改景点' } },
    async syncAttractionDestinationLinks() {},
    async verifyAttractions() { list.documentTop += 180 },
    async loadAll() {},
  }
  let nodes = [{ scrollTop: 245, scrollLeft: 61 }, { scrollTop: 0, scrollLeft: 125 }]
  const list = { documentTop: 210, getBoundingClientRect() { return { top: this.documentTop - window.scrollY } }, querySelectorAll() { return nodes } }
  state.$el = { querySelector() { return list } }
  window.scrollX = 7; window.scrollY = 320
  return {
    state, list,
    remount() { nodes = nodes.map(() => ({ scrollTop: 0, scrollLeft: 0 })); window.scrollY = 1500 },
    flush() { while (ticks.length) ticks.shift()() },
    flushOne() { ticks.shift()?.() },
    assertRestored() {
      assert.equal(window.scrollX, 7)
      assert.equal(list.getBoundingClientRect().top, -110, 'list keeps its viewport position even if a publication panel was added above it')
      assert.deepEqual(nodes, [{ scrollTop: 245, scrollLeft: 61 }, { scrollTop: 0, scrollLeft: 125 }], 'vertical and horizontal list/table scrolling restored')
      assert.equal(state.page, 4)
      assert.equal(state.pageSize, 20)
      assert.equal(state.filterText, '古城')
      assert.equal(state.filters.status, 'published')
      assert.equal(state.attractionView, 'destination')
      assert.equal(state.groupPages['destination:athens'], 3)
    },
  }
}
const row = { id: 'fixture-attraction', name: '隔离测试景点', status: 'published' }

{
  const f = fixture()
  f.state.openEditor(row, false)
  f.flush()
  f.remount()
  f.state.form.name = '修改后的名称'
  await f.state.saveEditor(false)
  f.flush()
  assert.equal(f.state.editor, null)
  f.assertRestored()
  console.log('PASS save-and-return keeps filtered/grouped page and both scroll axes, allowing a new publication panel')
}
{
  const f = fixture()
  f.state.openEditor(row, false)
  f.flush()
  f.remount()
  await f.state.saveEditor(true)
  f.flush()
  assert.ok(f.state.editor, 'save-and-continue stays in editor')
  f.state.canLeaveEditor = async () => true
  await f.state.closeEditor()
  f.flush()
  f.assertRestored()
  console.log('PASS save-and-continue retains the original list position for a later return')
}
{
  const f = fixture()
  f.state.openEditor(row, false)
  f.flush()
  f.remount()
  f.state.canLeaveEditor = async () => false
  await f.state.closeEditor()
  f.flush()
  assert.ok(f.state.editor, 'declining discard keeps the editor and its return position')
  f.state.canLeaveEditor = async () => true
  await f.state.closeEditor()
  f.flush()
  f.assertRestored()
  assert.equal(f.state.editorListPosition, null, 'return state is consumed after restoration')
  console.log('PASS cancelled discard retains state; confirmed cancel restores the list')
}
{
  const f = fixture()
  f.state.openEditor(row, false)
  f.flush()
  f.remount()
  f.state.request = async () => { throw Error('fixture save failure') }
  f.state.$message.error = () => {}
  await f.state.saveEditor(false)
  assert.ok(f.state.editor, 'save failure must not close the editor')
  assert.ok(f.state.editorListPosition, 'save failure must not discard the return position')
  assert.equal(window.scrollY, 1500)
  console.log('PASS failed save does not leave the editor or lose the return position')
}
for (const changeMenu of [false, true]) {
  const f = fixture()
  f.state.openEditor(row, false)
  f.flush()
  f.remount()
  if (changeMenu) f.state.active = 'destinations'
  f.state.resetEditor(false)
  f.flush()
  assert.equal(window.scrollY, 1500, 'navigation/logout must not restore a discarded list position')
  assert.equal(f.state.editorListPosition, null)
}
{
  const f = fixture()
  f.state.openEditor(row, false)
  f.flush()
  f.remount()
  f.state.resetEditor()
  f.state.active = 'destinations'
  f.flush()
  assert.equal(window.scrollY, 1500, 'a delayed restoration must not affect a different menu')
  console.log('PASS navigation and stale callbacks cannot restore an unrelated list')
}
{
  const f = fixture()
  f.state.openEditor(row, false)
  f.flush()
  f.remount()
  f.state.resetEditor()
  f.flushOne()
  f.remount() // Element's initial layout may reset offsets after Vue's DOM update.
  f.flush()
  f.assertRestored()
  console.log('PASS restoration waits until the animation frame after the initial table layout')
}
{
  const f = fixture()
  f.state.active = 'destinations'
  f.state.currentMenu = fields.destinations
  f.state.confirmDestinationPublish = async () => true
  let sent
  f.state.request = async (_url, options) => { sent = JSON.parse(options.body); return { ...sent, id: 'fixture-destination' } }
  f.state.openEditor({ id: 'fixture-destination', name: '隔离测试目的地', status: 'unpublished', sort: null }, false)
  f.flush()
  assert.equal(f.state.form.sort, undefined, 'unset weight must stay blank instead of being clamped to the minimum')
  assert.equal(f.state.form.featured, false, 'legacy destinations without a badge remain ordinary')
  f.state.form.sort = 20
  f.state.form.badgeType = 'featured'
  await f.state.saveEditor(true)
  f.flush()
  assert.equal(sent.sort, 20)
  assert.equal(sent.featured, true)
  f.state.form.sort = undefined
  f.state.form.badgeType = 'none'
  await f.state.saveEditor(false)
  f.flush()
  assert.equal(sent.sort, null, 'clearing an existing weight must explicitly clear it on PATCH')
  assert.equal(sent.featured, false)
  f.state.startCreate()
  f.flush()
  assert.equal(f.state.form.sort, undefined, 'new destinations start without a configured weight')
  assert.equal(f.state.form.featured, false, 'new destinations must not become hot by default')
  console.log('PASS destination optional weight round-trip, explicit clearing and safe new/legacy badge defaults')
}
