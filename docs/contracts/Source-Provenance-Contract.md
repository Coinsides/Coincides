# Source / Provenance Contract

**状态**：V2.BN.6 合同
**用途**：定义 Source 不只是外部文件，而是 evidence chain / provenance graph。

## 1. 核心原则

Source 回答：

```text
这段内容凭什么说？
它来自哪里？
它经过了哪些内部加工路径？
```

Source provenance 不是 semantic ObjectRelation，也不是 body link。

## 2. Source 对象

### SourceDocument

来源身份，例如：

- textbook.pdf；
- research-report.docx；
- web article；
- handwritten note PDF；
- image；
- code file；
- user draft report。

### SourceVersion

某个 SourceDocument 在某一时刻的具体快照。引用必须指向具体 version，不应指向会静默变化的模糊文件。

### SourceArtifact

Coincides 内部可被引用对象：

- Note；
- Report；
- Section；
- NoteBlock。

### SourceReference

某个 NoteBlock / Note / Relation / Section 对 source target 的引用。

target 可以是：

```text
external SourceVersion
internal SourceArtifact
```

### SourceUsage

记录 source 被哪些 Project / Course 使用。

```text
uploaded_in
used_via_citation
```

### SourceChain

可追踪：

```text
direct source
root source
full internal processing chain
```

### SourceTombstone / DeletedSourceRecord

source 或 internal artifact 删除后保留的最小恢复与警告记录。

## 3. Source 状态

```text
active
changed
outdated
deprecated
archived
deleted
missing
broken
degraded
recovered
```

`missing` 可以表示用户在文件层面删除了 snapshot。系统应标记 degraded / broken，而不是崩溃。

## 4. 操作边界

```text
Remove source reference
  只移除当前 block 的某一条 source reference。

Clear all source references
  清空当前 block 的全部来源引用。

Archive source document
  归档 source，不破坏已有引用链。

Deprecate source version
  标记旧版本不推荐继续使用。

Delete source document/version
  危险操作。必须影响预览 + 二次确认 + broken/degraded warning。
```

删除 SourceReference 不等于删除 source object。

## 5. Source Intent / Raw Source 类型

Source import 不能只看文件类型，还要看意图。

```text
unprocessed_evidence
condensed_note
agent_briefing
human_interpretation_note
draft_report
final_report
reasoning_trace
archive_only
```

第一版 ImportMode：

```text
evidence_source
reconstruct_existing_note
archive_only
```

Condensed raw source 仍然是 raw source。它只是已经被人类或 AI 加工过，因此默认处理策略是 preserve-first，而不是 summarize-first。

## 6. Internal Source

用户可以把已有 Note / Report / NoteBlock 作为后续内容的 source。

第一版内部引用颗粒度：

```text
whole note/report
NoteBlock
```

不做：

- block 内句子级 range；
- rich text offset tracking；
- external PDF bbox/paragraph range 的完整用户操作。

## 7. 与 Relation / GraphRAG 的边界

Source chain 是 provenance graph。

ObjectRelation 是 semantic graph。

GraphRAG 可以读取 source provenance 作为 evidence input，但不能把 source chain 自动当作用户确认的 semantic relation。
