> **状态 (Status)**: done(二轮施工;一轮停线=验证门×Git 禁令边界,HQ 补遗一裁定后续派;HQ 收口:client 全库 183 文件 1853/1853 亲跑定案+git diff --check/secrets 双门绿;本单服务端零 diff,builder 全量中两项既有 Python/MinerU 环境红为基线复现;2026-09-19)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-19
> **单号**: V14 纸面线 · A1 自动分页+断块(布局引擎地基)
> **上游**: `design/note-page-design.md`(权威,§〇公理/§1.1 七层/§四已决)+ `current-state/page-frame-and-layout-contract.md`(坐标契约九条,⛔破)+ `plans/v14-agent-era-plan-draft.md` 纸面工程线节 + `plans/v14-remainder-roadmap.md` 波A(验收以《宋史手册》第一章为剧本)。**设计裁量已完成,照拍施工⛔重开设计。**

# A1 · 自动分页+断块

**性质**:V14 纸面线承重墙。Word 式自动分页:版心顶爆自动切下页;**块可跨页**——逻辑一块、渲染多片。总纲三句(公理,⛔违):**树是内容,页是容器**(分页引擎把树灌进页序列;重新分页=重算,树上零改写);**分片=渲染投影,⛔新真相**(frame_id=起始页籍;第二片起的定位全部引擎派生,零持久化;若确需缓存,以派生缓存申报且失效即重算);**page_frame_local 契约九条原字不动**(墙动原点动零改写、auto 派生盒唯一合法宽度来源等)。

## 一 · 分页引擎(pageStackContentFlowService 升承重)

1. 输入=块序列+逐帧版心几何(每帧 contentInset/纸型;**每页可异形已法定**——异形页参数逐帧覆写,跨页块按目标页版心现宽重排);输出=页序列+逐页 fragment 清单(块→分片:起始帧籍+片内范围);
2. **切分规则**:text 块按渲染行切(⛔字中切、⛔行中切);媒体/投影/组件块 v1 整块不裂(顶爆整块下移;高于单页版心的块=单页独占+结构化溢出申报,⛔静默裁切);
3. **射程**:分页作用于流动件(在流/auto);manual 自由摆块保持帧籍与现行为零变(⛔卷入 reflow);衬底/浮面/钉视口覆盖件现行为零变;
4. **Web 长页⛔分页化**(单帧生长活标本保留,09-12 §十四.6);分页对纸型族(A4/Letter 等)生效;
5. 顶爆触发面:打字增行/改字号 Typography/调墙/换纸型/异形页参数——任一变更后重算收敛,⛔抖动循环(同输入必同输出,plan 纯函数)。

## 二 · 估高服务承重化(typographyMeasurementService)

1. 从"参考估高"升为分页承重:**缩进感知**(现对 indent_level 零感知=已知债,本单清)、按帧版心现宽 wrap、行高/字号随 Typography 四参;
2. **双源统一**:估高与真实渲染同源化(与 NotePrint/编辑层同一套字型度量),申报估高↔实测偏差数字;偏差超阈值(申报阈值)以实测回填修正,⛔各page各一套分页真相;
3. 打印/导出/Overview 与编辑面**共用同一份 flow plan**(pagePrintProjectionService 接新引擎;⛔两套分页各排各的)。

## 三 · 跨片编辑机器(B4-B9 机器 fragment-aware 化)

1. **光标穿行**:片尾→下页片头连续(视觉跨页,逻辑同块);上下行移动跨片正确;
2. **跨块选区**:跨页选区(含跨片块中段)选择/复制/删除正确;
3. **打字与撤销**:编辑永远作用于逻辑块(TextFlow 真相零动),分片仅投影;undo/redo 在跨片块上正确,撤销后重分页收敛;
4. 把手/标注章/受授公民在分片块上的呈现方案由 builder 申报(建议:随首片;⛔一件两处可点)。

## 四 · 墨水与页籍(HQ 裁定,照拍)

