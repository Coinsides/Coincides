> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: done | re: v2bn12-02-tooling | date: 2026-08-19

# V2.BN.12 工单 02:测试工装最小集 + pure reducer 抽取 + RED #1 落地

## 背景

工单 01 侦查闭环(builder Result + reviewer Review PASS/4MED + Opus Review-2,见同目录 01 号文件)。诊断确认修复须以测试先行,而 client 无组件级 runner(Review §6)。本单=工装前置,**不修任何 root cause**——为 03/04/05 的 RED 铺路。分支 `fable/v2-bn12-exoskeleton`。

## 任务

1. **client 测试 runner 最小集**:装 Vitest + @testing-library/react + jsdom(dev deps,pin 版本);`client/package.json` 加 `test:unit`;根 `package.json` 转发;**不装 Playwright**(浏览器层后续另单)。配置最小化——不引 Tailwind/不改构建链。
2. **Pure reducer 抽取(只搬逻辑不改行为)**:
   a. 编辑生命周期:从 `useDraftBlockController` / 相关 hook 中抽出可纯测的状态转换核(对应 Review 建议的 `idle→ephemeral-mounted→focused→dirty→persisted` 判定逻辑中**当前已存在**的部分——不实现新状态机,那是 04 的活);
   b. 斜杠事务:从 `useSlashCommandController` 抽 pure reducer(trigger 写入/移除/各退出路径的现状行为),为 05 的 SlashSession 改造建立行为基线快照。
   抽取纪律:行为零变化,`verify:v2-bn8-runtime` 与 `test:v2` 244 基线全绿为证。
3. **RED #1 落地(surface 链 model contract)——验收条件按 MED-2 修正版,一字不许软化**:
   - fixture **必须**使用 persisted entity PageFrame 形状:`{frame.x: 0, contentInset.left: 72, pageOffsetX: 0}`(CourseDetail/entity seed 实测值;**禁用** runtime fallback frame `x=-72`——同一输入在两种 fixture 下分类相反,fallback fixture 会造修前假绿,Review MED-2 + Review-2 ①已双重证实);
   - 断言链:`default Page local layout → project → build payload → hydrate → Page visibility`,期望 `formal_page` 且 Page 可见——**当前应 RED**(在 payload 重分类处失败);
   - **反向正控**:真正拖出 Page 边界的 layout 必须仍被重分类为 `canvas_workspace`——防"永远信 explicit surface"式假修;
   - 现状行为快照测试(非 RED):斜杠各退出路径的 trigger 残留现状、prompt 门计数现状,作为 03/04/05 的对照基线。
4. **申报**:≤10 行顺手修同 01 规矩;RED #1 的 fail 输出原文贴进回执。

## 边界

- **不修 RC-A/B/C/D 本体**;不碰 schema;不装 Playwright/browser 层;不动 `NoteWritingSurfaceLayer` 渲染结构(抽取允许的机械搬移除外)。
- 03/04 拆单预告(供你理解本单地位,不属本单):**RC-A 与 RC-B 将同批修复或带显式存量迁移路径**——Review-2 ②证实症状 2 死胡同是 RC-A.5×RC-B.3 合取,单修任一会留存量笔记半死。

## 验证

`test:v2` 244 基线 + `verify:v2-bn8-runtime` 全绿;新 `test:unit` 跑通且 RED #1 如期红。回执追加 `## Result`,不自评 PASS。

## Result

> executor: Codex(builder) | date: 2026-08-20 | branch: `fable/v2-bn12-exoskeleton`

### 落地

- client runner 最小集已落地：精确锁定 `vitest@3.2.7`、`@testing-library/react@15.0.7`、`jsdom@26.1.0`，client/root 各加 `test:unit`；新增合并既有 Vite 配置的最小 `vitest.config.ts` 与显式 RTL cleanup。未安装 Playwright、未改 Tailwind 或构建链。lock 与 package 同步；旧 lock 节点零升级、零删除，仅新增测试栈 closure。
- 编辑生命周期已机械抽为 `draftBlockLifecycleReducer.ts`：只拥有现存五字段及现存 transition；同步 refs、async I/O、focus/callback/finally 顺序仍留在 hook。`setDraftText` / `setDraftLayout` API 形状保留，setter no-op 保留 React state identity。prompt selector 仍精确使用 raw `sortedBlocks.length`，未引入 visible/meaningful/creating 判定。
- 斜杠状态已机械抽为 `slashCommandReducer.ts`：只拥有 `{target, activeIndex}`、现存 trigger 文本策略与退出策略。writing-role 的 TextFlow 专用删除路径、disabled/missing/escape/Ctrl+Enter/external-clear 现状及 async null/reject 无 rollback 均保留；deferred hook 测试确认 handler 等待 save receipt。
- MED-2 RED #1 独立落在 `surfacePersistenceContract.test.ts`：literal persisted PageFrame 为 `x=0`、`contentInset.left=72`、`pageOffsetX=0`，真实贯穿 project → payload → normalize/hydrate → Page policy；真越界 stale-`formal_page` 反向正控保持绿色。未修改 RC-A/B/C/D、schema 或 surface 渲染结构。
- 顺手修：0 行。

