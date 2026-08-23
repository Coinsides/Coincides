> from: claude(fable,上将军代发——Opus 调度会话阻塞;授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: ready(Fable 本人翻牌;上游:b-2a Review FAIL(方向成立)0B/0H/1M) | re: v2bn12-2b-2a-fix | date: 2026-08-23

# 12.2b-2a-fix:A-1「route 调用同一 listNotes」killer 补强(只写测试)

## 定位
b-2a 主单 `2026-08-23-v2bn12-2b2a-human-trash-restore-doors.md` 复核唯一 MED(R5):`server/src/__tests__/v2NotesListService.test.ts` 的 A-1 断言被收窄为 regex「同一 import 含 listNotes」,**无法证明 route 调用的是 `../services/notes` 的 canonical export**——reviewer 反例:canonical 以别名 import 保留 token,另建复制模块二次 import 本地名 `listNotes` 供 route 调用 → tsc 0、专项仍绿。产品侧全部 PASS,本单**只写测试**。

## 交付物(单项)
把 A-1 改成**承重**的「同一 service」killer,二选一(builder 按可行性选,回执写明理由):
- **(A) 行为法**:用 node:test 的 `mock.module`(或等价)把 `../services/notes.js` 的 `listNotes` 替换为 spy,真实启动 route 发 `GET /api/notes`,断言 spy 被调用恰一次且收到 `{ userId, courseId, status }`;复制模块/别名二次 import 下 spy 不会被调用 → 红。
- **(B) 结构法**:静态解析 `routes/notes.ts`:①对 `listNotes` 的 import 恰一处且 source 解析为 `../services/notes`(路径规范化后与 `services/notes.ts` 同文件);②除该 import 外源码中不得出现第二个 `listNotes` 绑定(含别名、二次 import、本地函数);③GET handler 体内调用的标识符解析到该 import。三条任一不满足即红。
必红判据(builder 前置自查,终判归 reviewer):复刻 reviewer 的 R5 反例(canonical 别名 + 复制模块二次 import)→ 新 A-1 红;还原后绿;原有 S1a 的 M1a(route 改 `res.json([])`)仍红。

## 硬闸
⛔ 不改产品代码(`routes/notes.ts`、`services/notes.ts` 零 diff);不改其他测试;不改 b-1/b-2a 已复核的 killer;不新增依赖。无法在测试内兑现 → 停手 `needs: claude`。

## 边界(触及面申报)
允许:`server/src/__tests__/v2NotesListService.test.ts`(仅 A-1 及其 helper)· 如需 `server/package.json` 测试脚本。其余禁区。

## D 段 + 锁纪律
阴性断言前先让同一探针看见已知阳性;命中后先问「这个字符串是谁写进去的」。📌 共享树两处 porcelain `.M` 为 EOL 假阳性。`.codex-tmp/builder.lock.d` 非你所有,只读确认。

## 验证与回执
门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → client/server `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `v2NotesListService` 单跑。回执 **UTF-8** 追加 `## Result`(不需确认):R5 反例复刻红 + 还原绿两段输出、M1a 仍红、`git diff --numstat` 产品码为 0;header 保持 `ready`;不 commit、不 push、不碰 main、不碰锁。

## Result

完成于 2026-08-23；施工分支 `fable/v2-bn12-exoskeleton`，基线与收尾 `HEAD` 均为 `910cf1cfb5d1331347f6ad669c64fd22de2c045e`。header 保持 `ready`。

### 选择与实现

选择 **B：结构法（TypeScript compiler API + symbol resolution）**。本机 Node `v22.22.1` 的现有普通 runner 下 `mock.module` 不可用，且本测试在模块顶层已静态 import `noteRoutes`；行为法会额外牵动 experimental flag、ESM 装载顺序与测试脚本。结构法直接复用 server 已有 `typescript` devDependency，不新增依赖、不改 `package.json`/脚本，触及面更窄。

只改 `server/src/__tests__/v2NotesListService.test.ts` 的 A-1 及其 helper：

- 用真实 `server/tsconfig.json` 创建 TypeScript `Program`；从 `services/notes.ts` module symbol 取得 canonical `listNotes` export。
- 要求 route 中 imported name 为 `listNotes` 的 import 恰一处；其 module specifier 规范化解析后必须是同一个 `services/notes.ts`，local alias symbol 必须指向该 canonical export。
- lexical-binding 探针先命中已知阳性 canonical import，再断言不存在第二个 `listNotes` binding，满足 D 段阳性资格。
- 以 symbol identity 找到顶层 router 的 `GET /` handler 与该 handler 的 response 参数；跳过嵌套函数，要求唯一 `res.json(...)` 的直接 payload callee symbol 精确等于 canonical import binding。
- A-3、ownership 测试及 MCP 既有断言未改；未造平行产品机关。

### Killer 收据

1. **阳性基线**：最终 helper 下 A-1 单跑 exit `0`，`1/1`。
2. **R5 反例必红**：临时把 canonical import 改为 `listNotes as canonicalListNotes`，新增独立复制实现 `services/listNotesCopy.ts`，再以第二个本地 `listNotes` 驱动 GET route。该反例的 server `tsc --noEmit` exit `0`；A-1 exit `1`，报 `routes/notes.ts must import the listNotes export exactly once`，实际 `2 !== 1`。两个 import 候选分别来自 canonical alias 与复制模块，不是日志/fixture 自照。
3. **R5 还原绿**：反向 patch 删除复制模块并恢复 route；`routes/notes.ts` SHA-256 回到开工值 `B57E4C588D9B179E676B1B601EC5BC8AE75B92179EA8BA0C884C65B43BC0DBFC`，`copyExists=False`；A-1 exit `0`，`1/1`。
4. **M1a 仍红**：临时仅把 GET response 改为 `res.json([])`；A-1 exit `1`，报 `GET / response must come from a service call`。
5. **M1a 还原绿**：恢复 canonical call 后 route SHA-256 再次等于上述开工值；A-1 exit `0`，`1/1`。

所有 mutation 均用可逆 `apply_patch`，逐刀还原；未用 checkout/reset。终态不存在 `listNotesCopy.ts`。

### 七门（docs-first，最终代码态逐门执行）

| 门 | 命令 / 结果 |
|---|---|
| 1 | root `npm.cmd run docs:check` → exit `0` |
| 2 | root `npm.cmd run verify:v2-bn8-runtime` → exit `0`（含 unit `211/211`、runtime/manifest/parity/build/smoke/docs/diff/secrets 全链） |
| 3 | client `.\\node_modules\\.bin\\tsc.cmd --noEmit` → exit `0` |
| 4 | server `.\\node_modules\\.bin\\tsc.cmd --noEmit` → exit `0` |
| 5 | root `npm.cmd run test:unit` → exit `0`，`20/20` files、`211/211` tests |
| 6 | server `npm.cmd run test:v2`，独立 `CANVAS_ASSET_DIR=C:\\Users\\70208\\AppData\\Local\\Temp\\coincides-v2-assets-a1-final-20260823-0940` → exit `0`，`270/270`；收尾 entry `0`、ReparsePoint `0`，核实路径位于 OS temp 后以非递归空目录删除，`assetCleanupExists=False` |
| 7 | server `node --import tsx --test src/__tests__/v2NotesListService.test.ts` → exit `0`，`3/3` |

PowerShell 首次直接调用 `npm` 被本机 ExecutionPolicy 在 `npm.ps1` 启动前拒绝，未执行门内脚本；正式门统一使用同一 Node 安装的 `npm.cmd`，上表只记实际执行结果。

### 触及面与零产品 diff

- `git diff --numstat -- server/src/routes/notes.ts server/src/services/notes.ts server/src/mcp/bindings.ts server/package.json`：空输出。
- 同一产品范围（另含临时复制模块）的 `git status --short --untracked-files=all -- ...`：空输出；因此也排除了 `git diff --numstat` 看不见的 untracked 漏项。
- `services/notes.ts` SHA-256 仍为开工值 `4202E8E6354311348548878AB4C99BEB49EF2CB032DF547AD36867A0B2EBA972`；`routes/notes.ts` 仍为上述开工值。
- 本单代码 diff 仅 `server/src/__tests__/v2NotesListService.test.ts`：`192 / 5`；产品码 0 diff，未改其他测试、依赖、脚本或 package。
- 共享树开工即有的两处 porcelain `.M` 内容指纹前后逐位相同：`useNoteCanvasRuntimeController.ts` = `317C8B...6BC88B`，`routes/projections.ts` = `C9072A...E08ED7`；本单未触碰。
- `git diff --check` exit `0`。

未 commit、未 push、未切换或触碰 main；`.codex-tmp/builder.lock.d` 只读确认属于本工单/Fable，未覆盖、未删除。
