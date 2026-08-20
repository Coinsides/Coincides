> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: done | re: v2bn12-01-editing-rootcause | date: 2026-08-19

# V2.BN.12 首单:编辑机件焦点/坐标 root-cause 并案侦查

## 背景与授权

V2.BN.12「外骨骼与地板」开工首单(宪章:`docs/agent-ops/analysis/unified-direction-concept-design.md` v1,§13)。本单为**侦查单**:先诊断后开方,不做大改动。分支:`fable/v2-bn12-exoskeleton`(所有 V12 工作在此分支或其子分支)。

## 并案的四个症状(2026-08-08 实测,复现细节见 `analysis/2026-08-08-econ-note-rebuild-experience-report.md` + 同日会议卷问题 3/6/9/10)

1. **焦点不移交**:Page 模式双击"开始写作"占位按钮消费后,键入全部落进标题输入框;
2. **Page 模式死胡同**:占位按钮消费且未产生内容后,纸面任意点击/双击永久无反应,F5 不恢复(Canvas 模式双击正常——差异本身是线索);
3. **编辑态静默污染**:斜杠菜单失败残留"/hea"于正文、字符重复累积,无"哪个单元在接键"的可见指示;
4. **所见文本与可编辑面错位**:单击/三连击可见文本行,命中的 textarea 为空(selStart=0,value="");空单元 Backspace 不发生向前合并——ADR-0001"transform 内 TextFlow 编辑稳定性"风险的首个实证。

**并案假设**:四症状同源于焦点/坐标管理与可见渲染的对位层(疑似 NoteWritingSurfaceLayer / textarea 捕获层 / overlay 渲染层之间的状态同步)。假设可以被推翻——若诊断出多个独立 root cause,如实分列。

## 任务

1. **复现**:在本地起 dev(.claude/launch.json 双服务;test@test.com/testtest),逐一复现四症状,记录精确触发路径;
2. **诊断**:定位每一症状的机制链(哪层丢焦点/哪层坐标失配/占位按钮消费后进入什么状态),给出 root-cause 判定(同源或分列),引用具体文件:行号;
3. **开方**:修复方案设计(不实施):改动面、风险、与新方向的关系(此机件为未来流式装配面共用内核——修法须服务新面,不为旧 Page 模式表层镀金;Page 模式死胡同若根因在"占位按钮状态机",修状态机而非修按钮);
4. **顺手可修**:若诊断中发现 ≤10 行的低风险即时修(如焦点移交一行补),可修并单列申报;大改动一律只开方等下一单。

## 边界

- 不碰:斜杠菜单键盘导航(症状 3 的菜单部分另单)、三图标样式、任何 schema;
- 测试:诊断结论须配最小复现测试(能 RED 的形状最好);
- 回执:本文件追加 `## Result`,含诊断报告+修复方案+顺手修申报;**不自评 PASS**——复核由 reviewer 单独进行。

## 验证基线

`cd server && npm run test:v2`(244 基线)与 `npm run verify:v2-bn8-runtime` 在你改动后必须仍绿(侦查单通常零改动,顺手修后必跑)。

## Result

> 执行者: Codex(builder) | 日期: 2026-08-19 | 分支: `fable/v2-bn12-exoskeleton`
>
> needs: claude — 复核本报告的 root-cause 分案，并据「修复方案」拆后续实现单；本单不自评 PASS。

### 1. 执行范围与复现样本

- 已按要求先读 `CLAUDE.md`、`docs/agent-ops/AGENT_CONTEXT.md`、宪章 §4/§13，并核对 active current-state、ADR-0001、原体验报告与会议问题 3/6/9/10。
- 在现有本地双服务与测试账号会话中，用真实 Chromium 复现；未切分支、未碰 `main`，也未修改既有 `docs/agent-ops/claude-log/2026-08-19.md` 工作树改动。
- 新建了可供 reviewer 检查的 disposable note：`V2.BN.12 editing root-cause repro 2026-08-19`（note id `648ed612-94d3-4033-8f3f-a6de726e04b0`）。历史症状 4 在 `July 8 · 跨时期价格歧视 — 完整讲稿(应用版)`（note id `1d10fe77-495b-4458-b7a4-f3d428c568ff`）复现；只做选择与无效 Backspace，未改其正文。

### 2. 四症状复现结论

