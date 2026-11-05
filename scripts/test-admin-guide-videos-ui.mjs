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
vm.runInNewContext(script.replace(/^import .*$/gm, '').replace(/^const attractionEditorFieldGroups = [[\s\S]*?^]/m, '').replace('export default {', 'globalThis.component = {') + '\nglobalThis.fields = fields; globalThis.groups = groups; globalThis.routes = routes; globalThis.emptyData = emptyData; globalThis.imageGuidanceByField = imageGuidanceByField', sandbox)
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
assert.match(config.miniProgramDisplay, /独立「视频讲解」板块/, 'guide videos use an independent section')
assert.match(config.miniProgramDisplay, /封面公开展示，未购买也可查看/, 'cover visibility does not require purchase')
assert.match(config.miniProgramDisplay, /视频播放仍需单独购买/, 'cover visibility does not unlock playback')
assert.match(sandbox.imageGuidanceByField['guideVideos.cover'], /封面公开展示/, 'cover upload hint states public visibility')
assert.match(sandbox.imageGuidanceByField['guideVideos.cover'], /必须再点「保存」才生效/, 'cover changes still require saving')
assert.doesNotMatch(config.miniProgramDisplay + sandbox.imageGuidanceByField['guideVideos.cover'], /不展示封面|未购买.*只展示锁头/, 'obsolete locked-cover copy is gone')
assert.match(config.fields.find((field) => field.key === 'attractionId').help, /独立.*「视频讲解」/, 'association hint points to the independent video section')

for (const key of ['category', 'sort', 'title', 'titleTw', 'titleEn', 'attractionId', 'cover', 'description', 'descriptionTw', 'descriptionEn', 'ossKey', 'durationSeconds', 'sizeBytes', 'status']) {
  assert.ok(config.fields.some((field) => field.key === key), `field ${key} editable`)
}
assert.deepEqual(Array.from(config.fields.find((field) => field.key === 'category').options, (option) => option.value), ['attraction', 'humanities'])
const associationField = config.fields.find((field) => field.key === 'attractionId')
assert.equal(associationField.type, 'select', 'API association is one attraction ID')
assert.equal(associationField.clearable, true, 'humanities can clear the association')
assert.match(config.miniProgramDisplay, /希腊人文影集.*无需关联景点/)
assert.match(source, /填写简体标题与简介后.*一键翻译/, 'video editor exposes one-click translation from Simplified Chinese')
const listFilterKeys = sandbox.listFilterKeys || null
// status filter key wired for the list view
assert.match(source, /audioAlbums:\['status'\], guideVideos:\['status'\]/, 'list filter keys include guideVideos')
assert.match(source, /if\(this\.active==='guideVideos'\)\{row\.id='guide-video-'/, 'new records get a generated id')
assert.doesNotMatch(config.fields.find((field) => field.key === 'attractionId').help, /showGuideVideo/, 'independent video guidance does not require the retired section opt-in')

// Image guidance copy matches the real display containers.
const guidanceChecks = [
  ["'homeBanners.image':'建议 1080×1080 px（1:1 方图）", 'home banner hint is a 1:1 square'],
  ["'miniprogramBanners.image':'建议 1080×1080 px（1:1 方图）", 'mini program banner hint is a 1:1 square'],
  ["'guideVideos.cover':'建议 1920×1080 px（16:9 横图）", 'video cover hint states 16:9'],
  ['必须再点「保存」才生效', 'video cover guidance warns that saving is required'],
  ['图片已上传，记得点「保存」后生效', 'upload success toast mentions saving'],
  ['duration:8000,showClose:true', 'upload failures stay visible long enough to read'],
]
for (const [needle, label] of guidanceChecks) assert.ok(source.includes(needle), label)
assert.doesNotMatch(source, /1200×1440|5:6 竖图/, 'the old portrait banner hint is gone')

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
  assert.equal(state.form.category, 'attraction', 'new records default to attraction category')
  assert.equal(state.form.attractionId, '', 'single association starts empty')
  state.form.category = 'humanities'
  state.form.title = '希腊人文影集'
  state.form.titleTw = '希臘人文影集'
  state.form.titleEn = 'Greek Humanities'
  state.form.sort = 20
  await state.saveEditor(false)
  const humanPayload = JSON.parse(sent.options.body)
  assert.equal(sent.options.method, 'POST')
  assert.equal(humanPayload.category, 'humanities')
  assert.equal(humanPayload.attractionId, '')
  assert.equal(humanPayload.sort, 20)
  assert.equal(humanPayload.titleEn, 'Greek Humanities')
  state.openEditor({ id: 'legacy-video', title: '旧视频', attractionId: 'acropolis' }, false)
  assert.equal(state.form.category, 'attraction', 'legacy records get a visible default category')
  assert.equal(state.form.sort, 0)
  assert.equal(state.form.attractionId, 'acropolis', 'opening a legacy association retains a scalar ID')
}

