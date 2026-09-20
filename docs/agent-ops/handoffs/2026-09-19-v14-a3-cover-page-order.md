> **状态 (Status)**: done(builder 一轮交付+HQ 收口全绿,2026-09-19:client 193 文件 1940/1940 亲跑定案;git diff --check+secrets(81 文件)双门绿;server 993/995,余 2=既有 Python/MinerU 环境基线;builder 实机证据覆盖封面全生命周期,原图上传/真实打印两项实机留后续冒烟顺手补)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-19
> **单号**: V14 纸面线 · A3 真封面页+真相绑定块
> **上游**: `design/note-page-design.md` §2.3(封面图=装订件住第 0 页 cover 槽,⛔notes 表裸加列)+§四.2(封面档版心四条,准)+ 09-12 规划场 §三(题名件/述名件=真相绑定块,item_ref 同族;裸 textarea 标题终局=被本件取代,⛔中间态)+ A2 装订面已入库(binding_settings_json + dropFolioOnCover 钩子,commit 3ec2bba9)+ 卡面封面 v1 现物(card 框取景,09-13 card-cover 单)。**设计裁量已完成,照拍施工⛔重开设计。**

# A3 · 真封面页+真相绑定块

**性质**:笔记的第 0 页成为一等公民。封面=装订件(服务气质、可选、整体可退),⛔侵入内容真相。

## 一 · 封面页(第 0 页)

1. **可选添加/移除**:「添加封面页」→ 笔记获得封面档页帧(第 0 页,机械页序在首内容页之前);移除=退档零损失(封面上的块按申报方案处置:随封面退回收/移交首页,builder 申报选择与理由);
2. **封面档三件套静默**:接 A2 `dropFolioOnCover`——封面页零页码零页眉脚;显示页码从第 1 内容页起算(A2 计数器语义顺延);
3. 封面页⛔参与 A1 内容 reflow(封面版心=manual 自由摆域,流动件不流入)。

## 二 · 真相绑定块(题名件/述名件)

1. 题名件内容绑 `notes.title`、述名件绑 `notes.description`——**item_ref 同族机制:块是投影,⛔第二份真相**;在块上编辑=改笔记题名/述名,别处改名封面即时跟随;
2. 删除绑定块=移除投影⛔删真相;一张封面各至多一件(重复添加=聚焦既有件);
3. 表头带(title band)与裸 textarea 标题的现役行为**申报边界**:有封面页时两者关系照 09-12 终局裁定处置(⛔发明中间态半自由),无封面页笔记零变。

## 三 · 封面档版心四条(§四.2 照拍)

1. **住户白名单**:题名件/述名件/text 块/媒体块(+装饰件若现物已备,无则留位)——**⛔组件块 v1**;
2. **全 manual 自由摆**(封面零流式);
3. **封面文字入检索**;
4. **导出默认带封面,可关**(开关住装订设置)。

## 四 · cover 槽与 page 框取景

1. **封面图=装订件,值住 A2 的 binding_settings_json**(⛔notes 表裸加列):资产引用+**page 框**取景参数(随纸型;x/y/scale 非破坏,原图恒存);
2. 复用卡面封面 v1 的取景机制(两框制:card 框已在,本单补 page 框)——同一资产多框,加消费场景=加框参数⛔加图;
3. cover 槽衬底渲染可满幅出血(衬底档,文字块浮其上);
4. 卡面联动零改(card 框归卡面,聚合投影读槽逻辑不动)。

## 五 · 验收与禁区

