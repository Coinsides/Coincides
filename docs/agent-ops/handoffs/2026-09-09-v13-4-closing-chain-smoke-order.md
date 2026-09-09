> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二段收口条款(定向核查+终点判据全链冒烟归档)
> **单号**: 13.4 段收口 · 全链冒烟 + 定向核查

# 13.4 段收口 · 全链冒烟

**使命**:终点判据**一段旅程走完**并归档证据——13.4 十单的机器在同一块板上连续协作,⛔ 分单碎证拼贴。

## 零 · 旅程剧本(一镜到底,合成夹具+真生产前端)

在一个合成板夹具(真 BoardPage/useBoard/真笔记运行时+内存 transport)里连续执行:

1. 开板→双击空白写**粉笔**"Compare two dynasties"→选中粉笔 **Cast to item**(原位换卡,origin=板);
2. 打开 **Staging**,picker 把一篇源笔记 **Stage** 进码头;从码头 **Place** 上板;
3. **双击**该笔记卡→**弹窗**开箱→框选一段→**Send to staging**→装卸区出现 range 行→**Place** 上板成活引卡;
4. 弹窗内**编辑该段前方插字**→Escape 关窗(等落库)→板上 range 引卡**跟变**且仍指原选段;
5. 建**第二层**,把 range 引卡 **Move to layer**→拖层序→遮挡互换;隐藏该层→引卡与相连边消失→恢复;
6. **New note** 开箱仪式(就地建 project+title)→弹窗开新笔记→把步骤 1 的 item 从装卸区**拖进笔记**成 item_ref 块;
7. 改该 item 正文(API)→重开新笔记→**块面跟变**;重开板→item 卡跟变;
8. **Ctrl+Z 一次**回滚最后一步板操作(验证命令栈在旅程尾仍健康);橡皮擦掉一笔随手画的 freehand;
9. 全程终检:重开板+两篇笔记,所有状态保持;事件账(mounted/unmounted/board_created/board_deleted 无冗余)抽核。

## 一 · 交付面

- 旅程夹具(可复跑,README 一页)+逐步收据(receipts/截图)归档 `.codex-tmp` 并在 Result 指路;
- **定向核查清单**:本段所动九面(接线批/item/text_range/粉笔铸卡/弹窗/装卸区/开箱/工具/分层/统揽)各一行"动了什么+定向测试面最新一次全绿的证据指针";
- 既有全量:client 全库 test:unit+server 板域全家+typecheck/build 最后一次整跑收尾。

## 二 · 裁量与停线

- 旅程某步失败=停线举证(⛔ 绕步⛔ 换样本掩盖);夹具工程问题自修不算停线;
- ⛔ 新功能⛔ 改产品码(除非旅程暴露真 bug——那就是停线举证的正业)。

## 三 · Result 格式

`## Result`:旅程九步逐步结果+证据指针 + 定向核查清单 + 全量收尾数字 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

2026-09-09 · Codex(builder) 执行收据 · **FAIL_STOP，第 4 步停线；13.4 全链未收口，不放行。**

本轮基线 HEAD：`25ac29b6f976d8fbeee2636fa60b2d443e4d113f`。未改产品码或既有测试、未 commit。保留原工单与 `ready` 状态，不用“交付回执”冒充“旅程通过”。

### 同板九步结果