| 症状 | 当前分支实测 | 精确现场 |
|---|---|---|
| 1. 焦点不移交 | **机制复现，历史落点未原样复现** | fresh Page note 中先聚焦标题，再双击空页 prompt 并立即键入 `FOCUS_PROBE_812`：同步时 `activeElement=BODY`、正文 textarea=0；约 900 ms 后 Page 仍无 textarea，输入丢失。当前 Chromium 未把字写回标题，故不能把历史「标题接键」冒充为当前精确结果；但「gesture 后没有正文接收者」稳定存在。 |
| 2. Page 死胡同 | **完整复现** | 空白 activation 完成后 Page 为 `visibleBlocks=0`、prompt 消失；F5 后仍为 0 且无 prompt。切 Canvas 后同 note 出现一个持久化 block。初始为唯一空 `tu-1`；其 article 是 scratch，Canvas style 为 `left:168px;width:760px`。 |
| 3. 静默污染 | **残留复现；历史键盘失灵已漂移** | 当前 `/hea`→Enter 会清 trigger 并把 unit 设为 Heading；ArrowDown 后菜单保持，故历史「Enter/Down 全断」当前不可复现。`/hea`→Escape 则只关菜单，textarea 仍为 `/hea`，blur 后可持久化。未观察到逐键 double-dispatch；历史 `现象//` 更符合两次未 rollback session 的累积，不能另立“字符复制”结论。 |
| 4. 所见/可编面错位 | **完整复现，但推翻 overlay/transform 猜测** | 历史 ECON note 的 Canvas 有 6 个 TextBlock：1 个 1791 字正文、5 个空块，其中 4 个空块同 rect 重叠正文。先从非重叠处激活另一空块后，其 z-index 从 2 升 34；正文可见坐标的 `elementsFromPoint` 顶层变成该空 textarea，下面才是正文 textarea。点击后 `value=""/selectionStart=0`；Backspace 前后空块数与正文长度均不变。 |

### 3. Root-cause 判定

原「四症状同源于 transform/overlay 对位」假设不成立。症状 1/2/4 有一条共同的 ghost-block lifecycle 上游，但还叠加 Page 坐标分类、命中面与 TextFlow 边界等独立缺口；症状 3 的 slash transaction 是独立 root cause。

#### RC-A：开始写作被实现为“先持久化空 block，后挂载/聚焦 editor”（症状 1，并产生症状 2/4 的 ghost）

1. `activateDraft` 先宣称 `editingText`，但 ready path 随即明确 `setDraftActive(false)`；它创建空 TextFlow 并调用 `createBlock('', layout)`，promise 完成后才 `setFocusBlockId`：`client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:112-147`。真正 draft textarea 只有 `draftActive` 时才挂载：`client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:3671-3707`。
2. `createBlock` 串行等待 block POST 与 placement PUT，最后才把 block 放进 React state：`client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:688-730`；随后 `autoFocus` 还要等一次 `setTimeout`：`client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx:200-217`。因此网络未完成期间必有“interaction 已是 editing、DOM 却无 editor”的 focus vacuum。
3. 标题 Enter 只 preventDefault + save，不 blur：`client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.tsx:366-380`。这解释历史浏览器为何可能继续由标题接键；本次当前 Chromium 把焦点落到 BODY，表现为丢字而非标题污染，根因不变。
4. 后端允许 `plain_text` 缺失/空值：`server/src/validators/index.ts:733-741`；POST 无条件插入 active block 与 placement：`server/src/routes/notes.ts:271-313`。GET 又返回所有 active block，不按 meaningful content 过滤：`server/src/routes/notes.ts:209-268`。
5. prompt 仅检查 raw `sortedBlockCount === 0`：`client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:3718-3722`。所以一次无字 activation 就永久消费入口，reload 会恢复 ghost 而不会恢复 prompt。

#### RC-B：Page-local layout 投影后又按错误原点重算 surface（症状 2 的 Page/Canvas 分叉）