### 验证收据

- `npm --prefix server run test:v2`：exit 0，244/244。
- `npm run verify:v2-bn8-runtime`：exit 0；159 项 runtime boundary、relation freshness、60 组 model contract、client/server build、performance、diff check、changed-file secret scan 均完成。
- `npm --prefix client run test:unit -- src/pages/Notes/canvasEngine/draftBlockLifecycleReducer.test.ts src/pages/Notes/canvasEngine/slashCommandReducer.test.ts src/pages/Notes/canvasEngine/hooks/useSlashCommandController.test.tsx`：3 files，22/22，exit 0。
- `npm --prefix client exec tsc -- --project tsconfig.json --noEmit`：exit 0。
- `npm run test:unit`：按本工单预期 exit 1；4 files 中 3 green / 1 RED，23/24 tests green；唯一失败为 MED-2 RED #1。原始失败输出：

```text
FAIL  src/pages/Notes/canvasEngine/surfacePersistenceContract.test.ts > Page surface persistence contract > keeps default Page-local layout formal and Page-visible across projection, payload, and hydrate
AssertionError: expected { …(2) } to deeply equal { payloadSurface: 'formal_page', …(1) }

- Expected
+ Received

  {
-   "pageVisibleBlockIds": [
-     "default-page-block",
-   ],
-   "payloadSurface": "formal_page",
+   "pageVisibleBlockIds": [],
+   "payloadSurface": "canvas_workspace",
  }

 ❯ src/pages/Notes/canvasEngine/surfacePersistenceContract.test.ts:104:8
    102|       payloadSurface: result.payload.surface,
    103|       pageVisibleBlockIds: result.pageVisibleBlocks.map((block) => blo…
    104|     }).toEqual({
       |        ^
    105|       payloadSurface: 'formal_page',
    106|       pageVisibleBlockIds: ['default-page-block'],

Test Files  1 failed | 3 passed (4)
Tests  1 failed | 23 passed (24)
```

## Review

> 复核者：Codex(reviewer，非 builder) | 日期：2026-08-20 | 分支：`fable/v2-bn12-exoskeleton` | 基线：`8516a833721797d7f0cad24387a43eb6a598cedd`
>
> 本节为洁净室复核结论：只依据工单、`HEAD` 对照 diff、当前代码与 reviewer 亲跑收据；不改产品代码、不接触 `main`，也不代 Fable 放行。

### 1. 判定

**判定：FAIL（修正 MED-1 后复核）。** Findings：**0 BLOCKER / 0 HIGH / 1 MED / 2 LOW**。

失败点只在本单最硬的验收语句“机械抽取 = 行为零变化”：两个 reducer 的**提交后 state、DOM effect、I/O 与 callback/finally 顺序**均与 `HEAD` 等价，但把原生 `useState` setter 换成 `useReducer` dispatch 后，React 的 render-phase 调度与 functional-updater 求值时机不再等价。该差异已有可复现的最终 state 反例，不能用“reducer 返回同一 identity”代替行为等价证明。

除 MED-1 外，测试工装、lockfile 纪律、RED #1 fixture/失败理由、反向正控及工单边界均核验通过。此 FAIL 不否定 RED #1 的有效性，也不授权修复 RC-A/B/C/D；放行权仍在 Fable。

### 2. 分支、diff 与边界

1. **分支正确**：全程为 `fable/v2-bn12-exoskeleton...origin/fable/v2-bn12-exoskeleton`；未切换或触碰 `main`。
2. **实际范围共 14 个 changed/untracked 文件**：2 个 package manifest、client lock、Vitest config/setup、2 个 reducer、4 个测试、2 个 hook 与 `NoteWritingSurfaceLayer`。未见 schema、Playwright、Tailwind、RC-A/B/C/D 修复或未申报顺手修。
3. `NoteWritingSurfaceLayer.tsx:3719-3722` 只把原布尔式委托给 `shouldShowEmptyPagePrompt`；render 结构与 raw `sortedBlockCount` 语义未变。`git diff --check` 为绿。
4. 代码流先经 CodeGraph 核对 callers/blast radius，再以 `git diff` 与 `git show HEAD:<path>` 对照基线；新文件及 index 未覆盖的最新细节直接读盘确认。

