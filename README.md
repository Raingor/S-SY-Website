# 希腊旅行管家网站

Greece Travel Butler 中高端希腊私人定制旅行官网，包含前台展示、预约留资和统一后台管理。

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
- 上线就绪检查：<http://127.0.0.1:4173/api/readiness>

## 后台登录

- 后台地址：<https://sy-greece.com/manage-9f3k7>
- 本地后台地址：<http://127.0.0.1:4173/manage-9f3k7>

后台密码不写入仓库。启动服务前必须通过环境变量提供独立的生产密码；未配置时 `/api/readiness` 会失败，后台登录也会被拒绝：

```bash
SY_ADMIN_PASSWORD='请通过部署平台注入的密码' npm run start
```

> 后台路径为非公开入口，但不能替代密码安全措施。生产环境还需配置 `WX_APPID`、`WX_APP_SECRET`、`SY_MINIPROGRAM_TOKEN_SECRET` 和 `SY_ALLOWED_ORIGIN`。

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

生产环境使用 MariaDB 持久化站点数据，数据库连接由服务端环境变量注入；本地未配置数据库时才回退到 `data/site-data.json`。预约统一通过 `/api/leads` 接收，后台 API 使用登录后 Bearer Token 鉴权。

### MariaDB 配置

生产服务需要配置以下变量：

```bash
SY_STORAGE=mariadb
SY_DB_HOST=127.0.0.1
SY_DB_PORT=3307
SY_DB_NAME=sygreece_website
SY_DB_USER=sygreece_web
SY_DB_PASSWORD='MariaDB 应用账号密码'
```

服务首次启动时会自动创建 `sy_site_data` 表；如果表为空，会从 `data/site-data.json` 导入初始内容。迁移前应先备份生产 JSON，迁移后 JSON 只作为回滚种子，不再作为生产写入源。

## 小程序登录与手机号绑定 API

小程序用户默认未登录，Website 不接收小程序端的微信 AppSecret。上线前需在服务端环境配置：

```bash
WX_APPID='微信小程序 AppID'
WX_APP_SECRET='微信小程序 AppSecret'
SY_MINIPROGRAM_TOKEN_SECRET='用于签发小程序用户 Token 的随机密钥'
```

接口：

- `POST /api/miniprogram/auth/wx-login`：请求 `{ "code": "wx.login 返回的 code", "nickname": "可选微信昵称", "avatarUrl": "可选 HTTPS 头像地址" }`，服务端调用微信 `jscode2session`，返回 `accessToken`、`tokenType`、`expiresIn` 和包含 `nickname`、`avatarUrl` 的 `user`；缺少昵称时生成 `用户+随机数`，已有资料不会被空值覆盖。
- `GET /api/miniprogram/auth/me`：需要 `Authorization: Bearer <accessToken>`，返回 `nickname`、`avatarUrl`、`phoneBound` 与脱敏手机号。
- `POST /api/miniprogram/auth/phone`：需要 Bearer Token，请求 `{ "code": "wx.getPhoneNumber 回调中的 code" }`，服务端调用微信手机号接口并保存绑定手机号。
- `GET /api/miniprogram/profile`：需要 Bearer Token，返回当前用户资料以及真实统计 `{ user, stats: { appointments, trips, coupons, profiles } }`；预约统计包含导游/用车，行程统计包含定制/商旅，资料统计为常用出行人与证件资料数量。
- `POST /api/miniprogram/profile/avatar`：需要 Bearer Token，以 `multipart/form-data` 上传字段 `file`，支持 PNG、JPG、WebP，单文件不超过 6MB；成功返回新的脱敏 `user.avatarUrl`。
- `PATCH /api/miniprogram/profile`：需要 Bearer Token，仅允许修改当前用户 `nickname`；空昵称及“微信用户”等通用无效昵称返回 `422 INVALID_NICKNAME`，成功返回脱敏 `user`。登录接口只在已有昵称为空时接受新的昵称。
- `GET /api/miniprogram/leads`：需要 Bearer Token，只返回当前用户自己的线索，响应 `{ "items": [...] }`；可用 `leadType`、`status` 查询参数筛选，不返回 openid、unionid 或其他用户数据。
- `GET/POST/PATCH/DELETE /api/miniprogram/travelers[/:id]`：当前用户的常用出行人资料，字段 `name`、`relation`、`passportNo`。
- `GET/POST/PATCH/DELETE /api/miniprogram/documents[/:id]`：当前用户的护照/签证资料，字段 `name`、`passportNo`、`expiry`、`visaStatus`。
- `GET /api/miniprogram/coupons`：需要 Bearer Token，返回真实优惠券 `{ "items": [] }`；当前没有优惠券时保持空数组，不生成演示数据。