1. Page create path 把 local layout 交给 PageFrame 投影：`client/src/pages/Notes/canvasEngine/hooks/useRuntimeNaturalWritingController.ts:65-89`；投影会加入 PageFrame content inset/offset，并明确写 `surface:'formal_page'`：`client/src/pages/Notes/canvasEngine/placementService.ts:259-282`。
2. placement 保存却调用 `buildLayoutPayload`，忽略上述 explicit surface，并用固定 Page-local `0..DEFAULT_PAGE_CONTENT_WIDTH` 对已经投影的 x/width 重新判 boundary：`client/src/pages/Notes/canvasEngine/canvasObjectRepository.ts:78-90`、`client/src/pages/Notes/canvasEngine/placementService.ts:204-207,305-318`。本次 live block 因投影后的 x 加全宽 760 被判 crossing，最终持久化为 `canvas_workspace`；Canvas DOM 的 scratch class/`left:168px;width:760px` 是直接佐证。
3. Page policy 会过滤 `canvas_workspace`，Canvas 则展示全部 renderable blocks：`client/src/pages/Notes/canvasEngine/placementService.ts:78-99`、`client/src/pages/Notes/canvasEngine/modePolicyService.ts:41-77`。因此 Page 为 0、Canvas 为 1，并非 reload 丢数据。
4. 另有 hit-surface 放大器：dblclick 仅绑 inner block list，且要求 `event.target === event.currentTarget`：`client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:3157-3223`、`client/src/pages/Notes/canvasEngine/hooks/useCanvasSurfacePointerController.ts:39-59`。Page 外纸面有 72px padding、inner list 最宽 760；Canvas inner world 为 4096×2600：`client/src/pages/Notes/NoteDetail.module.css:900-918,1008-1021`。所以 Page 的视觉白纸并不等于可启动写作的命中面。

#### RC-C：durable 空块重叠 + active 抬层，令透明空 textarea 遮住可见正文（症状 4）

1. Canvas 显示所有 ghost blocks，surface 为每个 visible block 渲染一个真实 editor：`client/src/pages/Notes/canvasEngine/modePolicyService.ts:68-77`、`client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:3593-3669`。
2. block article 绝对定位；active/focus/selected 任一成立即传 `active`：`client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx:268-282`、`client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:3593-3616`。CSS 把普通 block 放在 z=2、hover z=24、active z=34：`client/src/pages/Notes/NoteDetail.module.css:1428-1453`。合法但透明的空 textarea 因此可在视觉无字时拦截下层正文命中。
3. 这不是 annotation overlay 抢事件：overlay 只在有 highlight 时存在，位于 z=0 且 `pointer-events:none`；真实 textarea 位于 z=1：`client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx:1094-1146`、`client/src/pages/Notes/NoteDetail.module.css:1872-1900`。live `elementsFromPoint` 也显示是两个 TextBlock textarea 重叠。
4. Backspace 仅能合并同一 TextFlow 内的 previous unit；首个/唯一 unit 在 `previousUnit` 不存在时直接 return：`client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx:811-840`。跨 NoteBlock merge 尚无语义，所以 ghost 空块不会被 Backspace 清掉。

#### RC-D：slash query 先成为正文真值，cancel/failure 没有 transaction rollback（症状 3）

1. change handler 先把 `/query` 写进 draft/block state，再由该文本派生 slash target：`client/src/pages/Notes/canvasEngine/hooks/useSlashCommandController.ts:134-173`。
2. 只有成功 writing-role/template 分支会 remove trigger：同文件 `:200-237,252-271`。disabled、annotation action、missing template 与 Escape 路径只 toast/关菜单，不恢复 trigger：同文件 `:200-205,240-250,331-359`。
3. 当前 ArrowUp/Down/Enter 已有 preventDefault 与选择逻辑：同文件 `:290-329`，且 live 验证正常；本单按边界不重做菜单导航。
4. 可见归属不足是跨症状放大器：interaction 只存 `blockId`，没有 `textFlowId/textUnitId`：`client/src/pages/Notes/canvasEngine/interactionController.ts:25-48`。textarea 虽有三层 data identity：`client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx:1146-1179`，但没有持久的 active-unit state/明显反馈。

### 4. 修复方案（本单不实施）

