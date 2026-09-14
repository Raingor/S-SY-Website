# SY 希腊蔚蓝海岸网站

SY Greece 中高端希腊私人定制旅行官网，包含前台展示、预约留资和统一后台管理。

## 访问地址

### 正式域名（当前配置）

- 网站首页：<https://sy-greece.com/>
- Richard 李名人导游：<https://sy-greece.com/guides/richard-li>
- Richard 李英文版：<https://sy-greece.com/guides/richard-li?lang=en>
- Richard 李繁体中文：<https://sy-greece.com/guides/richard-li?lang=zh-TW>
- Richard 李日文版：<https://sy-greece.com/guides/richard-li?lang=ja>
- Richard 李希腊语版：<https://sy-greece.com/guides/richard-li?lang=el>

### 本地访问

启动服务后：

- 网站首页：<http://127.0.0.1:4173/>
- Richard 李名人导游：<http://127.0.0.1:4173/guides/richard-li>
- 后台管理：<http://127.0.0.1:4173/manage-9f3k7>
- 健康检查：<http://127.0.0.1:4173/api/health>

## 后台登录

- 后台地址：<https://sy-greece.com/manage-9f3k7>
- 本地后台地址：<http://127.0.0.1:4173/manage-9f3k7>
- 生产密码：`7f40605c585310b47896583c37fd7b8b9474ec9c73f7ebe4`

生产环境请通过环境变量修改密码：

```bash
SY_ADMIN_PASSWORD='生产环境变量中的密码' npm run start
```

> 不要在生产环境继续使用默认密码。后台路径为非公开入口，但不能替代密码安全措施。

## 启动方式

```bash
npm install
npm run build
npm run server
```

或直接执行：

```bash
npm run start
```

默认端口为 `4173`，可通过 `PORT` 修改：

```bash
PORT=4174 npm run start
```

开发模式：

```bash
npm run dev
```

## 多语言

语言切换器支持：

- 简体中文：`zh-CN`
- 繁体中文：`zh-TW`
- English：`en`
- 日本語：`ja`
- Ελληνικά：`el`

语言可以通过页面右上角切换，也可以使用 URL 参数，例如：

```text
/guides/richard-li?lang=en
```

当前 Richard 导游页、全局导航、CTA 和页脚已完成五语适配；路线、目的地和旅行工具的既有长篇内容仍以中文为主。

## 后台功能

- 路线管理
- 目的地管理
- 定制线索管理
- Richard 导游预约管理
- 小程序预约管理
- 预约状态：待处理、已联系、已报价、已完成
- 站点与 SEO 配置

预约统一写入 `data/site-data.json`，并通过 `/api/leads` 接收。后台 API 使用登录后 Bearer Token 鉴权。

## 小程序登录与手机号绑定 API

小程序用户默认未登录，Website 不接收小程序端的微信 AppSecret。上线前需在服务端环境配置：

```bash
WX_APPID='微信小程序 AppID'
WX_APP_SECRET='微信小程序 AppSecret'
SY_MINIPROGRAM_TOKEN_SECRET='用于签发小程序用户 Token 的随机密钥'
```

接口：

- `POST /api/miniprogram/auth/wx-login`：请求 `{ "code": "wx.login 返回的 code" }`，服务端调用微信 `jscode2session`，返回 `accessToken`、`tokenType`、`expiresIn` 和 `user`。
- `GET /api/miniprogram/auth/me`：需要 `Authorization: Bearer <accessToken>`，返回 `phoneBound` 与脱敏手机号。
- `POST /api/miniprogram/auth/phone`：需要 Bearer Token，请求 `{ "code": "wx.getPhoneNumber 回调中的 code" }`，服务端调用微信手机号接口并保存绑定手机号。

小程序提交表单时继续使用 `POST /api/leads`，并携带 Bearer Token 及 `platform: "wechat-miniprogram"`（或 `source` 同值）。未登录返回 `401 MINIPROGRAM_LOGIN_REQUIRED`，未绑定手机号返回 `403 PHONE_BIND_REQUIRED`；绑定后服务端从用户记录写入联系方式，不信任客户端传入的手机号。小程序用户记录保存在 `data/site-data.json` 的 `miniprogramUsers` 中，微信 `openid` 不会通过 API 返回。

### 本地 Mock 联调

启动 Mock 微信接口（监听 `127.0.0.1:18080`）：

```bash
npm run mock:wechat
```

另开终端启动 Website API（监听 `127.0.0.1:4174`）：

```bash
WX_APPID=mock-appid \\
WX_APP_SECRET=mock-secret \\
SY_MINIPROGRAM_TOKEN_SECRET=local-mock-token-secret \\
WX_API_BASE_URL=http://127.0.0.1:18080 \\
PORT=4174 npm run server
```

MpApp 联调 API 根地址使用 `http://127.0.0.1:4174`。Mock 接受任意登录 code 和手机号 code，测试 code 可使用 `mock-login-code`、`mock-phone-code`；手机号返回 `+8613812345678`。Mock 仅用于本地联调，不可用于生产。