| 步 | 结果 | 实际执行与收据 |
|---|---|---|
| 1 粉笔→铸卡 | **PASS** | 双击空白，写 `Compare two dynasties`，Enter，选中 Cast to item；sticky 消失，item 与投影原位几何相同，`origin_board_id=closing-chain-board`。[JSON](../../../.codex-tmp/v13-4-closing-chain/receipts/01-chalk-cast.json) / [截图](../../../.codex-tmp/v13-4-closing-chain/receipts/01-chalk-cast.png)。 |
| 2 Stage→Place 源笔记 | **PASS** | 打开 Staging 与 picker，Stage `Dynasty source`，从 dock Place；同一 member 从 placed=false 变 true，不额外 mounted。[JSON](../../../.codex-tmp/v13-4-closing-chain/receipts/02-source-placed.json) / [截图](../../../.codex-tmp/v13-4-closing-chain/receipts/02-source-placed.png)。 |
| 3 弹窗→选段→Send→Place | **PASS** | 双击源笔记卡，真 runtime 弹窗内鼠标拖选 `Qing expanded the empire.`；Send to staging 生成 range 行，再 Place 为 Live 引卡；保持此弹窗未重开。[JSON](../../../.codex-tmp/v13-4-closing-chain/receipts/03-range-placed.json) / [截图](../../../.codex-tmp/v13-4-closing-chain/receipts/03-range-placed.png)。 |
| 4 前方插字→关窗→跟变 | **FAIL_STOP** | 同一 textarea Ctrl+Home 插入 `Context: `，Escape 等待保存并关窗。正文已保存，但引卡显示 **Drifted / Source changed · Last valid snapshot**。旧偏移 38..63 未跟变，原选段现在应为 47..72。[停线 JSON](../../../.codex-tmp/v13-4-closing-chain/receipts/04-STOP-range-drifted.json) / [停线截图](../../../.codex-tmp/v13-4-closing-chain/receipts/04-STOP-range-drifted.png)。 |
| 5 分层遮挡与显隐 | **未执行** | 第 4 步停线，不建层、不换样本。 |
| 6 New note→item_ref 拖入 | **未执行** | 同上，不以单面既有绿证代替旅程结果。 |
| 7 item 正文双面跟变 | **未执行** | 同上，未调用夹具提供的第 7 步 Item 更新控件。 |
| 8 Ctrl+Z→橡皮 | **未执行** | 同上；reload 清会话栈仅为静态线索，未冒称本轮复现。 |
| 9 重开保持→事件账终检 | **未执行** | 同上。仅对已到第 4 步的合成账抽读：3 mounted、0 unmounted/board_created/board_deleted；板为 seed，零创建事件是夹具边界，**不是第 9 步终检通过**。 |

### 停线因果与归因边界

收据顺序：#26 GET 本 note 的 ranges（当时空）→ #30 新 mint range → #31 Place PATCH → #32 body PUT committed → #36 board GET。mint 后无 range 重读，也无 range PUT；unknown/rejected 请求 **0**。保存后旧偏移切出 `tration. Qing expanded th`，与原 excerpt 不符。

只读核查：`useNoteCanvasDataAdapter.ts:590/613` 只在初始 hydrate 把锚送入编辑 session；`BoardNoteModal.tsx:99/100` Send 仅 flush 后调用 mount；`BoardPage.tsx:390` 与 `useBoard.ts:175` 没将新锚登记回已打开的 note session；`boardTextRangeEditSession.ts:115` 对空 snapshot 不发保存。因此本次新锚未参加后续 rebase。真实 server 的 strict replay 也会将本样本判为 drifted。[完整停线分析](../../../.codex-tmp/v13-4-closing-chain/stop-analysis.md)。

这是**合成 transport + 真生产前端**上的同链缺陷证据；未接真实后端或用户库。不修产品、不补锚、不提前重开弹窗、不改成预置 range、不重跑换样本。夹具工程前置修正（Vite import 扩展名、CLI 浏览器连接不可用改 CUA）均发生旅程前；文字选择由 CUA selectText 改成同一段真实鼠标拖选只为触发既有选段工具栏，未改源文或样本。完整动作、局限与复跑说明见下方 README。

### 定向核查（工单称九面，实际列十项，全覆盖）

**C1**＝[本轮 client 全库日志](../../../.codex-tmp/v13-4-closing-chain/verification/01-test-unit.log)，81 文件 / 708 tests 全绿。**S1**＝[本轮 server 完整日志](../../../.codex-tmp/v13-4-closing-chain/verification/server-board-family.log)，15 文件 / 68 tests＝66 PASS、2 FAIL；不得称 server 全绿。各面真实文件名、最新既有 server 全绿指针与历史边界完整列在[定向核查清单](../../../.codex-tmp/v13-4-closing-chain/targeted-audit.md)。