1. **墨水保持单页锚定**(C4 现契约):块跨页分片后,既有墨水留原页⛔随片迁移——纸上的笔迹属于纸;
2. frame_id=块的起始页籍,籍随首片;分页变动时首片籍更新走既有 placement 机制,⛔新真相列。

## 五 · 验收与禁区

1. **验收剧本(段收口定向)**:《宋史手册》第一章正文(builder 自 `docs/agent-ops/…/song-handbook` 不可得——由 HQ 提供纯文本夹具,或以等量中文长文夹具代替,段落 30+ 含多级缩进)灌入笔记自动排出 ≥3 页:跨页块正确分片、片尾→片头光标连续、跨页选区复制、跨片 undo/redo、调墙/换纸型/异形页重排收敛;
2. 定向:引擎单测(多帧异形/顶爆下移/超高块独占/同输入同输出)+估高偏差夹具+跨片光标/选区/撤销+打印/Overview 同源回归;client 全库+server 全量;既有回归零破(Layout 态/墙九条/manual 块/墨水/把手/Web 长页);
3. **说明书义务**:`current-state/app-operating-manual.md` §一 补分页行为条目;
4. 证据落 `docs/audits/2026-09-19-a1-pagination-builder/`(蒸馏件),原始日志留 `.codex-tmp/a1-pagination/`;
5. ⛔碰 Relation 域/写门/注册表/Agent 机关;⛔动 TextFlow 真相 schema;⛔动 page_frame_local 契约九条;⛔碰 `.git`、⛔commit(工作树交 HQ 验后代账);⛔新依赖;⛔新设计安全对抗类用例(射程=只禁新设计对抗用例;既有功能回归含全库整跑明文允许,零排除);builder 新造凭据形合成值 ≤20 字符(域数据字符串不在射程,长度边界用例照跑)。Result:引擎形状申报(plan 数据形)+逐件行号+估高偏差数字+测试数字+说明书申报+未做项。冲突停线举证。

## Result

**2026-09-19 · Codex builder · STOP（开工对档停线，未完成）**

按本轮用户“遇工单冲突停线举证写入工单后停止”执行。工单状态保留 ready，不翻 done。已核对两份点名上游；未发现 A1 与笔记页设计/墙九条之间另有必停冲突。本次阻塞为完整验证门与本单 Git 禁令的执行边界：

1. `AGENTS.md:62` 明定“不跳过验证门（`npm run verify:v2-bn8-runtime`）”。
2. `package.json:44` 的原门直接包含 `git diff --check`，随后执行 `npm run check:changed-file-secrets`。
3. `package.json:38` 指向 `scripts/changedFileSecretScan.mjs`；该脚本 `:9` 调用 `execFileSync('git', ...)`，`:22–24` 读取 `diff` / `diff --cached` / `ls-files`，`:51` 无条件调用入口。
4. 本单 §五.5（原文 `:43`）及本轮用户明禁“碰 `.git`”。原门不能在该禁令下原样执行。Builder 未自行删闸、换闸、改操作指令或把禁令改读为“只禁写”。独立只读子代理确认了同一调用链。

**按工单格式申报**：

| 项目 | 结果 |
|---|---|
| 引擎形状（plan 数据形） | 未施工；无新增类型、分片持久化或缓存。 |
| 逐件行号 | 无产品实现改动；冲突位置见上列，详细证据见下方审计件。 |
| 估高偏差数字 | 未测量；阈值未制定。 |
| 测试数字 | 功能测试执行 0；client 全库 / server 全量 / runtime 门均未执行，不宣称通过。静态探针只取证。 |
| 说明书申报 | 未改 `current-state/app-operating-manual.md`，未交付分页行为。 |
| 未做项 | 本单全部产品施工与验收未做：引擎、估高、共享 flow plan、跨片编辑、夹具旅程、回归及说明书。 |
| 禁区遵守 | 未操作 `.git`，未 commit，未修改产品代码、上游契约、依赖、操作指令或验证脚本。 |