1. **共享编辑 lifecycle（首要，服务 §4/§13 的未来流式装配面）**：建立 `idle → ephemeral-mounted → focused → dirty → persisted/reconciled` 状态机。gesture 必须同步挂载 local TextUnit 并取得 focus；首个 meaningful input 或显式 command 才创建 durable block。空 blur/Escape 直接丢弃。若产品必须 server-first，则 pending block 要有 provisional 身份、失败/空白 rollback 和 reload 清理，不能成为普通 active truth。
2. **placeholder 与 focus receipt**：入口依据 `meaningful renderable content + pending editor`，不依据 raw block count；transition 只有在指定 `(blockId,textFlowId,textUnitId)` DOM owner 确认 focus 后才进入 editing。把该三元组加入 interaction/selection state，并在 row 暴露稳定 DOM/a11y active 标记。
3. **统一坐标与 surface authority**：明确 `PageFrame-local` 与 `Canvas-world` 类型/转换边界；创建、移动、保存、hydrate 共用一次 boundary classifier，不得把 projected x 再按 local 原点分类。Page/Canvas 共用 `beginWritingAt(point,surface)`，共同 surface 负责 dblclick，interactive descendants 走显式 allow/deny，而非 exact-target equality。
4. **ghost 数据与命中栈**：提供一次性/惰性清理策略，仅删除可证明由旧 activation 产生且无 meaningful content/source/annotation/history 的 provisional ghosts；placement stacking 必须确定化。不能给所有 empty textarea 加 `pointer-events:none`，合法空块仍需可编辑；也不能只压 active z-index，合法 Canvas 重叠会被破坏。
5. **slash transaction**：引入 SlashSession，记录 owner 三元组、trigger range/original slice 与 caret。success commit；Escape/disabled/missing guarded rollback（仅当 owner/range 仍匹配，避免删掉用户本来要保留的 literal slash），再恢复原 unit focus/caret。
6. **Backspace boundary**：在线性 Page/未来 flow 顺序里，只有前一 block 兼容且当前 first/only unit 为空时才 merge/delete/focus 前块尾；自由 Canvas 不按几何重叠猜“前一块”。症状 4 应先由 ghost cleanup/命中规则解决。

主要风险：ephemeral→persisted ID reconciliation 会碰 focus、selection、annotation、undo 与 autosave；surface 修复会影响 Page/Canvas 拖拽越界重分类；跨 block merge 会碰 source refs、anchors、layout/history；ghost cleanup 必须避免删除用户有意保留的空结构。

### 5. 最小 RED 测试形状

1. **纯 model contract**：`default Page local layout → project → build payload → hydrate → Page visibility`，断言仍是 `formal_page` 且 Page 可见；当前在 payload 重分类处 RED。
2. **component/DOM**：hold block POST/placement promises；标题先获焦，dblclick prompt 后在 promise resolve 前断言 local textarea 已挂载、获焦、接住 sentinel，标题不变；zero-text blur + reload 断言 durable block 数不增、入口仍可用。当前 RED。
3. **slash session**：成功 Enter 保持 GREEN；Escape/disabled/missing 断言 guarded trigger rollback、同一 unit/caret 恢复。当前 Escape RED。
4. **真实浏览器 E2E**：seed nonempty block + legacy overlapping empty ghost；点击可见文字坐标后，断言 `elementFromPoint`/active owner 是正文，或 empty block 有明确可见 affordance 而非静默拦点。再测 Page 60%/Canvas 60% 与 reload。真实 layout/hit-test 不能用 jsdom 代替。
5. **边界 Backspace**：Page linear flow 的 compatible previous block + 当前唯一空 unit，断言删除空 provisional 并 focus 前块末尾；Canvas control 断言不做几何猜测。

当前 client 没有 Vitest/RTL/jsdom/Playwright runner（`client/package.json:6-18,36-41`）；已有 model/static contracts 能覆盖 TextUnit 纯函数，却覆盖不到 focus、网络悬空、reload、CSS stacking 与坐标 hit-test。建议下一单先抽 lifecycle/slash pure reducer 接现有 model contract，再补最小 component + browser harness。

### 6. ≤10 行顺手修申报

**零项。** 没有实施 production code 改动。

- `title.blur()` 只会把“字进标题”改成“字丢到 BODY”；
- 让 prompt 在空 block 时继续显示会继续堆 ghost；
- 直接移除 exact-target guard 会让 textarea/button 的 bubbled dblclick 误建 block；
- 给 empty textarea 禁 pointer 或改一行 z-index 会破坏合法空块/合法重叠；
- 让 `buildLayoutPayload` 一律信任旧 `layout.surface` 虽是一行，却会让 block 拖过 Page 边界后无法重分类。

这些都不是低风险完整修，故按侦查单边界只开方。

### 7. 验证记录

