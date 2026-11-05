> **状态 (Status)**: active（D3 部分因撤回作废，保留记录）
> **层 (Layer)**: 复核报告
> **日期 (Updated)**: 2026-11-05
> **权威 (Authoritative)**: 否（判语归 Main_Designer）

# 保真 1a-乙复核报告 · Tester(1)

复核对象：builder 工作树未提交交付 D1-D4（基于 HEAD `2fcd59c2`）。简报：ops 档案 `tester-review-1a2-brief.md`。

**过程说明**：工作流 `wf_af1bb44f-ad0` 中途被打断，53 路结果走缓存续跑，只补未完成的路数，没有重来；连完整性批评共 68 路。

**判语（Main_Designer 2026-11-05，全文在单据尾部）**：无 major。D1 主路径、D2、D4 放行，**D3 整件撤回**。本报告保留原始记录，只在受影响的地方加注：

- **作废**：T-D3-1/2/3、T-D3-N1 至 N11、T-E-1、T-E-2，以及「打印不带 Source p.N」「D3 把浮层扩到可编辑笔记」两个待裁项。
- **进补丁**：T-D2-1 并 T-D2-N1（P2）、T-D2-N6（并入 P2）、T-D2-D2（P3）、T-D1-N9（P4）、部署清单第 3 条（P5）。
- **不进本轮**：T-D2-2、T-D2-D1、T-D2-D3、T-D2-D4、h1-h3 映射。
- **放行**：useChapterPresentation 红，修测试单入 tech-debt。
- **不进本轮，入 tech-debt（补丁轮裁定）**：默认原页下 Agent 聚焦远处块落空（本报告「裁定结果」节）、T-P-1。

D3 合体补丁实测已按 Main_Designer 指令中止，没有产出结果，报告里不引用。

**补丁轮结论见文末前的「收口结论（补丁轮）」：建议放行收割，只有 T-P-6 待裁。**

## 重点一 · useChapterPresentation 那条红：不是 D3 引入

**结论（三选一）：环境负载**，机理是测试读状态的时序竞争，干净 HEAD 上同样存在。

**限定**：同签名复现靠插桩模拟调度滞后。纯 CPU 加压没有自然命中 `page-a` 这条断言（压力过高时撞的是 vitest 自身的 fetch 超时）。所以「全量那一次红就是这个机理」是强推断，不是当场抓到。

**低负载压测（未插桩，4 个 CPU 占用进程）**：干净 HEAD 20/20 过；工作树 18/20，其中 1 次是 vitest 自身 `spawn UNKNOWN`，1 次自然命中同族断言：第 286 行 `expected 290 to be 383.35`（`keeps manual residents aligned`），与插桩臂两边都出现过的签名相同。这一轮工作树臂跑在真实目录、HEAD 臂跑在 scratch。

**对等压测（未插桩，两臂都在 scratch，先后轮换，6 个占用进程）**：HEAD 30/30 过，工作树副本 30/30 过。

**自然命中合计**：HEAD 0/50，工作树 1/50（另有 1 次 vitest 启动错误，不计）。差别没有统计意义，但 HEAD 上确实还没有自然命中过，这一点我不替它圆。支撑「非 D3 引入」的是上面的不可达论证和两臂同签名的插桩复现。builder 证据也指向不稳定：同一份客户端代码，第一轮全量不红，第二轮红（evidence-audit 核转录）。

### D3 对这条测试不可达

- 测试的静态运行时依赖闭包里，D3 改动的文件只有 `notePageFlowService.ts`、`typographyMeasurementService.ts`（HEAD 臂多一个 `pageFlowSourceReferenceService.ts`）。`measurementService.ts`、`BlockEditorLayer.tsx`、`BlockSourceReferenceLayer.tsx`、`NoteDetail.module.css`、`useSourcePageViewController.ts` 都不在闭包内。
- 这两处改动在该测试的输入下数值不变：
  - 测试的块全部 `source_references: []`（`useChapterPresentation.test.tsx:23`），HEAD 上 `pageFlowSourceReferenceHeight(0)` 也是 0。
  - `sourceReferenceCount` 只由 `measurementService.ts` 传入，而它不在闭包内，HEAD 上这一项同样加 0。
- 所以 D3 能带来的差别只有少加载一个小模块，没有逻辑路径。

### 失败机理

失败点在第 248 行，而第 246 行 `saveLayouts` 调用两次的断言已经通过。两次调用都发生，说明含 `first` 的那批布局已下发给 `setLayouts`（第 188-189 行实现侧、测试 harness 第 64-67 行）。此后没有任何路径把 `first` 写回 `page-a`。能解释 `page-a` 的只有测试读到了旧快照：

- `renderHook` 的 `result.current` 在 passive `useEffect` 里赋值（`@testing-library/react/dist/pure.js`）。
- `runWithRender`（测试第 95-100 行）只等 `outcome` 落定，不等 React 提交和 passive flush。
- React 的调度走 `setImmediate`，`rendered()`（实现第 87 行）走 jsdom 的 16ms interval。调度滞后时，两者先后可以颠倒。

### 复现

做法：在 scratch 副本里把 Scheduler 捕获的 `setImmediate` 换成延迟的 `setTimeout`（共享树零改动），只跑这一条测试（`-t "reaffiliates an entire mixed chapter"`）。

| 滞后 | 干净 HEAD | 工作树 |
|---|---|---|
| 30ms | 过 | 过 |
| 60ms | **红** `expected 'page-a' to be 'page-b'`，248:57 | **红**，同断言同行 |
| 100ms | 过 | 过 |
| 160ms | **红**，同断言同行 | **红**，同断言同行 |

- 两臂结果一致，签名与全量里的红逐字相同。滞后值与红绿不单调，符合时序竞争的相位特征。
- 整文件跑时，滞后 ≥20ms 还会红同文件另外 3-4 条（`moves manual chapter placements`、`keeps manual residents aligned`、`moves a manual chapter geometrically`、`waits for existing placement writes`），两臂同族。

### 建议

- 放行，把这个文件挂进载荷敏感族名录。这是这个族第三次被独立发现，按「二次重发现即机械化」应立修测试单：`runWithRender` 之后用 `waitFor` 断言目标状态，不直接读 `result.current`。
- **沿途所见（既有，非本单）**：`useChapterPresentation.ts:87,190-199` 用一次 rAF 代替「React 已提交」。滞后时 manual 住户会按旧标题锚落位（插桩臂 `expected 290 to be 383.35`）。真实浏览器里概率低，后果是一次可撤销的错位，建议入 tech-debt。

## 重点二 · D3 超量级扩展

> **⚠️ 本节因 D3 撤回作废，保留作记录。** 下面的问题都随 P1 恢复到 HEAD 而消失，修法不用再做。留下来的代价：md/txt 投影，以及 docx/PDF 手动切到文本视图时，每块下面的 chip 仍在，与现状一致，不是回退。

**结论：三条 minor 建议补丁，都不坏数据；其余记录。** 反驳验证后没有 major：finder 报的两条 major 都被降级，理由见下。

