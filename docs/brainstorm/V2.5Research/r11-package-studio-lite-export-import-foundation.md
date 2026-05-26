# R11 - Package Studio Lite / Export-Import Foundation

**Created**: 2026-05-23
**Status**: Research complete for Group 4
**Scope**: v2.5.5 Package Studio Lite + `.coincides` package foundation

---

## 1. 总览

R11 的核心问题是：

```text
Coincides 的模板、source、canvas、relation、proposal、package 如何成为可分享、可导入、可恢复的工程文件？
```

建议方向：

- v2.5.5 做 Package Studio Lite，不做完整 marketplace。
- 建立 `.coincides` package 的最小概念。
- 将 package 分为 Light / Trusted / Full 三档。
- 导出/导入必须先 preview，再 apply。
- source inclusion 必须可选：omit、reference、snapshot、bundle。
- visual projection 和 semantic truth 必须分开恢复。
- broken CanvasEdge、missing source、stale ObjectRelation 都必须在 import preview 中可见。

R11 是模板生态从“本机可用”走向“可迁移、可分享、可备份”的第一步。

---

## 2. 为什么需要 Package Studio Lite

到 v2.5 以后，Coincides 里会有很多对象：

- TemplateDefinition；
- CompositionTemplate；
- DomainBlockSet；
- NoteBlock；
- SourceSnapshot；
- SourceAnchor；
- SourceScope；
- SourceBoard；
- CanvasNode；
- CanvasFrame；
- CanvasEdge；
- ObjectRelation；
- RelationLayer；
- Proposal；
- OperationBatch。

这些对象之间存在复杂关系。

如果只导出 PDF、PNG、HTML，用户得到的是结果，不是可编辑工程。

如果要像 XMind 那样分享可编辑工程文件，Coincides 需要 `.coincides` package。

但 v2.5.5 不应该一口气做完整工程文件系统。它应该做 schema-first 的 Package Studio Lite，让导出/导入有可验证的边界。

---

## 3. `.coincides` Package 的最小概念

`.coincides` 应该是一个可验证的 bundle，而不是单个神秘 JSON。

概念结构：

```text
package.coincides/
  manifest.json
  templates/
  compositions/
  domain_sets/
  notes/
  sources/
  canvas/
  relations/
  proposals/
  previews/
  metadata/
```

实现上可以先是一个 zip-like archive，也可以先是目录结构或 JSON bundle。

关键不是文件格式，而是 package contract：

- 有 manifest；
- 有内容清单；
- 有版本兼容；
- 有 source inclusion policy；
- 有 import preview；
- 有 validation warnings；
- 有 recovery metadata。

---

## 4. Light / Trusted / Full Package Levels

建议三档：

### Light Package

适合分享模板、composition、domain sets。

包含：

- PackageManifest；
- TemplateDefinitions；
- CompositionTemplates；
- DomainBlockSets；
- optional preview examples；
- no private sources；
- no user notes；
- no canvas project。

用途：

- 分享医学模板包；
- 分享数学 formula sheet composition；
- 分享游戏资料整理模板。

### Trusted Package

适合分享可复用工作区结构。

包含：

- Light Package 内容；
- canvas/view presets；
- relation layer presets；
- example source scopes or synthetic sample notes；
- optional source snapshots if user approves；
- no private provider keys；
- no executable code。

用途：

- 团队内部分享课程模板；
- 个人设备间迁移一个结构化工作区；
- 分享一个可演示的模板工程。

### Full Package

适合完整工程备份或设备间转移。

包含：

- notes；
- source snapshots；
- source anchors/scopes；
- canvas nodes/frames/edges；
- object relations；
- proposals and operation history；
- recovery metadata。

用途：

- 本地完整备份；
- 迁移到另一台电脑；
- 保留可追溯 source + canvas + relation 的工程状态。

Full Package 风险更高，必须有强 preview。

---

## 5. Source Inclusion Choices

source 是 Coincides 的可信度核心，所以 package 必须明确 source 怎么处理。

推荐选项：

```text
omit
  -> 不带 source，只保留模板/结构

reference_only
  -> 保留外部文件名、URL、document id、hash、metadata

snapshot_text
  -> 带 source snapshot text/page-like content

snapshot_media
  -> 带 PDF/web/media snapshot，未来功能

bundle_original
  -> 带原始上传文件，风险最高
```

默认策略：

- Light Package 默认 omit；
- Trusted Package 默认 reference_only 或 snapshot_text；
- Full Package 可选择 snapshot_text / bundle_original；
- provider keys 永远不进入 package；
- private credentials 永远不进入 package；
- original files 需要明确授权。

---

## 6. Import Preview

导入不能直接落库。

必须先生成：

```text
PackageImportPreview
```

Preview 应显示：

- package identity；
- trust level；
- app compatibility；
- contents summary；
- templates to add；
- templates with conflicts；
- compositions to add；
- sources included / missing；
- canvas objects included；
- relations included；
- broken edges；
- stale bindings；
- missing source anchors；
- required features not available；
- recommended actions。

