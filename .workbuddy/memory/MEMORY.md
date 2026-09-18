# MEMORY.md — S-SY-Website 项目长期约定

希腊私人定制旅行官网（sy-greece.com）+ 内容管理后台。React 19 + Vite + Node ESM，后台路径 `/manage-9f3k7`。

## 环境

| 项 | 值 |
| --- | --- |
| 生产站点 | https://www.sy-greece.com/ |
| 服务器 | `root@106.15.53.150` |
| SSH 密钥 | `/Users/mac-2312-r/workspace/wwwroot/M-projects/S-SY/sy-secret.pem`（600） |
| 站点目录 | `/www/wwwroot/sy-greece.stourweb.net` |
| 服务 | systemd `sy-greece.service`，监听 `127.0.0.1:4173`，Nginx 反代 |
| 环境文件 | `/etc/sy-greece.env`（权限 600，systemd EnvironmentFile 注入） |
| 本地后台 | `http://127.0.0.1:4173/manage-9f3k7`（`npm run server`） |

## 存储（重要，容易搞错）

- **生产用 MariaDB**：库 `sygreece_website`，表 `sy_site_data`（`data_key='main'` 单条 `payload_json`，84048 字节）。不是 JSON 文件。
- **本地也用 MariaDB**（mariadb@11.4，root/root2312，应用账号 `sygreece_web@127.0.0.1`），配置在 `.env`。
- `data/site-data.json` 只是**种子文件**，且一旦同步过生产就含真实 PII（leads / miniprogramUsers）。**提交前必须还原到 HEAD**，绝不能入库。
- `.env` 已 gitignore，含本地 DB 密码 + 后台密码。

## 部署流程（非普通 git push）

```bash
# 1) 本机：推送 + 打增量 bundle（比全量 57MB 小得多）
git push origin main
git bundle create /tmp/sy-greece-<short>.bundle <上一个已部署commit>..HEAD
scp -i /Users/mac-2312-r/workspace/wwwroot/M-projects/S-SY/sy-secret.pem \
    /tmp/sy-greece-<short>.bundle root@106.15.53.150:/tmp/

# 2) 服务器
cd /www/wwwroot/sy-greece.stourweb.net
git fetch --no-tags /tmp/sy-greece-<short>.bundle HEAD:sy_deploy_<short>
git merge sy_deploy_<short> --no-ff -m "Merge sy-greece-<short>.bundle: <说明>"
systemctl restart sy-greece.service
```

**坑**：
- `git merge <bundle文件>` 直接跑会报错；该 Git 版本也不支持 `git bundle pull`。必须先 `fetch` 成本地 ref 再 `merge`。
- 生产**没有 npm**，不能现场构建。`index.html`（vite-plugin-singlefile 产物）必须随提交入库，部署靠 bundle 里的产物。
- 仓库里堆积约 482 个 `._*` macOS 垃圾文件（untracked），不影响部署，别误当改动。

## 代码坑

- `.env` 加载器必须在 **`storage.mjs` 模块顶部**，不能只放 `server.mjs`——`storageMode` 在 import 时就按 `process.env.SY_STORAGE` 初始化，晚加载永远走 json。
- 后台桌面端是**固定 100vh + 内部滚动**（`src/styles.css` 约 1253–1283 段）。调整 `.admin-content` / `.admin-panel` 宽度时别删这段，否则页面贴底滚不动。
- `imageUrl()`（server.mjs ~170 行）负责把图片路径归一成 `./images/xxx`，正则 `^(?:\.\/|\/)?(?:images\/)+` 折叠多层 `images/`。**空值返回 undefined，JSON 序列化会直接丢键**，不是 null/''。

## 跨仓协作

- MpApp 是另一个仓库、另一个会话负责（`subagent-chat-01a09d91-9c59-775f`），不要直接改它的代码，用 intercom 同步字段契约。
- 主仓会话 S-SY：`subagent-chat-01a09db3-36e6-73e8`。update-log 由主仓汇总，本仓不写。
