> **状态 (Status)**: draft(候 A2b 收口后派发)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 主线 · 14.1-A3a · 提案族服务端统一(枚举合并+proposal_issued+organized_note 入 chat)
> **上游**: plan §14.1 提案族段+裁定书③(create_proposal=C 自域,补 proposal_issued)+census §4.16
> **射程裁定(HQ)**:board_arrangement/note_patch 两新型**⛔本单**——其预览/采纳面按 plan 归 14.3(装卸区)/14.4(差异预览),无面先立型=违"可见"不变量;chat 提案的通用可见面按 Henry 既裁归 Staging 谈判桌(V14 整体批),过渡面⛔造。

# 14.1-A3a · 提案族服务端统一

**性质**:提案数据层的族谱归一。现状=agent chat 5 型(executor create_proposal 直写 proposals 表)与材料库 3 型(proposals 路由三专用创建)两套词汇两套写路。本单:**统一枚举+统一创建 service+事件接线+organized_note 开放给 chat**。零新提案型,零新 UI。

## 一 · 统一枚举与创建 service

1. **型枚举归一**:盘点两族现型(agent 5 型以 executor E:222–241 实际接受值为准;材料 3 型=material_map/organized_note/material_reconciliation),合并为 shared 单一闭集(shared/types 落点申报);server 校验两路同吃此枚举;**⛔改任何现型的 data 契约**;
2. **统一创建 service**:`services/proposals.ts`(或既有文件扩展,申报)出 `createProposal(db, userId, input)`——材料三专用创建内部改调它(专用校验保留在各自入口,落库层归一);executor create_proposal case 同调它;
3. **proposal_issued 事件接线**(裁定书③):统一创建 service 内=INSERT proposals 与 `recordEvent(verb: proposal_issued)` 同事务(词已在闭集,census §5.2 记未接);actor 按来源:chat 路=agent、人门路=human(via 对应);⛔收据(提案 pending 本身≠执行,细则口径:pending 对下游=不存在)。

## 二 · organized_note 入 chat 枚举(plan 原文:零新直写路径的第一扩面)

1. executor create_proposal 的可受理型加入 `organized_note`——复用既有 `createOrganizedNoteProposal` service(R/proposals.ts:88 所调者),⛔第二套实现;
2. chat definitions 的 create_proposal 参数枚举同步;
3. 既有 organized_note 的人门创建/预览/apply 流零变(它已有 CourseDetail 完整面,"可见"不变量已满足——这正是它先行扩面的原因)。

## 三 · 台账/禁区/验收(照 A2 常备)

零新增挂载期 API;client 全库必跑;server 全量必跑(Python/MinerU 环境红按例申报)。禁区:⛔board_arrangement/note_patch;⛔新 UI/过渡提案面;⛔改现型 data 契约;⛔判断域;⛔改机关本体;⛔新设计安全对抗类用例(既有回归照跑零排除);⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;新造凭据形合成值 ≤20 字符(域数据不在射程)。

验收:1) 三端 typecheck/build+全门绿;2) 定向:①两族型全过统一枚举(非法型两路同拒)②材料三入口行为零变(既有 proposals 测试全绿)③chat 建 organized_note 提案→pending 行+proposal_issued 事件(actor=agent)→人门 CourseDetail 流 apply 可达(API 级)④proposal_issued 两路 actor 正确;3) server 全量+client 全库;4) 证据落 `docs/audits/2026-09-14-a3a-proposal-builder/`(⛔构建产物⛔原始日志);git/secrets HQ 收口。

## 四 · 申报义务

Result 必含:交付清单+numstat、枚举落点与两族现型盘点、统一 service 落点、事件接线口径、chat organized_note 参数形状、测试数字、未做项。冲突停线举证⛔自作主张。
