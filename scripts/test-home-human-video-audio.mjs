import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const preview = { sourceVideoId: 'human-video-fixture', attractionId: 'acropolis', kind: 'human-video-audio', previewUrl: '/audio/human-video-preview-60s.m4a', previewSeconds: 60 }

async function check(name, change, expected = null) {
  const temp = await mkdtemp(join(tmpdir(), 'sy-home-human-video-'))
  let server
  try {
    for (const dir of ['seed', 'public/audio']) await mkdir(join(temp, dir), { recursive: true })
    for (const file of ['server.mjs', 'storage.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'private-map.mjs', 'attraction-ai-fill.mjs', 'wechat-pay.mjs']) await cp(join(root, file), join(temp, file))
    await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir')
    const fixture = syntheticContentFixture()
    fixture.guideVideos = [{ id: preview.sourceVideoId, attractionId: 'acropolis', title: '真人视频来源', durationSeconds: 2375, status: 'published', ossKey: 'private/original.mp4' }]
    fixture.home = { audioPreview: { ...preview, fullVideoUrl: 'https://private.invalid/original.mp4?Signature=private', internalNote: 'must stay private' } }
    change(fixture)
    await writeFile(join(temp, 'seed/site-data.json'), JSON.stringify(fixture))
    // The HTTP byte/range checks need an isolated media fixture, not an actual private video.
    if (name !== 'missing public excerpt') await writeFile(join(temp, 'public/audio/human-video-preview-60s.m4a'), Buffer.from('synthetic-public-audio-fixture'))
    const listener = net.createServer()
    await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve))
    const port = listener.address().port
    await new Promise(resolve => listener.close(resolve))
    const base = `http://127.0.0.1:${port}`
    server = spawn(process.execPath, ['server.mjs'], { cwd: temp, env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), SY_STORAGE: 'json', SY_ADMIN_PASSWORD: 'test-only-home-preview-password' }, stdio: ['ignore', 'ignore', 'pipe'] })
    let errors = ''
    server.stderr.on('data', chunk => { errors += chunk })
    let ready = false
    for (let i = 0; i < 100; i += 1) {
      try { if ((await fetch(base + '/api/health')).ok) { ready = true; break } } catch {}
      if (server.exitCode !== null) break
      await sleep(50)
    }
    assert.ok(ready, `${name}: server must start (${errors})`)
    const contentResponse = await fetch(base + '/api/content')
    assert.equal(contentResponse.status, 200)
    assert.equal(contentResponse.headers.get('cache-control'), 'no-store')
    const content = await contentResponse.json()
    const home = await (await fetch(base + '/api/miniprogram/home')).json()
    if (expected) {
      assert.deepEqual(content.home.audioPreview, expected)
      assert.deepEqual(home.home.audioPreview, expected, 'both home APIs publish the same contract')
      const head = await fetch(base + preview.previewUrl, { method: 'HEAD' })
      assert.equal(head.status, 200)
      assert.equal(head.headers.get('content-type'), 'audio/mp4')
      const range = await fetch(base + preview.previewUrl, { headers: { Range: 'bytes=0-3' } })
      assert.equal(range.status, 206)
      assert.equal((await range.arrayBuffer()).byteLength, 4)
      const locked = await (await fetch(base + `/api/miniprogram/video/${preview.sourceVideoId}/access`)).json()
      assert.equal(locked.access, 'locked', 'public excerpt does not unlock the private original')
      assert.equal(locked.playUrl, undefined)
    } else {
      assert.equal(content.home.audioPreview, undefined, `${name}: no fallback audio source`)
      assert.equal(home.home.audioPreview, undefined)
      if (name === 'missing public excerpt') assert.equal((await fetch(base + preview.previewUrl)).status, 404)
    }
    assert.equal(JSON.stringify(content.home).includes('Signature='), false)
    assert.equal(content.guideVideos.some(video => video.ossKey), false)
    console.log(`PASS ${name}`)
  } finally {
    if (server?.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit') }
    await rm(temp, { recursive: true, force: true })
  }
}

const guidePreview = { kind: 'guide-audio', attractionId: 'acropolis', sourceAudioId: 'acropolis-guide-30min', previewUrl: '/audio/human-video-preview-60s.m4a', previewSeconds: 30 }
await check('verified human video excerpt', () => {}, preview)
await check('public HTTPS excerpt URL', fixture => { fixture.home.audioPreview.previewUrl = 'https://sy-greece.com' + preview.previewUrl }, { ...preview, previewUrl: 'https://sy-greece.com' + preview.previewUrl })
await check('missing metadata', fixture => { delete fixture.home.audioPreview })
await check('unpublished source', fixture => { fixture.guideVideos[0].status = 'unpublished' })
await check('wrong source attraction', fixture => { fixture.guideVideos[0].attractionId = 'delphi' })
await check('online audio cannot replace human video', fixture => { fixture.home.audioPreview.kind = 'online' })
await check('private signed video cannot be a public excerpt', fixture => { fixture.home.audioPreview.previewUrl = 'https://private.invalid/original.mp4?Signature=private' })
await check('preview longer than one minute', fixture => { fixture.home.audioPreview.previewSeconds = 61 })
await check('missing public excerpt', () => {})
await check('guide audio excerpt', fixture => { fixture.home.audioPreview = { ...guidePreview } }, guidePreview)
await check('guide audio falls back to sourceVideoId', fixture => { fixture.home.audioPreview = { ...guidePreview, sourceAudioId: '', sourceVideoId: 'acropolis-guide-30min' } }, guidePreview)
await check('guide audio without source id', fixture => { fixture.home.audioPreview = { ...guidePreview, sourceAudioId: '' } })
await check('guide audio longer than one minute', fixture => { fixture.home.audioPreview = { ...guidePreview, previewSeconds: 61 } })
await check('guide audio needs existing excerpt', fixture => { fixture.home.audioPreview = { ...guidePreview, previewUrl: '/audio/missing-guide-preview.m4a' } })
await check('guide audio rejects video original', fixture => { fixture.home.audioPreview = { ...guidePreview, previewUrl: '/audio/acropolis-30min.mp4' } })
await check('guide audio unknown attraction', fixture => { fixture.home.audioPreview = { ...guidePreview, attractionId: 'unknown-city' } })
await check('guide audio disabled', fixture => { fixture.home.audioPreview = { ...guidePreview, enabled: false } })
