> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-11
> **权威 (Authoritative)**: 仅本单实施与验证证据，不代替 reviewer 或 Fable 放行

# B4v 板视口书签交付证据

书签仅保存用户命名的 x/y/zoom 快照。migration 066 与既有 boards 族的四个人面路由提供持久化；板侧安静书签列支持保存、跳转、重命名和删除。名字 trim 后 1–32，每板每人上限 24，创建序稳定，板删级联。

## 实现与接线

- [implementation.patch](implementation.patch)：完整产品代码与测试 diff，包含未提交新文件。14 文件：5 修改、9 新增，+1007 / −2。
- [source-manifest.json](source-manifest.json)：14 文件 SHA-256 与 diff 统计。
- BoardViewportBookmarks → boardRepository → /api/boards/:boardId/viewport-bookmarks。GET 返回 {bookmarks}；POST {name,x,y,zoom} 返回 {bookmark}；PATCH /:bookmarkId 仅接受 {name}；DELETE 返回 {deleted}。
- 保存入口点击时复制 viewportRef.current，命名期间移动视口不会改写这次快照。
- 一键跳：BoardViewportBookmarks.onJump → BoardPage.jumpViewport → animateBoardViewport（240ms ease-out，减少动态偏好时即时）→ 既有 changeViewport → 原 viewportRef/setViewport/viewportPending → commitViewport → useBoard.updateBoard({viewport}) → 原 boards PATCH。逐帧仅更新摄像机，结束才入现役保存队列；手动 pan/zoom、离页与切板取消旧动画。
- 书签不进入对象编辑历史，不读取或改变成员、图层、z 序。没有 Agent 注册、排序状态或拖动排序。

## 验证数字

| 验证 | 结果 |
| --- | --- |
| 新后端书签 + 既有 boards route/service/schema | 16/16，1.49s（新增 6） |
| 新前端 rail / 真实 BoardPage 接线 | 16/16，3.22s（rail 12 + page 4） |
| 既有 repository / board smoke / layers / selection | 37/37，5.74s |
| 定向测试合计 | **69/69**，其中新增 **22** |
| shared 编译 | PASS，0.52s |
| server typecheck | PASS，4.98s |
| server build | PASS，6.84s |
| client 最终 typecheck + build | PASS；Vite 3.72s，见 [client-build.log](client-build.log) |
| server shared runtime-import 静态门 | PASS，226 产品源文件、0 违规 |
| 隔离 HTTP 冒烟 | **9/9 checks，37 requests** |
| 真 Chrome 冒烟 | **5/5** 验收项，22 个产品 HTTP 请求 |
| 定向 diff 空白检查 | PASS |

按本单执行受影响门，未执行整库 runtime 总门。首次 client build 发现 runtime 常量使用 @shared/types 子路径与 Vite 单文件 alias 冲突，已改为相对路径并通过最终构建。server 初次构建的共享类型产物缺失经 shared 编译解决。最终 client build 仅有既有大 chunk 与 taskStore 混合导入提示。

复现命令：

```powershell
# 仓库根
.\server\node_modules\.bin\tsc.cmd -b shared
node scripts/check-server-shared-runtime-import.mjs

# server/
node --import tsx --test src/__tests__/v13BoardViewportBookmarks.test.ts src/__tests__/v13BoardRoutes.test.ts src/__tests__/v13BoardServices.test.ts src/__tests__/v13BoardSchema.test.ts
.\node_modules\.bin\tsc.cmd --noEmit
npm.cmd run build
node --import tsx ../docs/audits/2026-09-11-b4v-builder/http-smoke.mjs

# client/；环境目录为本单空目录
$env:COINCIDES_VALIDATION_ENV_DIR = 'D:/Coinsides/v2.x/Coincides/.tmp/b4v-empty-env'
npm.cmd run test:unit -- src/pages/Boards/BoardViewportBookmarks.test.tsx src/pages/Boards/BoardPage.bookmarks.test.tsx
npm.cmd run test:unit -- src/pages/Boards/boardRepository.test.ts src/pages/Boards/BoardPage.smoke.test.tsx src/pages/Boards/BoardPage.layers.test.tsx src/pages/Boards/BoardPage.selection.test.tsx
npm.cmd run build
```

## 真实浏览器与隔离数据

真实已有 Chrome，通过 CUA 打开 http://127.0.0.1:5195/?probe=1。页面为生产 BoardPage/useBoard/boardRepository，后端为生产 boards router 与 SQLite :memory:，全部迁移作用于一次性合成库。未打开真实应用数据库。候选库接口返回空数组，既有场景由合成 fixture 初始化。

1. 保存当前视口，命名「第二章」，存得 {x:120,y:80,zoom:0.8}。
2. 使用生产缩放按钮和平移，保存「时间线区」：{x:-249.5999999999999,y:-515.64,zoom:1.152}；两枚书签双向跳转，实际 DOM transform 与持久化视口均到位。
3. 「时间线区」重命名「时间线总览」再删除，第一枚书签保留。浏览器发现并修复重命名/删除后的焦点回返问题，两条新增回归断言通过。
4. 经隔离 fixture 的生产 service 补齐至 24，刷新后点保存，显示可读上限提示，未创建第 25 枚；HTTP 冒烟另验证第 25 次 POST 返回 409。
5. 在生产板菜单与删除对话框删除合成板，24 枚书签级联到 0。删板前成员、图层、边、图形及 z 序原始行保持一致。

主证据：[browser-evidence.json](browser-evidence.json)、[http-evidence.json](http-evidence.json)。

截图：[第一视口跳转](01-first-jump.png)、[第二视口与重命名](02-second-jump-renamed.png)、[24 上限提示](03-limit-24.png)。

原始记录：[DOM transform 历史](browser-dom-observations.json)、[重命名后的原始库](browser-before-delete.json)、[删除单书签后](browser-after-bookmark-delete.json)、[24 枚时](browser-limit-24.json)、[删板后](browser-after-board-delete.json)。

证据边界：CSS 将 -249.5999999999999 序列化为 -249.6；数据库快照与 viewport 数值完全一致。初版 fixture 在响应结束时记录 req.url，Express 挂载省掉 /boards 段，因此浏览器原始账本路径呈 /api/:id/...；body、状态和原始库记录未改写。fixture 已改用 req.originalUrl，后续运行保留完整路径。HTTP 冒烟账本自身记录完整请求路径。

重开浏览器 fixture（server/）：`node --import tsx ../docs/audits/2026-09-11-b4v-builder/serve.mjs`。GET /__fixture/state 提供数据库观测，GET /__fixture/evidence 提供只读 DOM 观测。底边 probe 仅属审计壳，不进入产品界面。

未执行 git commit、push、PR 或 merge；未修改权限配置或 Agent 指令。开工时已有的无关未跟踪文件保持原状。
