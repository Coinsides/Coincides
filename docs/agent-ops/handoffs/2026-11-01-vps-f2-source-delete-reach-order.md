> **from**: claude(Main_Designer,原 HQ)
> **to**: 临时工程对话1(builder)
> **status**: done(builder 实现+Main_Designer 验收收口 2026-11-01;旧设计规则「唯一入口在全局库」由 Henry 直令取代,镜头≠身份风险转确认文案承担——设计方核准)
> **单号**: VPS-F2 · Source 删除可达性单
> **上游**: Henry 首日实测;HQ 普查:确认对话(SourceDeleteDialog,含 impact 预检+deletion_blocked 禁用)与永久删除语义**均已存在**,缺口=入口可达性

# VPS-F2 · Source 删除可达性单

## 〇 · 背景

Henry 首日实测:失败的 Source 想删后重传,项目视图删除键是灰的(`SourceDetailDialog.tsx:64-67`:无 onDelete 即 disabled,提示「Delete Sources from the global Source Library」),他没找到全局库那条路 → 判「不能用」。裁定:**凡是看得见一条 Source 的地方,两步内必须能删它**;确认对话保留(用户要有心理准备);删除=完全删除(现语义即是,quarantine 为实现细节)。

## 一 · 修一:项目视图开放删除

- 把删除能力接进项目视图的 Source 详情(onDelete 接线,复用现成 SourceDeleteDialog 与 impact 预检);
- **侦察义务**:查明当初项目视图不传 onDelete 是否有活跃态/设计理由(git blame/注释/测试);若有真实理由(如 materialization 进行中)——那部分用 deletion_blocked 已有机制表达,⛔用「整视图禁删」表达;侦察结论进回执;
- 删除成功后的列表/状态刷新要正确(项目视图上下文)。

## 二 · 修二:死胡同文案清理

- 「Delete Source unavailable here」类指路文案在修一后应消失或仅存于真实受限态;
- 确认对话文案核对:须让用户明白①不可恢复②会连带删除其投影笔记与块(deleteSourceWithCompensation 现实)——若现文案未说清,补清(UX copy:说人话,主按钮措辞与后果一致)。

## 三 · 验收与测试面

- client Sources 定向 vitest + 新用例:项目视图删除全流(开详情→删除→确认→列表移除);失败态(failed)Source 可删;
- 服务端若零涉改则只跑邻接回归申报;
- 阳性对照一处(照前三单样板);⛔真实模型调用;⛔全库马拉松。

## 四 · 纪律(照抄现役)

⛔git 写操作(交工作树,commit 归 HQ);⛔读 .env key 值;⛔用户库;⛔动依赖锁文件;合成值 ≤20 字符或 synthetic-key-not-real-* 标记;⛔新设计安全对抗类用例,既有功能回归明文允许;措辞中性。

## 五 · 回执协议

本文件尾部 `## Result`(五件套);证据落 `docs/audits/2026-11-01-vps-f2-builder/`;HQ 自取。

## 六 · 不在射程

「agent 参与删除」的专用通道(现状:各 agent 以各自认证账号走既有 DELETE API 即可;给 Henry 账号的受控运维通道=候拍另案);回收站/软删设计;Source 结构性改动;批量删除(单条可达先行,批量候 Tester 报告)。

## Result — 2026-11-01 · 临时工程对话1

**执行状态**:`done`(两修面落工作树,未 commit;服务端零涉改)

### 侦察结论:项目视图当初为何不传 onDelete

**是有意的设计规则,不是疏漏,也不是活跃态理由。** 出处(同一提交 `9c5ac435` 2026-07-12「land v2 bn 10.4 and 10.5 source experience and lifecycle closure」引入灰按钮):
- `docs/releases/V2.BN.10.5-Deletion-Receipts-And-Closure-Gate-Plan.md` Task 3:「唯一入口位于 Source Library」;
- 同版 Review §2.3:「唯一用户入口位于全局 Source Library;Project 镜头不提供 Source identity 删除」。
- 文中未写明理由;从模型推得的动机 = **镜头≠身份**:Source 是全局身份,可放进多个 Project;从某个项目里删,删掉的是所有项目里的它,用户可能以为只是「从本项目移除」。
- 唯一的活跃态限制(materialization 进行中)早已由服务端 `deletion_blocked`(parsing/publishing)表达,与入口无关。
- 处置:Henry 11-01 直令(凡看得见即两步内可删)取代该规则;「镜头≠身份」的风险**改由确认对话文案承担**(明说「从所有 Project 移除,不止本项目」+ 显示 placement 数),⛔整视图禁删。注:那两份 10.5 文件属历史层,按规矩未回改。

### 写点(逐文件;4 改 + 1 新,+40/-12)

