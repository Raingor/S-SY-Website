// 回归：公开试听音频从 OSS 公读前缀直接下发（绝对 URL + immutable + Range），
// 付费原片仍走私有 OSS / 签名路径；OSS 未配置时保持站内相对路径回退。
// 运行：node scripts/test-public-audio-oss.mjs
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import http from 'node:http'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { copyPublicAudioFromPrivateOss, isPublicAudioExcerpt, ossPublicMediaBase, publicAudioUrl, PUBLIC_AUDIO_CACHE_CONTROL } from '../heritage-content.mjs'
import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)

// 1) 纯函数契约：默认公读基址、非法文件名、缓存策略常量。
process.env.SY_OSS_ACCESS_KEY_ID = 'id'
process.env.SY_OSS_ACCESS_KEY_SECRET = 'secret'
process.env.SY_OSS_BUCKET = 'demo-bucket'
process.env.SY_OSS_HOST = 'oss-example.aliyuncs.com'
delete process.env.SY_OSS_ENDPOINT
assert.equal(ossPublicMediaBase(), 'https://demo-bucket.oss-example.aliyuncs.com/public')
const trackName = 'a'.repeat(32) + '-preview.m4a'
assert.equal(publicAudioUrl(trackName), `https://demo-bucket.oss-example.aliyuncs.com/public/audio/${trackName}`)
assert.equal(publicAudioUrl('selected-routes-intro.m4a'), 'https://demo-bucket.oss-example.aliyuncs.com/public/audio/selected-routes-intro.m4a', '历史可读文件名仍可公开')
assert.equal(publicAudioUrl('../etc/passwd.m4a'), null, '路径穿越必须被拒')
assert.equal(publicAudioUrl('a/b.m4a'), null, '不允许子路径')
assert.equal(publicAudioUrl('notes.txt'), null, '非音频扩展名被拒')
assert.equal(PUBLIC_AUDIO_CACHE_CONTROL, 'public, max-age=31536000, immutable')
// 只有短试听（和显式白名单的引导音频）允许进公读前缀，正片必须私有。
assert.equal(isPublicAudioExcerpt('acropolis-guide-preview-60s-74cb88c5.m4a'), true)
assert.equal(isPublicAudioExcerpt('de12f7f1f5561f93831784819d52adda-preview.m4a'), true)
assert.equal(isPublicAudioExcerpt('selected-routes-intro.m4a'), true)
assert.equal(isPublicAudioExcerpt('acropolis-guide-30min-74cb88c5.mp3'), false, '43MB 正片不得公读')

// 2) 端到端：模拟 OSS（私有 + 公读前缀），验证上传公读对像带 immutable ACL 与正确字节。
const temp = await mkdtemp(join(tmpdir(), 'sy-public-audio-'))
const listener = net.createServer()
await new Promise((r) => listener.listen(0, '127.0.0.1', r))
const port = listener.address().port
await new Promise((r) => listener.close(r))
const base = `http://127.0.0.1:${port}`

const mp3 = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=16000:duration=65', '-c:a', 'libmp3lame', '-b:a', '32k', '-f', 'mp3', 'pipe:1'], { maxBuffer: 8 * 1024 * 1024 }).stdout
assert(mp3.length > 10000, 'ffmpeg failed to synthesize the fixture audio')

const objects = new Map()
const puts = []
const mock = http.createServer((req, res) => {
  const key = decodeURIComponent(req.url.split('?')[0].replace(/^\/+/, ''))
  const chunks = []
  if (req.method === 'PUT' || req.method === 'POST') {
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      if (req.headers['x-oss-copy-source']) {
        const source = String(req.headers['x-oss-copy-source']).replace(/^\/[^/]+\//, '')
        const body = objects.get(source)
        if (!body) { res.writeHead(404); res.end(); return }
        objects.set(key, body)
        puts.push({ key, headers: { 'cache-control': req.headers['cache-control'], 'x-oss-object-acl': req.headers['x-oss-object-acl'], copy: true } })
        res.writeHead(200, { 'Content-Type': 'application/xml' })
        res.end('<?xml version="1.0" encoding="UTF-8"?><CopyObjectResult><ETag>"x"</ETag></CopyObjectResult>')
        return
      }
      const body = Buffer.concat(chunks)
      objects.set(key, body)
      puts.push({ key, headers: { 'cache-control': req.headers['cache-control'], 'x-oss-object-acl': req.headers['x-oss-object-acl'] } })
      res.writeHead(200); res.end()
    })
    return
  }
  const body = objects.get(key)
  if (!body) { res.writeHead(404); res.end(); return }
  if (req.method === 'HEAD') { res.writeHead(200, { 'Content-Length': String(body.length), 'Cache-Control': 'public, max-age=31536000, immutable' }); res.end(); return }
  const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '')
  if (range) {
    const start = Number(range[1]); const end = range[2] ? Number(range[2]) : body.length - 1
    res.writeHead(206, { 'Content-Type': 'audio/mp4', 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Content-Length': String(end - start + 1) })
    res.end(body.subarray(start, end + 1))
    return
  }
  res.writeHead(200, { 'Content-Type': 'audio/mp4', 'Content-Length': String(body.length) }); res.end(body)
})
await new Promise((r) => mock.listen(0, '127.0.0.1', r))
const mockPort = mock.address().port
// 脚本侧（非子进程）也指向 mock，便于直接验证 copy 迁移与公读基址。
process.env.SY_OSS_ENDPOINT = `http://127.0.0.1:${mockPort}`
assert.equal(ossPublicMediaBase(), `http://127.0.0.1:${mockPort}/public`)
const previewFile = 'b'.repeat(32) + '-preview.m4a'
const audioFile = 'b'.repeat(32) + '.mp3'
objects.set(`public/audio/${previewFile}`, Buffer.alloc(96, 5))