- `npm.cmd run verify:v2-bn8-runtime`：exit 0；runtime boundary、relation freshness、60-group canvas model contract、client/server build、performance、diff/secrets 门完成。
- `npm.cmd run test:v2`（server 默认 asset path）：244 项中 239 通过、5 失败；五项均为 image-asset 测试在 `server/uploads/canvas-assets/<uuid>` 执行 `mkdir` 遭当前沙箱 `EPERM`，不是本单代码断言失败。
- 将 `CANVAS_ASSET_DIR` 临时指向 workspace `.codex-tmp/canvas-assets-test-v2bn12` 后重跑同一 `test:v2`：244/244，exit 0。测试留下的该目录为空；当前命令沙箱拒绝删除空目录，目录位于已忽略的 `.codex-tmp` 下。
- 工作树的本单变更只有本 handoff 的 `status: done` 与本 `## Result`；另有开工前既存的 `docs/agent-ops/claude-log/2026-08-19.md` 修改，未触碰。

## Review

> 复核者：Codex(reviewer，非 builder) | 日期：2026-08-19 | 分支：`fable/v2-bn12-exoskeleton`
>
> 本节只给独立复核结论；不改产品代码、不接触 `main`，也不代 Fable 放行。

### 1. 判定与范围

**判定：PASS（仅限本侦查报告的当前机制结论）。** Findings：**0 BLOCKER / 0 HIGH / 4 MED / 5 LOW**。

PASS 的依据是：RC-A/B/C/D 的当前主机制链均能由代码、只读 SQLite 现场或二者共同证成；builder 没有夹带产品代码；reviewer 亲跑强制 runtime gate 为绿。这个 PASS **不表示**第 5 节的五个 RED 草图已成为 implementation-ready 验收规格，也不认可“历史代码已经漂移”的因果表述。下列 MED 必须在 Fable 拆后续实现单时收窄；跨 block Backspace 还需要单独产品决定。

### 2. 分支、diff 与独立验证

1. **分支正确**：首次快照为 `fable/v2-bn12-exoskeleton...origin/fable/v2-bn12-exoskeleton`；未切换或触碰 `main`。
2. **builder 的实际申报按其原文成立，但“整棵工作树只有 handoff”若作字面理解则不成立**：review 开始时 `git status --short` 有两项——本 handoff 与已存在的 `docs/agent-ops/claude-log/2026-08-19.md`；`git diff` 显示本单只在 handoff 做 `ready → done` 并追加 `## Result`，而 claude-log 的改动已被 Result 明确披露为既存且未触碰。未发现任何 product-code diff 或未申报顺手修。
3. **并发工作树边界**：复核过程中外部会话又加入/修改 `docs/PRD.md`、`AGENT_CONTEXT.md`、`DOCUMENTATION-SYSTEM.md`、`current-state/README.md`、`scripts/docs-index.mjs` 与 `analysis/2026-08-20-doc-triage-assessment.md`，并把共享分支 HEAD 推进到 `7b093b2`。这些不在首次快照中，不能倒归因给本 builder；本 reviewer 也未编辑它们。最终 `git status --short` 已收敛为仅本 handoff modified，reviewer 的唯一写入仍是本节。
4. **强制门亲跑**：在仓库根执行 Windows 等价命令 `npm.cmd run verify:v2-bn8-runtime`，exit `0`。159 项 runtime boundary、Relation freshness、60-group Canvas model contract、client/server build、5 个 performance scenarios、`git diff --check` 与 changed-file secret scan 均通过；Vite 的 dynamic import / chunk-size 输出为 warning，不是失败。
5. **只读数据抽验**：disposable note 的 entity PageFrame placement 为 `x=0,width=904`，`contentInset.left=72`；block placement 为 `x=72,width=760,surface=canvas_workspace`。历史 ECON note 当前有 6 个 active TextBlock（1 个 `plain_text` 长度 1791、5 个空块），其中 4 个空块有相同 `x=72,y=0,width=760`。这分别独立背书 RC-B 的坐标重分类现场与 RC-C 的 durable ghost/重叠前提。
6. **live 复演边界**：reviewer 尝试重新打开 disposable note 时，本地 API/Vite 服务已无监听，页面请求报 network error，故没有把 builder 的 DOM 时序、`activeElement` 或 slash 键盘实测冒充为 reviewer 自己的 live receipt。以下 PASS 建立在源码、SQLite 现场与强制门上；“当前未原样复现历史行为”只作为 builder 现场记录，不上升为代码演化事实。

### 3. RC-A/B/C/D 引用逐条核对

