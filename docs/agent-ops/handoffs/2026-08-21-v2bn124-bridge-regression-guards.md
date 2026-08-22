> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(设计裁定:Fable 续打一轮,log 21) | re: v2bn12-1-4 | date: 2026-08-21

# V2.BN.12.1.4:过渡桥回归护栏(**只写测试,不改产品码**)

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。

## 定位:为什么是「只写测试」

12.1.3 复核判 **FAIL(方向成立)** 0B/**1H**/2M/1L。**「方向成立」是承重的**:复核明写「未发现当前 bridge 算法、C-1/C-2 时序或 `useLayoutEffect` 本身的产品缺陷」。

> **失败位于常驻回归测试的强度,不在机关里。** 故本单**不改一行产品代码** —— 桥是好的,缺的是「防止它被改坏/被摘掉」的护栏。
> **若你发现某条护栏非改产品码不可:停手,标 `needs: claude`,不要顺手改。**

**止损线(Fable,log 21)**:**本单再 FAIL → 停 12.1 线**,桥保留,HIGH-1 记 TD-9,J9 带标签重走。

---

## 本单的三个靶子(**均为复核已实证的活漏径,非假想**)

复核做了「反向补洞 mutation」——**API 存在、可编译、但写错或未接入生产**——三处**全绿存活**:

| 靶 | 复核实测的漏径 | 产品后果 |
|---|---|---|
| **X1** | `pageVisibleBlocks.length === 0` 错写为恒真的 `>= 0` → 专项 **6/6 PASS**,tsc exit 0 | 任意 Canvas-visible>0 的 **formal/mixed** note 也会被自动抢到 Canvas |
| **X2** | 只删换 note 时的 `manualToggledRef.current = false` → 专项 **6/6 PASS** | note A 手动切过后,**note B 的 canvas-only hydration 永远被旧 manual flag 禁止** |
| **X3** ⭐ | 删除 `useNoteCanvasRuntimeController.ts` 里 resolver 的解构、import 与 `useLayoutEffect` 生产调用(hook/API 本身保留)→ 专项 **6/6 PASS**、全量 **204/204 PASS**、tsc exit 0 | **桥无生产调用者,原 P-1 原样复发** |

> ⭐ **X3 是本单的头号目标。** 它说明现有 6 条测试**只测了逻辑对不对,没测这段逻辑是否被调用**。
> **这是调度方(Opus)上一轮点名 mutation 时的漏层** —— 我列的五处全在 hook 内部,复核往上走了一层。**记此归属,免得下一轮以为是 builder 漏了。**

---

## 交付物:三条必须「先红后绿」的护栏

### G-X1 formal/mixed 正例 fixture

现有非空 fixture **全是 canvas-only**,故 suite 从未有机会证明「Page 有内容时不得抢面」。

- 新增至少一条 **formal-only 或 mixed** fixture,断言 **`Page-visible > 0 && Canvas-visible > 0` 时保持 Page**。
- **必红判据**:把 `pageVisibleBlocks.length === 0` 改为 `>= 0`,**该条须精确变红**。

### G-X2 manual reset 的 A→B→A 矩阵

现有名为 `resets the one-shot and manual guards` 的测试**在旧 note 上从未调用 `toggleSurfaceMode`**,实际只覆盖 decided reset —— **名实不符**。

- 旧 note **先完成一次决定**,再**双 toggle 回 Page**(确保 `manual=true`);rerender 新 note 并 hydrate canvas-only 标本,**必须自动到 Canvas**。
- 补 **A→B→A 矩阵**,锁住 `surfaceState` 的 noteId/Page reset,避免旧 A 的 Canvas state 在回到 A 时重新匹配。
- **必红判据**:删除换 note 时的 `manualToggledRef.current = false`,**须变红**。

### G-X3 ⭐ root 接线契约测试

- 挂载或受控驱动 `useNoteCanvasRuntimeController`,断言**成功 hydration 后生产接线确实以 `sortedBlocks / contentWidth / note.id / loading` 调用 resolver**。
- 用 **canvas-only / mixed 或 formal / 真空** 三组结果检查首个可见 commit。
- ⭐ **必须区分 layout effect 与 passive effect** —— 防止未来把 `useLayoutEffect` 改回 `useEffect` 而恢复空 Page 闪帧。
- **必红判据(两条,须各自独立成立)**:
  1. 删除 root 的 resolver 解构 + `useLayoutEffect` 调用 → **须变红**;
  2. `useLayoutEffect` 改为 `useEffect` → **须变红**。