await mkdir(join(temp, 'seed'), { recursive: true })
await mkdir(join(temp, 'public/audio'), { recursive: true })
for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'private-map.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs']) await cp(join(root, file), join(temp, file))
await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')
const fixture = syntheticContentFixture()
fixture.audioUploads = [{ audioFile, previewFile, durationSeconds: 30, previewSeconds: 30, storage: 'oss' }]
fixture.audioTracks = [{ id: 'track-public', category: 'online', title: 'OSS 公开试听', attractionId: 'acropolis', status: 'published', unlockMode: 'membership', previewSeconds: 30, audioFile, previewFile, durationSeconds: 30 }]
// 首页试听：本地片段 + 配置指向站内路径（后台写入时应转成 OSS 绝对地址）。
const localPreview = 'f'.repeat(32) + '-preview.m4a'
const fullRecording = 'acropolis-guide-30min-fixture.mp3'
await writeFile(join(temp, 'public/audio', localPreview), Buffer.alloc(512, 7))
await writeFile(join(temp, 'public/audio', fullRecording), Buffer.alloc(4096, 9))
fixture.home = { ...(fixture.home || {}), audioPreview: { kind: 'guide-audio', attractionId: 'acropolis', sourceAudioId: 'acropolis-guide-30min', previewUrl: `/audio/${localPreview}`, previewSeconds: 60, enabled: true } }
await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))