1. 定向:封面页添加/移除生命周期+绑定块双向(块改→真相变;真相改→块跟)+白名单闸(组件块拒入)+manual 摆放+页码静默与首内容页起算+cover 槽出血+page 框取景参数往返+封面文字检索命中+导出开关;client 全库+server 全量;既有回归零破(A1 分页/A2 装订段页码/卡面封面 card 框/打印 Overview/墙九条);
2. **说明书义务**:`current-state/app-operating-manual.md` §一 补封面页用法;
3. 证据落 `docs/audits/2026-09-19-a3-cover-builder/`(蒸馏件),原始日志留 `.codex-tmp/a3-cover/`;
4. **禁区(全部带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 `.git` 目录);**只读 git 子命令明文允许**(含验证门脚本内部调用);`verify:v2-bn8-runtime` 的 git 检查+secrets 扫描两组件留 HQ 收口,其余组件照跑并按「非 git/secrets 的 N 组件」申报,⛔宣称完整门已绿;⛔碰 Relation 域/写门/注册表/Agent 机关;⛔动 TextFlow 真相 schema;⛔动 page_frame_local 坐标契约九条;⛔新依赖;⛔新设计安全对抗类用例(射程=只禁新设计对抗用例;既有功能回归含全库整跑明文允许,零排除);builder 新造凭据形合成值 ≤20 字符(域数据字符串不在射程,长度边界用例照跑)。Result:建模申报(binding_settings v2 字段表+封面帧建模)+逐件行号+测试数字+说明书申报+未做项。冲突停线举证。

## Result

2026-09-19 · Codex builder。施工已完成，工作树交 HQ；没有 git 写操作或 commit。证据入口：[A3 builder 回执](../../audits/2026-09-19-a3-cover-builder/README.md)。这份 Result 不授予放行，不宣称完整验证门或 server 全库全绿。

### 建模申报

| binding_settings v2 字段 | 语义 |
| --- | --- |
| `version:2` | 保留 v1 可读，A2 enabled/dropFolioOnCover/sections 六槽与计数器沿用 |
| `coverPage.frameId:string\|null` | 真正持久化的普通 page_frame 身份；null 无封面 |
| `coverPage.exportIncluded:boolean` | 默认 true；仅控制导出/打印 |
| `cover:{assetId,card?,page?}\|null` | 唯一原图资产，同图 card/page 多框；至少一框 |
| `cover.card` / `cover.page` | 原 `NoteCoverFrame` 的 crop{x,y,width,height}+zoom；非破坏取景 |

封面住 A2 装订 JSON，没有 notes 裸加列、迁移或新 Canvas kind。frame 复用现有页帧集合持久化，独立页叠，排于内容页之前；primary 仍是内容首页。运行时封面机械号 0、静默 A2 六槽，内容从 1 起；封面住户全 manual，不参与 A1 reflow。

退档方案选**移交首内容页**：仅迁原封面居民 frame_id，正文、题述名真相、墨水、原图、取景与浮点坐标全部保留，避免隐式删内容。若与首页原住户重叠，由 Layout 整理。真实 UI 移交两块及 server 文字/墨水用例均逐值验证几何不变。

题名件/述名件为 `note_ref`，content 仅 `{field:'title'|'description'}`，不存第二份正文；沿现役笔记 draft/save 修改 notes 真相。同一封面重复添加聚焦既有件，删除仅退投影；退档重建可添加新件，旧首页/托盘件不占新封面名额。未落位创建用既有 display_overrides_json 的 `note_ref_pending_frame_id` 关联封面，实际 placement 优先，不存正文/坐标副本。有封面时旧 title band/裸标题输入退出；无封面笔记保持原路，退档后恢复。

原 metadata.binding.cover 卡面读取协议不变，由 canonical JSON 投影；旧卡面数据只读兼容，首次写入归家。page 与 card 共用原裁剪计算和编辑器，无第二套算法/第二图。完整字段、事务、资产引用与源码锁说明见 [后端证据](../../audits/2026-09-19-a3-cover-builder/backend.md)。

### 逐件行号

