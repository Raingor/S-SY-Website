import { createHmac } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { createMockPrivateOss } from './helpers/mock-private-oss.mjs'

async function availablePort() {
  const server = net.createServer()
  await new Promise((resolveListen, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolveListen))
  const { port } = server.address()
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
  return port
}

const root = resolve(new URL('..', import.meta.url).pathname)
const tempRoot = await mkdtemp(join(tmpdir(), 'sy-image-upload-webp-'))
const port = await availablePort()
let memberId = ''
const base = `http://127.0.0.1:${port}`
let child
let oss
let ossEnv = {}

function assert(condition, message) { if (!condition) throw new Error(message) }
const filenameOf = (value) => String(value || '').split('/').pop()

async function prepare() {
  oss = await createMockPrivateOss()
  ossEnv = oss.env
  await mkdir(join(tempRoot, 'seed'), { recursive: true })
  for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'private-map.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs']) {
    await writeFile(join(tempRoot, file), await readFile(join(root, file)))
  }
  const fixture = JSON.parse(await readFile(join(root, 'seed/site-data.json'), 'utf8'))
  const fixtureUser = (fixture.miniprogramUsers || []).find((user) => user.id)
  if (!fixtureUser) throw new Error('fixture must contain at least one miniprogram user')
  memberId = fixtureUser.id
  await writeFile(join(tempRoot, 'seed/site-data.json'), JSON.stringify(fixture))
  await writeFile(join(tempRoot, 'seed/content-demo.json'), await readFile(join(root, 'seed/content-demo.json')))
  await mkdir(join(tempRoot, 'public/images'), { recursive: true })
  await symlink(join(root, 'node_modules'), join(tempRoot, 'node_modules'), 'dir')
}

function start() {
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: tempRoot,
    env: { ...process.env, ...ossEnv, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: 'test-admin-password', SY_MINIPROGRAM_TOKEN_SECRET: 'test-token-secret' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stderr.on('data', (chunk) => process.stderr.write(String(chunk)))
  return child
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server exited before ready (${child.exitCode})`)
    try {
      const response = await fetch(`${base}/api/health`)
      if (response.ok) return
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
  }
  throw new Error('server did not start')
}

async function login() {
  const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test-admin-password' }) })
  assert(response.ok, 'admin login should succeed')
  const { token } = await response.json()
  return token
}

async function upload(token, dataUrl, prefix) {
  const response = await fetch(`${base}/api/admin/upload-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data: dataUrl, prefix, updateSettings: false }),
  })
  const payload = await response.json().catch(() => ({}))
  return { status: response.status, payload }
}

function runtimeImage(name) {
  return readFile(join(tempRoot, 'public/images', name))
}

async function stop() {
  if (child) {
    child.kill('SIGTERM')
    await new Promise((resolveExit) => child.once('exit', resolveExit))
  }
}