### 小程序模拟商品与模拟支付（仅联调）

该能力默认关闭，服务端设置 `SY_MINIPROGRAM_SIMULATION_ENABLED=true` 后才开放；它使用独立的 `miniprogramSimulation.orders` 命名空间，不写入真实小程序用户或真实订单，也不会调用微信支付。关闭环境变量后相关接口返回 `404 MINIPROGRAM_SIMULATION_DISABLED`。

推荐先调用手机号测试会话接口获取 Bearer Token；旧的 `sim-regular`、`sim-attraction`、`sim-membership` fixture 仍保留用于无订单权益回归，但创建订单必须使用手机号会话。测试会话只在模拟开关开启时可用，手机号仅用于隔离测试订单，不代表真实微信手机号授权。

- `POST /api/miniprogram/simulation/session`：请求 `{ "phone": "13800138000" }`，返回 `simulation: true`、签名 `accessToken` 及脱敏手机号用户；手机号会标准化为带国家码的测试身份。
- `GET /api/miniprogram/knowledge/config`：返回后台 `settings.miniprogramKnowledge` 中的 `trialSeconds`、两类商品及 `simulation: true`。测试价格固定默认均为 `0.01 CNY`，不会产生真实扣款。
- `GET /api/miniprogram/entitlements`：需要手机号测试会话 Bearer Token，按 `phoneHash` 返回 `member`、`purchases`、`unlockedAttractions`、`favorites`、`history` 和完整 `orders`。终身会员会自动解锁所有当前及未来发布的景点。
- `GET /api/miniprogram/orders`：需要手机号测试会话，返回当前测试手机号下的模拟订单列表。
- `POST /api/miniprogram/orders`：需要手机号测试会话，请求 `{ "productType": "attraction", "attractionId": "acropolis" }` 或 `{ "productType": "membership" }`，返回价格 `0.01` 的 `pending` 订单和 `payment: null`；订单保存 `verifiedPhone`、`phoneHash` 与用户身份。
- `POST /api/miniprogram/orders/:id/simulate-paid`：将测试订单置为 `paid` 并授予对应权益；重复调用幂等。
- `POST /api/miniprogram/orders/:id/simulate-failed`：将测试订单置为 `failed`，返回 `SIMULATED_PAYMENT_FAILED`，不会授予权益；重复调用幂等。
- `POST /api/miniprogram/simulation/reset`：清理当前测试身份生成的模拟订单；fixture 身份的预置状态仍保留。

示例：

```bash
SESSION=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"phone":"13800138000"}' \
  http://127.0.0.1:4174/api/miniprogram/simulation/session)
SIM="Authorization: Bearer $(node -p "JSON.parse(process.argv[1]).accessToken" "$SESSION")"
curl -H "$SIM" https://sy-greece.com/api/miniprogram/entitlements
curl https://sy-greece.com/api/miniprogram/knowledge/config
curl -X POST -H "$SIM" -H 'Content-Type: application/json' \
  -d '{"productType":"attraction","attractionId":"acropolis"}' \
  https://sy-greece.com/api/miniprogram/orders
curl -X POST -H "$SIM" https://sy-greece.com/api/miniprogram/simulation/reset
```

模拟订单的 `phone` 来自服务端创建的测试会话，客户端不能通过订单请求体覆盖；真实用户路径仍使用微信登录后的 Website `userId` 与 `/api/miniprogram/auth/phone` 已验证手机号关联，真实支付接入点仍需后续配置微信商户号、支付服务和回调，模拟接口不会调用 `wx.requestPayment`。

模拟接口仍遵守 `/api/miniprogram/access` 维护开关；维护关闭时返回现有 `503 MINIPROGRAM_MAINTENANCE`，开启后恢复。

小程序提交表单时继续使用 `POST /api/leads`，并携带 Bearer Token 及 `platform: "wechat-miniprogram"`（或 `source` 同值）。未登录返回 `401 MINIPROGRAM_LOGIN_REQUIRED`，未绑定手机号返回 `403 PHONE_BIND_REQUIRED`；绑定后服务端从用户记录写入联系方式，不信任客户端传入的手机号。小程序用户记录保存在 MariaDB 的站点数据文档中，微信 `openid` 不会通过 API 返回。

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

## 小程序后台管理

后台左侧将共同数据、网站管理、小程序管理分组。小程序管理包含用户、预约、行程、出行人、签证资料和优惠券页面，对应管理员 API 为 `/api/admin/miniprogram-users`、`/api/admin/miniprogram-travelers`、`/api/admin/miniprogram-documents`、`/api/admin/miniprogram-coupons`。这些 API 仅接受后台 Bearer Token；出行人和签证资料列表、详情中的护照号均脱敏显示，后台编辑提交脱敏值不会覆盖原始资料。