- hook 直调测试**可保留**,但**不能替代** root 接线测试。

### G-LOW1 回执口径更正(**上游/调度方的错,非你的错**)

12.1.3 的 Result §6 与调度方 claude-log 的 diff 口径不精确:

- 实际 commit 为 **7 files, +442/-8**;Result §6 漏列 `docs/agent-ops/claude-log/2026-08-21.md`。
- 调度方 log 里的 `+219/-8` **不等于任一自然口径**(全 commit `+442/-8` / code+test `+255/-7` / 三 hook `+96/-7`)。**根因是 `git diff --stat` 不显示 untracked 文件**,故当时漏掉了新增的测试文件。
- `useNoteCanvasRuntimeController.ts` **本身属于 05 关联文件**,故应写「**未改 Slash/rollback 保护 hunk 与语义**」,**不得笼统写「未碰 05 文件」**。

**本单回执请按上述精确口径书写。**(这条是措辞更正,**不需要改任何代码**。)

---

## mutation 三要素(5-5)申报

| 要素 | 本单状态 |
|---|---|
| **位点谁定** | **调度方(Opus)在本单点名 X1/X2/X3**,不由 builder 自选 |
| **谁执行** | **复核方(reviewer)在隔离 worktree 亲测**。**builder 的自测只作前置自查,不作验收收据**(M-1) |
| **是否瞄准已知漏径** | ✅ **是** —— X1/X2/X3 均由 12.1.3 复核**实测存活**,不是假想位点 |

---

## 边界(触及面申报)

**允许**:`client/src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.test.tsx`(扩充)· **新增** root 接线契约测试文件(建议置于同目录)· 测试所需的 fixture/工具模块(**仅测试侧**)。

**⛔ 不得**:改**任何**产品代码 —— 尤其 `useSurfaceModeController.ts` / `useRuntimeSurfaceStateController.ts` / `useNoteCanvasRuntimeController.ts` / `modePolicyService.ts` / `placementService.ts` · 碰 server 侧 · 碰 migration/`schema.sql`/DB · 碰 12.2 面 · 碰 v1 线 · 改 03/05 的 Slash/rollback 保护 hunk 与语义 · 改生产数据。

> **若某条护栏必须改产品码才能写出来(例如生产代码没有可测接缝):停手,标 `needs: claude`,在回执写明「需要什么接缝、为什么」。** 前三单正因照此停手而被判高质量;**本单同样不以「做完」为荣,以「说准」为荣。**

---

## D. 探针先过阳性对照(`adjudication §7`)

任何阴性断言之前,先让同一探针看见一个已知阳性实例,并把阳性对照写进回执。

> 📌 **调度方自身在本单前已四次栽在坏探针上**(含上轮 `git diff --stat` 漏 untracked)。**这条不是形式要求。**

## 验证与回执

门禁 **docs-first**:`docs:check`(过期先 `docs:index`+`docs:inventory`)→ `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit`。
> 📌 verify 链的 tool-face parity 接线已由调度方撤除,链中无它属正常。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方** + **M-2 header 不由你翻**。

**回执须含**:G-X1/G-X2/G-X3 三条护栏各自的**先红后绿两段输出**(红须由本单点名的 mutation 触发,不是 API 缺失)· G-X3 两条必红判据**各一段** · 产品代码 diff **必须为 0**(附阳性对照证明探针没瞎)· 精确 commit 口径(files / +/-)· 四门逐条收据 · 触及面 diff vs 申报 · 显式范围排除 · 每条阴性断言的阳性对照。

## Result

> builder: Codex · date: 2026-08-21 · **实现完成,待 reviewer 隔离复核**
>
> 按 M-2 与用户指示,**本回执未翻 header**。本单未 commit、未 push、未碰 main；下述 mutation 仅为 builder 前置自查,最终 mutation 验收权仍属 reviewer(M-1)。

### 1. 交付与边界

