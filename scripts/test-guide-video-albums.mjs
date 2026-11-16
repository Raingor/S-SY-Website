// 回归：人文影集专辑（guideVideoAlbums）后台 CRUD 与公开内容契约。
// 运行：node scripts/test-guide-video-albums.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const temp = await mkdtemp(join(tmpdir(), 'sy-guide-video-albums-'))
const listener = net.createServer()
await new Promise((r) => listener.listen(0, '127.0.0.1', r))
const port = listener.address().port
await new Promise((r) => listener.close(r))
const base = `http://127.0.0.1:${port}`

await mkdir(join(temp, 'seed'), { recursive: true })
for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'private-map.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs']) await cp(join(root, file), join(temp, file))
await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')
const fixture = syntheticContentFixture()
fixture.guideVideoAlbums = [
  { id: 'album-fixture', title: '漫游希腊', titleTw: '漫遊希臘', titleEn: 'Roaming Greece', description: '合成简介', cover: '/images/album-cover-fixture.webp', sort: 1, status: 'published', sections: [{ key: 'monuments', title: '文明遗迹', titleTw: '文明遺跡', titleEn: 'Ancient Monuments', sort: 1 }, { key: 'stories', title: '旅途人文', sort: 2 }] },
  { id: 'album-draft', title: '合成草稿专辑', status: 'unpublished', sections: [] },
]
fixture.guideVideos = [
  { id: 'video-fixture', category: 'attraction', attractionId: 'acropolis', albumId: 'album-fixture', section: 'monuments', episode: 1, title: '雅典卫城：山顶上的古希腊文明密码', description: '合成描述', cover: '/images/guide-cover-fixture.webp', ossKey: 'video/guide-acropolis.mp4', durationSeconds: 2375, status: 'published' },
  { id: 'video-humanities', category: 'humanities', albumId: 'album-fixture', section: 'stories', episode: 1, title: '希腊雅典值得打卡的好去处', description: '合成描述', ossKey: 'video/humanities.mp4', durationSeconds: 557, status: 'published' },
]
await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))

