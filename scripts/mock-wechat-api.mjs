import http from 'node:http'

const port = Number(process.env.MOCK_WECHAT_PORT || 18080)
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (url.pathname === '/sns/jscode2session' && req.method === 'GET') {
    return res.end(JSON.stringify({ openid: 'openid-mock-001', unionid: 'unionid-mock-001', session_key: 'mock-session-key' }))
  }
  if (url.pathname === '/cgi-bin/token' && req.method === 'GET') {
    return res.end(JSON.stringify({ access_token: 'mock-access-token', expires_in: 7200 }))
  }
  if (url.pathname === '/wxa/business/getuserphonenumber' && req.method === 'POST') {
    return res.end(JSON.stringify({ errcode: 0, phone_info: { phoneNumber: '+8613812345678', purePhoneNumber: '13812345678', countryCode: '86' } }))
  }
  res.statusCode = 404
  res.end(JSON.stringify({ errcode: 404, errmsg: 'mock endpoint not found' }))
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Mock WeChat API: http://127.0.0.1:${port}`)
})
