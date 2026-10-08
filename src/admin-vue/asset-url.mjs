// Admin uploads and public APIs may reference the same image as a bare filename,
// images/name, ./images/name or public/images/name. Avoid duplicating /images/.
export function adminAssetUrl(path) {
  if (!path) return ''
  const value = String(path).trim()
  if (/^(?:https?:|data:|blob:|\/)/i.test(value)) return value
  const filename = value.replace(/^(?:\.\/|public\/)+/g, '').replace(/^(?:images\/)+/, '')
  return filename ? `/images/${filename}` : ''
}
