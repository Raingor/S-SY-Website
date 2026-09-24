import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const testPassword = 'local-admin-session-restart-test-password'
const testSecret = 'local-admin-session-restart-test-secret'

async function availablePort() {
  const server = net.createServer()
  await new Promise((resolveListen, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolveListen))
  const { port } = server.address()
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
  return port
}

function startServer(port) {
  const env = {
    ...process.env,
    PORT: String(port),
    SY_STORAGE: 'json',
    SY_ADMIN_PASSWORD: testPassword,
    SY_ADMIN_SESSION_SECRET: testSecret,
  }
  delete env.SY_DB_NAME
  delete env.SY_DB_USER
  delete env.SY_DB_PASSWORD
  return spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' })
}

async function waitUntilReady(child, baseUrl) {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Test server exited before becoming ready (${child.exitCode})`)
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) return
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 100))
  }
  throw new Error('Timed out waiting for the test server')
}

async function stopServer(child) {
  if (child.exitCode !== null) return
  await new Promise((resolveStop) => {
    const timeout = setTimeout(() => { child.kill('SIGKILL'); resolveStop() }, 3_000)
    child.once('exit', () => { clearTimeout(timeout); resolveStop() })
    child.kill('SIGTERM')
  })
}

const port = await availablePort()
const baseUrl = `http://127.0.0.1:${port}`
let server = startServer(port)
let token
try {
  await waitUntilReady(server, baseUrl)
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: testPassword }),
  })
  assert.equal(login.status, 200, 'test admin login should succeed')
  token = (await login.json()).token
  assert.equal(typeof token, 'string')
} finally {
  await stopServer(server)
}

server = startServer(port)
try {
  await waitUntilReady(server, baseUrl)
  const response = await fetch(`${baseUrl}/api/admin/countries`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(response.status, 200, 'the session must verify after a server restart')
  console.log('Admin session restart integration test passed.')
} finally {
  await stopServer(server)
}