| 文件 | 改动 |
|---|---|
| `client/src/pages/Sources/ProjectSourcesPanel.tsx` | 接通删除:`deleteSourceId` 状态 + 复用 `SourceDeleteDialog`(impact 预检原样);`confirmDelete` = `deleteSource` → 关两层对话 → `collection.refresh(true)` → `onSourceDeleted?.()` → 成功 toast(与全局库同文);新增可选 prop `onSourceDeleted` |
| `client/src/pages/Courses/CourseDetail.tsx` | 传 `onSourceDeleted={() => void refreshCovers()}`:删 Source 会连带删除其投影笔记,而项目页笔记列表(`/notes?course_id=` 不过滤 `note_class`)是宿主自己拉的,需重拉 |
| `client/src/pages/Sources/SourceDetailDialog.tsx` | `onDelete` 改为**必填**(两处调用方现均传入,以后新入口漏传会被类型系统拦下);删除键不再条件禁用;删掉死胡同文案「Delete Sources from the global Source Library」/「Delete Source unavailable here」 |
| `client/src/pages/Sources/SourceDeleteDialog.tsx` | 文案:标题 → `Delete <name> permanently?`;说明 → 「This cannot be undone. The original file and its extracted note, including that note's blocks, are deleted, and the Source is removed from every Project it is placed in, not only this one.」;影响三格 → `Projects it is removed from` / `extracted note deleted, with its blocks` / `citations in other notes kept as text; their links to this Source stop working`(对应服务端 receipt 降级现实:excerpt 保留、跳转失效)。主按钮「Delete Source permanently」与后果一致,保留;既有 legacy purpose 风险段与「Library purposes…」段原样保留 |
| **新** `client/src/pages/Sources/ProjectSourcesPanel.test.tsx` | 2 条:①项目视图全流——failed(`resource_limit`)Source:列表「Source details」→ 详情「Delete Source」(可用)→ 确认框(断言 impact 请求、「cannot be undone」「removed from every Project」)→ 主按钮 → `DELETE /sources/<id>`,两层对话消失、`refresh(true)`、`onSourceDeleted` 一次、成功 toast;②活跃态:impact `deletion_blocked=true` → 入口可点,确认框显示原因,主按钮禁用,零 DELETE 请求 |

### 测试数字(实跑实报)

- **client 定向**:`npx vitest run src/pages/Sources/ src/pages/Courses/` → **8 files / 70 tests pass**,exit 0。证据 `docs/audits/2026-11-01-vps-f2-builder/client-sources-courses-vitest.log`。
- **阳性对照**:把项目视图的 `onDelete` 换成空函数(恢复「看得见删不了」)→ 新文件 **2/2 红**,exit 1;还原后复绿(即上一条)。证据 `positive-control-project-ondelete-unwired.log`。
- **client 类型检查**:`tsc --noEmit` exit 0 / 0 条。证据 `client-tsc.log`。
- **服务端**:零涉改;邻接回归 `v2SourceLifecycleClosure.test.ts`(删除闭环)正门 **8 pass / 0 fail**,exit 0。证据 `server-adjacent-lifecycle.tap`。
- 首跑新文件 2 fail,原因是本项目 vitest 未装载 jest-dom 匹配器(`toBeEnabled` 等),改用原生断言后转绿,非产品问题。

### 未做清单

- 浏览器真机走查(交 Tester(1) 复测删除流);
- 批量删除 / 回收站 / agent 删除通道(不在射程);
- 删除确认框其余既有文案(legacy purpose 段)仍是英文长句,未重写;
- i18n:本组件族一直用硬编码英文(仅 reprojection 走 `t()`),本单沿用,未迁 i18n。

### 环境申报

1. 工作树新出现未跟踪目录 `docs/brainstorm/field-tests/`,**非本会话产物**(疑为 Tester 会话),未触碰,提请 Main_Designer 知悉以免误入 commit。
2. `CourseDetail.tsx` 文件头含 BOM,编辑后确认 diff 仅 1 处(+5/-1),BOM 保持。
3. 既存未跟踪文件原样保留;未读 `.env`;无 git 写操作;未动依赖/锁文件;无真实模型调用、无用户库接触。

## Main_Designer 收口 — 2026-11-01

- **实质验收**:diff 与回执吻合(4 改 1 新,+40/-12,client-only);复跑 client Sources+Courses **70/70**、tsc 0、服务端邻接 lifecycle **8/8**;阳性对照(onDelete 空函数→2/2 红)照单全收;
- **设计裁定落档**:10.5 的「唯一入口在全局库」规则由 Henry 11-01 直令取代;「镜头≠身份」的真实风险改由确认文案承担("removed from every Project it is placed in" + placement 数)——转移方式核准;历史层文件不回改,正确;
- **顺手的好手筋**:onDelete 改必填让未来新入口漏传被类型系统拦——结构性防复发,记一笔;
- **未做清单核准**:真机走查交 Tester(1) 复测;legacy 文案段与 i18n 迁移=🅱 攒着;
- 部署与 Tester 复测通知随本收口执行。
