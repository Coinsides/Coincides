> **from**: claude(Main_Designer)
> **to**: 临时工程对话1(builder)
> **status**: ready
> **单号**: VPS-F6 · 桥后遗症两修单(Reconcile 同源误判 + Note Proposal 引用错配)
> **上游**: Tester(1) round-02 中途报(A-10/A-11 候选,版本 a74ccd71 实测);两者均为桥通后首次走通的既有路径上的病

# VPS-F6 · 桥后遗症两修单

## 一 · 修一:Reconcile 同源判定把两个 null 当同一文档

- **现象**(Tester 实测):30 组提案全误报——24 组 OVERLAP 把**两份不同 PDF**配对,理由却是「page ranges overlap within the same source document」;另 6 组 SAME_CONCEPT 是同一 md 同一 segment 的标题片段配自己的正文片段。
- **根因**(Tester 已定位):桥接材料 document_id 全为 null,`materialReconciliationProposals.ts` 约 :424 的 `left.document_id !== right.document_id` 在两边都 null 时判为「同一文档」。
- **修法**:同源身份改为**来源恒等键** = document_id 与 source_record_id 的组合(或经 source_material_id 回溯),null≠null;**同 segment 自配对排除**(标题片段 vs 自身正文片段不构成 SAME_CONCEPT);slice(0,30) 截断保留(噪声修掉后自然不挤)。
- **测试**:①两份不同 Source 的桥接材料→零 OVERLAP(阳性对照:退回旧判定→误报重现);②同一 Source 内真实页重叠→仍报(别把真的修没了);③同 segment 自配对→排除;④documents 旧路行为不变。

## 二 · 修二:Note Proposal 每块引用全相同(fallbackRefs 挂满全体)

- **现象**(Tester 实测):23 块的 source_references 完全相同=全体 segment 的前 3 个引用;英文 Source 的块也引中文 PDF。
- **侦察+修法**:查 `organizedNoteProposals` 引用装配——fallbackRefs 不应无条件挂到每块;改为**每块引用=真正喂了该块的 segment/fragment 的引用**;仅当某块零引用时才用兜底,且兜底要申报形状(宁可空也别错配,方向候你侦察后在回执申报)。
- **测试**:多源提案→各块引用与其来源 segment 对应、互不相同;零引用块的兜底行为断言;单源路径回归。

## 三 · 验收与测试面

服务端定向(reconciliation/proposals 家族+新用例)正门运行器;阳性对照≥1;⛔真实模型调用(AI 模式走确定性/mock);⛔全库马拉松。

## 四 · 纪律

照抄现役全套(⛔git 写/⛔.env 值/⛔用户库/⛔动锁文件/⛔安全对抗类用例/合成值规矩/措辞中性)。

## 五 · 回执协议

本文件尾部 `## Result` 五件套;证据 `docs/audits/2026-11-01-vps-f6-builder/`;完工短讯。

## 六 · 不在射程

Reconcile/Proposal 的 UI 与文案(🅱 批);「Note Proposal 只取 Map 已采纳材料无提示」(🅱 批);材料区上传后刷新(🅱 批);向量检索版。
