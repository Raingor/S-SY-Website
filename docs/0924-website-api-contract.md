# 2026-09-24 Website ↔ MpApp 音频/景点接口契约（本地实现，未上线）

> **仅本地代码契约，不代表生产有音频。** 当前本地库 87 条旧景点均已发布，但无可播放音频/文史节目；未核验官方来源及更新时间。新增测试音频只在临时隔离环境合成，不写生产内容、订单或价格。复用旧登录、订单、预约和导游资料，不自动扩大旧视频权益。

## GET `/api/content?country=greece`

原有 `attractions`, `routes`（旅游路线）等字段保留；以下是新增、规范化的字段：

```json
{
  "audioAlbums": [],
  "attractions": [{
    "id": "existing-id", "name": "旧名称", "en": "Old English name", "summary": "旧介绍", "image": "./images/…",
    "nameTw": "", "summaryTw": "", "summaryEn": "",
    "visitorInfo": {"hours":"", "hoursTw":"", "hoursEn":"", "tickets":"", "ticketsTw":"", "ticketsEn":"", "transport":"", "transportTw":"", "transportEn":"", "map":"", "mapTw":"", "mapEn":"", "notices":"", "noticesTw":"", "noticesEn":"", "mapUrl":"", "mapImage":"", "sourceUrl":"", "sourceTitle":"", "sourceTitleTw":"", "sourceTitleEn":"", "verifiedAt":""},
    "visitorInfoSections": [
      {"id":"hours","kind":"hours","title":"开放时间","titleTw":"開放時間","titleEn":"Opening hours","bodyHtml":"","bodyHtmlTw":"","bodyHtmlEn":"","nodes":[],"nodesTw":[],"nodesEn":[],"sort":1,"status":"published"},
      {"id":"tickets","kind":"tickets","title":"门票信息","titleTw":"門票資訊","titleEn":"Tickets","bodyHtml":"","bodyHtmlTw":"","bodyHtmlEn":"","nodes":[],"nodesTw":[],"nodesEn":[],"sort":2,"status":"published"},
      {"id":"transport","kind":"transport","title":"交通信息","titleTw":"交通資訊","titleEn":"Transport","bodyHtml":"","bodyHtmlTw":"","bodyHtmlEn":"","nodes":[],"nodesTw":[],"nodesEn":[],"sort":3,"status":"published"},
      {"id":"map","kind":"map","title":"景点地图","titleTw":"景點地圖","titleEn":"Map","bodyHtml":"","bodyHtmlTw":"","bodyHtmlEn":"","nodes":[],"nodesTw":[],"nodesEn":[],"sort":4,"status":"published","map":{"image":"","url":"","description":"","descriptionTw":"","descriptionEn":""},"sourceUrl":"","sourceTitle":"","sourceTitleTw":"","sourceTitleEn":"","verifiedAt":""}
    ],
    "customSections": [],
    "highlights": [{"id":"existing-id-highlight-1", "name":"", "nameTw":"", "nameEn":"", "desc":"", "descTw":"", "descEn":"", "image":"", "sort":1, "exhibitId":null}],
    "exhibits": [{"id":"point-id", "name":"", "nameTw":"", "nameEn":"", "description":"", "descriptionTw":"", "descriptionEn":"", "author":"", "duration":"", "location":{}, "image":"", "sort":1, "routeOrder":0, "status":"published"}],
    "routes": [], "audioGuides": []
  }]
}
```

固定 `visitorInfoSections` **始终恰好返回四项**，依序以稳定 id `hours`/`tickets`/`transport`/`map` 表示开放时间、门票信息、交通信息、景点地图；内容缺失时 `bodyHtml*` 为空、`nodes*` 为空数组，客户端仍保留板块并展示空态，不因无地图图片/链接而隐藏 map section。自定义 `customSections` 只返回 `status:"published"` 项，按 `sort` 升序；各项含 `{id,kind:"custom",title,titleTw,titleEn,bodyHtml,bodyHtmlTw,bodyHtmlEn,nodes,nodesTw,nodesEn,sort,status}`。