**最要紧的背景：builder 的 D3 走查没走岛上那条路径。** 走查记录 `data-page-flow-sources=0`，这是 v1 形态。岛库和新库都是 v2，文字块走分页分支。复核者用真前端、真服务端、scratch 新库（v2）、真鼠标补走：PDF 投影 8/8、md 投影 30/30 走分页；悬停后点「Original page」target 是 BUTTON，跳转正确（显示比例 s=0.823、1.084 各一次）。把 scratch 库的契约行删掉读作 v1，才复现 builder 的 0。builder 的库是 v1 属推断（症状吻合，原库已删）。

### 简报四问

| 问题 | 结论 |
|---|---|
| 分页是读时派生、无持久化布局被破坏？ | **基本成立，有一处例外。** 分片、高度、y 都读时派生，高度不写回库，无撤销项、无脏标。例外：打开部署前存过的可编辑带引用笔记，会自动写一次首片 `frame_id`（T-D3-N1）。正文和坐标不动，投影笔记 0 写。 |
| 实际拔掉多少？ | **分页层每块 56px**（10+28+18），不是申报的 34。34 只是测量层。单页容量 9 块变 18 块。 |
| 2 条旧合约测试 + 预算断言诚实吗？ | **诚实，没削覆盖**，预留回来就会红。但都在 CSS mock 下，测不到真实布局。 |
| 打印/导出波及？ | 只有打印。导出预览从不渲染 chip，Overview、缩略投影不受影响。打印待裁，见 T-D3-N2。 |

### 建议补丁（minor，都已复现）

**T-D3-1 · 编辑时 chip 常驻盖字**（d3-chip-ui-2 + d3-pagination-6；单据要求的形态，builder 已申报，后果比申报重）
- 复现：Note Proposal → Apply，自动进新笔记（`source_kind=proposal`，可编辑，117/117 块走分页）。点进块、End、打字：光标处 `elementsFromPoint` 是 chip，字打在不透明 chip 底下。鼠标移开也不消失。
- 范围：3 条引用时遮挡末行 64%-94%（1440 宽）。手写块和投影笔记不受影响，受影响的是 Agent 生成笔记的唯一路径 organized_note。
- 为什么不是 major：不丢字，折行或回车后露出。
- 修法：`.block:focus-within .sources` 收窄为 `.sources:focus-within`（`NoteDetail.module.css:3969-3974`）。这一步已验证不切断只读块的触屏（真触摸管线，点块后靠 sticky hover 显示）。
- **但这一步不闭合（完整性批评，读 CSS 判定）**：`.block:hover .sources` 没动，刚点进去的鼠标停在块上时 `:hover` 仍成立，chip 照样盖字。要连 hover 一起排除「块内可写 textarea 有焦点」，判据不能用 `:focus-within`，否则只读投影点过正文后点不到 chip。（合体验证已随 D3 撤回中止。）
- **待你裁**：D3 单面写的是「全部投影笔记生效」，投影笔记只读，设计时没考虑打字场景。

**T-D3-2 · 拖选终点落在 chip 上，选区进不了批注**（d3-chip-ui-3，本次引入，未申报）
- 复现（真实应用，v2，只读 md 投影）：从正文拖到块尾，在 chip 上松手。`mouseup` target 是 SPAN，textarea 的 onMouseUp 不触发。文字高亮了，但 `data-selection-draft-handle=0`，批注入口不出现。对照：松手在 chip 左侧正文，draft=1。
- 死区：PDF 带动作 chip 占正文宽约 24%，md/docx 光秃 Source 约 7%。
- 绕路：重拖一次。复制不受影响。
- 修法：`pointer-events` 收到按钮本身，标签区穿透给 textarea。

**T-D3-3 · sticky 在缩放纸面内算错位置**（d3-chip-ui-4，本次引入，申报的界限不准）
- 机理：`.sourcesAnchor` 的 sticky 按未缩放布局算，纸面有 `transform: scale`。s=1 时才对。走查那句「It stays inside its block in every case」实测为假：s<1 时 chip 被顶到块顶上方（s=0.82、scrollTop≥3000，可见短块全部超出约 17px）。
- s<1 时比不加 sticky 还差：块底已进窗口的 14 个采样，chip 在屏内 0 个，无 sticky 版 14 个。s<1 不罕见：展开侧栏时窗口宽约 <1180 即触发。
- 范围：只影响非分页分支。分页主路径（段落文本）没有 sticky。但非分页分支不只 v1 和 manual/封面块，**v2 上带引用的 formula、code、table、component、media 块也走这里**（`BlockEditorLayer.tsx:259-264`，只有 textRange 才算 paginated；`organizedNoteBlocks.ts:7-9` 允许这些类型），这是读码判定。这是 DOM 复刻实测，没跑完整应用。
- 修法：去掉 sticky，锚改 `position:relative`。**这一处同时解决 T-D3-N3。**

### 记录项（note，不阻部署）

| 编号 | 事实 | 来源 |
|---|---|---|
| T-D3-N1 | 部署前存过的可编辑带引用笔记，首开静默写 `frame_id`（40 块 31 次），`notes.updated_at` 更新；第二次开 0 写，自愈。机制是 HEAD 的（无引用长笔记 HEAD 上也写 21 次），D3 只是多触发一次 | 引入，未申报 |
| T-D3-N2 | 打印不再印 `Source p.N`。**更正 builder**：删 `display:none` 恢复不了，基态 `opacity:0` 已经藏了，高度预留也没了。要保留页码得另做打印专用形态。docx 本来就只印光秃的「Source」，实际损失集中在 PDF 投影和带页码的采纳笔记。**待你拍** | 申报 |
| T-D3-N3 | 非分页分支 chip 按钮鼠标点不到（textarea z-index:1 压住，真鼠标 target=TEXTAREA）。finder 判 major，两路反驳都降为 note：v2 主路径可点。残余是 v1，或 v2 的 manual/封面块和带引用的非段落块（范围同 T-D3-3）；这些块只有无动作 chip 或 View，「Original page」只在投影笔记上，够不到这条分支。v1 库上属实，且 builder 走查库上就是这个形态 | 引入，未申报 |
| T-D3-N4 | 「页数可能变少」对可编辑笔记不成立：页帧只增不删，尾部变空白页并被打印（120 块 14 帧用 7 帧，约每 17 块空 1 页）。只发生在部署前已打开过的旧笔记，手册第 40 行的既定合约。Result 第 112 行口径要改 | 引入 |
| T-D3-N5 | 墨水、manual、装订段界留在原页，正文一次性上移（最大 448px）。只发生一次，存储值不变。**存量可能接近 0，建议你在岛上查一次：同时有 source_references 块和 freehand 摆放的可编辑笔记有几篇** | 设计取舍 |
| T-D3-N6 | manual 带引用块旧高偏大：下方块显示上移，拖动后重载偏 38px。不累积，移动 A 后自愈，范围极窄 | 引入，未申报 |
| T-D3-N7 | `flex-end` 让超宽 strip 前面的 chip 够不到（`scrollWidth=clientWidth`，焦点也滚不回去）。需要 ≥5 条 View 或 ≥4 条 Original page，产品路径上限 3 条，只有裸调 API 才到。一词修法 `safe flex-end` 已验证，建议顺手 | 引入，未申报 |
| T-D3-N8 | quote 出处被 chip 盖住左段（悬停时，书名或作者被盖），只在分页单片且带引用的 quote 块 | 引入，未申报 |
| T-D3-N9 | 只读笔记每块多一个 Tab 停靠点，docx 每块 2 站（group 只显示「Source」），300 段 600 站；PDF 每块 3 站。D3 明文要求键盘可达，代价没申报。编辑态 Tab 是缩进，既有 | 设计取舍 |
| T-D3-N10 | 跨页块悬停后片，chip 亮在首片上，可能在屏外；高首片同理。HEAD 上 chip 同样在屏外，非回归 | 既有 |
| T-D3-N11 | `firstFragmentExtraHeight` 无生产来源，注释过时；两处 `toBe 0` 断言已无区分力。无害 | 引入 |