try {
  await prepare()
  start()
  await waitForServer()
  const token = await login()

  const pngBuffer = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#204060' } }).png().toBuffer()
  const jpgBuffer = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#604020' } }).jpeg({ quality: 90 }).toBuffer()
  const webpBuffer = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#206040' } }).webp().toBuffer()

  const pngUpload = await upload(token, `data:image/png;base64,${pngBuffer.toString('base64')}`, 'testpng')
  assert(pngUpload.status === 201, `PNG upload should succeed (got ${pngUpload.status})`)
  assert(pngUpload.payload.path.endsWith('.webp'), `PNG should be stored as webp, got ${pngUpload.payload.path}`)
  assert(pngUpload.payload.path.startsWith(`${ossEnv.SY_OSS_ENDPOINT}/public/images/`), `PNG should be published to OSS, got ${pngUpload.payload.path}`)
  assert(pngUpload.payload.storage === 'oss', `PNG upload should report OSS storage, got ${pngUpload.payload.storage}`)
  const pngName = filenameOf(pngUpload.payload.path)
  const pngStored = await runtimeImage(pngName)
  const pngMeta = await sharp(pngStored).metadata()
  assert(pngMeta.format === 'webp', `stored PNG upload should be webp, got ${pngMeta.format}`)
  assert(Math.max(pngMeta.width, pngMeta.height) <= 1920, `long edge should be capped at 1920, got ${pngMeta.width}x${pngMeta.height}`)
  assert(statSync(join(tempRoot, 'public/images', pngName)).size < pngBuffer.length, 'webp output should be smaller than source png')
  const pngOssObject = oss.objects.get(`public/images/${pngName}`)
  assert(pngOssObject?.acl === 'public-read', 'PNG OSS object should be public-read')
  assert(pngOssObject?.cacheControl?.includes('immutable'), 'PNG OSS object should keep the immutable cache header')
  assert(pngOssObject?.type === 'image/webp', `PNG OSS object should be image/webp, got ${pngOssObject?.type}`)
  const publicPng = await fetch(pngUpload.payload.path)
  assert(publicPng.ok, `public PNG URL should be anonymously readable (got ${publicPng.status})`)
  assert(publicPng.headers.get('content-type') === 'image/webp', `public PNG URL content-type should be image/webp, got ${publicPng.headers.get('content-type')}`)
  assert(Buffer.compare(Buffer.from(await publicPng.arrayBuffer()), pngStored) === 0, 'public PNG bytes should match the local copy')

  const jpgUpload = await upload(token, `data:image/jpeg;base64,${jpgBuffer.toString('base64')}`, 'testjpg')
  assert(jpgUpload.status === 201, `JPEG upload should succeed`)
  assert(jpgUpload.payload.path.endsWith('.webp'), `JPEG should be stored as webp, got ${jpgUpload.payload.path}`)
  assert(jpgUpload.payload.path.startsWith(`${ossEnv.SY_OSS_ENDPOINT}/public/images/`), `JPEG should be published to OSS, got ${jpgUpload.payload.path}`)
  const jpgMeta = await sharp(await runtimeImage(filenameOf(jpgUpload.payload.path))).metadata()
  assert(jpgMeta.format === 'webp', `stored JPEG upload should be webp, got ${jpgMeta.format}`)

  const webpUpload = await upload(token, `data:image/webp;base64,${webpBuffer.toString('base64')}`, 'testwebp')
  assert(webpUpload.status === 201, `WebP upload should succeed`)
  assert(webpUpload.payload.path.endsWith('.webp'), `WebP stays webp, got ${webpUpload.payload.path}`)
  const webpStored = await runtimeImage(filenameOf(webpUpload.payload.path))
  assert(Buffer.compare(webpStored, webpBuffer) === 0, 'WebP input should be stored byte-for-byte')

  const served = await fetch(`${base}/images/${pngName}`)
  assert(served.ok, 'uploaded image should still be served from the local rollback copy')
  const servedMeta = await sharp(Buffer.from(await served.arrayBuffer())).metadata()
  assert(servedMeta.format === 'webp', `served image should still be webp, got ${servedMeta.format}`)

  const avatarBuffer = await sharp({ create: { width: 1400, height: 1400, channels: 3, background: '#406020' } }).jpeg({ quality: 88 }).toBuffer()
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ sub: memberId, iat: now, exp: now + 3600 })).toString('base64url')
  const signature = createHmac('sha256', 'test-token-secret').update(payload).digest('base64url')
  const boundary = '----testboundary'
  const avatarBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="avatar.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    avatarBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  const avatarResponse = await fetch(`${base}/api/miniprogram/profile/avatar`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, Authorization: `Bearer mpv1.${payload}.${signature}` },
    body: avatarBody,
  })
  const avatarResult = await avatarResponse.json().catch(() => ({}))
  assert(avatarResponse.status === 200, `avatar upload should succeed (got ${avatarResponse.status}: ${avatarResult.error || ''})`)
  const avatarPath = String(avatarResult.user?.avatarUrl || avatarResult.user?.avatar || '')
  assert(avatarPath.endsWith('.webp'), `avatar should be stored as webp, got ${avatarPath}`)
  const avatarServed = await fetch(`${base}/images/${avatarPath.split('/images/')[1]}`)
  assert(avatarServed.ok, 'avatar image should be served')
  const avatarMeta = await sharp(Buffer.from(await avatarServed.arrayBuffer())).metadata()
  assert(avatarMeta.format === 'webp', `served avatar should be webp, got ${avatarMeta.format}`)
  assert(Math.max(avatarMeta.width, avatarMeta.height) <= 1920, `avatar long edge should be capped at 1920, got ${avatarMeta.width}x${avatarMeta.height}`)

  console.log(`Image upload webp conversion tests passed (png→webp ${pngBuffer.length}→${statSync(join(tempRoot, 'public/images', pngName)).size}B, jpg→webp, webp passthrough, served webp, avatar jpg→webp, OSS public-read).`)
} finally {
  await stop()
  if (oss) await new Promise((resolveClose) => oss.server.close(resolveClose))
  await rm(tempRoot, { recursive: true, force: true })
}