| 面 | 动了什么 | 最新绿证及本轮边界 |
|---|---|---|
| 接线批 | 改名、投影几何、边、删除确认、note 生命周期接线 | C1：BoardPage.smoke / BoardDeleteDialog / BoardList / useBoard；S1 总体红保留。 |
| item | 板及 Gallery 读当前 Item 摘要与出处 | C1：BoardPage.item / groupGalleryItemSummary / itemSummaryReader；本次铸卡出处亲见。 |
| text_range | 锚投影与 TextFlow 编辑重定位、严格 replay | C1：clipboard / editSession / adapter 等全绿；**本次同弹窗新锚旅程第 4 步红，不能被单测绿覆盖**。 |
| 粉笔铸卡 | sticky 书写编辑、原位铸 Item、板出生证 | C1：BoardPage.chalk；本次第 1 步通过。 |
| 弹窗 | 真 note runtime、关闭保存屏障、板键盘让位 | C1：BoardNoteModal / BoardPage.modal / writeRegistry；本次第 3–4 步的源文落定可见，range 接缝失败。 |
| 装卸区 | 笔记 tray 整理及板 Stage/Place、modal 选段 Send | C1：BoardPage.staging / useBoardStagingSelection / Tray 各整文件；本次第 2–3 步通过。 |
| 开箱 | project/title→New note→item_ref 只持 identity | C1：BoardNewNoteDialog / BoardPage.unboxing；本次未达。 |
| 工具 | select/pan/pen/eraser、群选、会话命令栈 | C1：BoardPage.tools / useBoard.history / useBoard；本次旅程尾未达。 |
| 分层 | 独立 stacking、Move、层序、边显隐、迁 Base | C1：BoardPage.layers / useBoard.history；本次未达。 |
| 统揽 | 独立 Overview、4/3/2 列分页与只读页投影 | C1：NoteRuntimeDocumentLayer / NotePrintLayer / BoardNoteModal；既有浏览器 13 场景及打印 6 场景指针见清单，本次未复跑。 |

### 既有全量最后整跑

- Client `test:unit`：**81 文件，708/708 PASS，0 fail/skip**，完整未筛选。
- Server 板域及事件账：**15 文件，68 tests：66 PASS / 2 FAIL / 0 skip**。两红原样保留：`v13EventsLedger.test.ts:91` migration 期望 1、实际 9（054–062）；`:168` 旧 13 verbs 与现 14 verbs（多 `board_deleted`）不一致。未过滤、未修期待值或改判。
- Client/server typecheck 与原 build：**全部 PASS**；构建既有大 chunk / schema 递归警告留原日志。
- `verify:v2-bn8-runtime` 允许的 **20 个子命令最终逐项 PASS**，model contract 60 组、performance 5 场景。**原总门未完整执行，不标 PASS**：末项 `check:changed-file-secrets` 是本单明确留 HQ 的凭据扫描。既有套件中的安全相关断言仍整套执行，未设计/新增安全类测试。
- `git diff --check`：最终 exit 0；首次隔离 runner 裁切 Git 环境导致的 exit 129 与原 shell 同命令重跑证据均保留，属于夹具工程问题，不改变 server 两红。

原始命令/exit/计数/隔离方式：[验证汇总](../../../.codex-tmp/v13-4-closing-chain/verification/summary.md) / [完整 results](../../../.codex-tmp/v13-4-closing-chain/verification/results.json)。产品码在测试与旅程之间零修改，未用前轮产品版本的绿证代替本轮。

### 交付、未做与铁律

- [夹具一页 README / 复跑入口](../../../.codex-tmp/v13-4-closing-chain/README.md)，`start.mjs` + `fixture.tsx` + `mockApi.ts`；[可复跑的已执行前缀](../../../.codex-tmp/v13-4-closing-chain/replay-prefix.mjs) 仅做语法检查，**未作为第二样本再跑**，不冒称已实现/验证 5–9 步自动化。
- [九步结构化结果](../../../.codex-tmp/v13-4-closing-chain/journey-summary.json)、`receipts/` 内 **9 份 JSON + 9 张原始截图**（含初态及中间状态）、[定点文件 SHA-256 清单](../../../.codex-tmp/v13-4-closing-chain/artifact-manifest.json)。所有交付归 `.codex-tmp/v13-4-closing-chain/`。
- 未做：旅程 5–9、用户数据库/真后端复现、产品修复、HQ 凭据扫描、主观验收/放行。item_ref transport 的 null→空串简化已在清单披露，未到该步，不声称它得到验证。
- **零产品码改动；零 commit；未读 `.env`；无 key 输出/出境；未触碰用户数据库；未设计/新增安全类测试。** 既有安全断言随整套运行，不过滤。

