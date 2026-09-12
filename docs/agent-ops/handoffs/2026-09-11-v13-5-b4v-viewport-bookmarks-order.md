> **状态 (Status)**: done(builder 交付，待独立复核与放行)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · B4v · 板视口书签
> **上游**: 专场裁定收口 §5(Henry 拍:视口书签先行,展区归 V14,板卡上板长期候);本意=大板"分页"导航(13.4 图层=z 序勘误后的真需求轻解)

# B4v · 板视口书签

## 零 · 裁定原文

1. **书签=命名的视口快照**(位置 x/y+缩放),⛔任何板结构变化(零分区/零成员归属/零 z 序牵连);
2. 书签属板、属人:board 级持久化,带名字(用户起,如「第二章」「时间线区」),增删改重命名皆人面;
3. **一键跳**:点书签→板视口平滑移动到该快照;当前视口可一键存为新书签;
4. 数量上限 24(防失控);排序=创建序,v1 ⛔拖动排序;
5. UI 安静:书签停靠板侧一列小签(hover 显名),⛔常驻大面板;⛔Agent 面(V14 同门批)。

## 一 · 交付面

- 新迁移:board_viewport_bookmarks(id/board_id/user_id/name/x/y/zoom/created_at,board 删级联);人面路由挂既有 boards 族(list/create/rename/delete);
- 板页 UI:侧缘书签列(安静态,hover 显影名字)+「存当前视口」入口;跳转动画沿现役视口机制;
- 名字 1-32 字,zod 校验;板删级联。

## 二 · 禁区

⛔板结构/成员/z 序任何变化;⛔Agent 面;⛔拖动排序;⛔安全类测试;⛔碰 .git;⛔改权限配置。收口跑受影响秒级静态门。

## 三 · 验收

- typecheck+build 绿;定向绿+新增路由/级联/上限用例;
- 冒烟(隔离库+真浏览器):①存当前视口→书签现;②点书签→视口到位(位置+缩放皆准);③重命名/删除;④删板级联;⑤24 上限拒收可读;
- 证据落 `docs/audits/2026-09-11-b4v-builder/`。

## 四 · 申报义务

Result 必含:交付清单+diff、视口跳转接线申报、冒烟证据、测试数字。冲突停线⛔自作主张。

## Result

2026-09-11 · Codex builder 完成交付。未 git commit。

### 交付清单与 diff

- 新迁移 `066_v13_board_viewport_bookmarks.ts` 与 fresh schema 镜像：独立 `board_viewport_bookmarks(id,board_id,user_id,name,x,y,zoom,created_at)`，board FK `ON DELETE CASCADE`。
- 新共享类型、专用 zod validators 与 service；既有 boards 族追加 GET/POST `/api/boards/:boardId/viewport-bookmarks`、PATCH/DELETE `/:bookmarkId`。名字 trim 后 1–32，每板每人最多 24；超限 409 `board_viewport_bookmark_limit_reached`；按 `created_at,rowid` 创建序读取，重命名仅写 name。
- `BoardViewportBookmarks` 侧缘小签、hover/focus 显名及操作、存当前视口命名入口、一键跳、重命名/删除、失败提示与焦点回返。没有常驻大面板、拖动排序或 Agent 面。
- `boardRepository` 接四条路由；`BoardPage/boardViewport` 接现役摄像机状态与保存队列。
- 3 个新增定向测试文件；隔离 SQLite + 真实板页冒烟壳与证据。
- 产品与测试共 **14 文件，5 修改 / 9 新增，+1007 / −2**。完整 diff：[implementation.patch](../../audits/2026-09-11-b4v-builder/implementation.patch)；文件哈希：[source-manifest.json](../../audits/2026-09-11-b4v-builder/source-manifest.json)。

### 视口跳转接线申报

保存按钮点击时复制 `viewportRef.current`，只提交 name/x/y/zoom。跳转链为 `BoardViewportBookmarks.onJump` → `BoardPage.jumpViewport` → `animateBoardViewport`（240ms ease-out，reduced-motion 时即时）→ 原 `changeViewport` → 原 `viewportRef/setViewport/viewportPending` → `commitViewport` → `useBoard.updateBoard({viewport})` → 既有 boards PATCH。中间帧仅更新视口，末帧保存；手动 pan/zoom、离页及切板取消旧动画。书签不接对象历史，不改板结构、成员、图层或 z 序。

### 冒烟证据

- 总入口：[docs/audits/2026-09-11-b4v-builder/README.md](../../audits/2026-09-11-b4v-builder/README.md)。
- 真实 Chrome + 生产 BoardPage/useBoard/repository/router + SQLite `:memory:` 合成库，**五项验收 5/5**：保存、两组 x/y/zoom 双向精确跳、重命名/删除、24 可读上限、删板后 24 枚级联到 0。
- 第一组 `{120,80,0.8}`；第二组 `{-249.5999999999999,-515.64,1.152}`。数据库 viewport 与书签快照完全一致，DOM transform 到位；删板前场景原始行一致。
- [browser-evidence.json](../../audits/2026-09-11-b4v-builder/browser-evidence.json) 汇总截图和原始库证据；隔离 HTTP 另 **9/9 checks、37 requests PASS**：[http-evidence.json](../../audits/2026-09-11-b4v-builder/http-evidence.json)。
- 证据边界：CSS 浮点序列化和初版 fixture 请求日志省略 `/boards` 挂载段，已在审计 README 申报；原始记录保留，fixture 后续日志已修正。

### 测试数字

- 后端新书签 + 既有 boards route/service/schema：**16/16**（新增 6）。
- 前端新书签 rail + 真实 BoardPage 接线：**16/16**（含两条浏览器发现的焦点回归）。
- 既有 repository / board smoke / layers / selection：**37/37**。
- 合计定向 **69/69**，新增 **22**。shared 编译、server typecheck/build、client 最终 typecheck/build 全绿。
- 受影响 server shared runtime-import 静态门：**226 文件、0 违规，PASS**；定向 diff 空白检查 PASS。
- 按本单运行受影响门，未跑整库 runtime 总门。未修改 Agent 面、权限或操作指令；未执行 commit/push/PR/merge。未发现施工冲突。