### 3. reducer 抽取对抗性核验

#### 3.1 `draftBlockLifecycleReducer`

五个字段与原 hook 一一对应：`draftActive / draftText / creatingDraft / draftFocusNonce / draftLayout`（`draftBlockLifecycleReducer.ts:3-9,24-30`）。逐 transition 对照如下：

| transition | `HEAD` 原 setter 结果 | 当前 reducer 结果 | 提交态 |
|---|---|---|---|
| `activate_local` | active=true、layout=next、nonce+1；保留 text/creating | `:43-49` 同形 | 等价 |
| `begin_empty_block_create` | creating=true，清 text/active/layout | `:50-57` 同形 | 等价 |
| `begin_draft_persist` | 只置 creating=true | `:58-59` 同形 | 等价 |
| `persist_succeeded` | 清 text/active/layout；creating 留给 finally | `:60-66` 同形 | 等价 |
| `create_finished` | 只清 creating | `:67-68` 同形 | 等价 |
| `discard` | 清 text/active/layout，不清 creating | `:69-75` 同形 | 等价 |
| `reset` | 清 text/active/creating/layout，不重置 nonce | `:76-83` 同形 | 等价 |
| `set_text / set_layout` | 接受 value/updater；同值不 commit | `:84-94` 返回原 state identity | 提交态等价；调度不等价，见 MED-1 |

refs 与副作用仍留在 hook。空块 ready path 保持 `creatingDraftRef=true → state queue → createBlock → focus → onDraftPersisted → finally(ref=false → creating=false)`（`useDraftBlockController.ts:142-161`）；有意义 draft 保持 `create → optional save latest text → success state queue → draftTextRef clear → focus → callback → finally`（`:187-216`）。`create/save` 的 null、reject、callback throw 与 finally/rethrow/无 rollback 语义均未改变。auto-height 与 resize 的 updater 也仍只捕获当次 `nextHeight`（`:101-113,228-235`）。

#### 3.2 `slashCommandReducer`

状态仍只有 `{target, activeIndex}`（`slashCommandReducer.ts:20-23,47-50`）；target 派生仍直接委托原 `detectSlashTrigger`，index 的 reset/clamp/wrap 与原实现同式（`:52-65,100-129`）。退出矩阵核对：

| 路径 | 菜单 | trigger 文本 | 结论 |
|---|---|---|---|
| commit | 关闭 | 删除 | 等价 |
| Escape / annotation / Ctrl+Enter / external clear | 关闭 | 保留 | 等价 |
| disabled / missing template / missing block | 保持 | 保留 | 等价 |

writing-role block 仍走 TextFlow unit 专用删除，不被通用 helper 改写；draft/block 的 commit 都在 await 前删除 trigger 并关菜单；save/apply 返回 null 或 reject 时仍不 rollback，focus 只在成功对象存在时发生（`useSlashCommandController.ts:199-303`）。Escape、Ctrl+Enter、Arrow 与普通 Enter 的 preventDefault/调用顺序保持（`:305-383`）。专项 hook 收据证明 deferred save 未 settle 前 handler 仍 pending，null/reject 后 cleaned text 与 closed menu 均保留。

#### MED-1 — 原生 setter 的 React 调度/求值语义没有被机械保留

**性质：技术缺陷 + 认识论错误。** `useDraftBlockController.ts:72-91` 把五个独立 `useState` 改成一个 `useReducer`，并把公开的 `Dispatch<SetStateAction<...>>` 包成 reducer action。纯 reducer 在 no-op 时返回原对象，只证明“不 commit 新 state”，不能证明与原生 setter 行为相同。

**复现 A（当前 React `18.3.1`，RTL `renderHook`）**：

- 原 `useState(0)` 执行同值 `setValue(0)`：`renders=1 / effects=1 / value=0`；
- 当前形状的 `useReducer` 执行返回同一 state 的 dispatch：`renders=2 / effects=1 / value=0`。

