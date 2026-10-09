import { spawnSync } from 'node:child_process'
import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { extname, join, parse } from 'node:path'
import { tmpdir } from 'node:os'
import crypto from 'node:crypto'

const imageRoot = join(process.cwd(), 'public/images')
const dryRun = process.argv.includes('--dry-run')
const supported = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg'])
const maxDimension = 1920
const files = []

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) collect(path)
    else if (entry.isFile() && supported.has(extname(entry.name).toLowerCase()) && !entry.name.endsWith('.opt.webp')) files.push(path)
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}: ${(result.stderr || result.stdout).trim()}`)
  return result.stdout || ''
}

function dimensions(path) {
  const output = run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path])
  const width = Number(output.match(/pixelWidth: (\d+)/)?.[1])
  const height = Number(output.match(/pixelHeight: (\d+)/)?.[1])
  if (!width || !height) throw new Error(`Could not read image dimensions: ${path}`)
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))]
}

collect(imageRoot)
let completed = 0
let failed = 0
let sourceBytes = 0
let outputBytes = 0

for (const source of files) {
  const parsed = parse(source)
  const output = join(parsed.dir, `${parsed.name}.opt.webp`)
  const originalBytes = statSync(source).size
  let rasterSource = source
  let temporaryPng = ''
  try {
    if (extname(source).toLowerCase() === '.svg') {
      temporaryPng = join(tmpdir(), `sy-image-${crypto.randomBytes(8).toString('hex')}.png`)
      run('sips', ['-s', 'format', 'png', source, '--out', temporaryPng])
      rasterSource = temporaryPng
    }
    const [width, height] = dimensions(rasterSource)
    const args = ['-quiet', '-mt', '-m', '6']
    if (width !== Number(run('sips', ['-g', 'pixelWidth', rasterSource]).match(/pixelWidth: (\d+)/)?.[1]) || height !== Number(run('sips', ['-g', 'pixelHeight', rasterSource]).match(/pixelHeight: (\d+)/)?.[1])) {
      args.push('-resize', String(width), String(height))
    }
    if (extname(rasterSource).toLowerCase() === '.png' && originalBytes <= 128 * 1024) args.push('-lossless', '-exact')
    else args.push('-q', '82', '-alpha_q', '100')
    args.push(rasterSource, '-o', output)
    if (dryRun) {
      completed += 1
      sourceBytes += originalBytes
      continue
    }
    run('cwebp', args)
    const optimizedBytes = statSync(output).size
    completed += 1
    sourceBytes += originalBytes
    outputBytes += optimizedBytes
    console.log(`${source.slice(imageRoot.length + 1)} ${originalBytes} -> ${optimizedBytes} bytes`)
  } catch (error) {
    failed += 1
    console.error(`FAILED ${source}: ${error.message}`)
  } finally {
    if (temporaryPng) unlinkSync(temporaryPng)
  }
}

console.log(`Images: ${completed} processed, ${failed} failed${dryRun ? ' (dry run)' : ''}`)
if (!dryRun) console.log(`Total: ${(sourceBytes / 1024 / 1024).toFixed(1)} MiB -> ${(outputBytes / 1024 / 1024).toFixed(1)} MiB (${sourceBytes ? (100 - outputBytes / sourceBytes * 100).toFixed(1) : 0}% smaller)`)
if (failed) process.exitCode = 1