const server = spawn(process.execPath, ['server.mjs'], {
  cwd: temp,
  env: {
    PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), SY_STORAGE: 'json',
    SY_ADMIN_PASSWORD: '{{SECRET_k4naxu0v}}',
    SY_OSS_ACCESS_KEY_ID: 'test-id', SY_OSS_ACCESS_KEY_SECRET: '{{SECRET_v0pihwcy}}', SY_OSS_BUCKET: 'demo-bucket',
    SY_OSS_ENDPOINT: `http://127.0.0.1:${mockPort}`,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let log = ''
server.stderr.on('data', (chunk) => { log += chunk })
async function waitForServer() {
  for (let i = 0; i < 100; i += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return } catch {} await sleep(100) }
  throw new Error('server not ready: ' + log.slice(-800))
}
async function json(path, options = {}) {
  const response = await fetch(base + path, options)
  return { status: response.status, data: await response.json().catch(() => null), response }
}

try {
  await waitForServer()
  const publicBase = `http://127.0.0.1:${mockPort}/public`

  // 曲目试听：站内 HTML 接口绝对 URL 指向 OSS 公读前缀。
  const content = await json('/api/content')
  const track = content.data.attractionDetails.acropolis.audioGuides.find((item) => item.id === 'track-public')
  assert(track, 'track must stay listed')
  assert.equal(track.previewUrl, `${publicBase}/audio/${previewFile}`, '公开试听必须返回 OSS 绝对 URL')
  assert.equal(content.data.home.audioPreview.previewUrl, `${publicBase}/audio/${localPreview}`, '首页试听必须返回 OSS 绝对 URL')

  // 后台写入站内路径 → 自动上传到公读前缀并回填绝对地址。
  const login = await json('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: '{{SECRET_k4naxu0v}}' }) })
  const patched = await json('/api/admin/home-audio-preview', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.data.token}` },
    body: JSON.stringify({ previewUrl: `/audio/${localPreview}`, kind: 'guide-audio', attractionId: 'acropolis', sourceAudioId: 'acropolis-guide-30min', previewSeconds: 60, enabled: true }),
  })
  assert.equal(patched.status, 200, JSON.stringify(patched.data))
  assert.equal(patched.data.audioPreview.previewUrl, `${publicBase}/audio/${localPreview}`, '后台保存后应持久化 OSS 绝对地址')
  assert.equal(patched.data.published.previewUrl, `${publicBase}/audio/${localPreview}`)
  const homeAudios = puts.filter((entry) => entry.key === `public/audio/${localPreview}`)
  assert(homeAudios.length, '首页片段必须上传到公读前缀')
  for (const entry of homeAudios) {
    assert.equal(entry.headers['cache-control'], PUBLIC_AUDIO_CACHE_CONTROL, '公读对象必须带 immutable 缓存')
    assert.equal(entry.headers['x-oss-object-acl'], 'public-read', '公读对象必须是 public-read')
  }
  assert.deepEqual(objects.get(`public/audio/${localPreview}`), Buffer.alloc(512, 7), '公读对象字节必须与本地片段一致')

  // 幂等：再次 PATCH 同一个 OSS 绝对地址不应重复上传或失败。
  const again = await json('/api/admin/home-audio-preview', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.data.token}` },
    body: JSON.stringify({ previewUrl: `${publicBase}/audio/${localPreview}` }),
  })
  assert.equal(again.status, 200)
  assert.equal(again.data.published.previewUrl, `${publicBase}/audio/${localPreview}`)

  // 私有原片仍在私有前缀，且公读前缀里不存在原片。
  const authorize = await json('/api/miniprogram/audio/track-public/access')
  assert.equal(authorize.data.previewUrl, `${publicBase}/audio/${previewFile}`, 'access 也应回传 OSS 试听地址')
  assert.equal(authorize.data.access, 'preview')
  assert(!objects.has(`public/audio/${audioFile}`), '完整原片不得复制到公读前缀')

  // 完整录音绝不公读：后台把正片设为首页试听直接 422，且不会上传到公读前缀。
  const rejected = await json('/api/admin/home-audio-preview', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.data.token}` },
    body: JSON.stringify({ previewUrl: `/audio/${fullRecording}`, kind: 'guide-audio', attractionId: 'acropolis', sourceAudioId: 'acropolis-guide-30min', previewSeconds: 60, enabled: true }),
  })
  assert.equal(rejected.status, 422, JSON.stringify(rejected.data))
  assert.equal(rejected.data.code, 'PUBLIC_AUDIO_EXCERPT_REQUIRED')
  assert(!objects.has(`public/audio/${fullRecording}`), '完整录音不得进入公读前缀')
  assert.equal((await json('/api/content')).data.home.audioPreview.previewUrl, `${publicBase}/audio/${localPreview}`, '被拒的写入不得篡改已生效配置')

  // 新上传：完整音频进私有、试听进公读。
  const upload = await fetch(`${base}/api/admin/upload-audio`, { method: 'POST', headers: { 'Content-Type': 'audio/mpeg', Authorization: `Bearer ${login.data.token}`, 'X-File-Name': 'c'.repeat(32) + '.mp3', 'X-Preview-Seconds': '30' }, body: mp3 })
  const uploaded = await upload.json()
  assert.equal(upload.status, 201, JSON.stringify(uploaded))
  await sleep(200)
  assert(objects.has(`audio/${uploaded.audioFile}`), '完整音频必须写入私有前缀')
  assert(objects.has(`public/audio/${uploaded.previewFile}`), '试听必须写入公读前缀')
  const publicPut = puts.find((entry) => entry.key === `public/audio/${uploaded.previewFile}`)
  assert.equal(publicPut.headers['cache-control'], PUBLIC_AUDIO_CACHE_CONTROL)
  assert.equal(publicPut.headers['x-oss-object-acl'], 'public-read')

  // 运维脚本：私有已有试听时以复制方式补齐公读前缀。
  const copied = await copyPublicAudioFromPrivateOss('d'.repeat(32) + '-preview.m4a')
  assert.equal(copied, false, '私有对象缺失时复制应安全失败')
  objects.set(`audio/${'e'.repeat(32)}-preview.m4a`, Buffer.alloc(64, 3))
  const copiedOk = await copyPublicAudioFromPrivateOss(`${'e'.repeat(32)}-preview.m4a`)
  assert.equal(copiedOk, true, '私有对象存在时应复制成功')
  assert.deepEqual(objects.get(`public/audio/${'e'.repeat(32)}-preview.m4a`), Buffer.alloc(64, 3))

  // Range 仍由 OSS 提供：模拟 CDN 直接 206。
  const direct = await fetch(`${publicBase}/audio/${previewFile}`, { headers: { Range: 'bytes=0-3' } })
  assert.equal(direct.status, 206)
  assert.equal(direct.headers.get('content-range'), 'bytes 0-3/96')

  console.log('PASS public audio on OSS: absolute public URLs for excerpts, immutable + public-read objects, private originals stay private, home preview auto-published, copy migration verified, Range passthrough intact')
} finally {
  server.kill('SIGTERM')
  mock.close()
  await rm(temp, { recursive: true, force: true })
}