`nodes`、`nodesTw`、`nodesEn` 是可直接用于微信 `<rich-text nodes="{{nodes}}"/>` 的标准节点数组：文本节点 `{type:"text",text:"…"}`；元素节点 `{type:"element",name:"p",attrs:{},children:[…]}`。HTML 与 nodes 由同一服务器 allowlist sanitizer 派生、语义一致；App 优先渲染 nodes，不执行原始 HTML/JS。允许标签 `p,div,br,strong,b,em,i,ul,ol,li,blockquote,h2,h3,a,img`；所有 `on*`、style 与未允许属性剥除，script/style 标签剥除；链接仅 HTTPS、mailto 或安全站内路径；图片仅 HTTPS 或站内 `/images/...`。拒绝 `javascript:`、协议相对 URL、反斜线及路径上跳。

地图固定板块的 `map` 字段为 `{image,url,description,descriptionTw,descriptionEn}`，用于独立地图图片/链接操作；`visitorInfo.mapImage/mapUrl` 保持向后兼容并映射到新 map 结构。旧 `guide.map/mapTw/mapEn` 作为地图说明纯文本回退并进行转义/安全渲染；新 `guide.mapHtml/mapHtmlTw/mapHtmlEn` 优先；繁体/英文富文本缺失时先回退旧 `mapTw/mapEn`，再由客户端回退简体。其他固定板块也读取 `guide.hoursHtml*`, `ticketsHtml*`, `transportHtml*`；同语种富文本缺失时先回退旧的 `hoursTw/En`、`ticketsTw/En`、`transportTw/En`，再由客户端回退简体 plain text。`sourceUrl/sourceTitle* /verifiedAt` 继续用于来源与人工核对标注。

`attractions[].routes` **是讲解点路线**，不是顶层旅游路线；形状 `{id,title,titleTw,titleEn,description,sort,pointIds:[exhibitId]}`。`audioGuides` 按 `sort` 升序，包含 `category: "route"|"online"|"expert"`，以及下文统一的播放元数据。仅本景点已发布路线/有效点位能关联；旧缺字段自动填 `""`/`null`/`[]`。未设置来源/核对日期的参观信息不能展示为“实时最新”。图片路径使用 `./images/…`；旧 `guide` 对象继续提供兼容旧页面，地图链接/图片等新增字段读 `visitorInfo`。亮点缺图时 `image:""`；`exhibitId:null` 时隐藏点位跳转。

`audioAlbums` 只包含已发布且至少一集**真实已上传可播放**节目的专辑，形状 `{id,title,titleTw,titleEn,description,descriptionTw,descriptionEn,cover,sort,episodes:[…]}`。空列表确实表示无可播放节目；无音频草稿、下架节目和无效跨景点关联不对外暴露。节目字段与 `audioGuides` 一致：

```json
{"id":"track-id","category":"heritage","title":"","titleTw":"","titleEn":"","description":"","descriptionTw":"","descriptionEn":"","cover":"","language":"zh-CN","albumId":"album-id","attractionId":null,"exhibitId":null,"routeId":null,"durationSeconds":65,"previewSeconds":59,"unlockMode":"membership","sort":1,"previewUrl":"/api/miniprogram/audio/track-id/preview","accessUrl":"/api/miniprogram/audio/track-id/access","fullUrl":null}
```

语言策略：音轨中文优先 `title/description`；繁体优先 `titleTw/descriptionTw`，缺失退中文；英文优先 `titleEn/descriptionEn`，缺失退中文。`visitorInfo` 的参观信息按简体基础字段及 `Tw`/`En` 后缀字段提供；字段缺失时客户端回退中文。固定/自定义板块标题和正文同样有简体、繁体、英文字段并由客户端回退中文。地图 URL/图片、来源 URL/名称、核对日期语言无关；`map` 文案本身支持三语。切换 UI 语言不改变原音频语言，`language` 明示实际音轨；不自动假造配音。客户端须检查 `id`、有效 `previewUrl` 才绘制可点击播放器。

