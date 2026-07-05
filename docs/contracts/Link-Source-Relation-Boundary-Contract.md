> **状态 (Status)**: deferred
> **层 (Layer)**: 契约 / Contract
> **日期 (Updated)**: 2026-06-23
> **权威 (Authoritative)**: 否
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# Link / SourceReference / ObjectRelation Boundary Contract

**状态**：V2.BN.6 合同
**用途**：防止 navigation、evidence、semantic relation 三类对象混淆。

## 1. 三分法

```text
Link = navigation
SourceReference = provenance / evidence
ObjectRelation = semantic relation
```

### Link / InternalLink

回答：

```text
去哪里看？
```

目标可以是：

- note；
- page；
- section；
- NoteBlock；
- source view；
- future graph / frame / view target。

### SourceReference

回答：

```text
凭什么说？
```

它连接内容与 evidence / provenance。

### ObjectRelation

回答：

```text
两个对象是什么语义关系？
```

例子：

- derives_to；
- supports；
- prerequisite_of；
- example_of；
- contradicts；
- summarizes；
- elaborates。

## 2. 共存规则

一个 NoteBlock 可以同时拥有：

- body link；
- source reference；
- object relation；
- visual connector。

但它们不能自动互相创建。

规则：

- 点击跳转不自动代表证据；
- 证据引用不必须显示成正文链接；
- 语义关系不必须显示成可见线；
- visual connector 不自动等于 semantic ObjectRelation；
- GraphRAG discovered edge 不自动等于 user-confirmed ObjectRelation。

## 3. Visual Connector / CanvasEdge

CanvasEdge / CanvasConnector 是视觉连接或交互对象。

用户画线可能只是：

- 草稿；
- 演示箭头；
- 图示；
- 暂时连接；
- relation candidate。

只有当用户确认 relation type、endpoint、direction、lifecycle 后，才应该创建或更新 ObjectRelation。

## 4. Relation Truth 与 Render

Relation truth 不等于 relation render。

```text
Relation Truth
  保存正式关系事实。

Relation View Layer
  决定哪些关系显示、属于哪一层、样式是什么。

Relation Render Budget
  决定当前缩放/视野/筛选条件下渲染多少关系。
```

数据面可以保存关系，但显示面不需要全量渲染关系。

## 5. CandidateRelation

AI / GraphRAG / import adapter 发现的关系默认是 candidate/proposal。

```text
GraphRAG output
  -> relation candidate / query result / index

User confirmed relation
  -> ObjectRelation truth
```

这条规则用于避免把 Coincides 从精加工信息处理中台变成无限增殖关系垃圾场。

## 6. 后续版本边界

V2.BN.6 只定义边界。

RelationType / RelationGroup / RelationPack / lifecycle / relation inspector / local graph / supernode folding 属于 V2.BN.11+ 及后续 relation 阶段。
## 7. 2026-06-18 GroupFolder Boundary Addendum

`GroupFolder` is organization and view scope, not relation truth.

```text
GroupFolder
  where ContentGroups are organized
  what Gallery scope is open
  what local relation graph boundary is active

ObjectRelation
  durable semantic relation truth
```

Opening a relation graph from a GroupFolder should only set the current view boundary. It must not create, delete, or rewrite ObjectRelation records by itself.

Rules:

- GroupFolder containment is not `supports`, `derives_to`, `example_of`, or any other semantic relation.
- Moving or copying a GroupFolder changes organization only.
- Temporary AI projection folders may collect references for one view, but they do not become relation truth unless the user explicitly confirms relations later.
- SourceReference remains provenance/evidence; Link remains navigation; ObjectRelation remains semantic truth.