已驳倒：触屏完全够不着（d3-chip-ui-9，REFUTED）。

### D3 clean 面

隐藏态不占高、不挡操作（真 Chromium 计算样式）；只读投影 0 写、v1 笔记 0 分页写、无引用笔记新旧算法等价；写入收敛不反复；Agent `page_index` 不越界；TOC、双页码、折缝、Overview 没存旧页号；服务端和 shared 没有同算法副本（`sourceProjectionMaterializer.ts:157-161` 的 +34 外形相似，不看引用数）；只读笔记键盘可达、焦点框可见。定向 56 条全绿。

### 修后要补的走查

（已随 D3 撤回取消。）组件测试抓不到这类问题（CSS 被 mock）。修完在 v2 上用真鼠标补一次：悬停、点跳转、拖选到块尾、编辑打字到末行，s<1 和 s>1 各一次。

## 重点三 · D1 服务端全链

**结论：主路径放行，无 major，无阻部署的缺陷。** 简报列的八项全部核实：

| 项 | 结论 | 依据 |
|---|---|---|
| argv 模板 | 不走 shell；上传文件名不进参数（输入名固定 `source.docx`）；含空格、中文、引号、`# % & ;` 的路径原样到达 | `sourceDocxPdf.ts:80-95`，探针 |
| env 白名单 | 12 个键，无 key 进子进程。合成的 `JWT_SECRET`、`OPENAI_API_KEY` 等探针确认不传 | `CHILD_ENV_KEYS`，阳性对照 Arm C |
| 串行队列 | 属实，无新队列无信号量 | 调用链 `queueTail → renderMissingPages → openRenderer → ensureDocxPdf`；用例 16 无重叠 |
| 原子落位与崩溃窗口 | 同文件系统 rename，校验到改名全同步。**真杀补做了 builder 没做的**：`taskkill /F` 杀真服务进程，转换中杀 → 重转 1 次 complete；派生落位后杀 → 不重转 40/40 complete（仅本机 Windows） | `sourceDocxPdf.ts:149-152` |
| 删源链 | 「无条件清派生文件」已修净（文件存在才 settle，DB 提交后）；`v2SourceLifecycleClosure` 8/8；`storage_domain='source_blob'` 过 CHECK；EBUSY 留 cleanup job | `sourceLifecycle.ts:231-239` |
| sweep 不误删 | 判活正确，两用户活 PDF 都留；派生路径无多 record 共享（同内容同用户 1 record 1 file），删项目不删 Source | 场景 G2、J |
| 崩溃恢复三态 | 无死循环：一轮最多转换一次（finder 的「单文档最坏 240 秒」被驳倒） | `sourcePageImages.ts:304-311` |
| 三处执法一致 + 409 | 下表 | |

| 环境 | register | POST generate | 启动 resume | 已生成的页 |
|---|---|---|---|---|
| 未设 env | supported=false，none，pages=[] | 409 `source_pages_converter_unavailable` | 跳过，状态不动 | 读不到（行和文件都在，恢复 env 立即读回） |
| env 格式坏 | 同上，warn 一次 | 同上 | 同上 | 同上 |
| env 对但二进制没了 | supported=true，首次 failed | 202 → failed | failed 不自动重跑 | 可读 |
| env 正常 | 真实状态 | complete 200，其余 202 | 续做，复用完整派生 | 可读 |

**定向重跑**：`fidelity1a2DocxPages.test.ts` 16/16 过，`vpsF11SourcePageImages` 18/18 过。

**阳性对照**：五组 18 条红（14 个不同条目）的编号和名称与当前 TAP 输出逐字对得上。A-D 在当前代码重跑结果一致。**Arm E 证据过期**：`positive-controls.txt`（23:22）早于删源修复（23:31），当前是 14 红不是 13 红，多红 #14。因果已隔离：去掉 `:232` 守卫就回到 13 红。对照依然有效，单尾第 93 行的数字要补一句。

### 部署清单（请你照做，这几条比 finding 重要）

1. **`EnvironmentFile` 的引号（已更正）**：我上一版写「systemd 会吃掉双引号」是错的。读 systemd 源码 `src/basic/env-file.c`（main 分支，岛上是 24.04 的版本，未逐版本核对）：引号只在值的开头才生效，值以 `[` 开头时进入 VALUE 状态，中段双引号原样保留，反斜杠才转义。所以 builder 建议的 JSON 裸写和单引号包住都能用，且它不含反斜杠。依然没在岛上实跑，设完抽一篇 docx 确认 `supported=true`，再看 journal 有没有格式错误的 warn。
2. **先装字体，再设 env。** complete 之后没有重渲门（T-D1-N1）。
3. **上岛后核一次超时路径。** `terminateProcessTree` 杀完后 `await closePromise` 没有上限（`sourceMineruParser.ts:433`），正常退出路径也经过（`sourceDocxPdf.ts:116`）。若有后代脱离进程组并持有 stdout，全局页影像队列会挂到重启。Linux 分支没人实跑过，排练通过说明常态不发生。
4. **unit 限制下的真转换没跑过**（ProtectSystem=strict、ProtectHome、PrivateTmp）。读 unit 文本判断路径都在可写区，HOME 也可写，但要岛上第一次真跑才算数。
5. 4C8G 上单次转换耗时、120 秒够不够：没测。
6. **收割时带上未跟踪文件**：`server/src/services/sourceDocxPdf.ts` 和两个新测试都未跟踪。`index.ts`、`sourceLifecycle.ts`、`sourcePageImages.ts` 都 import 了它，漏带岛上启动就失败（`ea3a0fdc` 有过收割漏件先例）。
7. **转换器 exit 0 却没出 PDF 时查不到原因**（T-D1-N9）：部署排错时先在岛上手工跑一次命令，再开 env。
8. `LANG` 未设时中文 docx 的字形选择没验，首次真转换后看一份中文 docx 的页影像。

### 记录项（note）