| 项 | 结论 | reviewer 核对 |
|---|---|---|
| RC-A.1 | VERIFIED | `useDraftBlockController.ts:112-147` 的 ready path 先写 `editingText`，随即 `setDraftActive(false)`，创建空 TextFlow/block，promise 完成后才设 `focusBlockId`；`NoteWritingSurfaceLayer.tsx:3671-3707` 又把 draft textarea 严格绑在 `draftActive`。focus vacuum 成立。`textFlowService.ts:110-136` 还确认“空”TextFlow 实含一个 active 空 `tu-1`。 |
| RC-A.2 | VERIFIED | `useNoteCanvasDataAdapter.ts:688-730` 依次 await block POST、placement PUT，之后才 `setBlocks`；`canvasObjectRepository.ts:78-90` 确认 PUT 经过 layout payload；`BlockEditorLayer.tsx:200-217` 的 focus 再等 `setTimeout(0)`。两个请求完成前没有正文 editor；若 RC-B 过滤该块，之后也不会挂载。 |
| RC-A.3 | PARTIAL | `NoteChromeLayer.tsx:366-380` 的确只 `preventDefault + save`、没有 blur；但它不能证明历史双击之后 native focus 仍在标题。本次 BODY 落点与历史“标题接键”之间没有已证路径，历史 landing 应保持 unresolved。 |
| RC-A.4 | VERIFIED | `validators/index.ts:733-741` 接受缺失/空 `plain_text`；`routes/notes.ts:271-313` 无 meaningful-content guard 即插入，`:209-268` 只按 active 读回。Result 漏引的 `server/src/db/schema.sql:422-430` 才补足 `status DEFAULT 'active'`，但结论本身成立。 |
| RC-A.5 | VERIFIED | `NoteWritingSurfaceLayer.tsx:3718-3722` 只看 raw count；`useNoteCanvasDataAdapter.ts:353-356` 的 `sortedBlocks` 没有 meaningful/visibility filter，`useNoteCanvasRuntimeController.ts:299-305` 传入其长度。active ghost 会消费 prompt。 |
| RC-B.1 | VERIFIED（有前提） | `useRuntimeNaturalWritingController.ts:65-89` 走 PageFrame 投影；`placementService.ts:259-282` 加 frame/inset/offset 并写 `formal_page`。只读 DB 命中真实 persisted frame `x=0,inset.left=72` 与 projected block `x=72,width=760`。该结论不覆盖 `pageFrameCollection=null` 的 runtime fallback。 |
| RC-B.2 | VERIFIED | `canvasObjectRepository.ts:78-90` 调 `buildLayoutPayload`；`placementService.ts:204-207,305-318` 用 local `0..760` 边界重新分类 projected layout，未保留显式 surface。真实 `{x:72,width:760}` 因 crossing 落成 `canvas_workspace`，与 DB 一致。 |
| RC-B.3 | VERIFIED | `placementService.ts:78-99` 识别 workspace；`modePolicyService.ts:41-77` 在 Page 过滤 workspace、Canvas 保留全部 renderable block。Page 0 / Canvas 1 是 policy 分叉，不是 reload 丢数据。 |
| RC-B.4 | VERIFIED | `NoteWritingSurfaceLayer.tsx:3157-3223` 只在 inner block list 接 dblclick；`useCanvasSurfacePointerController.ts:39-59` 要求 exact target；CSS `:900-918,1008-1021` 证明 Page padding/760 内容宽与 Canvas world 的大命中面。4096×2600 应精确称为默认/最小 world，而非不可覆盖的固定值。 |
| RC-C.1 | VERIFIED（收窄） | `modePolicyService.ts:41-52,68-76` 让普通 non-shape-backed renderable ghosts 在 Canvas 可见；`NoteWritingSurfaceLayer.tsx:3593-3669` 为每个 visible block 挂真实 editor。不是任意 status/kind 的“所有 ghost”都会显示。 |
| RC-C.2 | VERIFIED，引用不完整 | active/focus/selected 的 OR 链在 `NoteWritingSurfaceLayer.tsx:3593-3616`，article active 在 `BlockEditorLayer.tsx:268-282`，z=2/24/34 在 CSS `:1428-1453`。报告未 cite 的 CSS `:1641-1655` 才直接证明 textarea 宽 100%、背景透明且未禁 pointer；机制仍成立。 |
| RC-C.3 | PARTIAL | inline highlight layer 的确由 `TextBlockProjection.tsx:1016,1094-1145` 条件挂载，CSS `:1882-1900` 为 z=0 / pointer-none、textarea z=1；但另有全局 `AnnotationOverlayLayer.tsx:16-29`，CSS `:2570-2575` 同样 pointer-none。能证成“这两个 annotation overlay 都不抢事件”，不能笼统说系统 overlay 只在 highlight 时存在。 |
| RC-C.4 | VERIFIED | `TextBlockProjection.tsx:811-840` 只从同一 editableFlow 找 previous unit；首/唯一 unit 找不到就 return。当前没有跨 NoteBlock Backspace merge。 |
| RC-D.1 | VERIFIED | `useSlashCommandController.ts:134-173` 先将 `/query` 写入 draft/block truth，再派生 slash target；污染可以随普通持久化链保存。 |
| RC-D.2 | PARTIAL | 成功 writing/template 分支在 `:209-235,253-270` remove trigger；Escape/annotation 在 `:240-243,334-337,354-358` 关菜单但不 rollback。disabled/missing-template 在 `:202-205,223-225,246-250,261-263` 同样不 rollback，**却并不都关菜单**；Result 的统一“toast/关菜单”措辞过宽。 |
| RC-D.3 | VERIFIED（静态） | `:303-320` 确有 ArrowDown/Up/Enter 的 preventDefault 与选择逻辑。它证明当前 source 有处理器，不证明 08-08 现场当时为何失灵。 |
| RC-D.4 | PARTIAL | 全局 `interactionController.ts:27-31,46-48` 只持 `blockId`，DOM 在 `TextBlockProjection.tsx:1174-1176` 有三元 identity，故“缺全局 focused-owner 三元组”成立；但组件已有 `selectedTextUnitIds`（`:484,1041-1057`），CSS `:1673-1675` 也有 `:focus-within` gutter。应说“缺全局 owner receipt / 强而持续的 unit 反馈”，不能说毫无 active-unit state/反馈。 |

