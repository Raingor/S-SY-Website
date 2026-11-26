// 回归：工单（workTickets）后台 CRUD、字段/附件校验、机器人只读 feed 鉴权。
// 运行：node scripts/test-work-tickets.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import http from 'node:http'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const temp = await mkdtemp(join(tmpdir(), 'sy-work-tickets-'))
const listener = net.createServer()
await new Promise((r) => listener.listen(0, '127.0.0.1', r))
const port = listener.address().port
await new Promise((r) => listener.close(r))
const base = `http://127.0.0.1:${port}`

await mkdir(join(temp, 'seed'), { recursive: true })
for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'private-map.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs']) await cp(join(root, file), join(temp, file))
await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')

const fixture = syntheticContentFixture()
// 预置一条历史遗留工单：存储中只有 note、没有 thread，验证读取时迁移不批量改库。
fixture.workTickets = [{
  id: 'ticket-legacy-note-01',
  title: '遗留备注工单',
  body: '请检查首页文案。',
  requester: 'jenny',
  requesterName: 'Jenny',
  priority: 'normal',
  status: 'in_progress',
  expectedAt: '',
  attachments: [],
  note: '第一轮已改完标题，待确认',
  createdAt: '2026-11-20T08:00:00.000Z',
  updatedAt: '2026-11-21T09:00:00.000Z',
  createdBy: 'SY Admin',
  updatedBy: 'SY Admin',
}]
await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))

// webhook 接收端：本地临时 http server，记录所有 POST body。
const webhookHits = []
const hook = http.createServer((req, res) => {
  if (req.method !== 'POST') { res.writeHead(405).end(); return }
  let raw = ''
  req.on('data', (chunk) => { raw += chunk })
  req.on('end', () => {
    try { webhookHits.push(JSON.parse(raw)) } catch { webhookHits.push({ raw }) }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}')
  })
})
await new Promise((r) => hook.listen(0, '127.0.0.1', r))
const hookPort = hook.address().port
const webhookUrl = `http://127.0.0.1:${hookPort}/hooks/ticket`
async function waitForHit(id) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const hit = webhookHits.find((item) => item.id === id)
    if (hit) return hit
    await sleep(100)
  }
  return null
}

const password = 'tickets-test-password'
const botToken = 'tickets-bot-token-for-test-only'
const server = spawn(process.execPath, ['server.mjs'], {
  cwd: temp,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: password, SY_TICKETS_BOT_TOKEN: botToken, SY_TICKETS_WEBHOOK_URL: webhookUrl },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let log = ''
server.stderr.on('data', (chunk) => { log += chunk })

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(`${base}/api/health`)).ok) return } catch {}
    await sleep(100)
  }
  throw new Error('server not ready: ' + log.slice(-600))
}
async function json(path, options = {}, token) {
  const response = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
  const type = response.headers.get('content-type') || ''
  const body = response.status === 204 ? null : /\bjson\b/i.test(type) ? await response.json() : await response.text()
  return { status: response.status, body, headers: response.headers }
}

