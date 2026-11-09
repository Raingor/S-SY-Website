import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'
import { createMockPrivateOss } from './helpers/mock-private-oss.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const temp = await mkdtemp(join(tmpdir(), 'sy-media-oss-'))
const oss = await createMockPrivateOss()
let child, token, base, logs = ''
await mkdir(join(temp, 'seed'))
for (const file of ['server.mjs','storage.mjs','admin-session.mjs','heritage-content.mjs','private-map.mjs','attraction-ai-fill.mjs','wechat-pay.mjs']) await cp(join(root, file), join(temp, file))
await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')
await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(syntheticContentFixture()))
const privateDir = join(temp, 'custom-audio-temp')
async function start(withOss = true) {
  const listener = net.createServer()
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve))
  const port = listener.address().port
  await new Promise((resolve) => listener.close(resolve))
  base = `http://127.0.0.1:${port}`
  child = spawn(process.execPath, ['server.mjs'], { cwd: temp, env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: 'fixture-media-password', SY_AUDIO_PRIVATE_DIR: privateDir, ...(withOss ? oss.env : {}) }, stdio: ['ignore','pipe','pipe'] })
  child.stderr.on('data', (chunk) => { logs += chunk })
  for (let index = 0; index < 100; index++) { try { if ((await fetch(base + '/api/health')).ok) break } catch {} await sleep(50) }
  token = (await request('/api/auth/login', 'POST', { password: 'fixture-media-password' }, false)).body.token
}
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const done = new Promise((resolve) => child.once('exit', resolve))
  child.kill('SIGTERM'); await done
}
async function request(path, method = 'GET', value, auth = true) {
  const binary = Buffer.isBuffer(value)
  const response = await fetch(base + path, { method, headers: { ...(auth ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': binary ? 'application/octet-stream' : 'application/json' }, ...(value === undefined ? {} : { body: binary ? value : JSON.stringify(value) }) })
  return { status: response.status, body: response.status === 204 ? null : await response.json() }
}
const video = Buffer.alloc(5 * 1024 * 1024 + 128, 1)
video.writeUInt32BE(24, 0); video.write('ftypisom', 4)
const videoInput = { kind: 'video', name: 'fixture.mp4', type: 'video/mp4', sizeBytes: video.length, durationSeconds: 65 }
async function create(input = videoInput) {
  const response = await request('/api/admin/media-uploads', 'POST', input)
  assert.equal(response.status, 201, JSON.stringify(response.body)); return response.body
}
async function upload(task, bytes) {
  for (let number = 1; number <= task.partCount; number++) {
    const response = await request(`/api/admin/media-uploads/${task.id}/parts/${number}`, 'PUT', bytes.subarray((number - 1) * task.partSize, number * task.partSize))
    assert.equal(response.status, 200, JSON.stringify(response.body))
  }
}
try {
  await start()
  assert.equal((await request('/api/admin/media-uploads', 'POST', videoInput, false)).status, 401)
  assert.equal((await request('/api/admin/media-uploads', 'POST', { ...videoInput, sizeBytes: 2 * 1024 ** 3 + 1 })).status, 422)
  assert.equal((await request('/api/admin/media-uploads', 'POST', { ...videoInput, name: 'fixture.exe' })).status, 422)
  const task = await create()
  assert.equal(task.partSize, 5 * 1024 * 1024); assert.equal(task.partCount, 2)
  assert.equal((await request(`/api/admin/media-uploads/${task.id}/complete`, 'POST', {})).status, 422)
  assert.equal((await request(`/api/admin/media-uploads/${task.id}/parts/0`, 'PUT', video)).status, 422)
  assert.equal((await request(`/api/admin/media-uploads/${task.id}/parts/1`, 'PUT', Buffer.alloc(task.partSize))).status, 422)
  assert.equal((await request(`/api/admin/media-uploads/${task.id}/parts/2`, 'PUT', Buffer.alloc(1))).status, 422)
  oss.control.failPart = true
  assert.equal((await request(`/api/admin/media-uploads/${task.id}/parts/1`, 'PUT', video.subarray(0, task.partSize))).status, 502)
  oss.control.failPart = false
  await upload(task, video)
  oss.control.completeError = true
  assert.equal((await request(`/api/admin/media-uploads/${task.id}/complete`, 'POST', {})).status, 502, 'HTTP 200 OSS error XML is not success')
  oss.control.completeError = false; oss.control.wrongHeadSize = true
  assert.equal((await request(`/api/admin/media-uploads/${task.id}/complete`, 'POST', {})).status, 502, 'verify merged object size')
  oss.control.wrongHeadSize = false
  const completed = await request(`/api/admin/media-uploads/${task.id}/complete`, 'POST', {})
  assert.equal(completed.status, 201)
  assert.equal(completed.body.storage, 'oss')
  assert.match(completed.body.ossKey, /^video\/[a-f0-9]{32}\.mp4$/)
  assert.equal(completed.body.sizeBytes, video.length)
  assert.deepEqual(oss.objects.get(completed.body.ossKey).body, video)
  assert.equal(oss.objects.get(completed.body.ossKey).acl, 'private')
  assert.deepEqual((await request(`/api/admin/media-uploads/${task.id}/complete`, 'POST', {})).body, completed.body, 'completion can be retried without duplicate objects')
  const published = await request('/api/admin/guideVideos', 'POST', { id: 'uploaded-humanities', category: 'humanities', title: 'Synthetic humanities', status: 'published', ...completed.body })
  assert.equal(published.status, 201)
  const publicVideo = (await request('/api/content', 'GET', undefined, false)).body.guideVideos[0]
  assert.equal(publicVideo.ossKey, undefined)
  assert.equal((await request(publicVideo.accessUrl, 'GET', undefined, false)).body.playUrl, undefined)
  const aborted = await create()
  await request(`/api/admin/media-uploads/${aborted.id}/parts/1`, 'PUT', video.subarray(0, aborted.partSize))
  assert.equal((await request(`/api/admin/media-uploads/${aborted.id}`, 'DELETE')).status, 204)
  assert.equal(oss.uploads.size, 0, 'abort removes incomplete OSS parts')

  const audio = spawnSync('ffmpeg', ['-v','error','-f','lavfi','-i','sine=frequency=440:duration=170','-c:a','libmp3lame','-b:a','320k','-f','mp3','pipe:1'], { maxBuffer: 10 * 1024 * 1024 }).stdout
  assert(audio.length > task.partSize, 'audio fixture covers multiple bounded requests')
  const audioInput = { kind: 'audio', name: 'fixture.mp3', type: 'audio/mpeg', sizeBytes: audio.length, previewSeconds: 30 }
  const audioTask = await create(audioInput)
  await upload(audioTask, audio)
  const audioComplete = await request(`/api/admin/media-uploads/${audioTask.id}/complete`, 'POST', {})
  assert.equal(audioComplete.status, 201, JSON.stringify(audioComplete.body))
  assert.equal(audioComplete.body.storage, 'oss')
  assert(audioComplete.body.previewSeconds <= 30)
  assert(oss.objects.has('audio/' + audioComplete.body.audioFile))
  assert(oss.objects.has('audio/' + audioComplete.body.previewFile))
  assert.deepEqual(await readdir(privateDir), [], 'configured temporary audio directory is emptied')
  const before = JSON.parse(await readFile(join(temp, 'seed/site-data.json'), 'utf8')).audioUploads.length
  const failedAudio = await create(audioInput)
  await upload(failedAudio, audio)
  oss.control.failPreview = true
  assert.equal((await request(`/api/admin/media-uploads/${failedAudio.id}/complete`, 'POST', {})).status, 502)
  oss.control.failPreview = false
  await request(`/api/admin/media-uploads/${failedAudio.id}`, 'DELETE')
  assert.equal(JSON.parse(await readFile(join(temp, 'seed/site-data.json'), 'utf8')).audioUploads.length, before, 'failed OSS audio is not registered')
  assert.deepEqual(await readdir(privateDir), [], 'failed audio does not remain on disk')
  assert(oss.requests.filter((entry) => entry.query.includes('partNumber')).every((entry) => entry.size <= 5 * 1024 * 1024))
  assert(oss.requests.filter((entry) => entry.method === 'PUT' && !entry.query).every((entry) => entry.acl === 'private'))
  await stop(); await start(false)
  assert.equal((await request('/api/admin/media-uploads', 'POST', videoInput)).status, 503)
  assert.equal((await request('/api/admin/upload-audio', 'POST', {})).status, 503, 'unconfigured OSS never falls back to local storage')
  console.log('PASS OSS video/audio: signed private multipart, bounded parts, retry/abort/idempotence, final size check, error XML rejection, audio preview/cleanup, no local fallback, public playback stays protected')
} catch (error) { console.error(logs); throw error }
finally { await stop(); oss.server.closeAllConnections(); await new Promise((resolve) => oss.server.close(resolve)); await rm(temp, { recursive: true, force: true }) }