| 编号 | 事实 | 来源 |
|---|---|---|
| T-D1-N1 | complete 后无重渲门：补字体后 generate、重投影都不重转。finder 判 minor，两路都降为 note：`complete` 短路是 1a 就有的合约，只有运维能造出这个状态。不丢工作的绕路：只删派生 PDF 和 PNG，不动 DB 行，再 generate（重转，投影 id 不变） | 设计取舍 |
| T-D1-N2 | 已生成的 docx 在 env 丢失时原页整批隐藏，读已有页其实不需要转换器。与单据「无转换器回退如今天」一致，不修；注释理由「防轮询」只对 pending/partial 成立。键缺失时不告警 | 设计取舍 |
| T-D1-N3 | 重转后页数变化：变少永久 failed（`completed=3, expected=2`），变多或相同新旧页混排且报 complete。需要三重条件：派生 PDF 坏、有缺页、重转结果不同。应用内没有同时成立的路径，只有磁盘损坏或手工运维 | 引入，未申报 |
| T-D1-N4 | 转换中优雅重启且有活跃连接（Agent SSE）时可能落 failed，重启不自动续（SSE 开着实测 failed，无连接时 pending 能续）。手动 Retry 可恢复。部署时有人开着 Agent 流才碰得到 | 引入，未申报 |
| T-D1-N5 | 模板只校验 `{input}`：漏 `{outdir}` 仍算已配置，所有 docx 落 failed，岛上 cwd 只读所以不留文件。改对后 Retry 恢复。范本 MinerU 校验更松，不算退步 | 引入，未申报 |
| T-D1-N6 | 客户端不认 409 区分码，过期页面点重试一直提示「请重试」。常态不可达（无转换器时无切换），同族码 HEAD 上也零引用 | 引入，未申报 |
| T-D1-N7 | 申报 4 属实：挂死 docx 占队列满 120 秒，N 个 N×120 秒，后面的 PDF 页影像一起等；文本投影和 API 不受影响（事件循环 p99 15ms）；failed 不反复占队列 | 单面要求 |
| T-D1-N8 | 申报 3 比申报的窄：岛上 systemd 默认 control-group 清掉残留（文档层核实，未岛上实测）；本机真 soffice 杀后 1.5 秒全部消失；每次独立 profile，不撞锁。**不用修** | 申报 |
| T-D1-N9 | 转换器 exit 0 且没出 PDF 时，stderr 被丢弃：`outputTail` 只在非 0 退出时打印（`sourceDocxPdf.ts:118-121,149`），实测报 `no usable PDF`，warn 为空。真 soffice 文档加载失败时是否 exit 0 只凭记忆，未实测。修法一行：校验失败也打印 | 引入，未申报 |

已驳倒：sweep 的 `readdirSync` 无防护会让服务起不来（路径只能靠人手放置才是文件，同族写法 HEAD 就有，不成立）。

## 重点四之一 · D4 与附加侦察

**D4 三条申报全部属实，都是既有缺陷，本单没有动产线代码，符合「只钉不改」。** 定向 5/5 绿。

| 编号 | 事实 | 判定 |
|---|---|---|
| T-D4-1 | 标题层级丢失：`#` 到 `######` 落库后全是一级 | 属实，minor，既有 |
| T-D4-2 | 列表不分块。不满足单据「列表结构正确落块」，测试钉现状的命名诚实，但绿灯里看不出要求没达成，建议加 todo | 属实，note，既有 |
| T-D4-3 | 围栏和引用无空行时只是字面保留 | 属实，note，既有 |
| T-D4-4 | **申报低估**：围栏内有空行时代码被拆块、缩进丢失，独立的 `#` 注释变成假标题 | minor，既有，未申报 |
| T-D4-5 | **申报漏项**：标题紧贴正文（无空行）不识别，`#` 字面留在正文里。这是最常见的写法 | minor，既有，未申报 |
| T-D4-6 | 「正文零丢失」钉子只读 `plain_text`，读者实际看到的 `text_flow` 没钉住 | note，测试缺口 |
| T-D4-7 | CRLF 钉子偏松：去掉归一化仍全绿 | note |
| T-D4-8 | GBK、UTF-16 的 txt 不乱码也不出笔记（stored-only），钉子只覆盖 UTF-8 | note，既有 |

钉子能咬住的：丢段、latin1 读取、plain_text 截断、标题识别失效、段内行序反转都能打红。中文和 emoji（含 𠮷、😀）无损；BOM、CRLF、纯 CR 不伤标题和文字。

### 附加侦察：h1-h3 映射进 writing_role

**结论：小。** 已在 scratch 副本打补丁实测，13 个相关服务端测试文件只红 1 条（预期要改的那条）。

- **改哪里**：`sourceProjectionMaterializer.ts:273` 把 `writing_role: block.writing_role` 换成 helper（`metadata.heading_level` 是数字则 `heading_${min(max(level,1),3)}`，否则保持 `heading`）。建议顺手把原始级别存进 unit metadata（`:276-279`），h4-h6 的信息不丢。测试改 `fidelity1a2TextFaithfulness.test.ts:88-90`。
- **唯一陷阱**：必须改在投影边界。改 `sourceArtifact.ts:358` 或 `SourceArtifactWritingRole` 会让 `block_type` 静默变 paragraph、title 变 null、Material 标题分组消失、imprint role 变 para，`v2SourceMaterialization.test.ts:196` 会红。
- **影响面（已核）**：章节投影变真树（1、1.1、1.1.1），Navigation 递归无需改；分页一级零变化，h2/h3 短标题差 -0.35px，长标题换行差 -6 到 -10px（估算路径，只读笔记不写回）；Project Material、Reconcile、血缘不受影响；Agent `read_note` 的 role 信息变多。
- **旧投影**：不重投影就保持全一级，不坏不变。走重投影的代价重（笔记 ID 变、批注不迁入、有外部引用时拒绝、已接受 segment 状态不保留）。建议补丁只管新导入和主动重投影，不做回填。
- **价值判断请你注意：这个补丁对 docx 零效果。** docx 走 `mammoth.extractRawText`，全是 paragraph，章节树仍然为空；native-pdf 同样。它只让 md（含 zip 里的 md）受益，不碰 Henry 喊疼的金融 docx。要拿 docx 标题得改 mammoth 调用方式，与单据 §0「mammoth 文本投影语义⛔动」冲突。
- T-D4-4、T-D4-5 这个补丁治不好，要改切块逻辑，会改块 ID，量级不同，不要合并。
- 局限：fixture 里的 `heading` 大多不带 `heading_level`，走 fallback，绿不等于验了新路径；新路径是脚本验的，补丁要同批补一条真钉子。没在浏览器打开过多级投影笔记。

## 重点四之二 · D2 默认进原页

**结论：主路径成立，无 major。一行修法值得收割前带上（T-D2-1）。** 项目页或 Source Library 进笔记、切文本再切回、Agent 聚焦先到、stale-jump 都成立。`NoteSourcePagesLayer.test.tsx` 30/30，相关 48/48。改掉的旧测试 `remembers the view per tab` 诚实。

**带目标入口逐个查过**：跨路由带块目标的只有 Agent `focus_object`，已被规则③覆盖。笔记路由不消费任何 hash 或 query，所以没有目标能丢。搜索命中、TOC、内联链接都只在本笔记内。Board 模态走 `hostMode=modal`，不切。

### 建议补丁

**T-D2-1 · 从投影笔记直达另一篇没开 tab 的投影笔记，记忆被写反成 text**（d2-default-1，minor，引入，未申报，与 builder 回执的保证相反）
- 根因：路由组件不带 key，`note` 在新 hydration 完成前保留旧值，所以 `enabled`（`NoteCanvasRuntime.tsx:25-26`）一路为真，register 抢在 tab 诞生前回来。默认判决生效，但 `remember` 对不存在的 tab 空转（`useSourcePageViewController.ts:83-88`、`documentTabsStore.ts:40`）。之后翻页按回退值写 `{mode:'text',page:4}`。
- 复现（真前端、真 Chrome，本地和 150ms 延迟各一次）：tab 诞生时 `sourceView=null` 而原页已显示；滚到第 4 页后记忆是 text，屏幕仍是原页；切走再切回开在文本。
- 实际入口：Agent `ui_open_note`（主路径）、关 tab 后 Back、手改 hash。必须翻过页才写错。后果只在进程内，点一下 Pages 回到第 4 页。
- 修法：`enabled` 加 `note?.id === noteId`。scratch 上验证 R1 路径有效（记忆 `{pages,4}`，切回仍在原页第 4 页），没跑现有测试，也没验证它对 T-D2-N1 的效果。

