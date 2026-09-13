import { copyFileSync, existsSync, symlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const builtEntry = resolve(projectDir, 'dist/src-entry.html')

copyFileSync(builtEntry, resolve(projectDir, 'dist/index.html'))
copyFileSync(builtEntry, resolve(projectDir, 'index.html'))

const rootImages = resolve(projectDir, 'images')
if (!existsSync(rootImages)) {
  symlinkSync('public/images', rootImages, 'dir')
}

console.log('Portable entry and image-path fallback written')
