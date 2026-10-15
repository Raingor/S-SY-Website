# 景点讲解置顶

后台「导览音频 / 文史节目」的线上游览、名导讲解音频支持置顶：可在列表点击「置顶 / 取消置顶」，或在编辑页「收听规则与发布」调整「讲解置顶」。新增音频默认不置顶。

## 数据契约

- 存储字段：`audioTracks[].isPinned`，布尔值，缺省为 `false`。
- 管理接口：`GET/POST /api/admin/audioTracks`、`PATCH /api/admin/audioTracks/:id`。例如 `PATCH` 请求体为 `{ "isPinned": true }`；`false` 表示取消。非布尔值返回 422。
- 公开内容接口：`GET /api/content?country=greece` 的 `attractions[].audioGuides[]` 和 `attractionDetails[attractionId].audioGuides[]` 均返回 `isPinned`。旧记录没有该字段时返回 `false`。
- 原有发布、音频文件存在性和收听权限规则不变；置顶不会自动发布或解锁内容。

## 小程序排序

公开接口继续沿用原 `sort` / ID 顺序。小程序在 `online`、`expert` 列表完成搜索及有音频筛选后，按 `isPinned === true` 稳定分组：置顶组在前，两组各自保留 API 原顺序。路线导览的 `pointIds`、讲解点顺序及音频排序不变。

## 验证

`npm run test:audio-pinning` 在合成 JSON fixture 中实例化实际 Vue 后台组件，通过 HTTP 验证新增、编辑、重新打开、列表置顶与取消、旧记录默认值、字段校验及重启后的存储与公开读取，并比对路线点位顺序。