- shared v2：`shared/types/noteBinding.ts:55`；唯一原图/card 兼容：`server/src/services/noteCoverStorage.ts:13`、`:23`、`:40`。
- 生命周期：`server/src/services/noteBinding.ts:30`、`server/src/routes/noteBinding.ts:11`；客户端 frame 建模：`client/src/pages/Notes/canvasEngine/noteCoverPageCollection.ts:6`、`:19`。
- 白名单/引用不复制：`server/src/services/noteCoverRules.ts:16`、`:24`、`:74`；块添加去重：`client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts:614`。
- 真相投影编辑：`client/src/pages/Notes/canvasEngine/blocks/NoteRefBlockProjection.tsx:5`；atomic snapshot 回接：`client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:911`。
- 封面控制/双框复用：`client/src/pages/Notes/canvasEngine/layers/NoteCoverPageControls.tsx:20`、`:92`；`client/src/pages/Courses/noteCover/geometry.ts:52`、`:57`。
- 满幅衬底/旧标题带退场：`client/src/pages/Notes/canvasEngine/layers/NoteCoverUnderlay.tsx:16`、`NoteWritingSurfaceLayer.tsx:497`。
- A1 隔离/机械序号：`client/src/pages/Notes/canvasEngine/documentPageFlowService.ts:92`、`engineModel.ts:158`、`:342`。Overview、打印、检索与导出逐消费者行号见 [页投影证据](../../audits/2026-09-19-a3-cover-builder/page-projection-evidence.md)。

### 验证与说明书

- **非 git/secrets 的 23/23 组件 PASS**；逐组件/逐次命令、退出码与原始日志见 [表](../../audits/2026-09-19-a3-cover-builder/runtime-components.md) / [JSON](../../audits/2026-09-19-a3-cover-builder/runtime-components.json)。完整 `verify:v2-bn8-runtime` 未执行。
- client 全库：**193 文件、1940/1940 PASS**。首轮默认并发 17 超时+1书签按钮等待失败；单 worker 完整重跑通过，无排除、无调高 timeout。收尾新增 6 项题名/述名重建封面去重功能回归，定向 controller 9/9 PASS。
- server 全量：**97 文件、995 项，993 PASS / 2 FAIL / 0 skipped**。失败仅现有 Python/MinerU 环境不可执行（`v2SourceMineruWiring`、`v2SourceRegionCells`），未豁免/改 fixture。server 定向 **25/25**、A3 **8/8**、tsc、pretest 均 PASS。
- 页投影定向 **9 文件、111 PASS**；坐标边界 **175 checks PASS**。A1/A2/card/Overview/打印既有回归均包含在整库与定向中；不把重叠定向数累计为总数。
- [v2 实机](../../audits/2026-09-19-a3-cover-builder/browser-evidence.md)完成新增/双向题述名/重复聚焦/manual拖摆/Overview/检索Page0/导出开关/无损移交/删投影留真相/退档重建再添加；原始 UI/API 比对在 `.codex-tmp/a3-cover/`。隔离服务已停止，fixture 与日志保留。
- `docs/agent-ops/current-state/app-operating-manual.md:35` 起已补 §一 封面入口、真相块、单原图双框、导出、退档与 API 用法。文档 INDEX/object inventory 按现有生成器更新。
- 既有 PUT 整段源码锁因本单 canonical 适配续记，保留完整 hash 断言；逆变换精确恢复旧 card 基线。没有修改产品授权写门/注册表/Agent 机关。没有新依赖、安全对抗新例、TextFlow schema 或坐标九条改动。

### 未做项 / HQ 收口

1. git 检查与 secrets 扫描两组件留 HQ；未进行 add/commit/push/PR/merge 或 `.git` 写入。
2. 在可执行的 Python/MinerU 环境复跑上述 server 两失败项。
3. 实机原图上传/page 取景与真实打印输出尚未验收：浏览器自动审批拒绝测试图片上传（理由为用户未授权），未绕过；CUA 标签面未显示原生打印预览。对应双框往返/衬底/打印组件测试已通过，不等同实机完整通过。
4. 主观验收与最终放行留 HQ。原始日志全部留 `.codex-tmp/a3-cover/`，蒸馏件在本单指定 audit 目录。