**T-D2-2 · 默认原页下 Agent 拿不到读者所在页**（d2-default-4，minor，HEAD 既有，D2 把它推上默认路径，未申报）
- 原页视图下提示只有 `{note_id}`（`NoteRuntimeDocumentLayer.tsx:227-228`、`useNoteAmbientAgentContextHint.ts:68-72`）。`read_note` 的 `pageIndex` 默认 0，Agent 照提示调用读第 1 页，问「这一页」时可能拿第 1 页来答（只从代码推得，未跑真实模型）。
- 切到文本不是绕路，文本恢复的是自己的滚动位置。绕路是问题里说页码（每页都印了）。docx 只有一个 flow frame，不受影响。
- 修法：PDF 下把原页当前页换算成 `page_index`（每原页恰一帧）。不够格阻塞收割：Henry 现阶段的烟测不用 Agent，面板本身也在候拍。**由你定是否进本轮。**

### 待裁（设计级）

| 编号 | 事实 |
|---|---|
| T-D2-D1 | **Ctrl+P 在默认原页下打的是文本投影，公式照丢，没有提示**（完整性批评，读码判定，未实际打印，minor）。`NotePrintLayer` 不看视图，原页层打印时隐藏。1a 明文「⛔打印集成」，行为既有，但 D2 后读者看着完整公式按打印，拿到的是丢公式的版本。最小做法是提示一句，绕路是打印原件 |
| T-D2-D2 | **「本件有内容未能完整转换，请以原件为准」横幅压在原页上方**（完整性批评，note）。横幅不看视图（`NoteCanvasRuntime.tsx:49`），Henry 那份含公式的 docx 首屏就是这样：下面明明显示原件逐页影像，上面说转换不全，读者会以为眼前这份也不全。走查把它记成通过项。建议原页视图下隐藏，或文案改成只说文本视图 |
| T-D2-D3 | 已有批注或组的投影笔记，默认进原页后看不到批注、高亮、Groups 入口，页面没有提示。两条已批设计合起来的直接后果，builder 照单实现（d2-default-8，note） |
| T-D2-D4 | F5 之后「切到文本」的选择失效，又回原页。tab 记忆有意不持久化，符合单据现状（完整性批评，note，读码判定） |

### 记录项（note）

| 编号 | 事实 |
|---|---|
| T-D2-N1 | 与 T-D2-1 同根：判决落在 Loading 期，滚动过的读者被判未滚动，800 回不来。只在中间页也是文本态投影时成立，手写笔记或非文档路由不触发（d2-default-2，从 minor 降级，建议并入 T-D2-1） |
| T-D2-N2 | 首页到达时切走会卸掉正在输入的导航搜索词。Groups 面板没被收走，只是隐藏。窗口窄（真 soffice 转 200 段 docx 18.0、6.6 秒）。**要修注意**：投影正文是只读 textarea，`userOwnsInput()` 只看元素类型，防护要排除 readOnly，否则点过段落的读者被永久留在文本（d2-default-3，从 minor 降级） |
| T-D2-N3 | 闪现文本属实，随篇幅变长（6 页约 0.5-0.85 秒，40 页约 2-3 秒，120 页约 6 秒，隐藏面板和压测下的数，只看趋势）。但「闪现窗内一滚动就锁文本」因果错了：锁文本的窗口是 register 往返时间，约 RTT 减一帧，与页数无关。耗时来自 HEAD 已有的长任务（d2-default-5，从 minor 降级） |
| T-D2-N4 | 入口文案 `Open extracted reading view` 对有页影像的源不再准确。主点击目标是文件名，这句只在小图标提示和详情弹窗（d2-default-6，从 minor 降级） |
| T-D2-N5 | 规则③不核对目标：stale `focusCommand` 挂着期间每个新开的投影 tab 都丢默认视图（聚焦 Y 后 2.2 秒内离开 Y 即可造成）。点一下就回来。修法核对 `target.note_id`，`board_member` 要先收窄类型（d2-default-7）。finder 的另一半「首屏目标被切走」被驳倒 |
| T-D2-N6 | 测试缺口只有一处实打实：删规则③的 `pending` 全绿，一条单行用例可杀（d2-default-10）。另外三个变异等价或不可达 |

已驳倒：failed 带部分页开在失败占位上（d2-default-9，REFUTED：首屏是成功页，加门槛反而藏掉重试入口）。

### 待裁定的矛盾（独立裁定中）

反驳 d2-default-10 时撞到一条疑似缺陷：读者停在默认原页，Agent 对远处正文块发 `focus_object`，切回文本、打高亮，但 `scrollTop=0`，目标不在视口（2/2）。而 D2 finder 同场景把 rAF 换成定时器后滚到了 5538。两边矛盾，已派独立裁定，结果见本节下方「裁定结果」。

### 裁定结果

**确有缺陷，是一场竞态，minor，HEAD 既有，D2 把它推上默认路径。** 两路各看到一支：落空一路在页面空闲时成立；正常一路是定时器替换 rAF 造成的假象。是否进补丁由 Main_Designer 定。

**实测**（Chrome 154，真 rAF，生产构建；真面板各行走真实客户端 SSE 解析，流是页内假流，不碰模型）。命中 = 目标高亮期间和落定后都在视口内：

| 场景 | 工作树（含 P1-P3） | HEAD |
|---|---|---|
| 空闲页，默认进入 | 0/6，可见窗口 1/5 | 无此入口 |
| 空闲页，手动切入 | 0/5（文本 top=0、800 各一组） | 0/8、0/8 |
| 页面已在出帧 | 可见窗口 5/5 | 10/10 |
| 面板开着，流式中，有文字 | 15/15 | 8/8 |
| 面板开着，流式中，无文字 | 14/15 | 未跑 |
| 面板已关，此前有文字 | 9/15 | 5/8 |
| 面板已关，此前无文字 | 0/15 | 0/6 |

重发一次全部命中（直接注入命令的各臂）。笔记长度和 CPU 降速对空闲页没有影响。真面板的比例只说明方向，不是线上命中率。

**根因：恢复滚动排在聚焦滚动之后。** 聚焦先调 `setMode('text')`（`useNoteDocumentShell.ts:49` → `NoteRuntimeDocumentLayer.tsx:139`），这一步只排队 state，接着注册两级 rAF（`useNoteDocumentShell.ts:67-68`）。切回文本 commit 约在 +10ms，`NoteRuntimeDocumentLayer.tsx:130-132` 才注册恢复滚动的 rAF。空闲页第一级 rAF 约 +0.5ms 就触发，第二级和恢复落在同一帧且第二级先注册：先滚到目标（+18.9），紧接着滚回旧位置（+19.2）。`positioned` 已置真，不再定位。页面已在出帧时第一级晚于 commit，恢复先跑，所以命中。空闲时立即补帧是推断，没查 Chromium 源码。

**定时器为什么正常**：定时器让第一级回调晚于 commit，恢复先跑，同一份代码全部命中（工作树 5/5、3/3、3/3、3/3，HEAD 3/3）。所以定时器桩测不出这个缺陷，回归测试要用按帧先进先出的 rAF 桩。