const password = '{{SECRET_bltmqvjs}}'
const server = spawn(process.execPath, ['server.mjs'], { cwd: temp, env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: password, SY_OSS_ACCESS_KEY_ID: 'test-key-id', SY_OSS_ACCESS_KEY_SECRET: 'test-key-secret', SY_OSS_BUCKET: 'sy-mpapp', SY_OSS_HOST: 'oss-cn-shenzhen.aliyuncs.com' }, stdio: ['ignore', 'pipe', 'pipe'] })
let log = ''
server.stderr.on('data', (c) => { log += c })
async function waitForServer() {
  for (let i = 0; i < 100; i += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return } catch {} await sleep(100) }
  throw new Error('server not ready: ' + log.slice(-600))
}
async function json(path, options = {}, token) {
  const r = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
  const body = r.status === 204 ? null : await r.json()
  return { status: r.status, body }
}
try {
  await waitForServer()
  const session = await json('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) })
  assert.equal(session.status, 200)
  const token = session.body.token

  // 1) Public album contract: published only, sorted, sections normalised, videos never nested.
  const content = (await json('/api/content')).body
  assert.equal(content.guideVideoAlbums.length, 1, 'unpublished albums stay hidden')
  const album = content.guideVideoAlbums[0]
  assert.equal(album.id, 'album-fixture')
  assert.equal(album.status, 'published')
  assert.equal(album.titleTw, '漫遊希臘')
  assert.equal(album.titleEn, 'Roaming Greece')
  assert.equal(album.cover, '/images/album-cover-fixture.webp')
  assert.equal(album.sort, 1)
  assert.equal(album.videos, undefined, 'albums never nest videos; clients join by albumId')
  assert.deepEqual(album.sections.map((s) => s.key), ['monuments', 'stories'])
  assert.deepEqual(album.sections[0], { key: 'monuments', title: '文明遗迹', sort: 1, titleTw: '文明遺跡', titleEn: 'Ancient Monuments' })
  assert.deepEqual(album.sections[1], { key: 'stories', title: '旅途人文', sort: 2, titleTw: '旅途人文', titleEn: '旅途人文' }, 'missing 三语 falls back to 简体')

  // 2) Public videos carry the album join fields used by the mini program.
  const acropolis = content.guideVideos.find((v) => v.id === 'video-fixture')
  assert.equal(acropolis.category, 'attraction')
  assert.equal(acropolis.attractionId, 'acropolis', '真人讲解保留独立景点入口')
  assert.equal(acropolis.albumId, '', 'legacy mixed albumId must not join the humanities album')
  assert.equal(acropolis.section, '')
  assert.equal(acropolis.episode, 0)
  assert.equal(acropolis.ossKey, undefined)
  const humanities = content.guideVideos.find((v) => v.id === 'video-humanities')
  assert.equal(humanities.albumId, 'album-fixture')
  assert.equal(humanities.section, 'stories')
  assert.equal(humanities.episode, 1)
  const attractionPatch = await json('/api/admin/guideVideos/video-fixture', { method: 'PATCH', body: JSON.stringify({ albumId: 'album-fixture', section: 'monuments', episode: 3 }) }, token)
  assert.equal(attractionPatch.status, 200)
  assert.equal(attractionPatch.body.albumId, '', 'admin save cannot reintroduce a cross-category join')
  assert.equal(attractionPatch.body.section, '')
  assert.equal(attractionPatch.body.episode, 0)
  const adminVideos = await json('/api/admin/guideVideos', {}, token)
  assert.equal(adminVideos.body.find((v) => v.id === 'video-fixture').albumId, '')
  const attractionCreated = await json('/api/admin/guideVideos', { method: 'POST', body: JSON.stringify({ id: 'new-attraction', category: 'attraction', title: '真人讲解', albumId: 'album-fixture', section: 'stories', episode: 9 }) }, token)
  assert.equal(attractionCreated.status, 201)
  assert.equal(attractionCreated.body.albumId, '', 'new attraction records cannot join humanities albums either')
  assert.equal(attractionCreated.body.section, '')
  assert.equal(attractionCreated.body.episode, 0)

  // 3) Admin list returns drafts too.
  const adminList = await json('/api/admin/guideVideoAlbums', {}, token)
  assert.equal(adminList.status, 200)
  assert.deepEqual(adminList.body.map((a) => a.id).sort(), ['album-draft', 'album-fixture'])

  // 4) Validation: album title is required; duplicate id rejected.
  const noTitle = await json('/api/admin/guideVideoAlbums', { method: 'POST', body: JSON.stringify({ id: 'album-bad', sections: [] }) }, token)
  assert.equal(noTitle.status, 422)
  assert.equal(noTitle.body.code, 'CONTENT_VALIDATION_FAILED')
  const duplicate = await json('/api/admin/guideVideoAlbums', { method: 'POST', body: JSON.stringify({ id: 'album-fixture', title: '重复' }) }, token)
  assert.equal(duplicate.status, 409)
  assert.equal(duplicate.body.code, 'DUPLICATE_ID')

  // 5) Create: status defaults to unpublished, section 三语 falls back to 简体.
  const created = await json('/api/admin/guideVideoAlbums', { method: 'POST', body: JSON.stringify({ id: 'album-new', title: '合成新专辑', sections: [{ key: 'islands', title: '海岛' }] }) }, token)
  assert.equal(created.status, 201)
  assert.equal(created.body.status, 'unpublished')
  assert.equal(created.body.sort, 0)
  assert.deepEqual(created.body.sections, [{ key: 'islands', title: '海岛', sort: 1, titleTw: '海岛', titleEn: '海岛' }])
  assert.equal((await json('/api/content')).body.guideVideoAlbums.length, 1, 'new draft album stays out of public content')

  // 6) Patch: publish the draft and rename a section.
  const patched = await json('/api/admin/guideVideoAlbums/album-new', { method: 'PATCH', body: JSON.stringify({ status: 'published', sort: 2, title: '合成新专辑 · 已发布', sections: [{ key: 'islands', title: '海岛慢行', titleEn: 'Island Hopping', sort: 1 }] }) }, token)
  assert.equal(patched.status, 200)
  assert.equal(patched.body.sections[0].titleEn, 'Island Hopping')
  const published = (await json('/api/content')).body.guideVideoAlbums
  assert.deepEqual(published.map((a) => a.id), ['album-fixture', 'album-new'], 'public albums are sorted by sort')
  assert.equal(published[1].sections[0].titleTw, '海岛慢行', 'traditional falls back to the简体 title when not translated')
  assert.equal((await json('/api/admin/guideVideoAlbums/album-missing', { method: 'PATCH', body: JSON.stringify({ title: 'x' }) }, token)).status, 404)

  // 7) Video patch keeps the album join fields owned by the album.
  const videoPatch = await json('/api/admin/guideVideos/video-humanities', { method: 'PATCH', body: JSON.stringify({ albumId: 'album-new', section: 'islands', episode: 2, titleEn: 'Best Things To Do in Athens Greece' }) }, token)
  assert.equal(videoPatch.status, 200)
  const patchedVideo = (await json('/api/content')).body.guideVideos.find((v) => v.id === 'video-humanities')
  assert.equal(patchedVideo.albumId, 'album-new')
  assert.equal(patchedVideo.section, 'islands')
  assert.equal(patchedVideo.episode, 2)

  // Category changes clear album join metadata without changing the independent video.
  const changedCategory = await json('/api/admin/guideVideos/video-humanities', { method: 'PATCH', body: JSON.stringify({ category: 'attraction', attractionId: 'acropolis' }) }, token)
  assert.equal(changedCategory.status, 200)
  assert.equal(changedCategory.body.albumId, '')
  assert.equal(changedCategory.body.section, '')
  assert.equal(changedCategory.body.episode, 0)

  // 8) Delete removes the album and its public entry.
  assert.equal((await json('/api/admin/guideVideoAlbums/album-new', { method: 'DELETE' }, token)).status, 204)
  assert.deepEqual((await json('/api/content')).body.guideVideoAlbums.map((a) => a.id), ['album-fixture'])

  console.log('PASS guide-video albums: public album contract (published/sorted/sections 三语), video album join fields, admin CRUD (validation, duplicate, defaults, patch, delete)')
} finally {
  server.kill('SIGTERM')
  await sleep(150)
  await rm(temp, { recursive: true, force: true })
}