// The shared home-banner collection must expose the jump target the operators set via API.
{
  const makeState = () => {
    const notices = []
    const state = { ...component.methods, active: 'guideVideos', editor: {}, busy: false, aiTranslating: false, form: { title: '希腊人文', description: '历史与艺术', titleTw: '旧繁体标题', titleEn: 'Old title', descriptionTw: '旧繁体简介', descriptionEn: 'Old description' }, $set(target, key, value) { target[key] = value }, $message: Object.fromEntries(['success','warning','error'].map((kind) => [kind, (text) => notices.push({ kind, text })])) }
    return { state, notices }
  }
  const { state, notices } = makeState()
  const sent = []
  state.request = async (path, options) => {
    assert.equal(path, '/admin/text-translation')
    const text = JSON.parse(options.body).text; sent.push(text)
    return text === '希腊人文' ? { tw: '希臘人文', en: 'Greek humanities' } : { tw: '歷史與藝術', en: 'History and art' }
  }
  await state.translateRecordFields()
  assert.deepEqual(sent, ['希腊人文', '历史与艺术'])
  assert.equal(state.form.titleTw, '希臘人文'); assert.equal(state.form.titleEn, 'Greek humanities')
  assert.equal(state.form.descriptionTw, '歷史與藝術'); assert.equal(state.form.descriptionEn, 'History and art')
  assert.equal(state.aiTranslating, false)
  assert.equal(notices.at(-1).kind, 'success')
  for (const mode of ['sourceChanged','editorChanged','requestFailed','missingTranslation']) {
    const { state, notices } = makeState()
    const original = { titleTw: state.form.titleTw, titleEn: state.form.titleEn, descriptionTw: state.form.descriptionTw, descriptionEn: state.form.descriptionEn }
    let calls = 0
    state.request = async () => {
      calls++
      if (mode === 'sourceChanged') state.form.description = '编辑期间更改的简介'
      if (mode === 'editorChanged') state.editor = {}
      if (mode === 'requestFailed' && calls === 2) throw new Error('translation unavailable')
      return mode === 'missingTranslation' ? { tw: '只有繁体' } : { tw: '译文', en: 'Translation' }
    }
    await state.translateRecordFields()
    for (const [key, value] of Object.entries(original)) assert.equal(state.form[key], value, mode + ' preserves previous translations')
    assert.equal(state.aiTranslating, false)
    assert(['warning','error'].includes(notices.at(-1).kind))
  }
  const empty = makeState(); empty.state.form = { title: '', description: '' }
  empty.state.request = async () => assert.fail('empty source must not request translation')
  await empty.state.translateRecordFields(); assert.equal(empty.notices.at(-1).kind, 'warning')
}