- 扩充 `client/src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.test.tsx`:新增真实 mixed fixture 的 G-X1；把旧的假 manual-reset 测试改为真实 A→B manual reset；另补 A→B→A note-keyed state 矩阵。
- 新增 `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.test.tsx`:挂载**生产 root hook**,保留真实 `useSurfaceModeController`,只 mock 与本契约无关的 data/layout/block-operations/presentation 重依赖。resolver wrapper 只记测试收据后调用真实 resolver,没有复制生产分类算法。
- `docs:check` 首跑发现目标工单未进入过期的 `docs/agent-ops/INDEX.md`;按工单明示运行 `docs:index` + `docs:inventory`,前者更新 1 个生成 INDEX,后者无变化。此为生成件,不是产品码。
- 未新增生产平行机关；测试 harness 的 mock 仅隔离 root 的宽依赖面,既有正门仍是 `useRuntimeSurfaceStateController` → 真实 `useSurfaceModeController`。

### 2. G-X1 — formal/mixed 正例与 RED/GREEN

同一可见性探针先做阳性校准:对 `[formalPageSpecimen, canvasOnlySpecimen]`,Page policy 精确看见 `[formalPageSpecimen]`,Canvas policy 精确看见两块；随后阴性断言才要求初始面**不得**被抢到 Canvas。

| 阶段 | 操作/命令 | 收据 |
|---|---|---|
| RED | 仅把 `pageVisibleBlocks.length === 0` 改为点名的 `>= 0`;`npm.cmd exec vitest -- run .../useSurfaceModeController.test.tsx -t "G-X1"` | exit **1**;仅 G-X1 运行并失败:`expected "page", received "canvas"`(测试行 177);6 条 skipped |
| GREEN | 逆向 patch 恢复 `=== 0`,同命令复跑 | exit **0**;1 passed / 6 skipped(当时 suite 为 7 条) |

红来自“API 仍存在、实现可编译但左半谓词写错”的 X1,不是 API 缺失。

### 3. G-X2 — manual reset 与 A→B→A

阳性校准先由同一 `surfaceMode` 探针看见 note A 的 Page→Canvas→Page 双 toggle,证明 manual flag 确实被置位；换到 B 时先看见 note-keyed Page reset,再以 canvas-only hydration 自动到 Canvas。独立矩阵另让 A 先处于 Canvas,切 B 后保持 Page,再回 A 仍先是 Page,防旧 note state 重新匹配。

| 阶段 | 操作/命令 | 收据 |
|---|---|---|
| RED | 仅删除换 note effect 中点名的 `manualToggledRef.current = false`;`npm.cmd exec vitest -- run .../useSurfaceModeController.test.tsx -t "G-X2"` | exit **1**;manual reset 测试精确失败:`expected "canvas", received "page"`(B hydration,当时行 211);6 条 skipped |
| GREEN | 逆向 patch 恢复该 reset,同命令复跑 | exit **0**;1 passed / 6 skipped(随后又补独立 A→B→A 测试) |

红来自 X2 的旧 manual flag 泄漏,不是 resolver/API 不存在。

### 4. G-X3 — root 生产调用与 layout/passive 独立护栏

root 契约逐组挂载 `useNoteCanvasRuntimeController` 并断言 resolver 收到**同一引用的** `sortedBlocks`、`DEFAULT_PAGE_CONTENT_WIDTH`、`note.id`、`loading=false`:

| hydration | 首个合法结果 |
|---|---|
| canvas-only | Canvas |
| mixed formal + canvas | Page |
| 真空 `[]` | Page |

Harness 在调用 root hook **之后**注册自己的 `useLayoutEffect`。同一 phase 探针的阳性是:当前生产 root 的 resolver 已记 1 次调用,后置 layout observer 的第一张收据才到；这证明调用发生在同一 pre-paint layout phase,而不只是 `act()` 最后把 passive effect 也冲完。

| 独立判据 | 点名 mutation | RED | 还原 GREEN |
|---|---|---|---|
| ① 删除 root 接线 | 删除 root 的 resolver destructure、React layout import 与整段生产 effect,hook/API 本身保留 | root 专项 exit **1**,3/3 均红:`expected resolverCalls length 1, got 0` | 逆向 patch 后 root 专项 exit **0**,3/3 passed |
| ② layout→passive | 只把 root import/call 的 `useLayoutEffect` 改为 `useEffect` | root 专项 exit **1**,3/3 均红；最终 resolverCalls 已是 1 且精确 payload 断言先通过,但后置 layout observer 首收据为 **0**,`expected 1` | 逆向 patch 后 root 专项 exit **0**,3/3 passed |

