import assert from 'node:assert/strict'
import { once } from 'node:events'
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'
import { syntheticContentFixture } from './helpers/synthetic-content-fixture.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tmp = mkdtempSync(join(tmpdir(), 'sy-map-test-'))
const mapDir = join(tmp, 'private-maps')
const port = 51000 + Math.floor(Math.random() * 5000)
const base = `http://127.0.0.1:${port}`
let child
let logs = ''
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=', 'base64')
const dataUrl = `data:image/png;base64,${png.toString('base64')}`

async function main() {
  mkdirSync(join(tmp, 'seed'), { recursive: true })
  mkdirSync(join(tmp, 'dist'), { recursive: true })
  writeFileSync(join(tmp, 'dist/index.html'), '<!doctype html><title>fixture</title>')
  for (const name of ['server.mjs', 'storage.mjs', 'wechat-pay.mjs', 'admin-session.mjs', 'heritage-content.mjs', 'attraction-ai-fill.mjs', 'private-map.mjs', 'package.json']) copyFileSync(join(root, name), join(tmp, name))
  const fixture = syntheticContentFixture()
  const spot = fixture.attractions[0]
  spot.guide = { ...(spot.guide || {}), mapImage: '', map: '南门进入' }
  writeFileSync(join(tmp, 'seed/site-data.json'), JSON.stringify(fixture))
  symlinkSync(join(root, 'node_modules'), join(tmp, 'node_modules'), 'dir')
  child = spawn(process.execPath, [join(tmp, 'server.mjs')], { cwd: tmp, env: { ...Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG', 'TZ'].filter(key => process.env[key]).map(key => [key, process.env[key]])), SY_STORAGE: 'json', PORT: String(port), SY_ADMIN_PASSWORD: 'map-test-password', SY_ADMIN_SESSION_SECRET: 'map-test-session-secret', SY_MAP_PRIVATE_DIR: mapDir }, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.on('data', (chunk) => { logs += chunk })
  child.stderr.on('data', (chunk) => { logs += chunk })
  for (let i = 0; i < 100; i += 1) {
    if (child.exitCode !== null) throw new Error(`server stopped: ${logs}`)
    try { if ((await fetch(`${base}/api/health`)).ok) break } catch { /* starting */ }
    await delay(50)
  }
  const { token } = await (await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'map-test-password' }) })).json()
  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  const record = (await (await fetch(`${base}/api/admin/attractions`, { headers: auth })).json()).find(item => item.id === spot.id)

  const uploaded = await fetch(`${base}/api/admin/upload-map`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'spot-map.png', type: 'image/png', data: dataUrl }) })
  assert.equal(uploaded.status, 201)
  const first = await uploaded.json()
  assert.match(first.path, /^\/api\/miniprogram\/attraction-map\/[a-f0-9]{32}\.png$/)
  assert.ok(existsSync(join(mapDir, first.mapFile)), 'map stored outside public/')
  assert.ok(!existsSync(join(tmp, 'public/images', first.mapFile)), 'map must not land in public images')
  assert.ok(!existsSync(join(tmp, 'dist', first.mapFile)))

  const saved = await (await fetch(`${base}/api/admin/attractions/${encodeURIComponent(spot.id)}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ ...record, guide: { ...record.guide, mapImage: first.path } }) })).json()
  assert.equal(saved.guide.mapImage, first.path)
  const publicSpot = (await (await fetch(`${base}/api/content?includeAttractionDetails=false`)).json()).attractions.find(item => item.id === spot.id)
  const mapSection = publicSpot.visitorInfoSections.find(item => item.kind === 'map')
  assert.equal(mapSection.map.image, first.path, 'public map image points at the view-only endpoint')
  assert.match(publicSpot.guide.mapImage, /^\/api\/miniprogram\/attraction-map\//)

  // View-only contract: no download filename, no public cache, image mime, HEAD supported.
  const view = await fetch(`${base}${first.path}`)
  assert.equal(view.status, 200)
  assert.equal(view.headers.get('content-type'), 'image/png')
  assert.equal(view.headers.get('content-disposition'), null, 'must not advertise a filename')
  assert.equal(view.headers.get('cache-control'), 'private, no-store')
  assert.equal(view.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(view.headers.get('accept-ranges'), 'bytes')
  assert.deepEqual(Buffer.from(await view.arrayBuffer()), png)
  const head = await fetch(`${base}${first.path}`, { method: 'HEAD' })
  assert.equal(head.status, 200)
  const ranged = await fetch(`${base}${first.path}`, { headers: { Range: 'bytes=0-7' } })
  assert.equal(ranged.status, 206)
  assert.equal(ranged.headers.get('content-range'), `bytes 0-7/${png.length}`)
  assert.equal((await fetch(`${base}${first.path.replace('.png', '.webp')}`)).status, 404, 'unknown map name 404')
  // The SPA fallback answers unknown paths with HTML, so assert the bytes are never the map itself.
  const staticProbe = await fetch(`${base}/images/${first.mapFile}`)
  assert.notEqual(staticProbe.headers.get('content-type'), 'image/png', 'no static copy is served')
  assert.ok(!Buffer.from(await staticProbe.arrayBuffer()).equals(png))
  const privateProbe = await fetch(`${base}/private-maps/${first.mapFile}`)
  assert.notEqual(privateProbe.headers.get('content-type'), 'image/png', 'private directory is not web-served')
  assert.ok(!Buffer.from(await privateProbe.arrayBuffer()).equals(png))

  // Reject non-image payloads, renamed executables and unsupported types.
  const fake = await fetch(`${base}/api/admin/upload-map`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'evil.png', type: 'image/png', data: `data:image/png;base64,${Buffer.from('#!/bin/sh\necho hi').toString('base64')}` }) })
  assert.equal(fake.status, 422)
  assert.match((await fake.json()).error, /内容无效/)
  assert.equal((await fetch(`${base}/api/admin/upload-map`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'evil.svg', type: 'image/svg+xml', data: `data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}` }) })).status, 422)
  assert.equal((await fetch(`${base}/api/admin/upload-map`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'evil.png', type: 'image/jpeg', data: dataUrl }) })).status, 422, 'declared type must match extension')
  assert.equal((await fetch(`${base}/api/admin/upload-map`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'x.png', type: 'image/png', data: dataUrl }) })).status, 401, 'upload requires admin session')

  // Replacing the map removes the superseded private file; clearing removes it too.
  const second = await (await fetch(`${base}/api/admin/upload-map`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'spot-map-2.webp', type: 'image/webp', data: `data:image/webp;base64,${Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(16)]).toString('base64')}` }) })).json()
  await fetch(`${base}/api/admin/attractions/${encodeURIComponent(spot.id)}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ ...saved, guide: { ...saved.guide, mapImage: second.path } }) })
  assert.equal(existsSync(join(mapDir, first.mapFile)), false, 'replaced map file deleted')
  assert.ok(existsSync(join(mapDir, second.mapFile)))
  assert.equal((await fetch(`${base}${first.path}`)).status, 404, 'replaced map no longer viewable')
  await fetch(`${base}/api/admin/attractions/${encodeURIComponent(spot.id)}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ ...saved, guide: { ...saved.guide, mapImage: '' } }) })
  assert.equal(existsSync(join(mapDir, second.mapFile)), false, 'cleared map file deleted')
  assert.equal((await fetch(`${base}/api/content`)).ok, true)

  // Deleting the attraction also removes its view-only map file.
  const beforeDelete = (await (await fetch(`${base}/api/admin/attractions`, { headers: auth })).json()).find(item => item.id === spot.id)
  const third = await (await fetch(`${base}/api/admin/upload-map`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'del.png', type: 'image/png', data: dataUrl }) })).json()
  await fetch(`${base}/api/admin/attractions/${encodeURIComponent(spot.id)}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ ...beforeDelete, guide: { ...beforeDelete.guide, mapImage: third.path } }) })
  assert.ok(existsSync(join(mapDir, third.mapFile)))
  assert.equal((await fetch(`${base}/api/admin/attractions/${encodeURIComponent(spot.id)}`, { method: 'DELETE', headers: auth })).status, 204)
  assert.equal(existsSync(join(mapDir, third.mapFile)), false, 'deleting the attraction deletes its map file')
  assert.equal((await fetch(`${base}${third.path}`)).status, 404)

  // Legacy public maps keep working; the endpoint is additive.
  assert.equal((await fetch(`${base}/api/admin/upload-map`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'legacy.png', type: 'image/png', data: dataUrl }) })).status, 201)
  assert.equal(JSON.parse(readFileSync(join(tmp, 'seed/site-data.json'), 'utf8')).attractions.length, fixture.attractions.length - 1, 'only the deliberately deleted attraction is gone')
  console.log('PASS: private map upload, view-only streaming (no filename/no static path/no public cache), HEAD+Range, magic-byte and mime rejection, admin auth, replace/clear/delete cleanup, public map contract')
}
try { await main() } catch (error) { console.error(error); console.error(logs); process.exitCode = 1 } finally {
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await Promise.race([once(child, 'exit'), delay(2000)]) }
  rmSync(tmp, { recursive: true, force: true })
}
