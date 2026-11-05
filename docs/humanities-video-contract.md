# 希腊人文影集接口与后台

本功能复用 `guideVideos` 内容和现有视频购买流程。以下为本地实现契约，未部署；不会自动把旧景点视频归入人文影集，不新增影片或迁移生产数据。

## 内容接口

`GET /api/content` 的 `guideVideos[]` 只返回已发布视频，新增：

| 字段 | 契约 |
| --- | --- |
| `category` | `attraction`（景点讲解）或 `humanities`（希腊人文影集）；旧记录未设置时为 `attraction` |
| `sort` | 非负整数，默认 `0`；列表升序排列，相同值保持录入顺序 |
| `attractionId` | 单个景点 ID；人文影集允许为空字符串 |

继续公开 `id`、`title/titleTw/titleEn`、`description/descriptionTw/descriptionEn`、`cover`、`durationSeconds` 和 `accessUrl`。繁体、英文缺省时回退简体。不公开 `ossKey`、`sizeBytes` 或播放 URL。

小程序首页影集及影集列表仅取 `category === 'humanities'`；景点详情的视频列表排除该分类。旧记录默认分类不会出现在首页影集。首页位置为视频号之后、目的地之前；没有已发布人文影片时由客户端显示相应空状态，不用旧景点视频填充。

## 后台维护

「开发配置 → 攻略视频」管理两种视频，可编辑分类、三语标题简介、单个可清空的关联景点、封面、排序、OSS 路径、时长、大小和发布状态。

表单顶部及底部的「一键翻译」根据简体标题、简介生成繁体与英文，复用现有管理员翻译接口。结果全部成功后才回填；请求失败、编辑页面改变或翻译期间简体内容改变时保留原译文。翻译仅修改当前表单，核对后仍需保存。未启用 AI 翻译时按钮不可用。

API 沿用 `GET/POST /api/admin/guideVideos`、`PATCH/DELETE /api/admin/guideVideos/:id`。分类只允许上述两个枚举，未设置按景点讲解处理。标题始终必填；发布前必须填写 OSS 路径，景点讲解还必须关联景点，人文影集允许不关联。分类变更也执行相同发布校验。保存、读取时补充默认值，不执行批量迁移。

## 购买与播放

- 详情页只需视频 `id`，无需景点 ID。
- `GET /api/miniprogram/video/:id/access`：匿名返回 `access:'locked', reason:'MINIPROGRAM_LOGIN_REQUIRED'`；登录未购买返回 `VIDEO_PURCHASE_REQUIRED`；购买后返回有效期 600 秒的私有 OSS 签名 `playUrl`。
- `POST /api/miniprogram/orders` 传 `{productType:'guideVideo', videoId:'…'}`，价格固定 CNY 168，复用现有微信支付及订单确认流程。
- 年会员不包含视频；每次购买只解锁对应 `videoId`，不解锁整个人文分类或其他课程。封面公开不授予播放权限，无试看。
- 草稿或已下架视频不在公开列表中，播放权限接口返回 404。

## 验证

`npm run test:guide-video-commerce` 使用临时 JSON 服务与合成内容，覆盖旧分类默认、人文影片无景点发布、分类校验、三语与排序、公开字段边界、单视频购买隔离、会员不包含视频、下架和删除。

`npm run test:admin-guide-videos-ui` 验证字段、单选关联、创建默认值及人文表单提交。构建与浏览器核验使用临时副本，不覆盖工作区生成文件或读取生产数据。