即 reducer 路径多执行一次 component render phase，虽不 commit effect/DOM。现役高频触发点包括 draft auto-height 的 no-op layout dispatch（`useDraftBlockController.ts:101-113`），以及 slash target/query 后经常为 no-op 的 reset/clamp（`useSlashCommandController.ts:126-132`）；因此不只是理论上的 future API 差异。

**复现 B（最终 state 反例）**：令 `external='one'`，调用公开形状 `setDraftText(() => external)`，随后在 React render 前把 `external='two'`。原 `useState` setter 在 dispatch 时 eager 求值得到 `'one'`；当前 reducer 在 render 时才调用 action 内 updater，得到 `'two'`。reviewer 独立探针实收 `{useStateUpdaterValue:'one', reducerWrappedUpdaterValue:'two'}`。现有 production caller 只传 direct string 或捕获 immutable `nextHeight`，所以未升 HIGH；但合法 `SetStateAction` 已能产生不同最终 state，硬验收“行为零变化”不成立。

**建议修法**：不要把“返回同一 reducer identity”当作 React setter 等价层。最安全的修正是保留原五个 `useState`/两个 slash `useState` 的生产 wiring，只把纯 transition/selector 抽出作行为模型；若仍要合并 state，必须补一组 hook 级 parity tests，证明 same-value render、functional updater 求值时机、连续 queued updater 与 async callback/finally 的行为都与基线一致。仅在 call site 加 no-op guard 只能修 render 次数，不能完整修 updater timing。

### 4. lockfile 与测试工装

机械解析 `HEAD:client/package-lock.json` 与 worktree lock 的 `packages`：`158 → 249`。其中：

- 旧 non-root 节点 `157/157` 全字段等价，**删除 0、升级 0**；唯一旧 entry 变化是 root `""` 新增三项 devDependency；
- 新增 `91` 节点，沿 `dependencies + optionalDependencies` 从 `vitest / @testing-library/react / jsdom` 三根做路径解析，**91/91 可达、orphan 0**；
- direct root 精确为 `vitest@3.2.7`、`@testing-library/react@15.0.7`、`jsdom@26.1.0`，均 `dev:true`，具有 registry resolved URL 与 sha512 integrity；
- `npm.cmd --prefix client ls --depth=0` exit 0，三项实装版本与 pin 一致；旧 React/Vite 等 resolved 版本未改变；
- package/lock/顶层安装树均无 Playwright；Tailwind 与既有 `vite.config.ts` 无 diff，build script 仍为 `tsc -b && vite build`。`vitest.config.ts` 只 merge 既有 Vite config 并设置 jsdom/setup。

**核心供应链申报 VERIFIED。**

#### LOW-1 — 新 lock 节点的可选 license metadata 不一致

旧 `157/157` non-root entry 都带 `license`，新增 `91/91` entry 均未写该可选字段；本地对应 package manifest 均有许可证，且 version/resolved/integrity/dev 完备，所以不影响 npm 解析与可复现安装。建议后续统一生成 lock 的 npm 工具链，或显式接受这项 SBOM/license 收据退化；不据此否定本单 closure 纪律。

### 5. RED #1 fixture、失败理由与反向正控

1. `surfacePersistenceContract.test.ts:25-41,86-90` literal 固定 `frame.x=0 / contentInset.left=72 / pageOffsetX=0`；`:59-65` 直接把该 persisted frame 传入投影函数，调用图没有 `createRuntimePageFrame`，因此结构性绕开 fallback `x=-72`。
2. reviewer 只读查询 `server/coincides.db` 的 active PageFrame entity：主样本组 `x=0,width=904,inset={top:0,right:72,bottom:96,left:72}` 共 `9` 条，fixture 与真实 persisted 形状相符。
3. 测试链为 `local layout → project → buildLayoutPayload → normalizeCanvasPersistencePayload → applyCanvasLayoutsToBlocks → Page visibility`（`:59-81`），不是只测 helper。RED 输入投影成 `{x:72,width:760,surface:'formal_page'}`，随后 `placementService.ts:305-312` 错把 world/projected x 再按 local `0..760` 分类，payload 变 `canvas_workspace`；hydrate 保留它，Page policy 因而过滤该块。失败位置和理由正确。
4. 真越界正控（`surfacePersistenceContract.test.ts:110-121`）先确认 projected explicit surface 仍 stale `formal_page`，再确认 payload 正确重分类为 `canvas_workspace` 且 Page 不可见。隔离执行 exit 0，确因越界而绿，能拦“永远信 explicit surface”的假修。

### 6. reviewer 亲跑验证收据

