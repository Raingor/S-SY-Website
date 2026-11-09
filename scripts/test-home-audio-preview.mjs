import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const temp = await mkdtemp(join(tmpdir(), 'sy-home-preview-'))
let child
await mkdir(join(temp, 'seed'))
await mkdir(join(temp, 'public/audio'), { recursive: true })
await writeFile(join(temp, 'public/audio/fixture-preview.m4a'), Buffer.alloc(128, 1))
for (const name of ['server.mjs','storage.mjs','admin-session.mjs','heritage-content.mjs','private-map.mjs','attraction-ai-fill.mjs','wechat-pay.mjs']) await cp(join(root, name), join(temp, name))
await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')
const preview = { kind: 'human-video-audio', sourceVideoId: 'fixture-video', attractionId: 'acropolis', previewSeconds: 60, previewUrl: '/audio/fixture-preview.m4a' }
const source = { id: 'fixture-video', attractionId: 'acropolis', status: 'published', durationSeconds: 65, ossKey: 'video/private.mp4' }
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const done = new Promise((resolve) => child.once('exit', resolve))
  child.kill('SIGTERM'); await done
}
try {
  for (const test of [
    { name: 'local public excerpt', visible: true },
    { name: 'official HTTPS excerpt', preview: { previewUrl: 'https://sy-greece.com/audio/fixture-preview.m4a' }, visible: true },
    { name: 'unpublished source', source: { status: 'unpublished' }, visible: false },
    { name: 'short source', source: { durationSeconds: 30 }, visible: false },
    { name: 'missing excerpt', preview: { previewUrl: '/audio/missing.m4a' }, visible: false },
    { name: 'private video cannot become public audio', preview: { previewUrl: 'https://sy-mpapp.oss-cn-shenzhen.aliyuncs.com/video/private.mp4' }, visible: false },
  ]) {
    const fixture = syntheticContentFixture()
    fixture.home = { audioPreview: { ...preview, ...test.preview } }
    fixture.guideVideos = [{ ...source, ...test.source }]
    await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))
    const listener = net.createServer()
    await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve))
    const port = listener.address().port
    await new Promise((resolve) => listener.close(resolve))
    const base = `http://127.0.0.1:${port}`
    child = spawn(process.execPath, ['server.mjs'], { cwd: temp, env: { PATH: process.env.PATH, HOME: process.env.HOME, SY_STORAGE: 'json', SY_SKIP_STARTUP_SAVE: '1', PORT: String(port) }, stdio: 'ignore' })
    let ready = false
    for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/api/health')).ok) { ready = true; break } } catch {} await sleep(50) }
    assert(ready, test.name)
    const home = (await (await fetch(base + '/api/miniprogram/home')).json()).home
    const content = await (await fetch(base + '/api/content')).json()
    for (const value of [home.audioPreview, content.home.audioPreview]) {
      assert.equal(Boolean(value), test.visible, test.name)
      if (test.visible) { assert.equal(value.previewUrl, fixture.home.audioPreview.previewUrl); assert.equal(value.previewSeconds, 60); assert.equal(value.ossKey, undefined) }
    }
    const audio = await fetch(base + '/audio/fixture-preview.m4a', { headers: { Range: 'bytes=0-15' } })
    assert.equal(audio.status, 206); assert.equal((await audio.arrayBuffer()).byteLength, 16)
    assert.equal((await fetch(base + '/audio/missing.m4a')).status, 404)
    await stop()
  }
  console.log('PASS existing production home-audio contract: home/content excerpt, public audio Range, genuine missing-file 404, unpublished/short/private-source guards')
} finally { await stop(); await rm(temp, { recursive: true, force: true }) }
