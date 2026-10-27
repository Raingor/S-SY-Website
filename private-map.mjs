import crypto from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)))
const mapDir = resolve(process.env.SY_MAP_PRIVATE_DIR || resolve(projectRoot, 'private-maps'))
for (const publiclyServed of ['public', 'dist']) {
  const exposed = resolve(projectRoot, publiclyServed)
  if (mapDir === exposed || mapDir.startsWith(`${exposed}/`)) throw new Error('私有地图目录不能位于 public 或 dist 下')
}
const MAP_EXTENSIONS = new Map([['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.webp', 'image/webp']])
const mapFilePattern = /^[a-f0-9]{32}\.(?:png|jpe?g|webp)$/
const mapFile = (name) => mapFilePattern.test(String(name || '')) && existsSync(resolve(mapDir, name))

// Deliberately no Content-Disposition filename and no public static route: the only way to
// read a map is this streaming endpoint, so it cannot be saved as a named file from the UI.
export function streamPrivateMap(req, res, name, cors = {}) {
  if (!mapFile(name)) return false
  const path = resolve(mapDir, name)
  const size = statSync(path).size
  const range = /^bytes=(\d*)-(\d*)$/i.exec(String(req.headers.range || '').trim())
  if (req.headers.range && (!range || (!range[1] && !range[2]))) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return true }
  const start = !range ? 0 : range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
  const end = !range || !range[1] || !range[2] ? size - 1 : Number(range[2])
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || end >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return true }
  res.writeHead(range ? 206 : 200, { ...cors, 'Content-Type': MAP_EXTENSIONS.get(extname(name).toLowerCase()) || 'application/octet-stream', 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) })
  if (req.method === 'HEAD') res.end()
  else createReadStream(path, { start, end }).pipe(res)
  return true
}

export function uploadPrivateMap(input) {
  const name = String(input.name || '')
  const extension = extname(name).toLowerCase()
  const declared = String(input.type || '').toLowerCase()
  if (!MAP_EXTENSIONS.has(extension)) throw new Error('地图仅支持 PNG、JPG 或 WebP 图片')
  const expected = MAP_EXTENSIONS.get(extension)
  if (declared && declared !== expected && !(extension === '.jpg' && declared === 'image/jpeg')) throw new Error('文件类型与扩展名不一致')
  if (typeof input.data !== 'string' || !/^data:image\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/.test(input.data)) throw new Error('地图文件格式无效')
  const buffer = Buffer.from(input.data.slice(input.data.indexOf(',') + 1), 'base64')
  if (!buffer.length || buffer.length > 12 * 1024 * 1024) throw new Error('地图大小需在 12MB 以内')
  // Magic-byte check: an executable renamed to .png must not be stored.
  const signatureOk = expected === 'image/png' ? buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : expected === 'image/webp' ? buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      : buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (!signatureOk) throw new Error('地图图片内容无效')
  mkdirSync(mapDir, { recursive: true, mode: 0o700 })
  const stored = `${crypto.randomBytes(16).toString('hex')}${extension === '.jpeg' ? '.jpg' : extension}`
  writeFileSync(resolve(mapDir, stored), buffer, { mode: 0o600, flag: 'wx' })
  return { mapFile: stored }
}

export function removePrivateMap(name) {
  if (mapFile(name)) rmSync(resolve(mapDir, name), { force: true })
}

export function privateMapUrl(name) {
  return mapFile(name) ? `/api/miniprogram/attraction-map/${encodeURIComponent(name)}` : ''
}
