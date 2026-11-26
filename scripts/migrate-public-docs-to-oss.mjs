// 运维脚本：把出行指南里引用到的 /docs/*.pdf 同步到 OSS 公读前缀（public/docs/），
// 再把 payload 里的引用改成稳定的 https 绝对地址。
// 只处理 payload 中真实引用到的文件名，站外链接一律不碰。
//
// 运行（生产 release 目录，需 SY_OSS_* 与 SY_STORAGE/SY_DB_* 环境变量）：
//   node scripts/migrate-public-docs-to-oss.mjs --dry-run
//   node scripts/migrate-public-docs-to-oss.mjs --apply-uploads --dir /path/to/public/docs
//   node scripts/migrate-public-docs-to-oss.mjs --apply-records --backup /root/sy-greece-backups/<tag>
// --apply-records 会写库，必须先停服，否则运行中的服务会用内存缓存覆盖本次写入。
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { closeStorage, initStorage, readData, saveData } from '../storage.mjs'
import { ossAudioConfigured, publicDocumentUrl, uploadPublicDocumentToOss } from '../heritage-content.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const dryRun = process.argv.includes('--dry-run')
const applyUploads = process.argv.includes('--apply-uploads')
const applyRecords = process.argv.includes('--apply-records')
const argValue = (name, fallback = '') => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? String(process.argv[index + 1] || '') || fallback : fallback
}
const sourceDir = resolve(argValue('--dir', resolve(root, 'public/docs')))
const backupDir = argValue('--backup', '')
const DOC_REF = /^\/docs\/([a-z0-9][a-z0-9._-]*\.pdf)$/i

function collectDocs(data) {
  const maps = { travelGuideDocs: data.settings?.travelGuideDocs, travelGuides: data.travelGuide?.docs }
  const names = new Set()
  for (const map of Object.values(maps)) {
    for (const value of Object.values(map || {})) {
      const match = String(value || '').match(DOC_REF)
      if (match) names.add(match[1])
    }
  }
  return [...names].sort()
}

async function head(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(30000) })
    return {
      status: response.status,
      size: Number(response.headers.get('content-length') || 0),
      contentType: String(response.headers.get('content-type') || ''),
      server: String(response.headers.get('server') || ''),
    }
  } catch (error) {
    return { status: 0, size: 0, contentType: '', server: '', error: error.message }
  }
}

async function main() {
  if (!dryRun && !applyUploads && !applyRecords) throw new Error('请指定 --dry-run、--apply-uploads 或 --apply-records')
  await initStorage()
  const data = readData()
  const names = collectDocs(data)
  const summary = { mode: dryRun ? 'dry-run' : applyUploads ? 'apply-uploads' : 'apply-records', sourceDir, names: names.length, files: [], uploaded: [], skipped: [], failed: [], rewritten: 0 }
  if (!names.length) throw new Error('payload 中没有 /docs/*.pdf 引用，已中止')

  for (const name of names) {
    const filePath = resolve(sourceDir, name)
    const url = publicDocumentUrl(name)
    if (!url) { summary.failed.push({ name, reason: '文件名不符合公开文档规则' }); continue }
    if (!existsSync(filePath)) { summary.failed.push({ name, reason: `源文件不存在：${filePath}` }); continue }
    const body = readFileSync(filePath)
    const sha256 = createHash('sha256').update(body).digest('hex')
    const localSize = statSync(filePath).size
    const before = await head(url)
    const entry = { name, localSize, sha256: sha256.slice(0, 16), url, before: before.status ? `${before.status} ${before.contentType} ${before.size}` : `HEAD 失败：${before.error || 'unknown'}` }
    if (before.status === 200 && before.size === localSize && /application\/pdf/i.test(before.contentType)) {
      summary.skipped.push({ ...entry, reason: 'OSS 已存在且字节一致' })
    } else if (dryRun) {
      summary.files.push({ ...entry, action: before.status === 200 ? '覆盖（字节不一致）' : '上传（不存在）' })
    } else if (applyUploads) {
      const uploadedUrl = await uploadPublicDocumentToOss(name, body)
      const after = uploadedUrl ? await head(uploadedUrl) : { status: 0 }
      if (uploadedUrl && after.status === 200 && after.size === localSize && /application\/pdf/i.test(after.contentType) && /AliyunOSS/i.test(after.server)) {
        summary.uploaded.push({ ...entry, url: uploadedUrl, after: `${after.status} ${after.contentType} ${after.size}` })
      } else {
        summary.failed.push({ ...entry, reason: `上传后校验失败：${JSON.stringify(after)}` })
      }
    }
  }

  const blockingFailure = summary.failed.length > 0
  if (applyRecords) {
    if (blockingFailure) throw new Error('存在未通过校验的文件，拒绝改记录')
    for (const name of names) {
      const url = publicDocumentUrl(name)
      const probe = await head(url)
      if (probe.status !== 200 || probe.size !== statSync(resolve(sourceDir, name)).size || !/application\/pdf/i.test(probe.contentType)) {
        throw new Error(`记录改写前的最终校验失败：${name} ${probe.status} ${probe.contentType} ${probe.size}`)
      }
    }
    if (!backupDir) throw new Error('--apply-records 必须提供 --backup <dir>')
    mkdirSync(backupDir, { recursive: true })
    const backup = { savedAt: new Date().toISOString(), settingsTravelGuideDocs: data.settings?.travelGuideDocs || {}, travelGuideDocs: data.travelGuide?.docs || {} }
    writeFileSync(resolve(backupDir, 'travel-guide-docs-before.json'), `${JSON.stringify(backup, null, 2)}\n`)
    let rewritten = 0
    for (const map of [data.settings?.travelGuideDocs, data.travelGuide?.docs]) {
      if (!map) continue
      for (const key of Object.keys(map)) {
        const match = String(map[key] || '').match(DOC_REF)
        if (!match) continue
        map[key] = publicDocumentUrl(match[1])
        rewritten += 1
      }
    }
    await saveData(data)
    summary.rewritten = rewritten
    summary.remainingLocalRefs = collectDocs(data).length
  }

  await closeStorage()
  console.log(JSON.stringify(summary, null, 2))
  if (summary.failed.length) process.exitCode = 1
}

main().catch(async (error) => {
  console.error(error.message)
  try { await closeStorage() } catch {}
  process.exitCode = 1
})
