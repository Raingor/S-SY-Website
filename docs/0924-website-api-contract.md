# 2026-09-24 Website ↔ MpApp 音频/景点接口契约（本地实现，未上线）

> **仅本地代码契约，不代表生产有音频。** 当前本地库 87 条旧景点均已发布，但无可播放音频/文史节目；未核验官方来源及更新时间。新增测试音频只在临时隔离环境合成，不写生产内容、订单或价格。复用旧登录、订单、预约和导游资料，不自动扩大旧视频权益。

## GET `/api/content?country=greece`

原有 `attractions`, `routes`（旅游路线）等字段保留；以下 JSON 仅作字段形状示意，实际缺失值按下文的 Website 演示回退填充：

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
    "routes": [{"id":"existing-id-demo-route","title":"示例参观路线","description":"演示路线由已录入讲解点组成，真实路线待发布。","pointIds":["point-id"],"isDemo":true}],
    "audioGuides": [{"id":"existing-id-demo-audio-route","category":"route","title":"路线讲解（演示）","exhibitId":"point-id","routeId":"existing-id-demo-route","previewUrl":"","accessUrl":"","fullUrl":null,"playable":false,"isDemo":true}],
    "demoFields": {"routes":true,"audioGuides":true}
  }]
}
```

`attractions[].highlights` 优先采用后台保存的景点亮点记录；detail 派生字段缺失时按 ID 合并补足，不以空白回退覆盖已录入的名称、描述或图片。上传图片、旧版单独文件名和 `images/...` 均规范为小程序可消费的 `./images/<filename>`；仅接受安全图片文件名或无凭据的 HTTPS 图片 URL，其他值输出空字符串。没有已保存亮点时才使用演示条目。

`attractionDetailPage` 是 `/api/content` 顶层的必需对象，**不得返回 `null` 或省略**。Website 从后台配置读取，并对缺失字段补默认值；全新初始化和配置缺失时也会提供可用默认值。MpApp 应读取此顶层字段配置景点详情页标题与语音导览说明，不能以特定的个性化文案判断配置有效。最低结构如下（`zh/tw/en` 分别为简体、繁体、英文；实际返回包含所有字段）：

```json
{
  "attractionDetailPage": {
    "sections": {
      "overview": {"label":{"zh":"景点概览","tw":"景點概覽","en":"Overview"},"subtitle":{"zh":"…","tw":"…","en":"…"}},
      "visitor": {"label":{"zh":"参观指南","tw":"…","en":"…"},"subtitle":{"zh":"…","tw":"…","en":"…"},"notice":{"zh":"…","tw":"…","en":"…"}},
      "highlights": {"label":{"zh":"…","tw":"…","en":"…"},"subtitle":{"zh":"…","tw":"…","en":"…"}},
      "audioHow": {"label":{"zh":"…","tw":"…","en":"…"},"subtitle":{"zh":"…","tw":"…","en":"…"}},
      "route": {"label":{"zh":"…","tw":"…","en":"…"},"subtitle":{"zh":"…","tw":"…","en":"…"}},
      "online": {"label":{"zh":"…","tw":"…","en":"…"},"subtitle":{"zh":"…","tw":"…","en":"…"}},
      "expert": {"label":{"zh":"…","tw":"…","en":"…"},"subtitle":{"zh":"…","tw":"…","en":"…"}}
    },
    "visitorSections": {"hours":{"zh":"…","tw":"…","en":"…"},"tickets":{"zh":"…","tw":"…","en":"…"},"transport":{"zh":"…","tw":"…","en":"…"},"map":{"zh":"…","tw":"…","en":"…"},"faq":{"zh":"…","tw":"…","en":"…"}},
    "audioHow": {"steps":[{"zh":"…","tw":"…","en":"…"}],"note":{"zh":"…","tw":"…","en":"…"}},
    "demo": {"summary":{},"exhibit":{},"highlight":{},"visitorInfo":{},"route":{},"audioGuides":[]}
  }
}
```

`sections` 固定包含 `overview`、`visitor`、`highlights`、`audioHow`、`route`、`online`、`expert`；每项必须有非空三语 `label` 与 `subtitle`，`visitor` 还包含三语 `notice`。`audioHow.steps` 必须是至少一项的数组，每项含非空三语文案；`note` 含三语文案。当前 Website 默认提供 3 个步骤。`visitorSections` 固定提供 `hours`、`tickets`、`transport`、`map`、`faq` 五个三语标签。`demo` 提供 `summary`、`exhibit`、`highlight`、`visitorInfo`、`route`、`audioGuides` 演示文案；具体默认文案由 Website 版本化 `seed/content-demo.json` 管理。较旧服务端可能未返回此字段，客户端可为兼容旧版本使用本地 UI fallback，但该响应不符合当前契约；服务端升级后须验证字段存在且 `audioHow.steps` 非空。

固定 `visitorInfoSections` **始终恰好返回四项**，依序以稳定 id `hours`/`tickets`/`transport`/`map` 表示开放时间、门票信息、交通信息、景点地图；对应正文与地图资产都缺失时，Website 从 `seed/content-demo.json` 填入明确写有「演示内容／待发布」的三语提示及 `nodes*`，并给该板块 `isDemo:true`、在景点 `demoFields.visitorInfo` 列出字段名；已有真实正文或地图则保留原样。客户端仍保留固定板块，不因无地图图片/链接而隐藏 map section。自定义 `customSections` 只返回 `status:"published"` 项，按 `sort` 升序；各项含 `{id,kind:"custom",title,titleTw,titleEn,bodyHtml,bodyHtmlTw,bodyHtmlEn,nodes,nodesTw,nodesEn,sort,status}`。

`nodes`、`nodesTw`、`nodesEn` 是可直接用于微信 `<rich-text nodes="{{nodes}}"/>` 的标准节点数组：文本节点 `{type:"text",text:"…"}`；元素节点 `{type:"element",name:"p",attrs:{},children:[…]}`。HTML 与 nodes 由同一服务器 allowlist sanitizer 派生、语义一致；App 优先渲染 nodes，不执行原始 HTML/JS。允许标签 `p,div,br,strong,b,em,i,ul,ol,li,blockquote,h2,h3,a,img`；所有 `on*`、style 与未允许属性剥除，script/style 标签剥除；链接仅 HTTPS、mailto 或安全站内路径；图片仅 HTTPS 或站内 `/images/...`。拒绝 `javascript:`、协议相对 URL、反斜线及路径上跳。

地图固定板块的 `map` 字段为 `{image,url,description,descriptionTw,descriptionEn}`，用于独立地图图片/链接操作；`visitorInfo.mapImage/mapUrl` 保持向后兼容并映射到新 map 结构。旧 `guide.map/mapTw/mapEn` 作为地图说明纯文本回退并进行转义/安全渲染；新 `guide.mapHtml/mapHtmlTw/mapHtmlEn` 优先；繁体/英文富文本缺失时先回退旧 `mapTw/mapEn`，再由客户端回退简体。其他固定板块也读取 `guide.hoursHtml*`, `ticketsHtml*`, `transportHtml*`；同语种富文本缺失时先回退旧的 `hoursTw/En`、`ticketsTw/En`、`transportTw/En`，再由客户端回退简体 plain text。`sourceUrl/sourceTitle* /verifiedAt` 继续用于来源与人工核对标注。

`attractions[].routes` **是讲解点路线**，不是顶层旅游路线；形状 `{id,title,titleTw,titleEn,description,sort,pointIds:[exhibitId]}`。`audioGuides` 按 `sort` 升序，包含 `category: "route"|"online"|"expert"`，以及下文统一的播放元数据。真实路线或音轨存在时优先返回真实数据；该景点缺路线时从 Website 版本化 `seed/content-demo.json` 回填一条路线（`isDemo:true`，`pointIds` 优先使用已发布 `exhibits[].id`），缺音轨时回填 route/online/expert 三条演示元数据（`isDemo:true`,`playable:false`,`previewUrl:""`,`accessUrl:""`,`fullUrl:null`），**不得**当可播放音频或解锁商品。仅本景点已发布路线/有效点位能关联；演示点位仅在原有 `exhibits` 为空时由 API 回填，永不写回数据表。`summary`、`highlights`、四个固定参观字段缺失时亦从该文件返回明确的演示内容；条目有 `isDemo:true`，字符串通过景点 `demoFields.summary`、`demoFields.visitorInfo` 标记。演示文案维护方式：编辑 `seed/content-demo.json`，验证后随 Website 代码部署并重启服务；目前后台不提供演示文案编辑入口。未设置来源/核对日期的参观信息不能展示为“实时最新”。图片路径使用 `./images/…`；旧 `guide` 对象继续提供兼容旧页面，地图链接/图片等新增字段读 `visitorInfo`。亮点缺图时 `image:""`；`exhibitId:null` 时隐藏点位跳转。

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
* 未登录的非免费音轨 `/access` **200** + `access:"preview"`/`fullUrl:null`/`reason:"MINIPROGRAM_LOGIN_REQUIRED"`；已登录未购买为 `reason:"AUDIO_ENTITLEMENT_REQUIRED"`；`/full` 无效/过期 token 为 **401** `AUDIO_TOKEN_REQUIRED`；签名有效但权益已撤销为 **403** `AUDIO_ENTITLEMENT_REQUIRED`；下架、没有可播放私有音频、缺节目或所属专辑下架为 **404** `AUDIO_NOT_FOUND`。后台发布无音频会 **422** `CONTENT_VALIDATION_FAILED`。

### 小程序访问与身份验证

小程序全局维护门禁已移除；`GET /api/miniprogram/access` 固定返回 `accessEnabled:true`。历史 `settings.miniprogramAccess` 字段仅为兼容保留，不再关闭内容、登录、账户或留资 API。客户端可继续发送 `X-Mini-Program-Env`，但服务端不依赖该 header 决定访问。移除维护门禁**不等于开放匿名业务权限**：微信登录、手机号绑定、账户资料、留资、订单/支付与内容权益接口仍执行各自既有认证、验证和授权规则；例如缺失微信登录 code 返回 **422** `WX_LOGIN_CODE_REQUIRED`，未登录访问账户及小程序留资仍返回 **401** `MINIPROGRAM_LOGIN_REQUIRED`。

私有完整音频仅放服务器 `private-audio/`，不可经 `/audio`、`/images`、`dist` 或 `/api/content` 获得。上传时后端用 ffprobe/ffmpeg 校验并生成短试听；需要生产环境提供同样的 ffmpeg/ffprobe 和私有文件的持久化/备份。本地 `public/audio/selected-routes-intro.m4a` 是既有公开素材，**不属于新受保护音轨**。

## 管理接口与测试边界

后台 Bearer 登录后：`GET/POST/PATCH/DELETE /api/admin/audioRoutes|audioAlbums|audioTracks[/:id]`；`POST /api/admin/upload-audio` 接收 `{name,type,data:"data:audio/mpeg;base64,…"}`，限 30MB，生成 `audioFile,previewFile,durationSeconds,previewSeconds`；图片仍用旧 `/api/admin/upload-image`。景点仍由旧 `/api/admin/attractions/:id` 维护。测试用的音频/专辑标题必须冠 `【TEST ONLY】` 并仅写隔离副本，不碰真实站点数据。

本地自动化验收：`node scripts/test-heritage-content.mjs`，临时复制代码/seed 以 `SY_STORAGE=json` 隔离运行，运行结束删除临时内容；浏览器后台表单手测、真实微信开发者工具/真机联调、生产来源核对和部署 **未由自动化测试代替**。

## `GET /api/content?country=greece` → `vehicleService`（在地用车）

小程序「在地用车」页面的页面级内容与选项由后台维护，随 `/api/content` 顶层字段 `vehicleService` 下发。该字段**始终返回对象**（未配置时返回默认值），客户端按 `xxx → xxxTw → xxxEn → 中文` 顺序回退。三语沿用 `xxx / xxxTw / xxxEn` 后缀约定。

```json
{
  "vehicleService": {
    "enabled": true,
    "sort": 1,
    "title": "在地用车资源", "titleTw": "在地用車資源", "titleEn": "Local transport",
    "subtitle": "对接咨询", "subtitleTw": "對接諮詢", "subtitleEn": "Resource coordination",
    "description": "…", "descriptionTw": "…", "descriptionEn": "…",
    "tags": ["欧6车型信息"], "tagsTw": ["歐6車型資訊"], "tagsEn": ["Euro 6 vehicles"],
    "note": "…", "noteTw": "…", "noteEn": "…",
    "disclaimer": "", "disclaimerTw": "", "disclaimerEn": "",
    "images": ["./images/vehicle-xxxx.jpg"],
    "options": {
      "vehicle":  [{"id":"vehicle-bmw-suv-5","label":"宝马 SUV / 5座","labelTw":"BMW SUV / 5座","labelEn":"BMW SUV / 5 seats","sort":1,"enabled":true}],
      "duration": [{"id":"duration-half-day","label":"半日","labelTw":"半日","labelEn":"Half day","sort":1,"enabled":true}],
      "people":   [{"id":"people-1-2","label":"1-2人","labelTw":"1-2人","labelEn":"1–2 people","sort":1,"enabled":true}]
    }
  }
}
```

约束：

* `enabled` 为 `false` 时仍返回该对象（客户端自行隐藏或显示「待后台配置」占位）；**不得**返回 `null` 或省略。
* `options.*` 只返回 `enabled !== false` 的项，并按 `sort` 升序。
* 选项 `id` 是后台生成的**稳定标识**，语言切换或改名后不变。客户端只做展示与回传（例如 `POST /api/leads` 中的 `vehicleTypeId / durationId / peopleId`），不参与业务判断；这些附加字段 `POST /api/leads` 会原样持久化。
* **后台只维护简体**：管理端不编辑繁体 / 英文；保存时缺失的 `xxxTw / xxxEn` 由服务端自动回填简体值，因此公开接口始终返回三语字段（三语内容可能相同）。客户端仍按 `Tw → En → 简体` 顺序取值。
* `tags / tagsTw / tagsEn` 三语**等长**并按 index 配对（由服务端根据简体条目数对齐）。
* 图片沿用 `./images/<filename>` 约定；无图片时为 `[]`。
* 页面内固定 UI 文案（表单标签、按钮等）由客户端 i18n 维护，不在此字段内。

### `vehicleService.form`（表单文案与开关）

小程序用车表单的 UI 文案与开关，整体可选：`form` 缺失或某字段为空时，由客户端使用本地 i18n 原文与默认值，不会出现空白。

```json
{
  "form": {
    "title": "说说你的用车计划", "titleTw": "…", "titleEn": "…",
    "tip": "…", "dateLabel": "…", "durationLabel": "…", "vehicleLabel": "…", "peopleLabel": "…",
    "routeLabel": "…", "contactLabel": "…", "submitLabel": "…",
    "routePlaceholder": "…", "phonePlaceholder": "…", "wechatPlaceholder": "…",
    "contactPhone": true, "contactWechat": true, "routeRequired": true,
    "dateStart": "today", "dateEnd": ""
  }
}
```

* 三语字段（`key / keyTw / keyEn`）：`title`、`tip`、`dateLabel`、`durationLabel`、`vehicleLabel`、`peopleLabel`、`routeLabel`、`contactLabel`、`submitLabel`、`routePlaceholder`、`phonePlaceholder`、`wechatPlaceholder`。后台只维护简体，缺失的 Tw/En 回填简体。
* `contactPhone` / `contactWechat`：是否显示两种联系方式，**至少一个为 `true`**；只显示一种时客户端自动选中它。
* `routeRequired`：路线与用车需求是否必填。
* `dateStart`：`today` 或 `YYYY-MM-DD`（`today` 避免日期写死后过期）；`dateEnd`：留空表示无上限，否则为 `YYYY-MM-DD` 且不得早于 `dateStart`。
* 校验失败返回 **422**，不落库。

## 管理接口（在地用车）

`GET /api/admin/vehicle-service`、`PATCH /api/admin/vehicle-service`（需 Bearer 登录）。

保存校验（不通过返回 **422** 并给出具体原因，不落库）：① `title / subtitle / description` **简体必填**；② `vehicle / duration / people` 每组至少 1 项、每项 `label`（简体）必填；③ 同一组内 `sort` 唯一且为正整数。

默认值为「在地用车」当前线上文案与 3/3/3 选项（见 `server.mjs` 的 `DEFAULT_VEHICLE_SERVICE`），首次启动会写入默认结构，避免上线即空。

自动化验收：`node scripts/test-vehicle-service.mjs`（覆盖默认值、仅简体后台与繁/英回填、校验失败、排序、enabled 过滤、询盘入库、鉴权与重启持久化）。

## 用车询盘（后台列表）

小程序 / 官网提交的用车咨询以 `POST /api/leads` 写入，`leadType` 固定为 `vehicle-consultation`；后台「小程序管理 → 用车询盘」按该类型筛选展示，支持查看与跟进状态（`PATCH /api/admin/leads/:id`，`status` 为 `new / contacted / quoted / closed`）。

常见字段：`vehicleDate`（用车日期）、`vehicleNeed`（用车场景）、`duration`（时长）、`vehicleType`（车型）、`travelers`（随行人数）、`contact`（联系方式）、`requirements`（补充说明）；若客户端使用后台选项，可同时回传稳定 `id`：`vehicleTypeId / durationId / peopleId`。`POST /api/leads` **不做字段白名单**，上述附加字段会原样持久化，后台列表与详情直接可用。

**键名归一化（服务端自动，客户端无需适配）**：官网与小程序使用不同键名，入库时 `leadType === 'vehicle-consultation'` 的线索会自动补齐别名，保证同一列表不出现空列：

| 后台列表列 | 读取键 | 归一化来源 |
| --- | --- | --- |
| 用车日期 | `vehicleDate` | `vehicleDate \|\| bookingDate \|\| travelDate` |
| 用车场景 | `vehicleNeed` | `vehicleNeed \|\| [vehicleType, duration, route] 以 ` · ` 拼接` |
| 随行人数 | `travelers` | `travelers \|\| people` |
| 联系方式 | `contact` | 原值 |

原始键（`bookingDate / route / vehicleType / duration / people`）仍会保留，不会丢失。因此小程序按现有键名提交即可，无需额外补别名。
