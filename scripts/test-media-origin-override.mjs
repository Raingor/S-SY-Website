// 回归：SY_MEDIA_ORIGIN_OVERRIDE 应急媒体域改写。
// 验证：开关开启时 /api/content、/api/tickets/feed（JSON 与 markdown）中的
// OSS 图片/文档 URL 被改写为 override 域名，音频不改写；开关未配置时原样输出。
// 运行：node scripts/test-media-origin-override.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const OSS_IMG = 'https://sy-mpapp.oss-cn-shenzhen.aliyuncs.com/public/images/fixture/cover.webp'
const OSS_DOC = 'https://sy-mpapp.oss-cn-shenzhen.aliyuncs.com/public/docs/fixture/guide.pdf'
const OSS_AUDIO = 'https://sy-mpapp.oss-cn-shenzhen.aliyuncs.com/public/audio/fixture/track.mp3'
const OVERRIDE = 'https://override-fixture.example.com'

async function freePort() {
  const listener = net.createServer()
  await new Promise((r) => listener.listen(0, '127.0.0.1', r))
  const port = listener.address().port
  await new Promise((r) => listener.close(r))
  return port
}

async function bootServer(withOverride) {
  const temp = await mkdtemp(join(tmpdir(), 'sy-media-override-'))
  const port = await freePort()
  await mkdir(join(temp, 'seed'), { recursive: true })
  for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'private-map.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs']) await cp(join(root, file), join(temp, file))
  await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')

  const fixture = syntheticContentFixture()
  fixture.attractions[0].coverImage = OSS_IMG
  fixture.attractions[0].guide = { ...fixture.attractions[0].guide, docUrl: OSS_DOC, note: `嵌套文本引用 ${OSS_IMG}` }
  fixture.settings.travelGuideDocs = { planning: OSS_DOC }
  fixture.workTickets = [{
    id: 'ticket-media-override-01',
    title: '媒体改写测试工单',
    body: `正文引用图片 ${OSS_IMG} 与音频 ${OSS_AUDIO}`,
    requester: 'jenny',
    requesterName: 'Jenny',
    priority: 'normal',
    status: 'pending',
    expectedAt: '',
    attachments: [
      { name: 'cover.webp', url: OSS_IMG, kind: 'image', size: 123 },
      { name: 'guide.pdf', url: OSS_DOC, kind: 'doc', size: 456 },
    ],
    note: '',
    thread: [],
    createdAt: '2026-11-28T08:00:00.000Z',
    updatedAt: '2026-11-28T09:00:00.000Z',
    createdBy: 'SY Admin',
    updatedBy: 'SY Admin',
  }]
  await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))

  const env = { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), SY_STORAGE: 'json', SY_TICKETS_BOT_TOKEN: 'media-override-test-token' }
  if (withOverride) env.SY_MEDIA_ORIGIN_OVERRIDE = OVERRIDE
  const server = spawn(process.execPath, ['server.mjs'], { cwd: temp, env, stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  server.stderr.on('data', (chunk) => { log += chunk })
  const base = `http://127.0.0.1:${port}`
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(`${base}/api/health`)).ok) return { server, base } } catch {}
    await sleep(100)
  }
  server.kill()
  throw new Error('server not ready: ' + log.slice(-600))
}

function assertRewritten(url, label) {
  assert.ok(url.startsWith(`${OVERRIDE}/`), `${label} 应被改写为 override 域名: ${url}`)
  assert.ok(!url.includes('sy-mpapp.oss-cn-shenzhen.aliyuncs.com'), `${label} 不应残留 OSS 域名: ${url}`)
}

// ---- 场景 1：开关开启 ----
{
  const { server, base } = await bootServer(true)
  try {
    const content = await (await fetch(`${base}/api/content`)).json()
    const attraction = content.attractions.find((item) => item.id === 'acropolis')
    assertRewritten(attraction.coverImage, 'content coverImage')
    assert.equal(attraction.coverImage, `${OVERRIDE}/images/fixture/cover.webp`, '图片前缀一一对应')
    assertRewritten(attraction.guide.docUrl, 'content guide.docUrl')
    assert.equal(attraction.guide.docUrl, `${OVERRIDE}/docs/fixture/guide.pdf`, '文档前缀一一对应')
    assert.ok(attraction.guide.note.includes(`${OVERRIDE}/images/fixture/cover.webp`), '嵌套文本内的 URL 也应改写')
    assertRewritten(content.settings.travelGuideDocs.planning, 'settings.travelGuideDocs')

    const raw = JSON.stringify(content)
    assert.ok(!raw.includes('sy-mpapp.oss-cn-shenzhen.aliyuncs.com/public/images/'), 'content 整体无残留 OSS 图片前缀')
    assert.ok(!raw.includes('sy-mpapp.oss-cn-shenzhen.aliyuncs.com/public/docs/'), 'content 整体无残留 OSS 文档前缀')

    const token = 'media-override-test-token'
    const feed = await (await fetch(`${base}/api/tickets/feed`, { headers: { Authorization: `Bearer ${token}` } })).json()
    const ticket = feed.items[0]
    assertRewritten(ticket.attachments[0].url, 'feed 附件图片')
    assertRewritten(ticket.attachments[1].url, 'feed 附件文档')
    assert.ok(ticket.body.includes(`${OVERRIDE}/images/fixture/cover.webp`), 'feed 正文图片改写')
    assert.ok(ticket.body.includes(OSS_AUDIO), 'feed 正文音频保持 OSS 不改写')

    const mdResponse = await fetch(`${base}/api/tickets/feed?format=md`, { headers: { Authorization: `Bearer ${token}` } })
    const md = await mdResponse.text()
    assert.ok(md.includes(`${OVERRIDE}/images/fixture/cover.webp`), 'markdown 附件/正文图片改写')
    assert.ok(md.includes(`${OVERRIDE}/docs/fixture/guide.pdf`), 'markdown 附件文档改写')
    assert.ok(md.includes(OSS_AUDIO), 'markdown 音频保持 OSS 不改写')
    assert.ok(!md.includes('sy-mpapp.oss-cn-shenzhen.aliyuncs.com/public/images/'), 'markdown 无残留 OSS 图片前缀')
    console.log('PASS: 开关开启时 content/feed(JSON+markdown) 图片与文档改写、音频不改写')
  } finally { server.kill() }
}

// ---- 场景 2：开关未配置，零行为变化 ----
{
  const { server, base } = await bootServer(false)
  try {
    const content = await (await fetch(`${base}/api/content`)).json()
    const attraction = content.attractions.find((item) => item.id === 'acropolis')
    assert.equal(attraction.coverImage, OSS_IMG, '未配置时图片原样输出')
    assert.equal(attraction.guide.docUrl, OSS_DOC, '未配置时文档原样输出')
    const token = 'media-override-test-token'
    const feed = await (await fetch(`${base}/api/tickets/feed`, { headers: { Authorization: `Bearer ${token}` } })).json()
    assert.equal(feed.items[0].attachments[0].url, OSS_IMG, '未配置时 feed 附件原样输出')
    const md = await (await fetch(`${base}/api/tickets/feed?format=md`, { headers: { Authorization: `Bearer ${token}` } })).text()
    assert.ok(md.includes(OSS_IMG), '未配置时 markdown 原样输出')
    console.log('PASS: 未配置开关时完全不改写（零行为变化）')
  } finally { server.kill() }
}

console.log('PASS: test-media-origin-override 全部通过')
