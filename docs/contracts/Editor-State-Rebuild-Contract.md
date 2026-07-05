> **状态 (Status)**: deferred
> **层 (Layer)**: 契约 / Contract
> **日期 (Updated)**: 2026-06-23
> **权威 (Authoritative)**: 否
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# Editor State / Rebuild / Undo Contract

**状态**：V2.BN.6 合同
**用途**：定义哪些状态属于 editor runtime，哪些状态属于可持久化 truth，哪些派生状态可以重建。

## 1. Editor State

Editor state 是交互状态，不是内容 truth。

例子：

```text
selected block
hovered block
focused field
drag ghost
resize ghost
slash menu open
preview popover open
overlay toggles
layout mode active
relation mode active future
temporary snap guide
temporary collision draft
```

这些状态可以帮助编辑，但不应该进入 export 或 AI context。

## 2. 持久化边界

### 必须持久化

- NoteBlock content；
- FieldValue；
- TemplateVariant identity；
- Placement / BlockBox；
- export role；
- AI visibility；
- SourceReference；
- ObjectRelation；
- user confirmed source/relation/template changes。

### 可以 session 存活

- selected block；
- active sidebar / inspector tab；
- overlay toggles；
- preview panel open；
- current viewport；
- zoom level；
- layout mode active。

### 可以关闭页面后丢失

- hover；
- drag ghost；
- resize ghost；
- slash menu open；
- transient guides；
- temporary selection rectangle；
- collision draft。

### 必须进入 undo/redo

- content edit；
- field value edit；
- block create/delete；
- placement move/resize；
- source reference add/remove；
- export/AI visibility change；
- template variant conversion；
- confirmed relation edit future。

### 不应该进入 export / AI context

- selection；
- hover；
- drag ghost；
- preview popover；
- layout mode active；
- overlay debug state。

## 3. OperationBatch / Undo

`operation_batches` 当前是 operation audit seed，不等于完整 undo/redo truth。

未来 undo/redo 需要：

- stable operation kind；
- before/after payload；
- affected object ids；
- user/session provenance；
- reversible or non-reversible marker；
- dangerous action marker；
- tombstone/recovery hooks。

## 4. Rebuild 行为

可以重建：

- `plain_text` from canonical content / field values；
- preview overlay from placement/source/relation/template state；
- SourceChain health from source references, source versions, tombstones；
- adapter index；
- GraphRAG sidecar index；
- source reconstruction candidates；
- frame thumbnails / covers future。

不能被静默重建覆盖：

- user-confirmed NoteBlock content；
- user-confirmed FieldValue；
- SourceReference truth；
- ObjectRelation truth；
- TemplateDefinition truth；
- SourceVersion truth。

## 5. Adapter Rebuild 边界

Adapter rebuild 只能生成：

```text
candidate
proposal
projection
index
cache
```

它不能绕开用户确认流程覆盖 Coincides Core truth。
## 6. 2026-06-18 GroupFolder / Gallery Rebuild Addendum

Persistent GroupFolder state is organization truth, not transient editor state.

Must persist:

- user-created GroupFolder;
- system Project / Note root GroupFolder;
- saved AI projection GroupFolder;
- ContentGroup placement in a GroupFolder;
- folder title, parent folder, order, origin, and status.

Can be transient:

- open / collapsed Gallery panel state;
- selected folder row;
- drag ghost while moving a group into a folder;
- temporary AI projection before the user saves it.

Rebuild rules:

- Missing system Project / Note root folders may be rebuilt from Project / Note ownership.
- Temporary AI projection folders may be discarded when not saved.
- Folder path can derive browsing depth and relation-view scope.
- Rebuilding folder previews must not rewrite ContentGroup member references, source provenance, or ObjectRelation truth.
