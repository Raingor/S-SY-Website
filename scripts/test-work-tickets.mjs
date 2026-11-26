// 回归：工单（workTickets）后台 CRUD、字段/附件校验、机器人只读 feed 鉴权。
// 运行：node scripts/test-work-tickets.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
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
await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))

const password = 'tickets-test-password'
const botToken = 'tickets-bot-token-for-test-only'
const server = spawn(process.execPath, ['server.mjs'], {
  cwd: temp,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: password, SY_TICKETS_BOT_TOKEN: botToken },
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

  // 5) 列表顺序：待处理在前，同状态按创建时间。
  const list = await json('/api/admin/work-tickets', {}, token)
  assert.equal(list.status, 200)
  assert.equal(list.body.items.length, 2)
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
  assert.equal(feed.body.count, 1)
  const feedItem = feed.body.items[0]
  for (const key of ['id', 'title', 'body', 'requester', 'requesterName', 'priority', 'status', 'expectedAt', 'attachments', 'createdAt', 'updatedAt']) assert.ok(Object.prototype.hasOwnProperty.call(feedItem, key), 'feed 缺字段 ' + key)
  assert.equal(feedItem.attachments[0].url.startsWith('https://'), true)
  assert.equal(feedItem.createdBy, undefined, 'feed 不输出后台操作人字段')

  const md = await json('/api/tickets/feed?format=md', { headers: { Authorization: `Bearer ${botToken}` } })
  assert.equal(md.status, 200)
  assert.match(String(md.headers.get('content-type')), /text\/markdown/)
  assert.match(md.body, /# SY 工单（1）/)
  assert.match(md.body, /带附件的需求/)

  // 8) 已取消默认不出现在 feed；显式 status=cancelled 可查。
  const cancelledTicket = await json('/api/admin/work-tickets', { method: 'POST', body: JSON.stringify({ title: '会被取消', status: 'cancelled' }) }, token)
  assert.equal((await json('/api/tickets/feed', { headers: { Authorization: `Bearer ${botToken}` } })).body.items.some((item) => item.id === cancelledTicket.body.id), false, '默认不含已取消')
  assert.equal((await json('/api/tickets/feed?status=cancelled', { headers: { Authorization: `Bearer ${botToken}` } })).body.items.length, 1)

  // 9) 公开内容接口不能泄漏工单。
  const content = await json('/api/content')
  assert.equal(content.status, 200)
  assert.equal(Object.prototype.hasOwnProperty.call(content.body, 'workTickets'), false, '/api/content 不应输出 workTickets')
  assert.equal(JSON.stringify(content.body).includes('带附件的需求'), false, '/api/content 不应出现工单标题')

  console.log('workTickets contract PASS')
} finally {
  server.kill('SIGTERM')
}