两条红彼此独立:①证明生产调用者不能被摘掉；②证明“最终会调用”仍不够,必须在首 paint 前调用。最终双专项命令为 **2 files / 11 tests PASS,exit 0**(surface 8 + root 3)。

### 5. D 段阳性对照与产品代码 diff=0

- changed-path 同一探针先看见两条测试阳性:`M useSurfaceModeController.test.tsx` 与 `?? useNoteCanvasRuntimeController.test.tsx`;随后检查 `client/src/**` 非测试**内容 diff**为 0。
- 对五个点名产品文件逐一用同一 filtered-blob 探针比较 index 与 working tree,五组均 `MATCH=True`:两枚 surface/root controller、`useRuntimeSurfaceStateController.ts`、`modePolicyService.ts`、`placementService.ts`。已知阳性仍是上述测试文件；产品 `git diff --numstat -- <五文件>` 无输出。
- `useNoteCanvasRuntimeController.ts` 在四次临时 mutation 后经逆向 patch/checkout-index 恢复；当前 `git hash-object --path` 与 index 均为 `3efe5f820e2077850611b54d4d09482845e89545`,`git diff` 无 hunk。因本环境 `.git/index` 只读,无法刷新 checkout 后的 stat cache,故 porcelain 仍显示该文件 `.M`;这是**stat/EOL 工作树标记**,不是内容 diff,特此披露而不把 `git status` 假写成 clean。
- 未改 `useSurfaceModeController.ts`、`useRuntimeSurfaceStateController.ts`、root 产品语义、policy/placement；未碰 server、migration、schema/DB、生产数据、12.2、v1、03/05 Slash/rollback hunk/语义。root 是 05 关联文件,故这里只申报“最终未改 Slash/rollback hunk/语义”,不写“未碰 05 文件”。

### 6. G-LOW1 口径更正

- 前单 12.1.3 的实际 commit 口径是 **7 files,+442/-8**；code+test 为 **+255/-7**；三枚 hook 为 **+96/-7**。Result §6 漏列 `docs/agent-ops/claude-log/2026-08-21.md`,`+219/-8` 不是自然口径,原因是 `git diff --stat` 漏掉当时 untracked 测试。
- 本单**没有 commit**,所以下节只报告当前 working-tree 内容 diff,不虚构 commit 统计。

### 7. 门禁收据(docs-first)

| 顺序 | 命令 | 最终收据 |
|---:|---|---|
| 0 | 首次 `npm.cmd run docs:check` | exit **1**;仅报 `docs/agent-ops/INDEX.md` 过期。随后 `docs:index` exit 0(写 1 个 INDEX),`docs:inventory` exit 0(无变化) |
| 1 | `npm.cmd run docs:check` | exit **0**;`object-inventory.md` latest |
| 2 | `npm.cmd run verify:v2-bn8-runtime` | exit **0**;client **19 files / 209 tests**,runtime boundary **159 checks**,model contract **60 groups**,client/server build、performance、docs/diff/secrets 全过 |
| 3a | client `npm.cmd exec tsc -- --noEmit` | exit **0**,无诊断 |
| 3b | server `npm.cmd exec tsc -- --noEmit` | exit **0**,无诊断 |
| 4 | `npm.cmd run test:unit` | exit **0**;**19 files / 209 tests PASS** |

披露:verify 首轮曾在新增测试的直接 `layerProps` cast 上被 client build 以 TS2352 拒绝；改为显式 test-double `unknown` 边界后,client tsc 先绿,再从 docs-first 重跑并取得上表最终收据。该失败不计作正式绿门。

### 8. 精确 working-tree 内容口径、UTF-8 与范围排除

- 当前内容 diff(含 untracked 新测试与本 Result):**4 files,+401/-3**。测试代码:**2 files,+312/-1**；生成 INDEX + 本回执:**2 files,+89/-2**。逐文件见下:两枚测试、`docs/agent-ops/INDEX.md`、本 handoff；产品内容 diff 为 0。
- 本 Result 以 `apply_patch` 写入 UTF-8；写后严格 UTF-8 decode 与首行自检见最终补充探针。header 保持原样。
- 写后探针:`TextDecoder('utf-8',{ fatal:true })` = PASS、BOM = false；首行中文与 `status: ready(...)` 完整可读。
- 未 commit、未 push、未切换/修改 main；未做浏览器主观验收、生产 DB 写入或历史数据修复；不把 unit/root contract 扩写成真实浏览器视觉签收。
