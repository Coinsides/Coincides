> from: claude(fable,上将军代发——Opus 调度会话阻塞;授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: done(复核 FAIL(方向成立)1M @ r2b2a → 修正单 PASS 0/0/0/1L @ r2b2afix Review,Fable 放行 log 08-23 #22;Fable 翻牌) | re: v2bn12-2b-2a | date: 2026-08-23

# V2.BN.12.2b-2a:人类的回收站门(先于 Agent 工具)—— note 移入回收站 / 恢复

## 裁定(Fable,2026-08-23;产品事实 + 红线)

**产品事实(grep 亲核)**:client 对 `/api/notes/:id` **没有任何调用**(只有 `/notes/:id/blocks*`);`DELETE /api/notes/:id` 是一扇没有人类入口的服务端门;服务端也**没有**恢复路由(恢复只能经 `PUT {status:'active'}`,client 同样不调)。⇒ **今天用户在 UI 里无法把一篇 note 移入回收站,也无法恢复。**
**红线**:Agent 能编辑的,人类必须 100% 能编辑。在给 Agent `trash_notes` 之前,**先补人类的门**,且人类门与 Agent 门共用 b-1 的执行器(`trashNote` / `restoreNote`)。

## 交付物(单项:一对人类门 + 一个恢复路由)

1. **服务端** `POST /api/notes/:id/restore`(`server/src/routes/notes.ts`):薄壳,调 `restoreNote({ userId, noteId })`;响应 `{ message: 'Note restored' }`(与 DELETE 的 `{ message: 'Note moved to trash' }` 同形);未命中(不存在/非本用户)的行为**与 DELETE 现行为一致**(DELETE 现在对未命中返回什么就照搬——builder 先核 DELETE 现行为再写,回执贴出)。
2. **客户端**(两处,最小):
   - Project 页的 note 列表(`client/src/pages/Courses/CourseDetail.tsx`,`fetchSummary` 所在页)每条 note 加一个「移到回收站」动作(图标按钮 `Trash2`,与既有 `DocumentManager`/`CardViewModal` 的删除按钮同形),**单条即时**(Henry 阈值规则:单条删除=immediate),调 `api.delete(\`/notes/${id}\`)`,成功后刷新列表并 toast;
   - 同页加「回收站」切换(最小:一个切换按钮/分段,列出 `GET /api/notes?course_id=…&status=trashed`——`listNotes` 已支持 status 过滤),每条有「恢复」调 `api.post(\`/notes/${id}/restore\`)`。
   - **不做**:批量多选、确认对话框(单条即时可撤,与人手点删同门)、新页面/新路由、导航项、动画。
3. **测试**:①server:restore 路由真实 Express + 临时 DB 正控(trash → restore → status active、trashed_at NULL)+ 未命中行为 golden + **killer**:route 内联绕过 `restoreNote` → 红;②client:现有 client 单测框架(Vitest)下,为两个新动作各写一条「点击后以正确 method + URL 调用 api」的测试(mock api),**并确保 parity 门的 client 探针能在该符号内部看见 `DELETE /api/notes/:id` 的构造**(b-2b 的 `trash_notes` 将以此为 `human_entry.client_call_site`——builder 在回执写明符号名 `文件#函数`);③既有 `v2NotesLifecycle` 7/7 与 `v2NotesListService` 保持绿。

## 硬闸
- ⛔ 不改 `trashNote`/`restoreNote`(b-1 已复核 PASS);不碰 PUT;不碰注册表/manifest/transport/policy(那是 b-2b);不新增依赖。
- ⛔ client 改动只在 `CourseDetail.tsx`(及其直接的样式/测试文件);不动 Notes 画布面、03/05 保护面、v1 学习规划线。
- 越界/需要新接缝 → 停手 `needs: claude`。

## 边界(触及面申报)
允许:`server/src/routes/notes.ts`(仅新增 restore 路由 hunk)· server 新/既有测试 · `client/src/pages/Courses/CourseDetail.tsx`(+ 同目录测试文件,如需新建)· 如需极小样式,同目录 css。其余禁区。

## D 段(`adjudication §7`,含反面分则)+ 锁纪律
阴性断言前先让同一探针看见已知阳性;命中后先问「这个字符串是谁写进去的」。📌 共享树 `client/.../useNoteCanvasRuntimeController.ts`、`server/src/routes/projections.ts` porcelain `.M` 为 EOL 假阳性。`.codex-tmp/builder.lock.d` 非你所有,只读确认。

## 验证与回执
门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → client/server `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ 新测试单跑。逐门 exit 入表。回执 **UTF-8** 追加 `## Result`(不需确认);含先红后绿、`git diff --numstat` 对照边界、client 调用点符号名、显式范围排除;header 保持 `ready`;不 commit、不 push、不碰 main、不碰锁。

## Result

> builder: Codex | date: 2026-08-23 | baseline/head: `bd92e0a6f24b96a7e7a8c531e6f56eaa7c184754` | branch: `fable/v2-bn12-exoskeleton`

### 交付

- 写 restore 前先用生产 `noteRoutes` + `errorHandler` 的真实 Express/TCP 探针锁定 DELETE 未命中现行为：不存在与非本用户 note 均为 HTTP `404`，`content-type: application/json; charset=utf-8`，原始 UTF-8 body 均为 `{"error":"Note not found"}`；两者都在 `getOwnedNote` 短路，foreign row 不变。
- 新增 `POST /api/notes/:id/restore` 薄壳，执行顺序为 `getOwnedNote(noteId, req.userId!)` → `restoreNote({ userId: req.userId!, noteId })` → `res.json({ message: 'Note restored' })`。因此未命中行为与 DELETE 同形，命中后复用 b-1 executor 恢复为 `active` 并清空 `trashed_at`。
- Project Notes 增加 Notes/Trash 分段；查询直接使用 `GET /notes?course_id=${courseId}&status=${noteStatus}`。active 卡片提供即时 `Trash2`，trashed 卡片提供即时 `RotateCcw`；成功后刷新并 toast，无确认框、批量能力、新页面/路由、导航项或动画。卡片打开与生命周期动作使用 sibling buttons，避免嵌套按钮。
- client 调用点（供 b-2b `human_entry.client_call_site`）：`client/src/pages/Courses/CourseDetail.tsx#handleTrashNote`，其函数体内直接构造 `api.delete(\`/notes/${noteId}\`)`。恢复调用点为 `client/src/pages/Courses/CourseDetail.tsx#handleRestoreNote`，函数体内直接构造 `api.post(\`/notes/${noteId}/restore\`)`。runtime parity 门通过。
- 未新增平行 lifecycle executor：服务端继续唯一复用 `trashNote` / `restoreNote`；client 两个符号仅是人类入口调用点。

### 先红后绿与测试证据

- 前置 DELETE 未命中 golden 单跑：exit `0`；missing/foreign 的 status、header、raw bytes 与 foreign row 不变均命中。
- restore route killer 在写生产 route 前单跑：exit `1`，唯一失败为 `POST /:id/restore route must exist`；该 killer 要求 route 调用 `restoreNote`，并拒绝 route 内出现 `UPDATE notes` 或 `.prepare(`，所以内联绕过会红。
- 写入薄壳后 `v2NotesLifecycle.test.ts`：exit `0`，`11/11`；真实 HTTP 正控完成 trash → restore → `status = active` / `trashed_at = NULL`，未命中 parity 与结构 killer 同时为绿。
- 第一次正式链在最后的 server 合跑出现 `13/14` 假红：旧 A-1 结构断言把 notes service import 硬编码为仅 `{ listNotes }`。只把该断言收窄为“同一 import 含 `listNotes`”，专项恢复为绿，并从 docs 第 1 门重新跑完整最终链；未为测试改生产行为。

### 最终 docs-first 七门

| 门 | 命令（cwd） | exit | 结果 |
|---|---|---:|---|
| 1 | `npm.cmd run docs:check`（root） | 0 | docs index / inventory 均最新 |
| 2 | `npm.cmd run verify:v2-bn8-runtime`（root） | 0 | runtime、build、parity、secret scan 等完整通过 |
| 3 | `npm.cmd exec tsc -- --noEmit`（client） | 0 | 无类型错误 |
| 4 | `npm.cmd exec tsc -- --noEmit`（server） | 0 | 无类型错误 |
| 5 | `npm.cmd run test:unit`（root） | 0 | `20/20` files，`211/211` tests |
| 6 | `npm.cmd run test:v2`（server，隔离 `CANVAS_ASSET_DIR`） | 0 | `270/270` tests；最终目录 `server/.codex-tmp/v2bn12-2b2a-assets-5f7d27cf194d4bd78574d6eac4ef592e`，结束后 leaf count `0` |
| 7a | `npm.cmd exec vitest run src/pages/Courses/CourseDetail.test.tsx`（client） | 0 | `2/2`：trash / restore 点击各自锁定 method + URL、刷新与 toast |
| 7b | `node --import tsx --test src/__tests__/v2NotesLifecycle.test.ts src/__tests__/v2NotesListService.test.ts`（server） | 0 | `14/14` |

### 边界与 numstat

追加本回执前的施工代码/测试 `git diff --numstat`（新文件另计）如下，全部在允许面：

| 文件 | + | - |
|---|---:|---:|
| `client/src/pages/Courses/CourseDetail.module.css` | 54 | 2 |
| `client/src/pages/Courses/CourseDetail.tsx` | 157 | 46 |
| `client/src/pages/Courses/CourseDetail.test.tsx`（new） | 78 | 0 |
| `server/src/__tests__/v2NotesLifecycle.test.ts` | 80 | 1 |
| `server/src/__tests__/v2NotesListService.test.ts` | 1 | 1 |
| `server/src/routes/notes.ts` | 9 | 1 |

- 显式排除：`server/src/services/notes.ts`（`trashNote` / `restoreNote`）零 diff；PUT handler 由 byte-for-byte killer 保持不变；未碰 registry / manifest / transport / policy、依赖、Notes 画布面、03/05 保护面或 v1 学习规划线。
- `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts` 与 `server/src/routes/projections.ts` 仍仅为工单已裁定的 porcelain EOL/stat `.M`；两者 `git diff --quiet` 均 exit `0`，没有内容改动。
- `git diff --check` exit `0`（仅现有 LF→CRLF 提示）；无 staged diff。独立只读终审无 finding。
- header 保持 `status: ready`；未 commit、未 push、未切换/触碰 main，`.codex-tmp/builder.lock.d/owner.json` 仅只读核验且 owner 仍为本工单。

## Review

复核对象固定为 commit `6e4a544235b093c9a5fd373c99297f90bd04b797`；其直接父提交为 `bd92e0a6f24b96a7e7a8c531e6f56eaa7c184754`。以下承重收据均由 reviewer 在 `$TMPDIR` 下的 detached 隔离树亲取，不以 builder 的 `## Result` 报数代替。

### 判定与分级

**FAIL（方向成立）**。分级计数：`BLOCKER 0 / HIGH 0 / MED 1 / LOW 0`。

人类 trash/restore 门的生产接线、HTTP 语义、UI 最小性，以及 R1–R4、R6–R7 均通过；但点名的 R5 反例能在 route 已不再调用 canonical `../services/notes.js` 的 `listNotes` 时让 A-1 常驻测试继续全绿。因此本单不能判 PASS；方向成立表示产品实现目标已经达成，失败项是承重回归护栏仍不能证明其标题所声称的同源绑定。

**MED-1（技术缺陷：A-1 lexical-binding 护栏缺口）**

- 复现：在精确 `6e4a544` 隔离树中，把 canonical import 写成 `listNotes as canonicalListNotes` 并保留该 token；另建一个独立复制现行为的 module，从该 module 二次 import 本地名 `listNotes`，让 GET route 调后者。随后 `server` 的 `tsc --noEmit` exit `0`，`v2NotesListService.test.ts` 仍 exit `0`、`3/3`，包括题为 “route and MCP binding both call the same listNotes service export” 的 A-1。
- 成因：现断言分别看见 canonical import 花括号里的字符串 `listNotes` 与 route slice 里的调用字符串 `listNotes(`，但不解析两者是否为同一个 lexical binding。这个 mutation 中，第一个字符串来自 alias import，第二个字符串来自 alternate import；“存在同名字符串”不能回答“调用来自哪个 export”。
- 定级理由：精确点名的验收 mutation 存活，故不是 LOW；但 `6e4a544` 的生产 route 当前确实调用 canonical service，A-3 与所有 HTTP 行为均绿，尚无现行用户数据/响应错误，故定 MED。
- 建议修法：用 TypeScript compiler API/AST 做 symbol resolution，确认 route call identifier 解析到 `../services/notes.js` 的 named import `listNotes`；或把 route 置于可注入/可 spy 的 service binding 下做调用测试。仅要求拆成独立 import 仍挡不住局部 shadow 或二次 import。修后应把本反例固化为 killer。

放行权仍在 Fable；本 Review 不作 release/checkpoint 决定。

### R1–R7 逐条

| 位点 | 判定 | reviewer 收据 |
|---|---|---|
| R1 restore route 内联 SQL、绕过 executor | **PASS** | 保留 `restoreNote` import，只把调用改为等价 `UPDATE notes SET status = active ...`。真实 HTTP restore 正控仍绿；route killer 单独红在“route slice 必须调用 `restoreNote(...)`”的结构断言，并同时命中禁止 `UPDATE notes` / `.prepare(` 的护栏。不是 import 缺失造成的假红。还原后专项 `14/14`。 |
| R2 去掉 `getOwnedNote` 前置 | **PASS** | 仅删前置后，现役 unmatched test exit `1`，首个 missing restore 实得 `200`、期望 `404`。因现役循环在首断言后停止，另加 reviewer-only 聚合 HTTP probe 覆盖 missing 与 foreign：两种 DELETE 都是 `404` + `{"error":"Note not found"}`；两种 restore 都错误变为 `200` + `{"message":"Note restored"}`；foreign row 仍因 executor 的 owner-WHERE 不变。由此同时证明 status/bytes 的漏径与 foreign-row 半径。 |
| R3 trash client method/URL 改错 | **PASS** | 把 `handleTrashNote` 改为 `api.post(/notes/:id/trash)` 后，真实渲染 `ProjectNotesSection` 并点击按钮的既有测试 `1 fail / 1 pass`；唯一红为 delete spy 的精确 method + URL 断言，restore 点击仍绿。现役 parity client predicate 在基线先报 `ok:true`（`DELETE /api/notes/:dynamic`，raw `/notes/:dynamic`，binding `api`），同一 predicate 在 mutation 后报 `ok:false` 并明确 saw `POST /api/notes/:dynamic/trash`。 |
| R4 restore client URL 改错 | **PASS** | 把 URL 改为 `/notes/:id/restored` 后，同一真实点击专项 `1 fail / 1 pass`；trash 仍绿，restore 精确断言收到 `/restored` 而非 `/restore`，命中对应漏径。 |
| R5 A-1 同 service export | **FAIL / MED-1** | canonical alias + alternate second import 的强反例下，route 不调用 canonical export，但 A-1、A-3、ownership 三项仍 `3/3`，且 `tsc --noEmit` 绿。现断言只做 token/regex 合取，标题宣称不成立。 |
| R6 executor 与 PUT 指纹 | **PASS** | `server/src/services/notes.ts` 在两 commit 间零 diff，blob 两端均为 `d56a89ddafd2cc81bb07c7601c709b6428d632a8`；validator blob 两端均为 `2b10377e0aef583bbe22b27304a7e206ff82f03d`。统一 LF 后，PUT handler 两端 length `1590`、SHA-256 `6140c7351e061a18a6db23753c98ec3c7bbf146e1c97ddacf88b658387b23c61`；`updateNoteSchema` 两端 length `277`、SHA-256 `63efa78c2a188b1d145763354ae7e595442796977cab220ee5d93fe027c590c8`，均与 b-1 Review 所记一致。 |
| R7 UI 最小性 | **PASS** | client diff 只含 `CourseDetail.tsx`、同目录 CSS 与测试，无新页面/router/nav 文件或导航项。status group 有 `role=group`/accessible label，toggle 均有 `type=button` 与 `aria-pressed`；卡片父节点为非交互 `div`，打开按钮与 trash/restore 动作按钮互为 sibling，动作按钮有 `type=button`、动态 `aria-label`/`title`/`disabled`，无 button-in-button。 |

R1–R5 均逐条施刀，未抽样；每刀后均恢复并检查 tree clean。R1/R2 用 Node/Express 真 HTTP；R3/R4 因隔离路径下 Vitest 配置加载器受环境权限阻断，使用下文同版本、同 React plugin/alias/setup 的 programmatic Vitest 入口执行原测试文件与原点击断言，没有改常驻测试。

### 未命中行为：真实 HTTP

基线专项通过真实 Express HTTP（非 handler mock）复跑，`--test-name-pattern=unmatched` exit `0`、`2/2`；两条测试内部完整覆盖四个组合：

| action | missing | foreign | content-type / raw bytes | foreign row |
|---|---:|---:|---|---|
| `DELETE /api/notes/:id` | 404 | 404 | `application/json; charset=utf-8` / `{"error":"Note not found"}` | 不变 |
| `POST /api/notes/:id/restore` | 404 | 404 | 与 DELETE 同 content-type、逐字节同 raw body | 不变 |

R2 mutation 的 reviewer-only 聚合 probe 又把 foreign 放在不会被首个 missing assert 截断的位置：restore 的 missing/foreign 均退化为 `200 {"message":"Note restored"}`，而 foreign row 仍不变，故现役 golden 对前置 ownership 的行为依赖已被直接证实。

### docs-first 门表

两棵隔离树均为真实 `$TMPDIR` worktree、非 junction，并分别对 client/server 执行 `npm ci --offline`。正式顺序从 docs 门开始。标准 Vite/Vitest launcher 在该真实 temp 绝对路径上稳定报同一启动错误：`Cannot read directory "../../../../..": Access is denied`，继而无法 resolve `vite.config.ts` / `vitest.config.ts`；这些标准命令 exit `1` 且运行 `0` 条测试，不伪记为绿。按工单允许的先例，随后以 `configFile:false`、相同 React plugin、三项 alias、`jsdom` 与 `test/setup.ts` 程序化补证。

| 门 | 标准命令收据 | 补证/结果 |
|---|---|---|
| 1 `docs:check` | exit `0` | 开头与 verify 尾段各跑一次，index/inventory 最新 |
| 2 `verify:v2-bn8-runtime` | exit `1`；停在首个 `test:unit` 的 config-loader startup，0 assertions | 全量 programmatic unit exit `0`：`20/20` files、`211/211` tests；其余子门逐项亲跑均绿，详见下列清单 |
| 3 client `tsc --noEmit` | exit `0` | 精确 `6e4a544` |
| 4 server `tsc --noEmit` | exit `0` | 精确 `6e4a544`；R5 mutation 下另跑一次也为 0 |
| 5 `test:unit` | 标准入口 exit `1`，同一 config-loader startup、0 assertions | programmatic 等价入口 exit `0`，`211/211`，包含新增 CourseDetail `2/2` |
| 6 server `test:v2` | exit `0` | `270/270`；独立 `CANVAS_ASSET_DIR` 收尾 entry count `0` |
| 7a CourseDetail 专项 | 标准入口 exit `1`，同一 config-loader startup、0 assertions | 原文件 programmatic 入口 exit `0`，`2/2` |
| 7b server 两专项 | exit `0` | `14/14` |
| unmatched HTTP 单跑 | exit `0` | `2/2`，覆盖上述四组合 |

`verify:v2-bn8-runtime` 在首门之后的每个 child 均另行补跑：`test:tool-face-registry` `3/3`；`test:tool-face-manifest` 共 9 tests；manifest check；`test:tool-face-parity` `10/10` 与 parity check；canvas runtime boundary `159` checks；group gallery `5` checks；groups rail、single editor、source experience、legacy shutdown、relation freshness checks；canvas-engine model contract `60` groups；programmatic client production build exit `0`、`2184` modules；server build exit `0`；performance smoke 5 scenarios；尾段 docs check、`git diff --check` 与 changed-file secret scan 全部 exit `0`。标准 `build:client` 亦诚实保留 exit `1` 的同一 Vite config-loader 收据；其 `tsc -b` 已先完成，程序化 Vite build 再补足实际 bundle 证明。

因此门禁中的非零均归因于隔离路径下同一配置加载器环境问题，并已有等价执行补证；产品/常驻测试 finding 只有 MED-1，未把环境红误算为代码 PASS，也未把它重复计入分级。

### 提交完整性与触及面

`git diff --name-status bd92e0a..6e4a544` 完整输出恰为 7 paths，未用截断输出推断缺席；`git diff --check bd92e0a..6e4a544` exit `0`：

| path | status | numstat `+ / -` |
|---|---|---:|
| `client/src/pages/Courses/CourseDetail.module.css` | M | `54 / 2` |
| `client/src/pages/Courses/CourseDetail.test.tsx` | A | `78 / 0` |
| `client/src/pages/Courses/CourseDetail.tsx` | M | `157 / 46` |
| 本工单 | M | `50 / 0` |
| `server/src/__tests__/v2NotesLifecycle.test.ts` | M | `80 / 1` |
| `server/src/__tests__/v2NotesListService.test.ts` | M | `1 / 1` |
| `server/src/routes/notes.ts` | M | `9 / 1` |

这与裁定边界精确相符：CourseDetail 三文件、restore route hunk、两份 server 测试及工单。两棵精确 commit 隔离树中的 client/server `tsc --noEmit` 均 exit `0`。无依赖/配置/registry/manifest/transport/policy/service/validator/新页面/新导航改动；`server/src/services/notes.ts`、PUT handler 与 `updateNoteSchema` 的零 diff/指纹另由 R6 正面证明。未碰 Notes canvas、03/05 保护面、v1 学习规划线或生产 DB。

共享树在追加本 Review 前的 porcelain 仍只有调度点名的两处 `.M`：`client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts` 与 `server/src/routes/projections.ts`。同一检查先观察到这两个命中，再以内容 diff/blob 核验归因：它们是 checkout 的 EOL/stat 假阳性，不是 builder 写入，也不是 reviewer mutation；本次未触碰。共享树的唯一写入是本段 UTF-8 `## Review`；未改 header、未 staged/commit/push、未切换或触碰 main、未碰 `.codex-tmp/builder.lock.d`。

### 5-2 跨条耦合与下一状态

- 当前 human trash door 的 `handleTrashNote` 经现役 `validateClientCallConstruction` 正控可解析为 `DELETE /api/notes/:dynamic`，指定 call site 为 `client/src/pages/Courses/CourseDetail.tsx#handleTrashNote`，故它满足 b-2b `trash_notes` 的 `human_entry.client_call_site` 必要条件；R3 又证明同一探针对 method/path 错接可见。当前 manifest 尚未加入 `trash_notes`，所以这里仅判“必要条件可过”，不提前宣称 b-2b 全 parity 已过。
- restore 的 404 由 route `getOwnedNote` 前置与 b-1 void executor 合取产生；R2 证明只看 owner-WHERE/foreign-row 不变会漏掉 missing/foreign 响应退化。b-2b 若按计划把 executor 改为 `{changes}`，属于下一单状态转换，不能反写成 b-2a 当前合同。
- restore 没有 tool face；其 human door 只作为 revert 对称门与记录态保留，不扩张 registry/manifest/policy/transport。
- active/trashed 人类列表当前生产 route 确实仍接 canonical `listNotes`，HTTP 行为全绿；但 R5 说明常驻 A-1 无法独立证明这一耦合。修 MED-1 前，不能把 A-1 的绿色当成跨 REST/MCP 同 service binding 的充分收据。

跨条扫描未发现除此以外的复合缺陷：R1 的 executor-only write、R2 的 preflight 404、R3/R4 的 UI 调用与 R6 的 b-1 指纹在当前态相容；下一状态唯一新增风险是 b-2b 改 executor 返回值时必须重新核对 route preflight/receipt，而非在本单预做。

### 5-1 完备、范围排除与取证纪律

- 已全文核对 reviewer charter 5-1…5-10、本工单含裁定与 Result、b-1 `§补裁` + Review、计划 §7；builder 自报仅作导航，判定所承重的 diff、门、HTTP、指纹、mutation 均重新亲取。
- 能取得的代码级/live HTTP 收据均已取得：两种 action × missing/foreign、content-type、raw bytes、foreign row、两端 tsc、全量 client/server 测试、专项、build、parity、边界 checks、mutation 与 tree-clean 收据。标准 Vite/Vitest 的环境红与替代入口均显式记录，没有用“诚实留洞”代替补证。
- 显式范围排除：未做人工浏览器主观视觉/手感验收，也未运行 aXe；本单关于嵌套控件/ARIA 的结论限于 DOM 静态结构与真实 Testing Library 点击。未连接或写入生产 DB；未验收尚未实现的 b-2b registry/manifest/policy/transport/receipt/confirm/queue；未为 restore 假造 MCP/tool；未评价精确 `6e4a544` 之外后续提交的产品代码。
- mutation 位点由调度方点名、由 reviewer 执行并逐条命中；R1–R5 全覆盖而非抽样，红点均记录到具体结构/行为断言。每刀后还原；R5 的“全绿”按验收判据判为缺口而非 PASS。

### 阴性断言的阳性对照与字符串归因

1. parity：同一生产 predicate 先在基线看见已知阳性 `DELETE /api/notes/:dynamic`，再对 R3 mutation 得到 `ok:false`；没有从“没搜到”直接推断。
2. R6：同一 commit-diff 探针先看见已知变化 `server/src/routes/notes.ts`，再对 `server/src/services/notes.ts` / validator 作零 diff 与 blob/SHA 阴性结论。
3. 触及面：先取得完整 7-path positive list 与 numstat，再声明没有 page/router/nav/service 等越界；未用 `head` 或截断空白作证。
4. R5：基线先让 A-1 看见 production 阳性；反例命中后追问两个 `listNotes` 字符串分别是谁写入，确认 import token 属于 canonical alias、call token 属于 alternate binding，从而定位 regex 的认识论错误。
5. 共享 porcelain：先承认两个 `.M` 命中，再用 content diff/blob 追溯为 Git EOL/stat 转换；未把“仓里存在该状态”归因给 builder。

### 隔离树自清收据

- 使用一棵 gates tree 与一棵专用 mutation tree，均位于 `C:/Users/70208/AppData/Local/Temp`，detached 于精确 `6e4a544`；另用 local bare clone 管理，未在 repo 内建临时树。
- 两树各自 `npm ci --offline`：gates client/server 安装 `202 / 212` packages，mutation client/server 亦为 `202 / 212`；递归 ReparsePoint count 均为 `0`，没有 junction/symlink 指向共享 `node_modules`。
- 清理前 gates/mutation 两树均 `git status --porcelain --untracked-files=all` count `0`、`git diff --exit-code` 为 `0`、HEAD 精确相同；mutation 间也逐刀恢复到 clean。
- 已依次由 local bare clone 执行 `git worktree remove --force`，再删除空资产目录与 bare clone；最终四个精确路径 `cr6e-g-f3250846`、`cr6e-m-f3250846`、`cr6e-f3250846.git`、`cr6e-assets-f3250846` 的 `Test-Path` 均为 `False`。无遗留需调度方代清。
