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