蒸馏证据：[停线报告](../../audits/2026-09-19-a1-pagination-builder/stopline-verification-gate.md)。原始静态结果：`.codex-tmp/a1-pagination/verify-gate-conflict-probe.json`；探针与工具记录同目录。既有 `ch1-fixture.txt`、`exec.log` 未改写。

**恢复条件**：后续明确完整验证门与 Git 禁令的执行边界；本回执不授权例外。至此停止。


## 补遗一(2026-09-19 · HQ 裁定:验证门与 Git 禁令的执行边界)

停线成立,合同缺陷在 HQ(禁令未带射程,0913 同族病)。裁定即时生效:

1. 「⛔碰 `.git`」射程=**⛔一切写操作**(add/commit/push/reset/rebase/直接改写 `.git` 目录);**只读 git 子命令明文允许**(status/diff/ls-files/rev-parse 等,含验证门脚本内部的只读调用);
2. 验证门口径与既往单一致(先例:2026-09-14 评测场单、2026-09-16 板视觉单):`verify:v2-bn8-runtime` 中 **git 检查与 secrets 扫描两组件留 HQ 收口**,builder 执行**其余全部组件**并按「非 git/secrets 的 N 组件」申报,⛔宣称完整门已绿;
3. AGENTS.md「不跳过验证门」与本裁定并读:builder 侧执行的验证门=去除 git/secrets 两组件的其余部分,HQ 收口补齐即为完整门——**分工不是跳过**;
4. 其余条款原字不动。一轮停线 Result 保留为档;续派恢复施工,完工后另起「## Result(二轮)」。

## Result(二轮)

**2026-09-19 · Codex builder · 二轮施工交付，工作树交 HQ；不代行主观验收或完整门放行。** 按补遗一恢复，原停线记录保留。本轮没有新的权威冲突，无 Git 写操作或 commit。

### 引擎形状与逐件行号

`DocumentPageFlowPlan` = `{ collection, frames:[{frame,fragments}], fragments, placementUpdates, appendedFrameIds, excludedBlockIds, overflows }`。fragment 带 blockId/frameId/startFrameId、片序、首尾标志、UTF-16 textRange/lineRange、完整渲染行与派生local layout。只保存新增页集合和首片frame_id（经现役placement）；续片/量测cache不持久化，TextFlow真相零改型，墙动不改储存x/y/width。

源码根 `client/src/pages/Notes/canvasEngine/`：

| 施工件 | 入口 |
|---|---|
| 引擎与异形页 | `documentPageFlowService.ts:77,114`，原 `pageStackContentFlowService.ts` 再导出；`pageFramePrintScaleService.ts:83` 保留显式短页几何 |
| 估高/实测同源 | `typographyMeasurementService.ts:78,152`；`typographyDomMeasurementService.ts:49,152` |
| 生产集成与首片籍 | `notePageFlowService.ts:13,49,66`；`hooks/useNotePageFlow.ts:11,43`；`hooks/useNoteCanvasRuntimeController.ts:273`；`hooks/useNoteCanvasLayoutModel.ts:181,306` |
| 跨片编辑机器 | `blocks/PaginatedTextBlockProjection.tsx:37`；`paginationEditingService.ts:27,67,77`；`fragmentTextareaService.ts:2`；`hooks/useTextFlowHistory.ts:106` |
| 把手/章/来源 | `hooks/useTextUnitHandleDrag.ts:16`；`layers/BlockEditorLayer.tsx:157`；`pageFlowSourceReferenceService.ts:6`；`layers/BlockSourceReferenceLayer.tsx` |
| 写面/打印/Overview | `layers/NoteWritingSurfaceLayer.tsx:1546`；`layers/NotePrintLayer.tsx:21`；`layers/NoteReadOnlyPageContent.tsx:35`；`pagePrintProjectionService.ts:11,43`；`exportPreviewService.ts:196` |
| 墨水与页籍证明 | `layers/PaginationProjection.test.tsx`：文字首片迁页/新增续页，墨水placement不改且只渲染于原页；现役墨水代码未改 |

