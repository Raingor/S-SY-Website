// 回归/运维脚本：把「公开可试听」的音频同步到 OSS 公读前缀（public/audio/）。
// 只写 OSS 对象，不改数据库、不改线上服务进程内存。
// 运行（生产 release 目录，需 SY_OSS_* 与 SY_STORAGE/SY_DB_* 环境变量）：
//   node scripts/migrate-public-audio-to-oss.mjs [--dry-run]
import { readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { copyPublicAudioFromPrivateOss, ossAudioConfigured, ossMediaRequest, ossPublicMediaBase, publicAudioUrl, uploadPublicAudioToOss } from '../heritage-content.mjs'
import { closeStorage, initStorage, readData } from '../storage.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const dryRun = process.argv.includes('--dry-run')
const audioExtensions = new Set(['.m4a', '.mp3', '.aac', '.wav'])

function localPublicAudio() {
  const dir = resolve(root, 'public/audio')
  try {
    return readdirSync(dir).filter((name) => audioExtensions.has(name.slice(name.lastIndexOf('.')).toLowerCase()))
  } catch { return [] }
}

async function head(key) {
  const response = await ossMediaRequest(key, { method: 'HEAD' })
  await response.arrayBuffer()
  if (!response.ok) return null
  return {
    size: Number(response.headers.get('content-length')),
    cacheControl: response.headers.get('cache-control') || '',
  }
}

async function main() {
  if (!ossAudioConfigured()) throw new Error('OSS 未配置（SY_OSS_ACCESS_KEY_ID / SY_OSS_ACCESS_KEY_SECRET）')
  await initStorage()
  const data = readData()
  const tracks = Array.isArray(data.audioTracks) ? data.audioTracks : []
  const uploads = Array.isArray(data.audioUploads) ? data.audioUploads : []
  const previewNames = [...new Set([...tracks, ...uploads].map((item) => item.previewFile).filter(Boolean))]
  const files = localPublicAudio()
  const summary = { localFiles: files.length, previewObjects: previewNames.length, uploaded: [], copied: [], skipped: [], failed: [] }

  for (const name of files) {
    const filePath = resolve(root, 'public/audio', name)
    const size = statSync(filePath).size
    if (!publicAudioUrl(name)) { summary.failed.push({ name, reason: '不支持的公开音频文件名' }); continue }
    const existing = await head(`public/audio/${name}`)
    if (existing && existing.size === size && existing.cacheControl.includes('immutable')) {
      summary.skipped.push({ name, size, reason: '已存在且缓存策略正确' })
      continue
    }
    if (dryRun) { summary.uploaded.push({ name, size, dryRun: true }); continue }
    const ok = await uploadPublicAudioToOss(name, filePath)
    const after = ok ? await head(`public/audio/${name}`) : null
    if (after && after.size === size && after.cacheControl.includes('immutable')) summary.uploaded.push({ name, size })
    else summary.failed.push({ name, reason: '上传或校验失败' })
  }

  for (const name of previewNames) {
    if (files.includes(name)) continue
    const existing = await head(`public/audio/${name}`)
    if (existing && existing.cacheControl.includes('immutable')) { summary.skipped.push({ name, size: existing.size, reason: '已存在且缓存策略正确' }); continue }
    if (dryRun) { summary.copied.push({ name, dryRun: true }); continue }
    const privateHead = await head(`audio/${name}`)
    if (!privateHead) { summary.failed.push({ name, reason: '私有 OSS 中没有该试听对象' }); continue }
    const ok = await copyPublicAudioFromPrivateOss(name)
    const after = ok ? await head(`public/audio/${name}`) : null
    if (after && after.size === privateHead.size && after.cacheControl.includes('immutable')) summary.copied.push({ name, size: after.size })
    else summary.failed.push({ name, reason: '复制或校验失败' })
  }

  summary.publicBase = `${ossPublicMediaBase()}/audio`
  console.log(JSON.stringify(summary, null, 2))
  if (summary.failed.length) process.exitCode = 1
}

await main()
await closeStorage()