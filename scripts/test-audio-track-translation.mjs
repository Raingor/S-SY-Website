import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, cp, rm, symlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { tmpdir } from 'node:os'

async function availablePort() {
  const server = net.createServer()
  await new Promise((resolveListen, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolveListen))
  const { port } = server.address()
  await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()))
  return port
}

const root = resolve(new URL('..', import.meta.url).pathname)
const tempRoot = await mkdtemp(join(tmpdir(), 'sy-audio-track-translation-'))
const appPort = await availablePort()
const providerPort = await availablePort()
const base = `http://127.0.0.1:${appPort}`
let child
let providerRequests = 0
let providerPrompt = ''
let providerModel = ''
const provider = createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  providerRequests += 1
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  providerModel = input.model
  providerPrompt = input.messages?.[0]?.content || ''
  const result = { titleTw: '雅典衛城', titleEn: 'The Acropolis of Athens', descriptionTw: '雅典衛城簡介。', descriptionEn: 'An introduction to the Acropolis of Athens.' }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }))
})

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } })
  return { status: response.status, data: response.status === 204 ? null : await response.json() }
}

try {
  await new Promise((resolveListen, reject) => provider.once('error', reject).listen(providerPort, '127.0.0.1', resolveListen))
  for (const file of ['server.mjs', 'wechat-pay.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'attraction-ai-fill.mjs']) await cp(join(root, file), join(tempRoot, file))
  await cp(join(root, 'seed/site-data.json'), join(tempRoot, 'seed', 'site-data.json'))
  await cp(join(root, 'seed/content-demo.json'), join(tempRoot, 'seed', 'content-demo.json'))
  await symlink(join(root, 'node_modules'), join(tempRoot, 'node_modules'), 'dir')
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: tempRoot,
    env: {
      ...process.env,
      PORT: String(appPort),
      SY_STORAGE: 'json',
      SY_ADMIN_PASSWORD: 'test-audio-translation-admin-password',
      SY_LOCAL_ASSISTANT_ENABLED: 'true',
      SY_SENSENOVA_API_KEY: 'test-provider-key',
      SY_SENSENOVA_BASE_URL: `http://127.0.0.1:${providerPort}/v1`,
    },
    stdio: 'ignore',
  })
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`temporary server exited (${child.exitCode})`)
    try { if ((await fetch(`${base}/api/health`)).ok) break } catch {}
    await new Promise(resolveDelay => setTimeout(resolveDelay, 100))
    if (attempt === 99) throw new Error('temporary server did not start')
  }

  const unauthorized = await request('/api/admin/audio-track-translation', { method: 'POST', body: JSON.stringify({ title: '雅典卫城' }) })
  assert.equal(unauthorized.status, 401, 'translation endpoint must require admin authentication')
  const login = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ password: 'test-audio-translation-admin-password' }) })
  assert.equal(login.status, 200, 'temporary admin login failed')
  const translated = await request('/api/admin/audio-track-translation', {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.data.token}` },
    body: JSON.stringify({ title: '雅典卫城', description: '雅典卫城简介。' }),
  })
  assert.equal(translated.status, 200)
  assert.deepEqual(translated.data, { titleTw: '雅典衛城', titleEn: 'The Acropolis of Athens', descriptionTw: '雅典衛城簡介。', descriptionEn: 'An introduction to the Acropolis of Athens.' })
  assert.equal(providerRequests, 1)
  assert.equal(providerModel, 'sensenova-6.8-flash-lite')
  assert.match(providerPrompt, /雅典卫城简介/)
  assert.match(providerPrompt, /繁体中文和英文/)
  const missingTitle = await request('/api/admin/audio-track-translation', {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.data.token}` },
    body: JSON.stringify({ title: ' ' }),
  })
  assert.equal(missingTitle.status, 422)
  assert.equal(providerRequests, 1, 'invalid source must not call the AI provider')
  child.kill('SIGTERM')
  await new Promise(resolveExit => child.once('exit', resolveExit))
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: tempRoot,
    env: { ...process.env, PORT: String(appPort), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: 'test-audio-translation-admin-password', SY_LOCAL_ASSISTANT_ENABLED: 'false', SY_SENSENOVA_API_KEY: 'test-provider-key', SY_SENSENOVA_BASE_URL: `http://127.0.0.1:${providerPort}/v1` },
    stdio: 'ignore',
  })
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`temporary disabled server exited (${child.exitCode})`)
    try { if ((await fetch(`${base}/api/health`)).ok) break } catch {}
    await new Promise(resolveDelay => setTimeout(resolveDelay, 100))
    if (attempt === 99) throw new Error('temporary disabled server did not start')
  }
  const disabledLogin = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ password: 'test-audio-translation-admin-password' }) })
  assert.equal(disabledLogin.status, 200)
  const disabled = await request('/api/admin/audio-track-translation', { method: 'POST', headers: { Authorization: `Bearer ${disabledLogin.data.token}` }, body: JSON.stringify({ title: '雅典卫城' }) })
  assert.equal(disabled.status, 404, 'translation endpoint must respect explicit AI enable flag')
  assert.equal(providerRequests, 1, 'disabled AI must not call the AI provider')
  console.log('Audio-track translation endpoint tests passed (admin auth, mock provider, output shape, source validation, explicit AI flag).')
} finally {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM')
    await new Promise(resolveExit => child.once('exit', resolveExit))
  }
  await new Promise(resolveClose => provider.close(resolveClose))
  await rm(tempRoot, { recursive: true, force: true })
}
