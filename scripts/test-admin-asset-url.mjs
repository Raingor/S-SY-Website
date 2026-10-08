import assert from 'node:assert/strict'
import { adminAssetUrl } from '../src/admin-vue/asset-url.mjs'

for (const [input, expected] of [
  ['', ''],
  ['image.jpg', '/images/image.jpg'],
  ['images/image.jpg', '/images/image.jpg'],
  ['./images/image.jpg', '/images/image.jpg'],
  ['public/images/image.jpg', '/images/image.jpg'],
  ['./public/images/image.jpg', '/images/image.jpg'],
  ['https://example.com/image.jpg', 'https://example.com/image.jpg'],
  ['/images/image.jpg', '/images/image.jpg'],
]) assert.equal(adminAssetUrl(input), expected, `admin image URL normalization: ${input}`)

assert.notEqual(adminAssetUrl('./images/image.jpg'), '/images/images/image.jpg', 'must not duplicate image directory')
console.log('PASS admin image paths: bare, relative, public, absolute and remote references')
