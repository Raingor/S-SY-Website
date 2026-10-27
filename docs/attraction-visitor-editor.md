# 景点后台与参观指南

## 编辑入口

「景点管理 → 编辑」仅展示五组内容：

1. **基础资料**：名称、城市、主图、简介、状态及关联目的地。
2. **游览服务**：开放时间、门票信息、交通信息、景点地图。
3. **景点亮点**：亮点名称、说明及图片。
4. **景点讲解**：讲解点；提供所有景点共用的「语音导览使用指南」配置入口。
5. **专业介绍与攻略**：卡片封面、现有攻略视频字段，以及本景点对应类别的音频管理入口。

原有文史文章、深度内容、自定义参观板块、游览建议、场馆服务等多余编辑项暂时隐藏，不删除历史数据。基础资料和目的地关联是保存、发布、归属所需的元信息，不属于新增前台板块。

游览攻略仅保留后台维护，小程序前台继续隐藏。本改动不改变发布状态、音频权益或服务端 `hiddenSections` 策略。

## 四项富文本

正文支持段落、小标题、粗体、斜体、有序/无序列表和 HTTPS 官网链接。使用「插入官网链接」可给选中文字添加链接；未选中文字时插入网址本身。编辑时链接不导航。

- 默认编辑简体，可切换繁体、英文，分别保存。
- 旧的分号/换行文本按段落显示；旧正文中的 HTTPS 网址转换为可编辑链接。
- 打开/取消编辑不会自动迁移资料。修改某一语言时只更新该语言的 HTML 和旧纯文本回退字段，保留其他语言及隐藏字段。
- 清空正文同时清空对应纯文本回退，避免旧文字重新出现。
- 地图图片、地图文字说明可以同时配置；图片上传走 `POST /api/admin/upload-map`（私有目录）。地图上传和说明均需保存景点才完成绑定。

## API（沿用，无新增重定向接口）

保存：`PATCH /api/admin/attractions/:id`，正文存于 `guide.hoursHtml`、`ticketsHtml`、`transportHtml`、`mapHtml`，繁/英后缀为 `Tw` / `En`。服务端继续清洗 HTML。

公开读取：`GET /api/content?country=greece&includeAttractionDetails=false`。

- `attractions[].visitorInfoSections` 仍包含四项 `hours/tickets/transport/map`；false 仅省略顶层冗余 `attractionDetails`。
- 每项含 `bodyHtml/bodyHtmlTw/bodyHtmlEn` 和相同语种的 `nodes/nodesTw/nodesEn`。
- 安全链接节点格式为 `{type:'element',name:'a',attrs:{href:'https://…'},children:[…]}`。
- 地图项含 `map:{image,url,description,descriptionTw,descriptionEn}`；description 对应正文 HTML。
- 地图项另有 `sourceUrl/sourceTitle/sourceTitleTw/sourceTitleEn/verifiedAt`。
- 无 HTML 时仍使用旧的 `guide.hours/tickets/transport/map` 回退。

微信小程序无法直接唤起任意外部浏览器。官网链接使用 HTTPS 复制操作：仅在复制成功后提示 **「已复制，请在浏览器打开」**；复制失败提示失败，不显示成功。无需外部网页代理、重定向或业务域名接口。客户端须从正文链接节点/HTML 提供可靠的复制入口，不能仅假定原生 rich-text 会提供锚点点击 URL。

## 地图（仅在线查看，不提供下载）

管理员原话：「那个地图，需要不支持下载的。可以在线浏览或者截图都行」。

- 上传走 `POST /api/admin/upload-map`（需管理员会话），PNG / JPG / WebP，≤12MB，校验魔数，拒绝 SVG 与改名的可执行文件。
- 文件写入仓库外私有目录 `private-maps/`（可用 `SY_MAP_PRIVATE_DIR` 覆盖；禁止放在 `public/` 或 `dist/` 下，否则启动报错）。目录已在 `.gitignore`。
- 公开接口 `GET /api/miniprogram/attraction-map/:name` 是唯一读取路径：`Content-Type` 为图片、**无 `Content-Disposition` 文件名**、`Cache-Control: private, no-store`、`X-Content-Type-Options: nosniff`，支持 `HEAD` 与 `Range`。
- 不复制到 `public/images`，不生成静态路径，界面不渲染 `download` 链接；预览图设 `draggable=false`。所以只能在线查看或自行截图，没有可下载的地址。
- 替换、清空地图或删除景点时删除旧私有文件，避免残留可读副本。
- 历史 `images/...` 或 HTTPS 地图继续可用（公开图片，本身可下载），只是新增上传不再产生公开文件。若需要旧图也不可下载，需重新上传为私有地图。
- 生产现状（2026-10-27 部署后）：107 个景点仅「雅典卫城」有地图图片，16 个地图图片与地图文字均为空。私有地图数量为 0，需管理员在后台实际上传后才会出现；这不是代码问题。
- nginx：`sy-greece.stourweb.net.conf` 全局 `client_max_body_size 10m`，已为 `= /api/admin/upload-map` 单独设为 16m，否则 10–12MB 地图会被 413 拒绝。改动该 vhost 后必须 `nginx -t` 再 reload。

## 已知内容状态（部署后实测）

- 生产 `visitorInfoSections` 三语 `bodyHtml` 中 HTTPS 网址共 5 处，`<a>` 标签 0 个；`guide.*` 纯文本字段另有 6 处。即旧内容仍为纯文本，客户端靠纯文本识别兼容；只有管理员在新编辑器里实际编辑并保存后才会写入 `<a>`。
- 同一主机多个不同页面链接（如 oasa.gr 的 3 条）应保持独立，客户端按**完整 URL** 去重，不要按主机合并。

## 验证

- `npm run test:visitor-guide-editor`：编辑分组白名单、旧内容显示、隐藏资料/多语言保留、布局、链接、地图与清空。
- `npm run test:attraction-map`：私有地图上传、只读流式响应头、HEAD/Range、魔数与 MIME 拒绝、管理员鉴权、替换/清空/删除景点清理、公开契约。
- `node scripts/test-heritage-content.mjs`：临时合成 JSON 实例的保存及公开 API 契约，包括 false 参数。
- 交付合成客户端回放样例：`node scripts/test-heritage-content.mjs --visitor-fixture /tmp/sy-visitor-guide-http-fixture.json`，输出真实 HTTP 响应包装及 SHA-256。离线回放不等于微信真机验证。
- `npm run build`、`git diff --check`。