try {
  await waitForServer()

  // 1) 未登录不能读写工单。
  assert.equal((await json('/api/admin/work-tickets')).status, 401, '未登录读取应 401')
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: 'x' }) })).status, 401, '未登录创建应 401')

  const session = await json('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) })
  assert.equal(session.status, 200)
  const token = session.body.token

  // 2) 最小字段创建：默认值补齐。
  const created = await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: '  修复首页 Banner  ' }) }, token)
  assert.equal(created.status, 201)
  const ticket = created.body
  assert.match(ticket.id, /^ticket-/, '工单 id 前缀')
  assert.equal(ticket.title, '修复首页 Banner', '标题应 trim')
  assert.equal(ticket.status, 'pending', '默认待处理')
  assert.equal(ticket.priority, 'normal', '默认普通优先级')
  assert.equal(ticket.requester, 'other', '默认其他')
  assert.deepEqual(ticket.attachments, [], '默认无附件')
  assert.equal(ticket.createdBy, 'SY Admin', '创建人')
  assert.equal(ticket.createdAt, ticket.updatedAt, '创建时两个时间一致')

  // 3) 字段校验。
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ body: '缺少标题' }) }, token)).status, 422, '缺标题 422')
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: 'x', requester: 'someone' }) }, token)).status, 422, '请求人白名单')
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: 'x', priority: 'urgent' }) }, token)).status, 422, '优先级白名单')
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: 'x', status: 'closed' }) }, token)).status, 422, '状态白名单')
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: 'x', expectedAt: '2026/11/30' }) }, token)).status, 422, '日期格式')

  // 4) 附件校验：只收 https、最多 20 个、字段归一。
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: 'x', attachments: [{ url: '/docs/a.pdf', kind: 'doc' }] }) }, token)).status, 422, '相对路径附件应拒绝')
  const tooMany = Array.from({ length: 21 }, (_, index) => ({ url: `https://example.com/${index}.png`, kind: 'image' }))
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: 'x', attachments: tooMany }) }, token)).status, 422, '附件数量上限')
  const withFiles = await json('/api/admin/work-tickets', {
    method: 'POST',
    body: JSON.stringify({
      title: '带附件的需求',
      body: '请把首页第三屏换成新图。',
      requester: 'jenny',
      priority: 'high',
      expectedAt: '2026-11-30',
      attachments: [
        { name: 'shot.webp', url: 'https://sy-mpapp.oss-cn-shenzhen.aliyuncs.com/public/images/a.webp', kind: 'image', size: 2048 },
        { name: 'spec.pdf', url: 'https://sy-mpapp.oss-cn-shenzhen.aliyuncs.com/public/docs/b.pdf', kind: 'doc', size: 4096 },
      ],
      note: '待确认色值',
    }),
  }, token)
  assert.equal(withFiles.status, 201)
  assert.equal(withFiles.body.attachments.length, 2)
  assert.equal(withFiles.body.attachments[1].kind, 'doc')
  assert.equal(withFiles.body.attachments[1].size, 4096)
  assert.equal(withFiles.body.requesterName, 'Jenny', 'Jenny 自动补名')
  assert.equal(Object.prototype.hasOwnProperty.call(withFiles.body, 'videoUrl'), false, '视频链接字段已下线')
  assert.ok(Array.isArray(withFiles.body.thread), '创建响应应含 thread 数组')
  // 遗留 note 创建后读取时迁移为第一轮 Q&A。
  assert.equal(withFiles.body.thread.length, 1, 'note 应迁移为一轮对话')
  assert.equal(withFiles.body.thread[0].ask, '（原始工单）', '迁移轮 ask 标记')
  assert.equal(withFiles.body.thread[0].answer, '待确认色值', '迁移轮 answer 为原 note')
  assert.equal(withFiles.body.thread[0].askBy, 'jenny', '迁移轮提问人')
  assert.equal(withFiles.body.thread[0].answerBy, 'admin', '迁移轮回应人')
  assert.equal(withFiles.body.note, '', '迁移后 note 应为空')
  // 读取时迁移：遗留工单存储里仍保留原 note，不做批量 DB 改写。
  const storedRaw = JSON.parse(await readFile(join(temp, 'seed/site-data.json'), 'utf8'))
  const storedLegacy = (storedRaw.workTickets || []).find((item) => item.id === 'ticket-legacy-note-01')
  assert.equal(storedLegacy.note, '第一轮已改完标题，待确认', '未再编辑前存储里仍保留原 note')
  assert.equal(Boolean(storedLegacy.thread), false, '存储不应被批量补写 thread')
  // GET 遗留工单响应含迁移后的 thread 且 note 为空。
  const legacyRead = await json('/api/admin/work-tickets/ticket-legacy-note-01', {}, token)
  assert.equal(legacyRead.status, 200)
  assert.equal(legacyRead.body.note, '', '遗留工单读取后 note 为空')
  assert.equal(legacyRead.body.thread.length, 1, '遗留工单迁移为一轮对话')
  assert.equal(legacyRead.body.thread[0].ask, '（原始工单）')
  assert.equal(legacyRead.body.thread[0].askAt, '2026-11-20T08:00:00.000Z', 'askAt 用 createdAt')
  assert.equal(legacyRead.body.thread[0].askBy, 'jenny', 'askBy 用原 requester')
  assert.equal(legacyRead.body.thread[0].answer, '第一轮已改完标题，待确认', 'answer 为原 note')
  assert.equal(legacyRead.body.thread[0].answerAt, '2026-11-21T09:00:00.000Z', 'answerAt 用 updatedAt')
  assert.equal(legacyRead.body.thread[0].answerBy, 'admin')
  // 迁移幂等：再次读取不应追加第二轮。
  const legacyReread = await json('/api/admin/work-tickets/ticket-legacy-note-01', {}, token)
  assert.equal(legacyReread.body.thread.length, 1, '重复读取迁移幂等')
  // GET 列表读取时也应迁移。
  const listAfterNote = await json('/api/admin/work-tickets', {}, token)
  const migratedInList = listAfterNote.body.items.find((item) => item.id === 'ticket-legacy-note-01')
  assert.equal(migratedInList.thread.length, 1, '列表读取时应迁移 note')
  assert.equal(migratedInList.note, '', '列表读取迁移后 note 为空')

  // 4.5) thread 字段校验与 PATCH append。
  const threaded = await json('/api/admin/work-tickets', {
    method: 'POST',
    body: JSON.stringify({
      title: '多轮调整需求',
      thread: [
        { ask: '请把按钮改成绿色', askAt: '2026-11-27T10:00:00.000Z', askBy: 'jenny', answer: '已改，待确认', answerAt: '2026-11-27T11:00:00.000Z', answerBy: 'admin' },
        { ask: '再改成蓝色', askAt: '2026-11-27T12:00:00.000Z', askBy: 'zoey', answer: '', answerAt: '', answerBy: '' },
      ],
    }),
  }, token)
  assert.equal(threaded.status, 201, '带 thread 创建应 201')
  assert.equal(threaded.body.thread.length, 2, 'thread 两轮保留')
  assert.equal(threaded.body.thread[1].answer, '', '未答轮 answer 为空')
  assert.equal(threaded.body.note, '', '显式 thread 创建后 note 为空')
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: 'x', thread: [{ ask: 'x'.repeat(2001), askBy: 'admin' }] }) }, token)).status, 422, 'ask 超长 422')
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: 'x', thread: [{ ask: 'ok', answer: 'y'.repeat(2001), askBy: 'admin' }] }) }, token)).status, 422, 'answer 超长 422')
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: 'x', thread: [{ ask: 'ok', askBy: 'someone' }] }) }, token)).status, 422, '非法 askBy 422')
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: 'x', thread: [{ ask: 'ok', askBy: 'admin', answerBy: 'robot' }] }) }, token)).status, 422, '非法 answerBy 422')
  const tooManyRounds = Array.from({ length: 51 }, (_, index) => ({ ask: `round-${index}`, askBy: 'admin' }))
  assert.equal((await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: 'x', thread: tooManyRounds }) }, token)).status, 422, '超过 50 轮 422')
  const appendedThread = threaded.body.thread.concat([{ ask: '最终确认版本', askAt: '2026-11-27T13:00:00.000Z', askBy: 'jenny', answer: '蓝色已上线', answerAt: '2026-11-27T14:00:00.000Z', answerBy: 'admin' }])
  const patchedThread = await json(`/api/admin/work-tickets/${threaded.body.id}`, { method: 'PATCH', body: JSON.stringify({ thread: appendedThread }) }, token)
  assert.equal(patchedThread.status, 200, 'PATCH append thread 应 200')
  assert.equal(patchedThread.body.thread.length, 3, 'PATCH 后三轮')
  assert.equal(patchedThread.body.thread[2].answer, '蓝色已上线')
  const reread = await json(`/api/admin/work-tickets/${threaded.body.id}`, {}, token)
  assert.deepEqual(reread.body.thread, appendedThread, '读回 thread 与 PATCH 一致')
  assert.equal(reread.body.note, '', '读回应答 note 为空')
  // 5) 列表顺序：待处理在前，同状态按创建时间。
  const list = await json('/api/admin/work-tickets', {}, token)
  assert.equal(list.status, 200)
  assert.equal(list.body.items.length, 4)
  assert.equal(list.body.items[0].status, 'pending')

  // 6) 状态流转与 DELETE 规则。
  const started = await json(`/api/admin/work-tickets/${ticket.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'in_progress' }) }, token)
  assert.equal(started.status, 200)
  assert.equal(started.body.status, 'in_progress')
  assert.equal(started.body.createdAt, ticket.createdAt, 'PATCH 不能改 createdAt')
  assert.equal(started.body.updatedBy, 'SY Admin')
  assert.notEqual(started.body.updatedAt, ticket.updatedAt, 'updatedAt 应刷新')
  assert.equal(started.body.title, ticket.title, '未提交字段保持')
  assert.equal((await json(`/api/admin/work-tickets/${ticket.id}`, { method: 'DELETE' }, token)).status, 409, '处理中的工单不能删除')

  const cancelled = await json(`/api/admin/work-tickets/${ticket.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled', note: '需求撤回' }) }, token)
  assert.equal(cancelled.status, 200)
  assert.equal((await json(`/api/admin/work-tickets/${ticket.id}`, { method: 'DELETE' }, token)).status, 204, '已取消可删除')
  assert.equal((await json(`/api/admin/work-tickets/${ticket.id}`, {}, token)).status, 404)

  // 7) 机器人 feed：无 token / 错 token 401，正确 token 200 且字段齐全。
  assert.equal((await json('/api/tickets/feed')).status, 401, '无 token 401')
  assert.equal((await json('/api/tickets/feed', { headers: { Authorization: 'Bearer wrong-token' } })).status, 401, '错 token 401')
  assert.equal((await json('/api/tickets/feed?token=' + botToken)).status, 401, '不支持 query token')
  const feed = await json('/api/tickets/feed', { headers: { Authorization: `Bearer ${botToken}` } })
  assert.equal(feed.status, 200)
  assert.equal(feed.headers.get('cache-control'), 'no-store')
  assert.equal(feed.body.count, 3)
  const feedItem = feed.body.items[0]
  for (const key of ['id', 'title', 'body', 'requester', 'requesterName', 'priority', 'status', 'expectedAt', 'attachments', 'thread', 'createdAt', 'updatedAt']) assert.ok(Object.prototype.hasOwnProperty.call(feedItem, key), 'feed 缺字段 ' + key)
  assert.equal(feedItem.attachments[0].url.startsWith('https://'), true)
  assert.equal(feedItem.createdBy, undefined, 'feed 不输出后台操作人字段')
  assert.ok(Array.isArray(feedItem.thread), 'feed 应输出 thread 数组')
  assert.equal(feedItem.thread[0].answer, '待确认色值', 'feed 含迁移后的对话')
  const feedThreaded = feed.body.items.find((item) => item.id === threaded.body.id)
  assert.ok(feedThreaded, 'feed 应包含多轮工单')
  assert.equal(feedThreaded.thread.length, 3, 'feed 多轮完整')

  const md = await json('/api/tickets/feed?format=md', { headers: { Authorization: `Bearer ${botToken}` } })
  assert.equal(md.status, 200)
  assert.match(String(md.headers.get('content-type')), /text\/markdown/)
  assert.match(md.body, /# SY 工单（3）/)
  assert.match(md.body, /带附件的需求/)
  assert.match(md.body, /Q1（[^）]+）：请把按钮改成绿色/, 'markdown 输出第一轮问')
  assert.match(md.body, /A1（[^）]+）：已改，待确认/, 'markdown 输出第一轮答')
  assert.match(md.body, /A2：（待处理）/, 'markdown 未答轮标待处理')

  // 8) 已取消默认不出现在 feed；显式 status=cancelled 可查。
  const cancelledTicket = await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: '会被取消', status: 'cancelled' }) }, token)
  assert.equal((await json('/api/tickets/feed', { headers: { Authorization: `Bearer ${botToken}` } })).body.items.some((item) => item.id === cancelledTicket.body.id), false, '默认不含已取消')
  assert.equal((await json('/api/tickets/feed?status=cancelled', { headers: { Authorization: `Bearer ${botToken}` } })).body.items.length, 1)

  // 9) 公开内容接口不能泄漏工单。
  const content = await json('/api/content')
  assert.equal(content.status, 200)
  assert.equal(Object.prototype.hasOwnProperty.call(content.body, 'workTickets'), false, '/api/content 不应输出 workTickets')
  assert.equal(JSON.stringify(content.body).includes('带附件的需求'), false, '/api/content 不应出现工单标题')

  // 10) webhook：已创建的工单应触发 POST，字段与事件名正确。
  const hit = await waitForHit(ticket.id)
  assert.ok(hit, '创建工单应触发 webhook POST')
  assert.equal(hit.event, 'ticket.created')
  assert.equal(hit.title, '修复首页 Banner')
  assert.equal(hit.priority, 'normal')
  assert.equal(typeof hit.requesterName, 'string')
  assert.equal(typeof hit.createdAt, 'string')
  assert.ok(Object.prototype.hasOwnProperty.call(hit, 'expectedAt'), 'webhook 应带 expectedAt')
  const filesHit = await waitForHit(withFiles.body.id)
  assert.ok(filesHit, '带附件工单应触发 webhook')
  assert.equal(filesHit.requesterName, 'Jenny')
  assert.equal(filesHit.priority, 'high')
  assert.equal(filesHit.expectedAt, '2026-11-30')
  assert.equal(webhookHits.some((item) => item.event !== 'ticket.created'), false, '不应出现其他事件')

  // 11) 未配置 SY_TICKETS_WEBHOOK_URL 的实例：创建工单仍 201、不报错、不外发。
  const noHookPort = await new Promise((resolvePort) => {
    const probe = net.createServer()
    probe.listen(0, '127.0.0.1', () => { const p = probe.address().port; probe.close(() => resolvePort(p)) })
  })
  const temp2 = await mkdtemp(join(tmpdir(), 'sy-work-tickets-nohook-'))
  await mkdir(join(temp2, 'seed'), { recursive: true })
  for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'private-map.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs']) await cp(join(root, file), join(temp2, file))
  await symlink(join(root, 'node_modules'), join(temp2, 'node_modules'), 'dir')
  await writeFile(join(temp2, 'seed/site-data.json'), JSON.stringify(fixture))
  const noHookServer = spawn(process.execPath, ['server.mjs'], {
    cwd: temp2,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(noHookPort), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: password, SY_TICKETS_BOT_TOKEN: botToken },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let noHookLog = ''
  noHookServer.stderr.on('data', (chunk) => { noHookLog += chunk })
  try {
    const noHookBase = `http://127.0.0.1:${noHookPort}`
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try { if ((await fetch(`${noHookBase}/api/health`)).ok) break } catch {}
      await sleep(100)
    }
    const noHookLogin = await fetch(`${noHookBase}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    const noHookToken = (await noHookLogin.json()).token
    const hitsBefore = webhookHits.length
    const createdNoHook = await fetch(`${noHookBase}/api/admin/work-tickets`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${noHookToken}` }, body: JSON.stringify({ title: '无 webhook 配置' }) })
    assert.equal(createdNoHook.status, 201, '未配置 webhook 创建仍应 201')
    const noHookTicket = await createdNoHook.json()
    await sleep(600)
    assert.equal(await waitForHit(noHookTicket.id), null, '未配置时不应外发')
    assert.equal(webhookHits.length, hitsBefore, '接收端不应新增请求')
    assert.equal(/webhook/i.test(noHookLog), false, '未配置时日志不应出现 webhook 报错')
  } finally {
    noHookServer.kill('SIGTERM')
  }

  console.log('workTickets contract PASS')
} finally {
  server.kill('SIGTERM')
  hook.close()
}