**最终判定保持：第 4 步停线 + server 两红，交 HQ 接手；不改判，不续走。**

## 补遗一(HQ 裁定,2026-09-09:真 bug 修复授权 + 陈旧断言跟账,续工令)

1. **第 4 步停线采纳=13.4 真 bug**(旅程冒烟的正业收获):"弹窗编辑期内铸的锚不入活跃编辑 session"——授权产品修复:**Send to staging 成功后,把该 note 的 board 锚增量拉回当前编辑 session**(复用既有 by-note GET+session 合并;⛔ 覆盖在途编辑;⛔ 重开弹窗式的粗暴刷新;⛔ 动 rebase 算法本身);配套回归一条:弹窗内铸锚→同会话前方插字→保存→复放 **Live 且偏移跟变**(以本次停线样本转正向);
2. **server 两红=陈旧断言跟账**(⛔ 产品问题):`v13EventsLedger.test.ts:91` 迁移数与 `:168` verb 清单按现实更新(迁移 054-062 共 9/verbs 14 含 board_deleted——后者是单 A 有案授权的开闸);**守卫语义保留**(清单仍显式枚举,防未授权 verb 潜入);⛔ 放宽为"任意数目过";
3. **续工**:修复+跟账后,**旅程九步从第 1 步全新样本重走一遍到底**(⛔ 续用停线样本半程),九步全 PASS+server 板域全家绿+client 全库+typecheck/build,新 Result 追加于本补遗后;
4. 修复射程若超出"session 增量登记"一层(牵动 adapter 保存链或 server 契约)→停线举证。

## Result

2026-09-09 · Codex(builder) · 补遗一续工回执 · **FAIL_STOP：授权修复与 server 跟账完成，新样本第 1–7 步 PASS，第 8 步停线；13.4 全链未收口，不放行。**

本回执追加于补遗之后，保留此前第 4 步停线及旧目录，不覆盖旧判定；工单仍为 `ready`。本轮未 commit。收尾只读 HEAD 为 `beda0ccf7a8c09695c436e146cdf48afbd9e6e2d`（不是本轮开工前采集的基线）。

### 授权修复与跟账

- **产品仅 session 增量登记一层**：`BoardNoteModal.tsx` 在 Send 成功后等待既有 by-note GET；通过 `NoteCanvasRuntime` / controller / adapter 暴露 `refreshBoardTextRanges`，调用 `boardTextRangeEditSession.mergeNewRanges`。仅添加本 note 的新 identity，保留既有 range 对象、dirty、drafts、失败快照及在途保存身份。等待期间沿用 staging 输入屏障；不重开、不 hydrate 编辑器，不动 rebase 算法、adapter 保存链或 server 产品契约。
- **新增一条功能回归**：`client/src/pages/Boards/BoardNoteModal.rangeSession.test.tsx` 跑 modal/provider/adapter/repository/session/原 rebase 保存链，覆盖铸锚→同会话前缀编辑→保存→严格切片仍指原文且偏移跟变；同时检查 GET 等待屏障、单次挂载及中途旧 GET 不覆盖已有 draft/dirty。既有 `BoardNoteModal.test.tsx` 仅补刷新调用与顺序断言。真实 runtime 和板卡 Live 由下列浏览器第 3–4 步收据补足。
- **server 跟账**：`v13EventsLedger.test.ts` 明确断言迁移 **9（054–062）**、显式枚举 **14 verbs（含 board_deleted）**，最终行数仍精确断言 14。ledger fixture 应用既有 058 以使用当前 SQL CHECK；054 不改变原表的守卫仍在显式执行 054 后逐表比较，再跑当前迁移链。fresh/legacy SQL 比较只规范 SQLite 058 rename 产生的精确 `CREATE TABLE "events" (` 前缀引号，其余 SQL 比较及已有守卫保留；未改成任意数量或跳过断言。

### 全新同板九步结果