### 4. Findings

#### MED-1 — “历史症状漂移”超出证据

**复现**：08-08 记录确有标题接键、Enter/Down 失灵、slash/重复字符污染；但 `git blame -L 290,329 useSlashCommandController.ts` 显示 Arrow/Enter handler 自 2026-06-23 已存在，相关 surface source 的最后提交也早于 08-08。仓库没有“之后改代码所以现在好了”的时间证据。

**建议**：把“历史键盘失灵已漂移”改为“本次未原样复现，差异原因未定”。RC-D 可以解释当前 Escape/annotation 等 non-commit 路径残留 trigger，却不能完整解释历史 Enter/Down 失灵；“`现象//` 更符合两次 session 累积”只能保留为候选假设，不能当 root cause 收据。

#### MED-2 — RED #1 未钉死真实 persisted PageFrame fixture，存在修前错误 GREEN

**复现**：Course/note 的 persisted entity frame 是 `x=0,inset.left=72`，故 local `{x:0,width:760}` 投影成 `x=72` 后被错误分成 workspace；但 `pageFrameService.ts:53-68` 的 runtime fallback frame 是 `x=-72`，相同输入投影后仍是 `x=0`，当前代码已会给 `formal_page`。若测试作者把“default Page”理解成 fallback，所谓 RED 会因错误理由先绿。

**建议**：fixture 明写 CourseDetail/entity seed `{frame.x:0, contentInset.left:72, pageOffsetX:0}`，串完 `project → build payload → hydrate → Page policy`；另加反向正控——真正拖出 Page 后必须仍重分类为 `canvas_workspace`，防止用“永远信 explicit surface”造成假修。

#### MED-3 — RED #2/#3/#4 尚不是可直接执行且确定的契约

**复现**：`client/package.json:6-18,36-41` 无 Vitest/RTL/jsdom/Playwright；现有 Node model contract 不能验证真实 focus、reload 或 CSS hit-test。#2 把 component promise/focus race 与 browser/API durable-count 两层揉在一条；#3 漏 `annotation_action`，且 disabled/missing 究竟留菜单还是关闭尚未定；#4 用“正文成为 owner **或** 空块有 affordance”的析取 oracle，任一偶然成立都可让测试通过。

**建议**：#2 拆成 pure/component race 与 browser/API persistence 两项；#3 抽 SlashSession reducer，覆盖**所有 non-commit exit**，并加 owner/range 已漂移时 rollback 必须 no-op 的负例，再由 Fable决定 disabled/missing 的菜单状态；#4 先选定唯一产品策略和断言，再配真实浏览器 seed/cleanup。现状只有 #1 在修正 fixture 后可直接进入现有 runner，#2-#4 需先抽 reducer或补 harness。