**最小修法（只在 scratch 内存转换验证过，没跑仓库测试）**：`NoteRuntimeDocumentLayer.tsx:139`

```ts
if (useAgentUiStore.getState().focusCommand) { sourcePageView?.takeTextScroll(); sourcePageView?.setMode('text'); }
```

验证：默认 5/5，可见窗口 5/5，面板开着 8/8，面板已关无文字 8/8。切换按钮直接调 `setMode`，不经此行，读码判断「切回文本恢复阅读位置」不受影响。

**不必进本轮的理由**：无数据损伤，重发即中，面板开着基本命中；Henry 现阶段不用 Agent。**要进的理由**：修法一行，且 Agent 把读者带到某块是面板的核心动作。这是你的裁定。

**没验到**：真模型和真网络 SSE；`note_page` 目标；折叠章节内的目标；docx 来源的笔记。

**顺带查明（滚动记忆压扁）**：文本 800 切到原页态 tab，切回只剩 26。HEAD 上就有（26/26），D2 放大了暴露面，**P2 已消除**（工作树 800/800）。P2 被撤回才会复发，它现有的测试 mock 了文档层，钉不住这条。

**待评估的 P2 代价**：一条 trace 里进原页比 cleanup 晚约 2 秒（当时机器有负载），HEAD 是首个 commit 就进。这段时间屏幕显示什么，由 P2 回归实测回答。

## 证据对账

**builder 的数字全部属实，没有虚报。** 不符的是措辞和证据覆盖。

| Result 申报 | 核查 | 结论 |
|---|---|---|
| 服务端 1276 过 1274，红 2 | 与原始输出逐字一致；+21 算术对 | 符 |
| harness 既有；K-4 单跑 5/5 | harness 同错误；K-4 过 | 符 |
| 客户端 2580 过 2576，红 4 文件 3 | 逐字一致；+7 算术对 | 符 |
| 3 条超时单跑过 | 13/13、5/5 | 符 |
| useChapterPresentation 第一轮无红、单跑 4 次过 | 证据目录没落盘，转录属实 | 属实，目录不能自证 |
| 新套件改名后 16/16 | 目录没落盘，复跑 16/16 | 属实 |
| tsc 0/0；5 项 check | 复跑两侧 exit 0 | 符 |
| test-wiring 9 个既有；两新测试挂进 test:v2 | 与 stopbleed 名单 diff 无差异；package.json 只加两个文件 | 符 |
| 第一版删源红 2 条（申报 2） | 转录属实 | 属实 |
| 阳性对照 5 行 | A-D 符，E 过期（13→14） | 过期 1 条 |

**新鲜度**：终轮全量后产品代码零改动，只改了测试标记名。早于最终代码的证据只有 `positive-controls.txt` 和走查的部分行（早于粘性锚和 44px）。

**范围与红线**：无新依赖、无锁文件改动、无新迁移、无新队列；`sourceMineruParser.ts` 只加三个 export，`index.ts` 只加启动清扫。未点名但无害：`ParagraphFurnitureDecoration`、`.sourceRef` 底色、第二条组件测试改名。

**证据问题**

| 编号 | 事实 | 判定 |
|---|---|---|
| T-E-1（随 D3 作废） | D3「走查里点 Original page」是脚本 `.click()` 点隐藏态 chip（屏外、`pointer-events:none`），且早于粘性锚落地。真鼠标在该分支最终 CSS 上点不到。「跳转不回归」说重了。v2 主路径已由复核真鼠标补验 | note（从 minor 降级） |
| T-E-2（随 D3 作废） | 走查跑在 v1 形态库上，所以 D3 浏览器证据都不是岛上路径 | 见重点二；补丁收尾已要求在 v2 新库补走查 |
| T-E-3 | D4 申报漏标题紧贴和围栏假标题。**更正 finder**：「最常见写法」不成立，语料统计紧贴只占 1.6%-11.1%，缺语料是手写中文笔记；但单次伤害重，导航为空 | minor，既有 |
| T-E-4 | 证据目录不能完全自证（16/16、单跑 4 次、第一轮结果被同名文件覆盖）。不算违单，补口径即可 | note |
| T-E-5 | 操作手册缺原页视图、生成入口、默认进原页、chip 悬停。手册第 4 行有防腐条款。1a 就漏了，本批扩大；派单未带申报义务，不算 builder 失职。**这条归 steward，收割时要补** | note，既有 |

已驳倒：「按钮焦点探针是键盘可达的反证」（evidence-audit-3，REFUTED：机理是隐藏面板不出帧，`visibility` 过渡停在 t=0，焦点没落上去，是环境造成）。

**单据验收逐条**：D1 的公式图片一致和岛上真转换未验（已申报）；无转换器回退有服务端测试，409 只测到 service 层，浏览器没走；kill-resume 由本次复核真杀补验（仅 Windows）。D2 记忆不被覆盖有证据；新导入转换中切换只有组件测试和拦截器模拟，真链路没走。D3 隐藏态、悬停有证据；「跳转不回归」「键盘 Tab」「分页形态」是本次复核补验。D4 列表落块未达成（已申报）。

## 补丁轮核验（P1-P5）

对象：builder 补丁 Result（单尾）和 `patch-*` 证据。

### BoardPage.selection 新红：环境负载，HEAD 既有，已查明根因

**结论：不是 P1、P2、P3 引入。** builder 的推断成立，这里补上证据。

- **运行时不可达**：测试的导入闭包经 `BoardNoteModal` 碰到 `NoteCanvasRuntime`，但 `BoardNoteModal` 只在 `openNoteId` 存在时渲染（`BoardPage.tsx:1522`）。scratch 副本里把 `useSourcePageViewController` 和 `SourceConversionNotice` 改成一运行就抛错，整个文件仍 7/7 过，所以这个文件根本没执行到 P2、P3。`client/src/pages/Boards` 与 HEAD 无差异，D3 也已恢复。
- **同签名复现（把 Scheduler 的 setImmediate 换成延迟 setTimeout）**：

| 滞后 | 干净 HEAD | 工作树副本 |
|---|---|---|
| 0 | 过 | 过 |
| 10、20、40、60、100ms | **红**，`selection.test.tsx:42:29`、`:111:51` | **红**，同断言同行 |

- **根因**：`begin()` 在 `viewportRef.current` 为空时直接返回（`BoardPage.tsx:822`），而 `viewportRef` 在 `[detail]` 的 passive effect 里才写（`:245-253`）。对象一进 DOM，`findByTestId` 就返回，调度滞后时测试抢在 effect 之前按下指针，marquee 被忽略，工具栏不出现。失败现场的 DOM 对得上：对象都在，状态 Saved，没有工具栏。
- **机理已验证**：在干净 HEAD 副本上只把这一个 effect 改成 `useLayoutEffect`，滞后 20、40、60、100ms 全过（对照基线 4/4 红）。这只是验证手段，不建议改产品代码。
- **产品影响**：真实使用里只是加载完成那一帧内的按下被忽略，无后果。
- **建议**：放行，挂进载荷敏感族。修测试：`openBoard` 之后先 `await act(async () => undefined)` 再按指针，并入 useChapterPresentation 的修测试单。
- **限定**：这一轮是插桩复现，这条断言在 HEAD 上没有做未插桩的自然压测。

