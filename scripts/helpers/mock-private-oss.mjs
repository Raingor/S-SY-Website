import http from 'node:http'
import crypto from 'node:crypto'

// Loopback-only private OSS fixture. Validate signatures independently of the app.
export async function createMockPrivateOss() {
  const objects = new Map(), uploads = new Map(), requests = []
  const control = { failPart: false, failPreview: false, completeError: false, wrongHeadSize: false }
  const secret = 'fixture-oss-secret', accessKeyId = 'fixture-oss-id', bucket = 'sy-mpapp'
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://fixture.invalid')
      const key = decodeURIComponent(url.pathname.slice(1))
      const signedQuery = url.searchParams.has('Signature')
      const query = [...url.searchParams.keys()].filter((name) => !['Signature','Expires','OSSAccessKeyId'].includes(name)).sort().map((name) => url.searchParams.get(name) ? `${name}=${url.searchParams.get(name)}` : name).join('&')
      const headers = Object.keys(req.headers).filter((name) => name.startsWith('x-oss-')).sort().map((name) => `${name}:${req.headers[name]}\n`).join('')
      const canonical = `${req.method}\n${req.headers['content-md5'] || ''}\n${req.headers['content-type'] || ''}\n${signedQuery ? url.searchParams.get('Expires') : req.headers.date}\n${headers}/${bucket}/${key}${query ? '?' + query : ''}`
      const signature = crypto.createHmac('sha1', secret).update(canonical).digest('base64')
      if (signedQuery ? url.searchParams.get('Signature') !== signature || url.searchParams.get('OSSAccessKeyId') !== accessKeyId : req.headers.authorization !== 'OSS ' + accessKeyId + ':' + signature) { res.writeHead(403); res.end('<Error><Code>SignatureDoesNotMatch</Code></Error>'); return }
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = Buffer.concat(chunks)
      if (req.headers['content-md5'] && req.headers['content-md5'] !== crypto.createHash('md5').update(body).digest('base64')) { res.writeHead(400); res.end(); return }
      requests.push({ method: req.method, key, query, size: body.length, acl: req.headers['x-oss-object-acl'] })
      const uploadId = url.searchParams.get('uploadId')
      if (req.method === 'POST' && url.searchParams.has('uploads')) {
        const id = crypto.randomBytes(16).toString('hex')
        uploads.set(id, { key, parts: new Map(), type: req.headers['content-type'] })
        res.end(`<InitiateMultipartUploadResult><UploadId>${id}</UploadId></InitiateMultipartUploadResult>`)
      } else if (req.method === 'PUT' && uploadId) {
        if (control.failPart) { res.writeHead(503); res.end('<Error/>'); return }
        const upload = uploads.get(uploadId), number = Number(url.searchParams.get('partNumber'))
        if (!upload || upload.key !== key) { res.writeHead(404); res.end(); return }
        const etag = crypto.createHash('md5').update(body).digest('hex').toUpperCase()
        upload.parts.set(number, { body, etag })
        res.setHeader('ETag', `"${etag}"`); res.end()
      } else if (req.method === 'POST' && uploadId) {
        if (control.completeError) { res.end('<Error><Code>InvalidPart</Code></Error>'); return }
        const upload = uploads.get(uploadId)
        if (!upload || upload.key !== key) { res.writeHead(404); res.end(); return }
        const parts = [...body.toString().matchAll(/<PartNumber>(\d+)<\/PartNumber><ETag>"([A-Fa-f0-9]+)"<\/ETag>/g)]
        if (!parts.length || parts.some(([,number,etag]) => upload.parts.get(Number(number))?.etag !== etag) || req.headers['x-oss-object-acl'] !== 'private') { res.writeHead(400); res.end(); return }
        objects.set(key, { body: Buffer.concat(parts.map(([,number]) => upload.parts.get(Number(number)).body)), type: upload.type, acl: 'private' })
        uploads.delete(uploadId)
        res.end('<CompleteMultipartUploadResult><ETag>"complete"</ETag></CompleteMultipartUploadResult>')
      } else if (req.method === 'PUT') {
        if (control.failPreview && key.includes('-preview.')) { res.writeHead(503); res.end(); return }
        if (req.headers['x-oss-object-acl'] !== 'private') { res.writeHead(403); res.end(); return }
        objects.set(key, { body, type: req.headers['content-type'], acl: 'private' }); res.end()
      } else if (req.method === 'DELETE') {
        if (uploadId) uploads.delete(uploadId)
        else objects.delete(key)
        res.writeHead(204); res.end()
      } else if (['HEAD','GET'].includes(req.method)) {
        const object = objects.get(key)
        if (!object) { res.writeHead(404); res.end(); return }
        const length = object.body.length
        res.setHeader('Content-Type', object.type)
        if (req.method === 'HEAD') { res.setHeader('Content-Length', length + (control.wrongHeadSize ? 1 : 0)); res.end(); return }
        const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '')
        if (range) {
          const start = Number(range[1]), end = Math.min(length - 1, range[2] ? Number(range[2]) : length - 1)
          if (start >= length) { res.writeHead(416, { 'Content-Range': `bytes */${length}` }); res.end(); return }
          res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${length}`, 'Content-Length': end - start + 1 }); res.end(object.body.subarray(start, end + 1))
        } else { res.setHeader('Content-Length', length); res.end(object.body) }
      } else { res.writeHead(405); res.end() }
    } catch { if (!res.headersSent) res.writeHead(500); res.end() }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { server, objects, uploads, requests, control, env: { SY_OSS_ACCESS_KEY_ID: accessKeyId, SY_OSS_ACCESS_KEY_SECRET: secret, SY_OSS_BUCKET: bucket, SY_OSS_ENDPOINT: `http://127.0.0.1:${server.address().port}` } }
}