#### MED-4 — RED #5 在 root-cause 修理中引入未获宪章确认的新编辑语义

**复现**：历史症状 4 证明的是点击落到错误空 textarea、Backspace 无变化；`TextBlockProjection.tsx:831-840` 只定义同 TextFlow unit 合并。宪章 §4 确定未来是一维组件流，却没有决定跨 NoteBlock Backspace 的兼容规则、删除、source/anchor/history 或 focus 语义。

**建议**：把跨 block merge 从本单必过项和 RED #5 移出，另交 Fable/Henry 决策；症状 4 先由 ghost provenance、命中规则和 owner receipt 修复。Canvas “不按几何猜前块”可保留为边界原则。

#### LOW

- **LOW-1**：RC-A.3 只证 title Enter 不 blur，历史 title landing 仍 unresolved；RC-A.4 应补 schema active-default 引用。
- **LOW-2**：RC-C.2 漏 cite textarea transparency/pointer 规则；RC-C.3 对 overlay 种类概括过宽，但两类已查 overlay 均 `pointer-events:none`，不改变命中栈结论。
- **LOW-3**：RC-D.2 把 disabled/missing 与 Escape/annotation 都写成“关菜单”不精确；修复方案还应把 annotation 与 async failure 纳入所有 non-commit exits。
- **LOW-4**：RC-D.4 的“无 active-unit state/明显反馈”过宽；应限定为缺全局 focused-owner tuple 与强反馈。
- **LOW-5**：legacy ghost cleanup 只有能证明 provisional provenance 时才安全；“空文本/重叠”本身不能成为自动删除凭据。RC-B.4 的 Canvas 4096×2600 也应称默认/最小值。

### 5. 宪章 §4/§13 与修复方向

**总体一致。** shared lifecycle、owner 三元组、统一 surface authority、SlashSession 都在修复 §4 所说会被未来流式装配面继续复用的 TextFlow“活机件”；root-cause repair 也正是 §13 的 V12 必需项。坐标修理应留在共享 surface kernel / 旧 Page 兼容层，遵守 V12 暂不物理拆 PageFrame、未来新流面绕开的边界，不能继续扩建 Page 专属机制。

两点必须守住：其一，ephemeral editor 只是交互暂态，不能把内容真值搬进 placement；durable/provisional 的 provenance 与 reconcile/rollback 要明确。其二，跨 block Backspace 不是 §4/§13 已批准语义，按 MED-4 另单决定。Result 对 ghost cleanup 已写“只删除可证明的 provisional”，方向正确，但在 provenance 尚不存在时只能保守处理。

### 6. RED 可执行性结论

| RED | 当前可执行性 | 复核结论 |
|---|---|---|
| #1 surface chain | 可直接落现有 Node model contract | 必须使用 persisted entity PageFrame fixture，并带“拖出 Page”反向正控；否则会假绿。 |
| #2 lifecycle/focus | 当前不可整条执行 | 拆 component race 与 browser/API persistence；先抽 pure lifecycle 或补 component/browser harness。 |
| #3 slash transaction | 当前不可直接执行 | 抽 pure reducer；覆盖 success 与所有 non-commit exits、annotation、async failure、owner/range mismatch no-op。 |
| #4 overlap hit-test | 只能真实浏览器 | 先选择一个确定 oracle，不能保留 `A 或 B`；补 seed、身份、清理与合法空块反例。 |
| #5 Backspace | 不应作为本 root-cause RED | 未拍板的新语义，移出本单；pure TextFlow unit 测试不能替代跨 block lifecycle 契约。 |

本单是零产品代码侦查，因此没有“声称修复 X”可要求 fail-before/pass-after 收据；builder 也诚实披露 runner 缺口。后续实现单一旦宣称修复，必须先把上述确定化 RED 跑出修前 fail，再以同一断言证明修后 pass。

### 7. 最终边界

RC-A/B/C/D **当前机制链 PASS**；历史原样症状的完整因果、后续 RED/UX 契约与跨 block 编辑语义 **未获本 Review 放行**。本 reviewer 不授权施工、合并或 checkpoint；由 Fable 根据以上 MED 抽检、收窄并决定是否发后续实现单。
