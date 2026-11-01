> **from**: claude(Main_Designer)
> **to**: 临时工程对话1(builder)
> **status**: ready(§232 裁定⑤预批件,F3 段二收口后自动放行)
> **单号**: VPS-F5 · Agent 源料发现低配单(A-02 低配版)
> **上游**: F3 段一侦察第四问+Tester round-01 A-02/C-02;完整向量/FTS 版=独立单候裁⛔混入

# VPS-F5 · Agent 源料发现低配单

## 一 · 修一:search_documents 增 Source 路

- 对 Source 来源的 material fragment 做 LIKE 检索 + 按 Source display_name 匹配;结果带 `projection_note_id`,让 Agent 自然接既有 `read_note` 工具读全文;
- 结果形状与 documents 路并列清晰(来源可辨),⛔伪装成 documents 行;
- 无材料/未物化时结果为空属正常,⛔报错。

## 二 · 修二:system-prompt 误导句修正

- `agent/system-prompt.ts:38` 一带:删除「Source Library 内容检索不到/经材料库上传」的死指引;改为如实描述现有能力(可按名称/内容检索已放置的 Source 材料,可用 read_note 读其投影笔记);
- 全文巡一遍 system-prompt 中与本次能力变化相矛盾的句子,一并对齐,逐处申报。

## 三 · 验收与测试面

- 服务端定向:executor/search 相关+新用例(Source 命中带 projection_note_id/documents 行为不变/空库不报错);正门运行器;
- 阳性对照一处(Source 路摘除→新用例独红);
- ⛔真实模型调用(工具层 mock);真机验收归 Tester round-02 的 R2-02。

## 四 · 纪律

照抄现役全套(⛔git 写/⛔.env 值/⛔用户库/⛔动锁文件/⛔安全对抗类用例/合成值规矩/措辞中性)。

## 五 · 回执协议

本文件尾部 `## Result` 五件套;证据 `docs/audits/2026-11-01-vps-f5-builder/`;完工短讯。

## 六 · 不在射程

向量/FTS 检索版(独立单候裁);Agent 工具新增;UI 改动;文案批其余。
