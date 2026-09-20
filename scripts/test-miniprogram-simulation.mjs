import { cp, mkdir, rm, symlink } from 'node:fs/promises'
import { mkdtemp } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'

const root = resolve(new URL('..', import.meta.url).pathname)
const tempRoot = await mkdtemp(join(tmpdir(), 'sy-miniprogram-simulation-'))
const port = 4190 + Math.floor(Math.random() * 100)
const base = `http://127.0.0.1:${port}`
let child

async function prepare() {
  await mkdir(join(tempRoot, 'data'), { recursive: true })
  await cp(join(root, 'server.mjs'), join(tempRoot, 'server.mjs'))
  await cp(join(root, 'wechat-pay.mjs'), join(tempRoot, 'wechat-pay.mjs'))
  await cp(join(root, 'storage.mjs'), join(tempRoot, 'storage.mjs'))
  await cp(join(root, 'data/site-data.json'), join(tempRoot, 'data/site-data.json'))
  await symlink(join(root, 'node_modules'), join(tempRoot, 'node_modules'), 'dir')
}

function start(simulationEnabled) {
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: tempRoot,
    env: {
      ...process.env,
      PORT: String(port),
      SY_STORAGE: 'json',
      SY_ADMIN_PASSWORD: 'test-admin-password',
      WX_APPID: 'test-appid',
      WX_APP_SECRET: 'test-secret',
      SY_MINIPROGRAM_TOKEN_SECRET: 'test-token-secret',
      SY_MINIPROGRAM_SIMULATION_ENABLED: simulationEnabled ? 'true' : 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (chunk) => process.stdout.write(String(chunk)))
  child.stderr.on('data', (chunk) => process.stderr.write(String(chunk)))
  return child
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/health`)
      if (response.ok) return
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
  }
  throw new Error('server did not start')
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } })
  const data = response.status === 204 ? null : await response.json()
  return { status: response.status, data }
}

function assert(condition, message) { if (!condition) throw new Error(message) }
function auth(user) { return { Authorization: `Bearer sim-${user}` } }
async function createSession(phone) {
  const result = await request('/api/miniprogram/simulation/session', { method: 'POST', body: JSON.stringify({ phone }) })
  assert(result.status === 200 && result.data.simulation === true && result.data.user.phoneBound === true, 'phone simulation session failed')
  return { Authorization: `Bearer ${result.data.accessToken}` }
}

async function stop() {
  if (!child || child.killed) return
  child.kill('SIGTERM')
  await new Promise((resolveExit) => child.once('exit', resolveExit))
  child = null
}

try {
  await prepare()
  start(true)
  await waitForServer()

  let result = await request('/api/miniprogram/knowledge/config')
  assert(result.status === 200 && result.data.simulation === true && result.data.trialSeconds === 60 && result.data.products.attraction.price === 0.01 && result.data.products.membership.price === 0.01, 'config contract failed')
  assert(result.data.products.attraction.productType === 'attraction' && result.data.products.membership.productType === 'membership', 'product config failed')

  result = await request('/api/miniprogram/entitlements', { headers: auth('regular') })
  assert(result.status === 200 && result.data.member === false && result.data.orders.length === 0, 'regular fixture failed')

  const phoneAuth = await createSession('13800138000')
  result = await request('/api/miniprogram/entitlements', { headers: phoneAuth })
  assert(result.status === 200 && result.data.user.phoneBound === true && result.data.orders.length === 0, 'phone entitlement isolation failed')

  result = await request('/api/miniprogram/orders', { method: 'POST', headers: phoneAuth, body: JSON.stringify({ productType: 'attraction', attractionId: 'acropolis' }) })
  assert(result.status === 201 && result.data.simulation === true && result.data.order.status === 'pending' && result.data.order.price === 0.01 && result.data.order.phone === '+8613800138000' && result.data.payment === null, 'attraction order creation failed')
  const attractionOrderId = result.data.order.id

  result = await request('/api/miniprogram/orders', { method: 'POST', headers: phoneAuth, body: JSON.stringify({ productType: 'membership' }) })
  assert(result.status === 201 && result.data.order.productType === 'membership' && result.data.order.price === 0.01, 'membership order creation failed')
  const membershipOrderId = result.data.order.id

  result = await request('/api/miniprogram/orders', { method: 'GET', headers: phoneAuth })
  assert(result.status === 200 && result.data.items.length === 2 && result.data.items.every((order) => order.phone === '+8613800138000'), 'order query contract failed')

  result = await request(`/api/miniprogram/orders/${attractionOrderId}/simulate-paid`, { method: 'POST', headers: phoneAuth })
  assert(result.status === 200 && result.data.order.status === 'paid' && result.data.entitlements.unlockedAttractions.includes('acropolis'), 'paid entitlement failed')
  result = await request(`/api/miniprogram/orders/${attractionOrderId}/simulate-paid`, { method: 'POST', headers: phoneAuth })
  assert(result.status === 200 && result.data.idempotent === true, 'paid idempotency failed')

  result = await request(`/api/miniprogram/orders/${membershipOrderId}/simulate-failed`, { method: 'POST', headers: phoneAuth })
  assert(result.status === 200 && result.data.order.status === 'failed' && result.data.code === 'SIMULATED_PAYMENT_FAILED' && result.data.entitlements.member === false, 'failed payment path failed')
  result = await request(`/api/miniprogram/orders/${membershipOrderId}/simulate-failed`, { method: 'POST', headers: phoneAuth })
  assert(result.status === 200 && result.data.idempotent === true, 'failed idempotency failed')

  const otherPhoneAuth = await createSession('13900139000')
  result = await request('/api/miniprogram/entitlements', { headers: otherPhoneAuth })
  assert(result.status === 200 && result.data.orders.length === 0 && result.data.unlockedAttractions.length === 0, 'phone order isolation failed')

  result = await request('/api/miniprogram/entitlements', { headers: auth('attraction') })
  assert(result.status === 200 && result.data.member === false && result.data.unlockedAttractions.includes('acropolis'), 'attraction fixture failed')
  result = await request('/api/miniprogram/entitlements', { headers: auth('membership') })
  assert(result.status === 200 && result.data.member === true && result.data.unlockedAttractions.length > 0, 'membership fixture failed')

  result = await request('/api/miniprogram/simulation/reset', { method: 'POST', headers: phoneAuth })
  assert(result.status === 200 && result.data.reset === true && result.data.entitlements.orders.length === 0, 'simulation reset failed')

  result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ password: 'test-admin-password' }) })
  const adminToken = result.data.token
  result = await request('/api/admin/settings', { method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ miniprogramKnowledge: { trialSeconds: 90, products: { attraction: { enabled: true, name: '测试景点讲解', price: 0.01, currency: 'CNY' }, membership: { enabled: true, name: '测试终身会员', price: 0.01, currency: 'CNY' } } } }) })
  assert(result.status === 200, 'knowledge config settings update failed')
  result = await request('/api/miniprogram/knowledge/config')
  assert(result.status === 200 && result.data.trialSeconds === 90 && result.data.products.attraction.price === 0.01, 'knowledge config persistence failed')
  result = await request('/api/admin/settings', { method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ miniprogramAccess: false }) })
  assert(result.status === 200, 'maintenance toggle off failed')
  result = await request('/api/miniprogram/knowledge/config')
  assert(result.status === 503 && result.data.code === 'MINIPROGRAM_MAINTENANCE', 'maintenance simulation gate failed')
  result = await request('/api/content')
  assert(result.status === 200, 'website content should remain available during maintenance')
  result = await request('/api/admin/settings', { method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ miniprogramAccess: true }) })
  assert(result.status === 200, 'maintenance toggle on failed')
  await stop()

  start(false)
  await waitForServer()
  result = await request('/api/miniprogram/knowledge/config')
  assert(result.status === 404 && result.data.code === 'MINIPROGRAM_SIMULATION_DISABLED', 'simulation disable switch failed')
  console.log('PASS: phone session, 0.01 products, order query/isolation, fixtures, attraction purchase, membership/failed payment, idempotency, reset, maintenance gate, content isolation, disable switch')
} finally {
  await stop()
  await rm(tempRoot, { recursive: true, force: true })
}