单一逻辑editor拥有多片textarea；把手随各unit首片，标注章随首个命中unit首片，block控制一份，来源仅首片56px可横向滚动条带。manual/覆盖件排除；Web保留现役单帧生长；旧纸保留以保护墨水/手摆内容。超高整块独页且结构化报告，不静默裁短。

### 估高偏差与验收

阈值 **0.5px或任意行边界差异**；超过即以同源DOM结果回填。HQ中文夹具三组纯估高↔实测差 **22.03125px /0.9101%**、**30.0142045px /0.69089%**、**0.03125px /0.0008294%**；另补两组代码角色差21.878125px、0.3494318px。五组回填后 plan↔render 高度差均 **0px**，原生textarea换行不一致 **0**；原生scrollHeight舍入最大0.40625px。heading/code字号行高按默认15/22比例响应Typography，保留默认角色外观。

真实Chrome以31个非空正文段、62 units、四级缩进及3600字单unit补充段执行：A4 **5页7片**、Letter **5页6片**、异形页 **8页10片**；异形+窄墙+21px **14页16片**，恢复设置回同一范围与全文。左右片缝、上下软缝往返、硬换行片缝、续片输入Undo/Redo、从跨片块中段跨到下一块的1774字符复制/删除/撤销均落证。最终编辑/打印/Overview **65个slice逐项相同**。浏览器发现的撤销光标抢回、硬换行隐空行和垂直软缝affinity均已修复并实测回归。

### 测试与说明书

- 最终client全库：**183文件 /1853测试 PASS**，114.37s；`npm.cmd --prefix client run test:unit -- --maxWorkers=2`，不筛选用例、不改超时。TypeScript和生产build均exit0。
- 定向：纯引擎/adapter/旧入口/短纸页28项；度量14项；hook收敛4项；跨片编辑及既有输入/把手/history/source共143项；同源projection/墨水/只读层8项均PASS（这些是完整client中的重叠子集，不相加造总数）。Canvas boundary174 checks，single-editor/source-experience等受影响静态门PASS。
- runtime门严格按补遗一拆为**非git/secrets的23组件，23/23 PASS**；文档索引已按既有命令生成，`docs:check` exit0。**Git检查和secrets扫描两组件留HQ，本回执不宣称完整门已绿**。
- Server全量执行完毕，标准命令exit1：首遍 **779项 /776通过 /3失败 /0跳过**；IPC项由现役runner隔离重试59/59恢复，最终留 **2项既有Python/MinerU环境失败**（基线已复现）。仅进程PATH补Python的另次尝试受Win32_Process权限拒绝挂起，明确ABORTED；未改外部环境、服务端测试名单或断言来造绿。
- 说明书已更新：`current-state/app-operating-manual.md:25`起§一新增5条分页行为。

蒸馏证据：[实现逐件索引](../../audits/2026-09-19-a1-pagination-builder/implementation-map.md)、[引擎](../../audits/2026-09-19-a1-pagination-builder/engine-and-content-adapter.md)、[度量](../../audits/2026-09-19-a1-pagination-builder/typography-measurement-evidence.md)、[验收剧本](../../audits/2026-09-19-a1-pagination-builder/acceptance-scenario.md)、[真实浏览器](../../audits/2026-09-19-a1-pagination-builder/runtime-integration-and-browser.md)、[验证组件/环境欠项](../../audits/2026-09-19-a1-pagination-builder/verification-components.md)。全部原始日志/夹具/JSON保留 `.codex-tmp/a1-pagination/`，最终client为`client-final-handoff.log`，最终服务端为`server-final-standard.log`，浏览器失败及修正证据分别保留，未覆盖成绿。

**未做项/交HQ**：两项Git/secrets门、两项服务端环境欠项与HQ主观验收；真实账户刷新恢复/OS打印成品与操作系统中文候选窗未由本地内存夹具替代（现役服务端与IME事件回归已执行）。无push/PR/merge/commit，无新依赖；未动Relation域、写门/注册表、Agent机关、TextFlow schema、墙九条或操作指令。
