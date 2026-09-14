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