新目录 [README / 复跑入口](../../../.codex-tmp/v13-4-closing-chain-resume/README.md)，新 board `closing-chain-resume-board`、新存储命名空间、端口 5195。真实生产前端 + 合成内存 transport，从第 1 步零 member/item/range/event 开始；未接用旧停线样本半程。

| 步骤 | 结果 | 连续动作与证据 |
|---|---|---|
| 1 粉笔→铸卡 | **PASS** | 写 `Compare two dynasties`、Cast to item，原位置/尺寸/scale/z 不变，origin 指本板。[JSON](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/01-chalk-cast.json) / [截图](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/01-chalk-cast.png)。 |
| 2 Stage→Place 源笔记 | **PASS** | picker Stage `Dynasty source`，dock Place，同一 member 置为 placed，未额外 mounted。[JSON](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/02-source-placed.json) / [截图](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/02-source-placed.png)。 |
| 3 弹窗选段→Send→Place | **PASS** | 双击开真实 runtime，拖选 `Qing expanded the empire.`；#30 铸锚，新增 #31 by-note GET 登记回当前 session，#32 Place 成 Live 卡，保持原弹窗。[JSON](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/03-range-placed.json) / [截图](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/03-range-placed.png)。 |
| 4 同会话前插字→保存跟变 | **PASS** | 同一弹窗 Ctrl+Home 插 `Context: `，Escape 等保存；#33 body PUT→#34 range PUT→#38 board GET。锚 **38..63→47..72**，原 excerpt 不变，active/严格 replay active，板卡 **Live**。[JSON](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/04-range-followed.json) / [截图](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/04-range-followed.png)。 |
| 5 分层、遮挡、显隐 | **PASS** | Base 固定，建两个可拖自定义层；range 与源卡分层并连边、重叠。#47 真正交换层序及遮挡，隐藏层时 range/相连边一起消失，再恢复。[互换](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/05c-order-swapped-confirmed.json) / [隐藏](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/05d-layer-hidden.json) / [恢复 JSON](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/05-layers-restored.json) / [恢复截图](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/05-layers-restored.png)。首次 grip 拖动未写入却过早标 PASS，原收据保留并以 [纠正记录](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/05b-order-attempt-correction.json) 作废该标签；以实际 draggable 行拖动后的 #47 为通过依据，没有换样本。 |
| 6 New note→拖入 item_ref | **PASS** | 同 Item Stage 到 dock；开箱就地建 project/title，拖入新笔记为 item_ref，仅持 `item_id` 引用正文。[JSON](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/06-item-ref-in-note.json) / [截图](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/06-item-ref-in-note.png)。 |
| 7 Item 正文双面跟变 | **PASS** | #96 API 改 Item 正文，重开新笔记读到更新，再重开板读到更新。[笔记](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/07b-note-item-followed.json) / [板 JSON](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/07-item-both-surfaces-followed.json) / [板截图](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/07-item-both-surfaces-followed.png)。此前普通 picker 把新笔记放板以供重开（#94），原 Item 卡移到无遮挡处（#95，最后板操作）。 |
| 8 Ctrl+Z→橡皮 | **FAIL_STOP** | 重开板后聚焦空白，仅按一次 Ctrl+Z；Undo 禁用、零新请求，sequence 仍 124，板状态完全相等，最后移动仍 `(1090,232)`、未回到 `(420,112)`。[停线 JSON](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/08-STOP-history-empty.json) / [截图](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/08-STOP-history-empty.png) / [前后比较](../../../.codex-tmp/v13-4-closing-chain-resume/receipts/08-undo-comparison.json)。**橡皮未执行**。 |
| 9 重开保持→事件终检 | **未执行** | 第 8 步停线，不越步；没有以单测或中途读取代替终检。仅前缀账可读为 5 mounted、0 unmounted/board_created/board_deleted、0 rejected，板为 seed，此计数不代表第 9 步通过。 |

### 第 8 步停线归因与边界

只读定位：`useBoard.ts:40` 为组件作用域新建 history，`:106` 在 load/reload 后 reset；`boardCommandHistory.ts:54–57` 清空 past/future。`BoardPage.tsx:248–250,1110` 普通笔记关窗也经 `refreshProjections → board.reload` 清栈，夹具 Reopen saved board 则重挂载真实 BoardPage/useBoard。既有 `useBoard.history.test.tsx:139–152` 明确断言 reload 后无 history，本次整库运行仍通过。