### P1：11 个文件确实恢复，没有多恢复也没有漏

逐路径 `git diff` 为空：`NoteDetail.module.css`、`ParagraphFurnitureDecoration.tsx`、`BlockEditorLayer.tsx`、`BlockSourceReferenceLayer.tsx` 及其测试、`measurementService.ts`、`notePageFlowService.ts` 及其测试、`pageFlowSourceReferenceService.ts`、`typographyMeasurementService.ts` 及其测试。单据说 9 类，是把「实现 + 测试」算一类，11 个文件与单据一致。

客户端相对 HEAD 只剩 `NoteCanvasRuntime.tsx`、`useSourcePageViewController.ts`（D2）、`NoteSourcePagesLayer.test.tsx`，加一个新测试。D1 的服务端文件都还在。`sourcesAnchor` 在 client/src 已无残留。走查记录 chip 回到常显，分页和打印的代码因此回到 HEAD（走的是同一批文件）。

### 证据对账

| 申报 | 核查 | 结论 |
|---|---|---|
| 服务端 1278 过 1277，红 harness | 1276+2（P4、P5 用例）；TAP 段原样 | 符 |
| 客户端 2584 过 2581，红 3 条 | 2580+4（sourceView 3 + pending 1）；红条目原样 | 符 |
| 红文件单跑 | harness 14/15；selection 7/7；smoke 13/13；pagination 5/5 | 符。selection「连跑 3 次」目录里只落了 1 次，其余靠申报 |
| 闸门 | tsc 0/0；5 项 check；test-wiring 仍 9 个既有；两新测试在 test:v2 | 符 |
| 证据新鲜度 | 最后一处产品代码改动 11:34，测试 11:38，全量 11:58；全量后源码零改动 | 符 |
| 红线 | 无新依赖、无新迁移（头仍 086） | 符 |
| Arm E 补记 14 红 | 单尾已补 | 符 |

### P4、P5：放行

**结论：MinerU 超时路径语义没变，上限没有误伤能正常结束的进程。** 下面的问题都是低严重度。Linux 分支和真 soffice、真 MinerU 没有验到。

**MinerU 四种假命令**（走 `parseSourceArtifact`，共享函数的真实入口；scratch 实测，仓库里仍无这类用例）：

| 场景 | HEAD | 工作树 |
|---|---|---|
| 正常、无后代 | ok，约 2.3-3.1 秒 | ok，约 2.1-2.3 秒 |
| 超时、后代被杀 | `internal_interrupted`，消息 `was terminated` | 同码同消息 |
| exit 0、结果已产出、脱树孙进程持有输出 | **挂住**（30 秒上限后杀掉） | 7.3 秒，`internal_interrupted`，可重试 |
| 超时 + 持有 | **挂住** | 9.2 秒，`internal_interrupted`，可重试 |
| 持有者只活 3 秒 | 通过 | 通过 |
| 持有者活 12 秒 | 13.2 秒成功 | 7.2 秒失败（申报的代价） |

**上限会不会误判？**
- 等待只在清树之后开始（`:417-429` 先于 `:437-442`）。Node 根 10 次，`close` 都比定时器启动早 1.2-1.8 秒。
- 大量 stdout：64-256 MiB，exit 到 close 0-1 ms。同组后代被杀后：Python 根，一层和三层链，`close` 都早于定时器启动 0.8-1 秒。
- **唯一的误判窗口**：持有者在定时器启动时仍占着输出、5 秒内释放，同时同步块盖住到期点（6/6 定时器赢，此时持有者已死）。win32 全链路把 6 秒堵塞放在 37 个不同时刻，0 误判。后果最多一次可重试的失败。真实服务端有没有 ≥5 秒的同步段没测。

**`internal_interrupted` 的后续**：可重试，不自动重跑（3 轮清扫和恢复都不动），不再卡队列（HEAD 下两篇到 25 秒都没结束；工作树第一篇失败后第二篇成功）。

**docx 路径**：Retry 能恢复（持有者还活着时重试 2.8 秒 complete）。文本投影还在，派生 PDF 不保留，邻居文档不受影响。

**阳性对照重跑**：基线 18/18；ARM P5 红 #18，ARM P4 红 #17，红名与 `patch-positive-controls.txt` 逐字一致。定向：`fidelity1a2DocxPages` 18/18、`v2SourceMineruWiring` 5/5、`vpsF11SourcePageImages` 18/18、`v2SourceLifecycleClosure` 8/8。

**校正回执一句**：Node 假根的直接后代在根退出时就死了，不是树清理杀的，所以 Node 假命令证明不了树清理，上面用 Python 根补了。「要脱树的孙进程才能复现」仍成立。

**记录项（低严重度，都不阻部署）**

| 编号 | 事实 |
|---|---|
| T-P-1 | **持有者场景诊断丢失，这条对首次上岛有用**：清树抛错发生在打印之前（`sourceDocxPdf.ts:118` 先于 `:121,:153`），`outputTail` 不打印（实测）。首次真跑 soffice 若撞上，日志只有 `still held PID`。MinerU 同理，stderr 细节丢失，`parser_failure` 变 `internal_interrupted`。一行修法：catch 里也打印 |
| T-P-2 | 超时 + 持有时落库的是「tree could not be terminated」（`sourceMineruParser.ts:490`），实际树已清，真实原因只在不落库的 cause 里 |
| T-P-3 | 持有者不会被回收：P5 只停止等待，每次重试多留一个活进程（实测累积 3 个） |
| T-P-4 | Windows 上持有者的工作目录在运行目录内，EBUSY 会盖掉原始错误。docx 留到下次启动清；MinerU 的 `coincides-mineru-*` 留在系统临时目录，全仓没有清扫。岛上是 Linux，只影响本机 |
| T-P-5 | Windows 还有没封顶的等待：`windowsProcessTree`（`:392-393`）和 `runTaskkill`（`:359`）。探测卡住时 5 秒定时器不会启动（只读码） |

**P4 日志内容**：`outputTail` 只来自子进程 stdout/stderr，上限 2000 字符，只进 `console.warn` 不落库，路径里没有上传文件名和 userId。真 soffice 会不会回显文档片段没验到。

### P2、P3：放行，有一条 minor 取舍待裁

**结论：T-D2-1 和 T-D2-N1 都修好了，有对照。P2 带来两处小回归，一条 minor（T-P-6）。P3 符合判语。**

环境：A 臂=工作树副本，B 臂=A 只去掉 `note?.id === noteId`，HEAD=`git archive` 的 `2fcd59c2`（只跑切回时序）。都是 headless=new、真 rAF、新库 v2、假转换器、dev server，零页面异常。绝对毫秒不可外推。这组实验中途遇云机锁定，从断点接续，只作废 1 条（n1stress-18-b，延迟 150ms 组第 3 次，B 臂，未写入），其余 jsonl 每行完整。

**T-D2-N1 对照（你问「够不够」）：builder 那一次不够，现在够了。** 含滚动的返回 **A 留在文本 30/30，B 被拽进原页 29/29**（jsonl 已抽查计数）。