用户确认后才 apply。

---

## 7. Recovery Rules

Package import 可能不完整。

必须把 visual continuity 和 semantic continuity 分开处理。

### CanvasNode

如果 target object 存在：

- restore normally。

如果 target object missing：

- import as orphan projection with warning；
- or skip if user chooses strict import。

### CanvasEdge

如果 source/target CanvasNode 都存在：

- restore visual edge。

如果一端缺失：

- restore as incomplete/broken visual edge；
- do not create ObjectRelation。

### ObjectRelation

如果 source/target semantic objects 都存在：

- restore relation。

如果缺失：

- mark broken_relation / recovery needed；
- do not silently downgrade to CanvasEdge truth。

### SourceAnchor / SourceScope

如果 snapshot/page exists：

- restore jump target。

如果 source missing：

- mark missing source；
- keep metadata for possible repair。

### TemplateDefinition

如果 exact template exists：

- link。

如果 same key different version：

- conflict preview。

如果 missing：

- import template or mark unresolved。

---

## 8. Package Studio Lite UI

v2.5.5 的 Studio 不需要复杂，但需要清晰。

最小 UI：

```text
Package Library
  -> local packages / installed packages / drafts

Package Detail
  -> manifest, contents, compatibility, trust, warnings

Create Package
  -> choose Light / Trusted / Full

Content Picker
  -> choose templates, compositions, domain sets, notes, sources, canvas

Source Inclusion Picker
  -> omit / reference / snapshot / bundle original

Export Preview
  -> what will be included, what will be omitted

Import Preview
  -> conflicts, missing pieces, recovery warnings

Apply Import
  -> creates operation batch and records package import
```

这应该是高级入口，不应该出现在普通写笔记流程里。

---

## 9. Headless Engine Relationship

R11 与前面的“底层引擎独立，产品界面先内嵌”原则直接相关。

Package Studio Lite 应该只是 UI。

真正核心应该是 headless services：

```text
validatePackageManifest
buildExportPreview
buildImportPreview
resolvePackageConflicts
applyPackageImport
recordPackageOperation
```

未来如果 Template / Package Studio 被拆成独立工具，这些能力可以复用。

主应用负责使用模板和 package。

Studio 负责制作、审阅、导入导出。

Engine 负责验证和执行安全规则。

---

## 10. v2.5.5 应该实现什么

建议 v2.5.5 实现：

- package level concept: Light / Trusted / Full；
- `PackageManifest` runtime validation；
- export preview；
- import preview；
- source inclusion policy；
- conflict detection；
- package operation batch；
- broken visual/semantic binding warnings；
- Package Studio Lite minimal UI；
- docs and tests。

v2.5.5 不应该实现：

- remote marketplace；
- executable plugins；
- paid distribution；
- social/community features；
- full original-file bundling by default；
- full rollback UI；
- full graph-native import/export；
- complete `.coincides` binary/archive optimization。

---

## 11. Test Plan Implications

自动测试应覆盖：

- Light package preview includes templates but not private sources；
- Trusted package can include source snapshots when selected；
- Full package preview lists notes/canvas/relations/proposals；
- provider keys are excluded；
- incompatible package reports warning；
- template key conflict produces import preview warning；
- missing source anchor reports recovery warning；
- broken CanvasEdge imports as visual broken/incomplete, not ObjectRelation；
- missing ObjectRelation endpoint blocks semantic relation restore；
- import apply writes operation batch；
- discard preview mutates nothing。

Browser smoke 可覆盖：

- create Light package from templates；
- preview export；
- import same package into local environment；
- see conflicts；
- apply import；
- verify templates appear。

---

## 12. Graph-Native 迁移启发

Package 是 future graph-native 的重要边界对象。

可能的节点：

```text
(:PackageManifest)
(:PackageImport)
(:PackageExport)
(:PackageObject)
```

可能的边：

```text
(:PackageManifest)-[:CONTAINS]->(:TemplateDefinition)
(:PackageManifest)-[:CONTAINS]->(:NoteBlock)
(:PackageImport)-[:CREATED]->(:OperationBatch)
(:PackageObject)-[:RESOLVES_TO]->(:NoteBlock)
```

v2.5 应记录：

- package 中哪些对象是 canonical truth；
- 哪些对象是 projection；
- 哪些对象可以 rebuild；
- 哪些对象缺失会导致 degraded import；
- semantic relation 如何在导入时保真或降级。

---

## 13. R11 结论

R11 的结论是：

```text
.coincides package 应该先成为可验证、可预览、可恢复的工程包契约。
Package Studio Lite 是内嵌制作/导入导出入口。
底层 package engine 应保持 headless，未来可拆。
```

这让 Coincides 不只是能生成笔记，还能保存、分享、迁移和恢复一整个 source-grounded workspace。

