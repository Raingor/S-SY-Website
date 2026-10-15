// 回归：希腊商旅（businessService）与出行指南（travelGuide）后台配置与公开契约。
// 运行：node scripts/test-business-travel-guide.mjs
import { spawn } from 'node:child_process'
import net from 'node:net'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import assert from 'node:assert/strict'

const root = resolve(new URL('..', import.meta.url).pathname)
const tempRoot = await mkdtemp(join(tmpdir(), 'sy-business-travel-guide-'))

function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = net.createServer()
    server.once('error', rejectPort)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close((error) => (error ? rejectPort(error) : resolvePort(port)))
    })
  })
}
const port = await availablePort()
const base = `http://127.0.0.1:${port}`

// 在临时目录内运行 server（storage.mjs 硬编码 seed/site-data.json 相对仓库根），避免污染仓库 seed。
await mkdir(join(tempRoot, 'seed'), { recursive: true })
const { cp, symlink } = await import('node:fs/promises')
for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs', 'seed/site-data.json', 'seed/content-demo.json']) {
  await cp(join(root, file), join(tempRoot, file))
}
await symlink(join(root, 'node_modules'), join(tempRoot, 'node_modules'), 'dir')

const server = spawn(process.execPath, ['server.mjs'], {
  cwd: tempRoot,
  env: { ...process.env, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: 'test-admin-password' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk })
server.stderr.on('data', (chunk) => { serverLog += chunk })

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try { const res = await fetch(`${base}/api/health`); if (res.ok) return } catch {}
    await sleep(250)
  }
  console.error(serverLog); throw new Error('server failed to start')
}
try {
  await waitForServer()
  const login = await (await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test-admin-password' }) })).json()
  assert(login.token, 'admin login should return token')
  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` }

  // ---- business-service 默认配置 ----
  const business = await (await fetch(`${base}/api/admin/business-service`, { headers: auth })).json()
  assert.equal(business.title, '希腊商旅')
  assert.equal(business.titleTw, '希臘商旅')
  assert.equal(business.options.cycle.length, 4, 'cycle options default 4')
  assert.equal(business.options.language.length, 4, 'language options default 4')
  assert(business.form.cardTitle, 'form cardTitle default exists')

  // ---- business-service 保存 + 校验 ----
  const patched = await (await fetch(`${base}/api/admin/business-service`, { method: 'PATCH', headers: auth, body: JSON.stringify({ ...business, title: '希腊商旅定制', subtitle: '企业随行顾问', options: { ...business.options, cycle: business.options.cycle.slice(0, 2) } }) })).json()
  assert.equal(patched.title, '希腊商旅定制')
  assert.equal(patched.options.cycle.length, 2)
  const badBusiness = await fetch(`${base}/api/admin/business-service`, { method: 'PATCH', headers: auth, body: JSON.stringify({ ...patched, title: '' }) })
  assert.equal(badBusiness.status, 422, 'empty title should 422')

  // ---- travel-guide 默认配置 ----
  const guide = await (await fetch(`${base}/api/admin/travel-guide`, { headers: auth })).json()
  assert.equal(guide.title, '出行指南')
  assert.equal(guide.sections.length, 3, '3 default sections')
  assert(guide.sections[0].cards[0].titleTw, 'card fallback Tw = zh-CN')
  assert(Array.isArray(guide.sections[0].cards[0].points))

  // ---- travel-guide 保存 + 上限 + 校验 ----
  const edited = JSON.parse(JSON.stringify(guide))
  edited.subtitle = '实用攻略大全'
  edited.sections[0].title = '出发准备（新）'
  edited.sections[0].cards[0].title = '签证与材料清单（新）'
  edited.sections[0].cards[0].points = ['护照与复印件', '新增要点']
  const patchedGuide = await (await fetch(`${base}/api/admin/travel-guide`, { method: 'PATCH', headers: auth, body: JSON.stringify(edited) })).json()
  assert.equal(patchedGuide.sections[0].title, '出发准备（新）')
  assert.deepEqual(patchedGuide.sections[0].cards[0].points, ['护照与复印件', '新增要点'])
  const badGuide = await fetch(`${base}/api/admin/travel-guide`, { method: 'PATCH', headers: auth, body: JSON.stringify({ ...patchedGuide, sections: [] }) })
  assert.equal(badGuide.status, 422, 'empty sections should 422')
  // 超过 6 组被截到前 6 组保存（cap 语义，非报错）
  const capped = await (await fetch(`${base}/api/admin/travel-guide`, { method: 'PATCH', headers: auth, body: JSON.stringify({ ...patchedGuide, sections: Array.from({ length: 8 }, (_, i) => ({ ...patchedGuide.sections[0], key: `section-${i}` })) }) })).json()
  assert.equal(capped.sections.length, 6, 'sections capped to 6')

  // ---- 文档上传（travelGuideDocs 在线阅读）----
  const pdfBytes = Buffer.from('%PDF-1.4\n%\u204a\u00e2\u00e3\u00c5\u00d3\n1 0 obj\nendobj\ntrailer<<>>\n%%EOF\n', 'binary')
  const docUpload = await (await fetch(`${base}/api/admin/upload-doc`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'visa-guide.pdf', type: 'application/pdf', data: `data:application/pdf;base64,${pdfBytes.toString('base64')}`, prefix: 'guide' }) })).json()
  assert(docUpload.url && docUpload.url.startsWith('/docs/') && docUpload.url.endsWith('.pdf'), `upload-doc should return /docs/ url, got ${JSON.stringify(docUpload)}`)
  const badDoc = await fetch(`${base}/api/admin/upload-doc`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'evil.exe', type: 'application/octet-stream', data: `data:application/octet-stream;base64,${pdfBytes.toString('base64')}` }) })
  assert.equal(badDoc.status, 422, 'exe upload rejected')
  const docFetch = await fetch(`${base}${docUpload.url}`)
  assert.equal(docFetch.status, 200, 'uploaded doc should be served')
  assert.equal(docFetch.headers.get('content-type') || '', 'application/pdf', 'doc served as pdf')
  const settingsPatch = await (await fetch(`${base}/api/admin/settings`, { method: 'PATCH', headers: auth, body: JSON.stringify({ travelGuideDocs: { visa: docUpload.url, packing: '  ', athens: 'https://example.com/ext.pdf' } }) })).json()
  assert.equal(settingsPatch.travelGuideDocs.visa, docUpload.url)
  assert.equal(settingsPatch.travelGuideDocs.packing, undefined, 'empty value dropped')
  assert.equal(settingsPatch.travelGuideDocs.athens, 'https://example.com/ext.pdf', 'absolute URL kept')

  // ---- 公开契约：/api/content 暴露两字段，结构与车辆服务一致 ----
  const content = await (await fetch(`${base}/api/content`)).json()
  assert(content.businessService && content.businessService.title, 'content.businessService present')
  assert.equal(content.businessService.subtitle, '企业随行顾问')
  assert(Array.isArray(content.businessService.options.cycle), 'public options arrays')
  assert(content.travelGuide && content.travelGuide.title, 'content.travelGuide present')
  assert.equal(content.travelGuide.subtitle, '实用攻略大全')
  assert(content.travelGuide.sections[0].cards[0].descTw, 'public travelGuide Tw fallback')
  // 旧字段不受影响
  assert(content.vehicleService && content.vehicleService.title, 'vehicleService unchanged')
  assert(Array.isArray(content.miniprogramServiceEntries) && content.miniprogramServiceEntries.length === 6, 'service entries unchanged')
  assert(content.settings.travelGuideDocs && content.settings.travelGuideDocs.visa === docUpload.url, 'settings.travelGuideDocs exposed')

  console.log('Business service, travel guide & docs tests passed (admin CRUD, validation, caps, upload-doc, public contract).')
} finally {
  server.kill('SIGTERM')
  await rm(tempRoot, { recursive: true, force: true })
}