| 场景（每臂 3 次） | 滚动 | 返回 | A 留文本 | B 进原页 |
|---|---|---|---|---|
| S2 中间页 md | 真滚轮 | 标签真点击 | 3/3 | 3/3 |
| S2 | 真滚轮 | hash | 3/3 | 3/3 |
| S2 | 脚本 | hash | 3/3 | 3/3 |
| S7 两篇 docx 都在等 | 真滚轮 | 标签真点击 | 3/3 | 3/3 |
| S7 | 真滚轮 | hash | 3/3 | 3/3 |
| S2，转换全部完成后返回 | 真滚轮 | 标签真点击 | 3/3 | 3/3 |
| S1 中间页 PDF 原页态 | 真滚轮 | 标签真点击 | 3/3 | 3/3 |
| S2，CPU 4 倍降速 | 真滚轮 | 标签真点击 | 3/3 | 3/3 |
| S2，转换完成后 + CPU 4 倍 | 真滚轮 | 标签真点击 | 3/3 | 3/3 |
| S2，转换完成后 + 延迟 150ms | 真滚轮 | 标签真点击 | 3/3 | 2/2 |

A 的记忆保持 800。B 落在 266 或 26，点 Text 后 top=0，800 回不来。对照组：未滚动的 S2 两臂都进原页（各 3/3，符合设计）；读者不离开、首页到达时两臂都留在文本（各 3/3）。

**T-D2-1**：投影直达未开 tab 的投影，真滚轮到第 4 页，切走切回。hash 和 Agent `open_note` 各 3 次：**A 6/6 守住（原页第 4 页），B 6/6 丢失（回到 Text，记忆 text/4）**。

**P2 没破坏的**：记忆 pages 的 tab 来回切页码不丢（A 44/44）；默认进原页仍成立（手写笔记 hash、手写笔记 Agent、项目页真点击，PDF 和 docx，各 3/3）；规则③的 Agent 聚焦在被测的进入路径上都切到文本并进视口（只记数字，不判规则③之外的竞态）。切回时页位比 HEAD 晚约 63ms（两帧），首张图基本不晚（134 对 128ms），之前担心的「晚 2 秒」是负载假象。

**P2 带来的回归**

| 编号 | 严重度 | 事实 |
|---|---|---|
| T-P-6 | **minor，待裁** | 流程：文本读到 800 → 切 Pages → 切到记忆 pages 的 tab → 切回 → 点 Text，**落在 35，不是 800**（A 3/3，B 3/3 保住 800）。机理：路由刚变那一帧 `enabled` 已假、`active` 变假，`NoteRuntimeDocumentLayer.tsx:130` 的 effect 把 `takeTextScroll` 取走了。`textScroll`（`useSourcePageViewController.ts:64`）不按笔记分。B 也不干净：同一个 ref 让它把 X 的 800 漏到另一篇笔记上（不切回，直接在中间页点 Text：B 落在 800，A 落在 0）。所以 P2 是丢了这个位置，也堵了这个串位。根治是把 `textScroll` 按笔记分开，改动小，没验证 |
| T-P-7 | note | 原页 tab 互切时闪一帧旧笔记正文（A 44/44，B 0/44，HEAD 0/8；截帧确认已绘制，约 15-17ms）。路由刚变时 `loading` 还是 false，`enabled` 已假（`NoteCanvasRuntime.tsx:28,:42`） |
| T-P-8 | note | 离开原页时旧笔记横幅闪一帧（到 md、手写笔记两臂都 6/6，P3 的条件带来；到记忆 pages 的 PDF：A 6/6，B 0/6，P2 扩大） |

**P3**：含 `parser_messages` 的 docx，原页无横幅、切文本出现、切回消失（12/12，两臂，标签真点击和 hash）。原页生成失败的 Source 仍显示；无转换器主机显示，无切换按钮。Source 行徽标、详情提示没动（四个相关文件对 HEAD 无 diff）。切回记忆 pages 的笔记 0 帧横幅。首次打开落到原页前，横幅和文本露出约 140ms（两臂 12/12，不是 P2 引入，属已申报的闪现）。

**阳性对照重跑**：基线 34/34。ARM P2、P3、T-D2-N6 各红 1 条，红名与 `patch-positive-controls.txt` 一致（P2 那行在证据里被截断于「so」，前缀和断言文字一致）。定向 55/55：`NoteCanvasRuntime.sourceView` 3、`NoteSourcePagesLayer` 31、`BlockSourceReferenceLayer` 2、`notePageFlowService` 5、`typographyMeasurementService` 14。后两个加上 Block 那个都是恢复后的 HEAD 版本。

**测试缺口**：P2 现有测试 mock 了文档层，钉不住滚动记忆压扁和 T-P-6。

**没验到**：可见窗口；生产构建；真 LibreOffice；浏览器标签页隐藏时返回（rAF 不跑，读码看可能判成未滚动）。HEAD 只跑了切回时序，文本位置和横幅的对照用的是 B 臂。

## 收口结论（补丁轮）

**建议放行收割。** P1 正确；P2、P3、P4、P5 按单生效，阳性对照都重跑过；全量红全部归类（harness 既有；BoardPage.selection、smoke、Pagination 载荷敏感）；证据相符。

**唯一需要你裁的是 T-P-6**：我建议接受，入 tech-debt，不再开补丁轮。理由：只在「文本读过 → 切原页 → 切 tab → 切回 → 再切文本」这条窄路上丢一次阅读位置，无数据损伤；不修也比修前干净（修前会把位置串到别的笔记）。要修的话把 `textScroll` 按笔记分开，改完补一条不 mock 文档层的用例。

**部署仍按「部署清单」走**：先手工跑命令，先装字体再设 env，设完抽查 `supported=true`，核一次超时路径。三个未跟踪文件要带上。

## 仍未覆盖

| 对象 | 缺口 | 何时补 |
|---|---|---|
| 导入到切原页全链（真 soffice + 真上传 + 真浏览器） | 没人连起来跑过 | 首次岛上真跑 |
| D2 新导入首开（真转换中切换） | 假转换器实测过（N1 组），真 soffice 没走 | round-04 |
| D3 legacy View 真点击 | 只读过码 | 取消，D3 恢复到 HEAD |
| Linux 杀进程分支 | 本机无 WSL、无 docker | 岛上超时核查 |
| 默认视图打印的内容 | 只读过码 | 不进本轮，已知墙（T-D2-D1） |

## 过程留痕

- **复核方一次越界（已申报，无实害）**：D2 视角的子 agent 想看脚本用法时误运行 `node scripts/copy-tool-face-manifest.mjs --help`，脚本不解析参数，把 `docs/generated/tool-face-manifest.json` 复制到了真实仓库的 `server/dist/tool-face-manifest.json`。路径被 `.gitignore` 忽略，复制后与来源逐字节相同，`git status` 无变化。除此之外复核没有写共享树。
- 实验都在 scratch 副本，使用独立库和独立端口，未读 `.env`，无真实模型调用，未碰岛。
- **另一处副作用**：裁定 Agent 聚焦时，子 agent 跑了一次 `chrome.exe --version`，输出「Opening in existing browser session」，可能在 Henry 的 Chrome 里多开了一个窗口或标签，未关。已告知 Henry。
- 云机两次中断（挂起、误锁），实验都从断点接续，没有重来。作废的 trial 已逐条写明。实验证据在本机会话 scratch，不进仓库；报告里的数字由 `tally.json` 和各 jsonl 重算过（抽查了 N1、T-D2-1 的计数）。