Windows execution policy 会拦 `npm.ps1`，以下均用同一 Node 安装的 `npm.cmd`；启动器拦截不计产品测试结果。

| 命令 | exit | reviewer 收据 |
|---|---:|---|
| `npm.cmd --prefix server run test:v2` | 0 | `244/244` pass |
| `npm.cmd run verify:v2-bn8-runtime` | 0 | 159 runtime checks、Relation freshness、60 model-contract groups、client/server build、5 performance scenarios、diff check、14-file secret scan 全绿 |
| 三份非 RED reducer/hook tests | 0 | 3 files，`22/22` pass |
| `npm.cmd run test:unit` | 1（预期） | 4 files；3 pass / 1 RED；`23/24` pass |
| 只跑 RED “keeps default Page-local...” | 1（预期） | 收到 `payloadSurface=canvas_workspace`、`pageVisibleBlockIds=[]`；正是在 payload 重分类断言红 |
| 只跑正控 “reclassifies a truly out-of-Page...” | 0 | 1 pass / 1 skipped |
| `npm.cmd exec tsc -- --project tsconfig.json --noEmit`（cwd=`client`） | 0 | 独立 typecheck 绿；总门中的 `tsc -b` 亦绿 |

#### LOW-2 — Result 的独立 tsc 收据缺 cwd，按 repo-root 字面不可复现

Result 写的 ``npm --prefix client exec tsc -- --project tsconfig.json --noEmit`` 若从本工单其余命令共同采用的 repo root 执行，实得 exit 1 / `TS5058: tsconfig.json does not exist`。从 `client` cwd 执行，或在 repo root 改为 `--project client/tsconfig.json`，均 exit 0。代码类型门本身是绿的；问题是回执命令未把 cwd 写进收据，建议更正为自足可复现的命令。

### 7. 5-2 跨条合取 / 耦合扫描

1. **reducer identity × React hook wiring**：pure test 的 `.toBe(current)` 与 22/22 绿，只证明 reducer 结果 identity；和真实 `useReducer` 合取后仍出现额外 render 与 updater timing 差异。这正是逐条均绿却在交互处失真的 MED-1。
2. **surface RED × raw prompt gate**：misclassified persisted ghost 在 Page 被过滤，而 `shouldShowEmptyPagePrompt` 仍按 raw `sortedBlockCount=1` 隐藏入口；两条合取仍形成 legacy dead-end。它是已知 RC-A.5 × RC-B.3，不是 02 新缺陷，且本单按边界正确地没有修。03/04 必须同批处理或给显式存量迁移路径，不能只让新 note 好转。
3. **runtime 总门 × intentional RED**：`verify:v2-bn8-runtime` 不包含 `test:unit`，所以总门绿与 full unit 有且仅有一个预期 RED 可以同时成立；隔离正反控证明不是误吞失败。后续修复单必须让同一 RED 转绿，不能删除/软化断言。
4. **runner × dependency closure/build**：Vitest 与既有 Vite alias/config 合并后，unit、client build、server build、model contract 同时可运行；未发现 runner 配置与旧构建链的复合冲突。

### 8. 5-1 收据完备与显式范围排除

- 已取得可得的 code diff、HEAD 基线、lock JSON 深比较、依赖闭包、实装树、只读 SQLite persisted fixture、全套脚本、RED 隔离与正控隔离收据；没有借用 builder 的绿灯。
- **未做浏览器旅程 / 服务重启**：本单明确不装 browser runner，且没有声称修复任何用户旅程；核心新增物是 pure reducer 与一个应保持 RED 的 model contract。重启服务不会为 reducer scheduler 或 payload classifier 增加比上述 hook/model 收据更相关的观测，因此显式排除 browser/live UX 签收，留给后续实现单。
- **未执行会改写安装树的 `npm ci`**：本工作树已有依赖且 lock 纪律可由 JSON deep-compare、closure traversal、integrity 与 `npm ls` 只读证明；复核官不以重装依赖污染共享施工工作树。
- 未做联网 vulnerability audit；它不是“旧节点零升级零删除/仅新增 closure”的验收条件，且不能替代本次机械 lock 对照。

### 9. 最终边界

RED #1 与供应链纪律 **PASS**；两个 reducer 的提交态/副作用顺序 **PASS**；但 React setter 的调度与 updater 时序 **FAIL（MED-1）**。修正后应重跑本节全部验证，并新增 hook-level parity 收据。

本 reviewer 不授权合并、checkpoint 或放行；由 Fable 决定修正单与最终放行。