## 播放权限与响应

* `GET /api/miniprogram/audio/:id/preview`：无需登录，输出**单独裁剪文件**，最长 60 秒，支持 `Range` / `HEAD`。前端 60 秒倒计时可辅助体验，但不能替代后端裁剪。
* `GET /api/miniprogram/audio/:id/access`：可带 `Authorization: Bearer <微信登录 token>`；模拟测试仅在开关开启时使用模拟 token。公开元数据不含完整音频原始 URL；同一个接口适用于景点导览和文史节目。返回：

```json
{"id":"track-id","access":"preview","unlockMode":"membership","previewSeconds":59,"previewUrl":"/api/miniprogram/audio/track-id/preview","fullUrl":null,"expiresIn":null,"reason":"MINIPROGRAM_LOGIN_REQUIRED"}
```

`access` 为 `"preview"` 或 `"full"`，免费音轨可匿名得到 `full`。已授权时 `fullUrl` 返回形如 `/api/miniprogram/audio/:id/full?token=<signed-token>` 的 **5 分钟有效签名 URL**，`expiresIn:300`、`reason:null`；微信 `InnerAudioContext.src` 可直接使用完整绝对地址（相对 URL 需先拼接服务端 base），**不需要在播放器设置 Authorization header**。播放/Range 请求会再次核验签名、节目发布状态和当前有效订单；失效后重取 `/access`。不要缓存、转发签名 URL 或当作永久链接。
* `unlockMode="free"`：任意访客可取完整音频；`"attraction"`：须对应 `attractionId` 的**已支付单景点订单**；`"membership"`：须已支付会员订单；`"locked"`：目前无单集购买商品，只能试听（`reason:"NO_PRODUCT_CONFIGURED"`），不得显示虚假购买入口。会员订单**不默认解锁** `attraction` 类型音频；旧视频会员权益与音频权限不互通。
* 未登录的非免费音轨 `/access` **200** + `access:"preview"`/`fullUrl:null`/`reason:"MINIPROGRAM_LOGIN_REQUIRED"`；已登录未购买为 `reason:"AUDIO_ENTITLEMENT_REQUIRED"`；`/full` 无效/过期 token 为 **401** `AUDIO_TOKEN_REQUIRED`；签名有效但权益已撤销为 **403** `AUDIO_ENTITLEMENT_REQUIRED`；下架、没有可播放私有音频、缺节目或所属专辑下架为 **404** `AUDIO_NOT_FOUND`。后台发布无音频会 **422** `CONTENT_VALIDATION_FAILED`。维护开关关闭时小程序 API 为 **503**。

私有完整音频仅放服务器 `private-audio/`，不可经 `/audio`、`/images`、`dist` 或 `/api/content` 获得。上传时后端用 ffprobe/ffmpeg 校验并生成短试听；需要生产环境提供同样的 ffmpeg/ffprobe 和私有文件的持久化/备份。本地 `public/audio/selected-routes-intro.m4a` 是既有公开素材，**不属于新受保护音轨**。

## 管理接口与测试边界

后台 Bearer 登录后：`GET/POST/PATCH/DELETE /api/admin/audioRoutes|audioAlbums|audioTracks[/:id]`；`POST /api/admin/upload-audio` 接收 `{name,type,data:"data:audio/mpeg;base64,…"}`，限 30MB，生成 `audioFile,previewFile,durationSeconds,previewSeconds`；图片仍用旧 `/api/admin/upload-image`。景点仍由旧 `/api/admin/attractions/:id` 维护。测试用的音频/专辑标题必须冠 `【TEST ONLY】` 并仅写隔离副本，不碰真实站点数据。

本地自动化验收：`node scripts/test-heritage-content.mjs`，临时复制代码/seed 以 `SY_STORAGE=json` 隔离运行，运行结束删除临时内容；浏览器后台表单手测、真实微信开发者工具/真机联调、生产来源核对和部署 **未由自动化测试代替**。