{
  const state = { ...component.methods, busy: false, editor: {}, form: { ossKey: 'video/original.mp4', durationSeconds: 30, sizeBytes: 200 }, $set(target, key, value) { target[key] = value }, $message: { success() {} }, readVideoDuration: async () => 65, notifyUploadError() {} }
  const file = { name: 'fixture.mp4', size: 5 * 1024 * 1024 + 128, slice(start, end) { return { size: end - start } } }
  const paths = [], progress = []
  let transientFailure = true, uploaded, failed
  state.request = async (path, options) => {
    paths.push(path)
    if (path === '/admin/media-uploads') {
      const input = JSON.parse(options.body)
      assert.equal(input.kind, 'video'); assert.equal(input.durationSeconds, 65)
      return { id: 'fixture-task', partSize: 5 * 1024 * 1024, partCount: 2 }
    }
    if (path.endsWith('/parts/1') && transientFailure) { transientFailure = false; throw Object.assign(new Error('OSS unavailable'), { status: 502 }) }
    if (path.endsWith('/complete')) return { storage: 'oss', ossKey: 'video/new.mp4', sizeBytes: file.size, durationSeconds: 65 }
    return {}
  }
  await state.uploadVideo({ file, onProgress(value) { progress.push(value.percent) }, onSuccess(value) { uploaded = value }, onError(error) { failed = error } })
  assert.equal(failed, undefined)
  assert.equal(uploaded.storage, 'oss')
  assert.equal(state.form.ossKey, 'video/new.mp4')
  assert.equal(state.form.durationSeconds, 65)
  assert.equal(state.form.sizeBytes, file.size)
  assert.equal(paths.filter((path) => path.endsWith('/parts/1')).length, 2, 'transient part failure is retried')
  assert(paths.every((path) => path.startsWith('/admin/media-uploads')), 'upload does not save the content record')
  assert(progress.length === 2 && progress.at(-1) === 99)
  assert.equal(state.busy, false)
  const original = JSON.stringify(state.form)
  const failurePaths = []
  state.request = async (path) => {
    failurePaths.push(path)
    if (path === '/admin/media-uploads') return { id: 'failed-task', partSize: 5 * 1024 * 1024, partCount: 2 }
    if (path.includes('/parts/')) throw Object.assign(new Error('Invalid part'), { status: 422 })
    return null
  }
  await state.uploadVideo({ file, onSuccess() { assert.fail('failed upload cannot succeed') }, onError(error) { failed = error } })
  assert.equal(failed.status, 422)
  assert.equal(failurePaths.filter((path) => path.includes('/parts/')).length, 1, 'validation failures are not retried')
  assert(failurePaths.includes('/admin/media-uploads/failed-task'), 'failed task is aborted')
  assert.equal(JSON.stringify(state.form), original, 'failure preserves the original video')
  state.form = { previewSeconds: 30 }
  state.request = async (path, options) => {
    if (path === '/admin/media-uploads') { assert.equal(JSON.parse(options.body).kind, 'audio'); return { id: 'audio-task', partSize: 1024, partCount: 1 } }
    if (path.endsWith('/complete')) return { storage: 'oss', audioFile: 'full.mp3', previewFile: 'preview.m4a', durationSeconds: 65, previewSeconds: 29 }
    return {}
  }
  await state.uploadAudio({ file: { name: 'fixture.mp3', size: 100, slice() { return {} } }, onSuccess() {}, onError(error) { throw error } })
  assert.equal(state.form.audioFile, 'full.mp3')
  assert.equal(state.form.previewFile, 'preview.m4a')
  assert.equal(state.form.previewSeconds, 29)
}

for (const menu of ['homeBanners', 'miniprogramBanners']) {
  const bannerFields = fields[menu].fields.map((field) => field.key)
  assert.ok(bannerFields.includes('link'), `${menu} exposes the link field`)
}
assert.ok(source.includes('小程序首页只有排序最前的第一张 Banner 响应点击'), 'link help states the first-banner-only client rule')
assert.ok(fields.homeBanners.columns.some((column) => column[0] === 'link'), 'banner list shows the jump target')

console.log('PASS admin guide-videos UI: 开发配置 menu group, route/data plumbing, editable fields, PATCH/POST endpoint shape, generated ids, unpublished default')