因此旅程要求与现有命令栈生命周期存在冲突，交 HQ 裁定；**不因既有测试如此就把旅程改判**。修复命令栈超出补遗一的 session 增量登记授权，未修改这些文件，未补一次新操作来制造可 Undo，未执行后续步骤。[完整停线分析](../../../.codex-tmp/v13-4-closing-chain-resume/stop-analysis.md)。

### 定向核查与最终全量

工单称九面，实际列十项，逐项「动了什么 + 最后全绿测试指针 + 浏览器到达边界」均见 [十面定向核查清单](../../../.codex-tmp/v13-4-closing-chain-resume/targeted-audit.md)：接线壳、item、text_range、粉笔铸卡、弹窗、装卸区、开箱、工具、分层、统径。工具单测绿与旅程第 8 步红分别记录；统径未另复跑浏览器历史场景。

- Client `test:unit`：**82 文件 / 709 tests，全部 PASS**；新增上述一条功能回归，完整套件未过滤。
- Server 板域全家及事件账：**15 文件 / 68 tests，68 PASS、0 FAIL/skip/cancel/todo**。旧两红已按 HQ 跟账转绿。
- Client/server **typecheck 与原 build 全部 PASS**；既有大 chunk 与 schema 递归构建警告保留在日志。
- 最终整跑 **23 个命令全部 exit 0**，结束 `2026-09-09T13:02:13.131Z`；与本轮浏览器同一产品修改，此后仅归档回执。包含原 `verify:v2-bn8-runtime` 允许的 **20 个组成命令全 PASS**（model contract 60 组、performance 5 场景等）。**原总门未整体运行，不标 PASS**：`check:changed-file-secrets` 是本单明确留 HQ 的凭据扫描。既有套件中的安全断言仍整套执行，未过滤。
- 前置 server SQL 引号差异失败及第一次 full 的新增测试 nullable 类型错误已修正；原始红日志留在 `verification/precheck/` 与 `verification/first-full/`，最终全量重跑全绿，不覆盖这些历史失败。

[验证汇总](../../../.codex-tmp/v13-4-closing-chain-resume/verification/summary.md) / [23 条原始命令与退出码](../../../.codex-tmp/v13-4-closing-chain-resume/verification/results.json) / [九步结构化结果](../../../.codex-tmp/v13-4-closing-chain-resume/journey-summary.json) / [定点文件 SHA-256 清单](../../../.codex-tmp/v13-4-closing-chain-resume/artifact-manifest.json)。逐步 JSON 与原始 PNG 均在新目录 `receipts/`。

### 未做与铁律

未做：第 8 步橡皮、第 9 步、命令栈生命周期修复、真实后端/用户库验证、HQ 凭据扫描、主观验收/放行。合成 replay 与真实 server 单测分列；本轮 item_ref 创建 payload 实际 `plain_text=''`，transport 已保留显式 null，但不冒称亲测真实 SQL null 存储规范。

**零 commit；未读 `.env`；无 key 输出/出境；未触碰用户数据库；未设计/新增安全类测试；既有套件整跑不筛选。保持第 8 步 FAIL_STOP，不改判，不继续旅程。**

## 补遗二(HQ 裁定,2026-09-09:第 8 步=剧本缺陷⛔产品问题,剧本修订续走)

1. **停线采纳,归因改判为剧本缺陷**:单 4 拍定"换板隔离、reload 清栈"(useBoard.history.test:139-152 既有断言即此设计);第 7 步重开板后旧栈按设计为空,Undo 禁用=**正确行为**(旅程顺带验证了该裁定,记一功);⛔ 任何产品改动;
2. **第 8 步剧本修订**:重开板后**先做一步新board操作**(拖动 Item 卡到新位置)→**Ctrl+Z 回原位**→Ctrl+Y 复位;然后画一笔 freehand→**橡皮擦掉**→Ctrl+Z 笔回来;
3. **样本续用**:第 1-7 步收据有效(本轮零产品改动),从修订版第 8 步继续到第 9 步终检,⛔ 重走 1-7;
4. 完成后新 Result 追加(九步全 PASS 判据以修订剧本为准)。
