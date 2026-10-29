// 回归：音频资源 OSS 化（磁盘不再保留时的兼容契约）。
// 运行：node scripts/test-audio-oss-migration.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, symlink, unlink, writeFile } from 'node:fs/promises'
import http from 'node:http'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { spawnSync } from 'node:child_process'
import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'


const root = resolve(new URL('..', import.meta.url).pathname)
const temp = await mkdtemp(join(tmpdir(), 'sy-audio-oss-'))
const listener = net.createServer()
await new Promise((r) => listener.listen(0, '127.0.0.1', r))
const port = listener.address().port
await new Promise((r) => listener.close(r))
const base = `http://127.0.0.1:${port}`

// Minimal mock of the private OSS surface: PUT stores, GET serves bytes with Range echo.
// A real, decodable MP3 so uploadPrivateAudio's ffprobe accepts the upload.
const mp3 = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=16000:duration=65', '-c:a', 'libmp3lame', '-b:a', '32k', '-f', 'mp3', 'pipe:1'], { maxBuffer: 4 * 1024 * 1024 }).stdout
assert(mp3.length > 10000, 'ffmpeg failed to synthesize the fixture audio')

const objects = new Map()
const mock = http.createServer((req, res) => {
  const key = decodeURIComponent(req.url.split('?')[0].replace(/^\/+/, ''))
  if (req.method === 'PUT') {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => { objects.set(key, Buffer.concat(chunks)); res.writeHead(200); res.end() })
  } else if (req.method === 'GET') {
    const body = objects.get(key)
    if (!body) { res.writeHead(404); res.end(); return }
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '')
    if (range) {
      const start = Number(range[1]); const end = range[2] ? Number(range[2]) : body.length - 1
      res.writeHead(206, { 'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Content-Length': String(end - start + 1) })
      res.end(body.subarray(start, end + 1))
    } else { res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': String(body.length) }); res.end(body) }
  } else { res.writeHead(405); res.end() }
})
await new Promise((r) => mock.listen(0, '127.0.0.1', r))
const mockPort = mock.address().port
// The migration has already copied the existing audio into OSS: seed the mock store.
objects.set('audio/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mp3', mp3)
objects.set('audio/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-preview.m4a', Buffer.alloc(96, 1))

await mkdir(join(temp, 'seed'), { recursive: true })
for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'private-map.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs']) await cp(join(root, file), join(temp, file))
await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')
const fixture = syntheticContentFixture()
fixture.audioUploads = [{ audioFile: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mp3', previewFile: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-preview.m4a', durationSeconds: 30, previewSeconds: 30 }]
fixture.audioTracks = [{ id: 'track-oss', category: 'online', title: 'OSS 迁移测试', attractionId: 'acropolis', status: 'published', unlockMode: 'membership', previewSeconds: 30, audioFile: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mp3', previewFile: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-preview.m4a', durationSeconds: 30 }]
await mkdir(join(temp, 'private-audio'), { recursive: true })
// Local copies for the disk-first baseline: a tiny MP3 and a stub preview.
await writeFile(join(temp, 'private-audio/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mp3'), mp3)
await writeFile(join(temp, 'private-audio/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-preview.m4a'), Buffer.alloc(96, 1))
await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))

const server = spawn(process.execPath, ['server.mjs'], { cwd: temp, env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: '{{SECRET_k4naxu0v}}', SY_MINIPROGRAM_SIMULATION_ENABLED: 'true', SY_MINIPROGRAM_SIMULATION_SECRET: '{{SECRET_m2oqrvu0}}', SY_OSS_ACCESS_KEY_ID: 'test-id', SY_OSS_ACCESS_KEY_SECRET: '{{SECRET_v0pihwcy}}', SY_OSS_ENDPOINT: `http://127.0.0.1:${mockPort}` }, stdio: ['ignore', 'pipe', 'pipe'] })
let log = ''
server.stderr.on('data', (c) => { log += c })
async function waitForServer() {
  for (let i = 0; i < 100; i += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return } catch {} await sleep(100) }
  throw new Error('server not ready: ' + log.slice(-600))
}
async function raw(path, options = {}) { return fetch(base + path, options) }
try {
  await waitForServer()

  // Baseline: local file present → disk-first streaming still wins, bytes identical.
  const guides = (await (await raw('/api/content')).json()).attractionDetails.acropolis.audioGuides
  assert.equal(guides.length, 1, 'track listed with local file')
  const first = await raw('/api/miniprogram/audio/track-oss/preview', { headers: { Range: 'bytes=0-15' } })
  assert.equal(first.status, 206)

  // Simulate the migration: remove local files; the manifest must keep the track public.
  const privateDir = join(temp, 'private-audio')
  await unlink(join(privateDir, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mp3'))
  await unlink(join(privateDir, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-preview.m4a'))
  const after = (await (await raw('/api/content')).json()).attractionDetails.acropolis.audioGuides
  assert.equal(after.length, 1, 'manifest-aware check keeps the track listed without local files')

  // Preview now proxies from OSS: 206 + bytes + Content-Range passthrough.
  const proxied = await raw('/api/miniprogram/audio/track-oss/preview', { headers: { Range: 'bytes=0-15' } })
  assert.equal(proxied.status, 206, 'OSS proxy serves 206')
  assert.equal(proxied.headers.get('content-range'), 'bytes 0-15/96')
  const bytes = Buffer.from(await proxied.arrayBuffer())
  assert.equal(bytes.length, 16)

  // Upload endpoint syncs to OSS and frees the local copy.
  const login = await (await raw('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: '{{SECRET_k4naxu0v}}' }) })).json()
  const auth = { 'Content-Type': 'audio/mpeg', Authorization: `Bearer ${login.token}`, 'X-File-Name': 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.mp3', 'X-Preview-Seconds': '30' }
  const up = await raw('/api/admin/upload-audio', { method: 'POST', headers: auth, body: mp3 })
  const upload = await up.json()
  assert.equal(up.status, 201, JSON.stringify(upload))
  await sleep(200)
  let gone = true
  for (const name of [upload.audioFile, upload.previewFile]) {
    try { await (await import('node:fs/promises')).access(join(privateDir, name)); gone = false } catch {}
  }
  assert.ok(gone, 'local copies freed after OSS sync')
  assert(objects.has('audio/' + upload.audioFile) && objects.has('audio/' + upload.previewFile), 'both files stored in OSS under audio/ prefix')

  // A track referencing the OSS-only upload is valid and immediately playable.
  const createdTrack = await raw('/api/admin/audioTracks', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` }, body: JSON.stringify({ id: 'track-new', category: 'online', title: 'OSS-only 新曲目', attractionId: 'acropolis', status: 'published', unlockMode: 'membership', previewSeconds: upload.previewSeconds, audioFile: upload.audioFile, previewFile: upload.previewFile, durationSeconds: upload.durationSeconds }) })
  assert.equal(createdTrack.status, 201, JSON.stringify(await createdTrack.json()))
  const contentFinal = (await (await raw('/api/content')).json()).attractionDetails.acropolis.audioGuides
  const created = contentFinal.find((t) => t.id === 'track-new')
  assert(created, 'new track listed after OSS-only upload')
  const createdPreview = await raw(`/api/miniprogram/audio/${created.id}/preview`, { headers: { Range: 'bytes=0-15' } })
  assert.equal(createdPreview.status, 206)

  console.log('PASS audio OSS migration: manifest-aware listing without local files, OSS proxy with Range passthrough, upload syncs to OSS and frees local copies, new uploads immediately playable.')
} finally {
  server.kill('SIGTERM')
  mock.close()
  await rm(temp, { recursive: true, force: true })
}
