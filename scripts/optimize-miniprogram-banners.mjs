import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, readFile, rename, rm, stat } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const execFileAsync = promisify(execFile)
const root = resolve(new URL('..', import.meta.url).pathname)
const imageRoot = join(root, 'public', 'images')
const endpoint = process.argv[2] || 'http://127.0.0.1:4173/api/miniprogram/home'
const quality = Number(process.env.MINIPROGRAM_BANNER_WEBP_QUALITY || 78)
const cwebp = process.env.CWEBP_BIN || 'cwebp'

if (!Number.isInteger(quality) || quality < 60 || quality > 95) throw new Error('MINIPROGRAM_BANNER_WEBP_QUALITY must be an integer from 60 to 95')

const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) })
if (!response.ok) throw new Error(`Could not fetch home banners: HTTP ${response.status}`)
const payload = await response.json()
const homeBanners = payload?.home?.banners
if (!Array.isArray(homeBanners)) throw new Error('Response does not contain home.banners')
const contentUrl = new URL('/api/content?country=greece', endpoint)
const contentResponse = await fetch(contentUrl, { signal: AbortSignal.timeout(15000) })
if (!contentResponse.ok) throw new Error(`Could not fetch heritage guide banners: HTTP ${contentResponse.status}`)
const content = await contentResponse.json()
const heritageBanners = content.heritageGuideBanners
if (!Array.isArray(heritageBanners)) throw new Error('Response does not contain heritageGuideBanners')
const banners = [...new Map([...homeBanners, ...heritageBanners].map((banner) => [String(banner?.image || ''), banner])).values()]

let converted = 0
let skipped = 0
for (const banner of banners) {
  const url = String(banner?.image || '')
  if (!url || /^(https?:)?\/\//i.test(url) || url.startsWith('/')) { skipped += 1; continue }
  const filename = url.replace(/^(?:\.\/images\/|images\/)/, '')
  if (filename !== basename(filename) || !/^[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g)$/i.test(filename)) { skipped += 1; continue }
  const source = join(imageRoot, filename)
  const sourceBytes = await readFile(source)
  const sourceHash = createHash('sha256').update(sourceBytes).digest('hex').slice(0, 10)
  const outputName = `${filename.slice(0, -extname(filename).length)}.mp-${sourceHash}.webp`
  const output = join(imageRoot, outputName)
  try { await stat(output); skipped += 1; continue } catch {}

  const tempDir = await mkdtemp(join(tmpdir(), 'sy-miniprogram-banner-'))
  const tempOutput = join(tempDir, outputName)
  try {
    await execFileAsync(cwebp, ['-quiet', '-m', '6', '-q', String(quality), '-metadata', 'none', source, '-o', tempOutput])
    const convertedBytes = await readFile(tempOutput)
    if (convertedBytes.length >= sourceBytes.length) { skipped += 1; continue }
    await mkdir(imageRoot, { recursive: true })
    await rename(tempOutput, output)
    console.log(`${filename}: ${sourceBytes.length} -> ${convertedBytes.length} bytes; ${outputName}`)
    converted += 1
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}
console.log(`Done: converted=${converted}, skipped=${skipped}, quality=${quality}`)
