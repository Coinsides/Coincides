# 2026-06-22 ContentGroup Shell Gap Matrix And Version Proposal

## 一句话结论

下一步最值得做的是 Gallery 壳体对齐，然后做 Rail，最后只做 Single Editor 的非 Canvas 精修壳。完整 workbench / projection / canvas object 继续留到 8.8+。

OpenDesign 可以照搬视觉方向和信息层级，但实现顺序必须服从当前数据层成熟度。

## 1. 决策原则

本报告按三个问题判断每个壳功能：

- 当前是否有真实数据支撑？
- 它是否符合 surface 分工？
- 它会不会把 8.7 偷偷拖进 CanvasObject / Graph / SourceArtifact 大坑？

推荐分类：

- build now：现在就值得做真实功能或壳体。
- adapt now：借用原型心智，但按当前系统改写。
- reskin only：行为保留，只换更清楚的表达。
- document and defer：记录下来，等后续版本。
- reject / mock only：只适合原型，不进入产品。
- needs Henry decision：需要产品判断再动手。

## 2. Gap Matrix

| surface | shell feature | current support | data readiness | product value | cost | risk | recommendation | target |
|---|---|---|---|---|---|---|---|---|
| Gallery | 资源管理器式左侧 folder tree | 已有 folder tree 和 entity folder | 高 | 高 | 中 | 低 | build now | 8.7.5 |
| Gallery | 顶部 search / New folder / New group / Back | 已有对应能力但布局不同 | 高 | 高 | 低 | 低 | adapt now | 8.7.5 |
| Gallery | Folder / Topic / Role tabs | 当前已有三种 GalleryMode | 高 | 高 | 低 | 低 | reskin only | 8.7.5 |
| Gallery | All view | 原型没有主 tab，但 Rail 有 All；当前 Gallery 可搜索/按 scope | 中 | 中 | 低 | 中 | needs Henry decision | 8.7.x |
| Gallery | role tab 贴在 card 顶部 | 当前有 role 信息 | 高 | 高 | 低 | 低 | build now | 8.7.5 |
| Gallery | topic dot / source note / status chip | 当前已有 topic/source/stability 信息 | 高 | 高 | 中 | 低 | build now | 8.7.5 |
| Gallery | saved graph scopes | 当前不做 graph scope runtime | 低 | 未来高 | 高 | 高 | document and defer | 8.8+ |
| Gallery | cross-project review folder | 组织心智有价值，完整跨项目复用未成熟 | 中 | 中 | 中 | 中 | adapt now as folder only | 8.7.5/8.7.x |
| Rail | folder path bar | 当前有 folder context，但视觉弱 | 高 | 高 | 低 | 低 | build now | 8.7.6 |
| Rail | New group draft with drop zone | 当前有 create/drop 能力 | 高 | 高 | 中 | 低 | adapt now | 8.7.6 |
| Rail | compact group rows with role/status/topic strip | 当前有 group row，但表达粗糙 | 高 | 高 | 中 | 低 | build now | 8.7.6 |
| Rail | Folder / Topic / Role / All tabs | 当前未形成完整 Rail view mode | 中 | 中 | 中 | 中 | needs Henry decision | 8.7.6/8.7.x |
| Rail | search/filter row | 可能部分存在或可补 | 中 | 中 | 中 | 中 | adapt carefully | 8.7.6 |
| Rail | expanded group drop zone + Open editor | 当前已有类似行为 | 高 | 高 | 低 | 低 | reskin only | 8.7.6 |
| Rail | full folder manager inside Rail | 原型不做完整管理，当前也不应做 | 中 | 低 | 高 | 高 | reject / mock only | none |
| Single Editor | header with title, role, topic, saved state | 当前有 identity 编辑能力 | 高 | 高 | 中 | 低 | build now | 8.7.7 |
| Single Editor | summary bar | 当前有 summary，但表达可更清楚 | 高 | 高 | 低 | 低 | adapt now | 8.7.7 |
| Single Editor | Petal dock / Petals panel | 当前 Petal 能力真实存在 | 高 | 高 | 中 | 中 | adapt now | 8.7.7 |
| Single Editor | Source / evidence drawer | 当前只有轻量 source 信息 | 中 | 中 | 中 | 中 | adapt lightly | 8.7.7 |
| Single Editor | free canvas workbench | 当前没有完整 CanvasObject 基础 | 低 | 高 | 高 | 高 | document and defer | 8.8+ |
| Single Editor | draggable member material as canvas object | 当前 member 可拖放/分配，但不是 CanvasObject | 中 | 高 | 高 | 高 | defer full version | 8.8+ |
| Single Editor | inline petal highlight inside source text | doctrine 不允许把 Petal 做成 source Label | 中 | 中 | 中 | 高 | adapt only inside group member material | 8.7.7/8.8 |
| Cross-surface | preserve note_id/folder_id/group_id | 当前已有基础 | 高 | 高 | 低 | 低 | build now | 8.7.5-8.7.7 |
| Cross-surface | preserve mode/query/member/petal selection | 当前不完整 | 中 | 中 | 中 | 中 | adapt incrementally | 8.7.x |
| Reuse | Reference / Duplicate / Fork / Materialize UI | 服务语义存在，但产品 UI 未定 | 中 | 高 | 高 | 高 | document and defer | 8.8+ |
| Projection | ContentGroup tile / mini editor on canvas | 需要 CanvasObject | 低 | 高 | 高 | 高 | document and defer | 8.8+ |

## 3. 当前产品有、但壳没有充分表达的东西

这些不能在套壳时丢掉：

- Entity-backed ContentGroup / GroupFolder / Member / Petal。
- Member 与 source range 的边界。
- Petal 是 group 内部结构，不是 source label。
- folder placement 不改变 source truth。
- stability / sync 状态。
- hard delete member 后级联清理相关 Petal fragment 的原则。
- Reference / Duplicate / Fork / Materialize 的服务语义，哪怕 UI 暂时不放出来。

OpenDesign 壳负责让这些东西可见，但不能替换它们。

## 4. 建议版本顺序

### 8.7.5: Group Gallery Shell Parity

目标：

- 把 Gallery 做成真正像资源管理器的第一屏。
- 对齐 OpenDesign 的 folder tree、top actions、mode tabs、card hierarchy。
- 不引入 Graph scope runtime。
- 不做 CanvasObject / projection。

主要内容：

- folder tree 视觉密度和当前选中状态。
- header search / new folder / new group / back。
- card role tab、topic signal、source note、status chip。
- empty/loading/error 状态。
- 当前 folder target 状态条。

为什么先做：

Gallery 的数据最稳，entity folder 已经存在，最能立刻把 ContentGroup System 的成熟感展示出来。

### 8.7.6: Groups Rail Shell Parity

目标：

- 让 Rail 更像轻量 collect 面板。
- 增强 folder path、drop zone、group row 的可理解性。
- 保持不打扰自然写作。

主要内容：

- folder path bar。
- new group draft/drop selected content。
- group row topic strip / role badge / status chip。
- expanded group drop zone + open editor。
- 搜索/筛选如果做，要非常克制。

需要 Henry 决定：

- Rail 是否加入 Folder / Topic / Role / All tabs。
- Rail 的 All 是否会让用户把它当 Gallery 用。

### 8.7.7: Single Editor Non-Canvas Refinement Shell

目标：

- 不重写成完整 Canvas。
- 只把现有 refine 能力表达得更清楚。

主要内容：

- header identity chips。
- summary bar。
- member material 的卡片化表达。
- Petal dock / Petal panel。
- lightweight source drawer。
- 保存状态和返回上下文。

明确不做：

- 真正自由画布。
- CanvasObject member material。
- projection tile。
- graph relation。

### 8.8+: CanvasObject / Projection / Workbench

目标：

- 处理 ContentGroup 作为 canvas object / projection / reference / materialization 的完整体验。

可能内容：

- ContentGroup tile。
- mini editor。
- reference into textflow。
- materialize to blocks。
- duplicate/fork/open original selector。
- cross-note/cross-project reuse。
- source anchor refresh/apply-back 策略。

## 5. 下一步推荐

建议下一小版本直接定为：

```text
V2.BN.8.7.5 - ContentGroup Gallery OpenDesign Shell Parity
```

原因：

- Gallery 是 organize surface，最适合承接资源管理器壳。
- 当前 entity folder / group / member / petal 已经足够支撑 Gallery 展示。
- 视觉收益最大，工程风险最低。
- 做完 Gallery 后，Rail 和 Single Editor 的视觉语言会自然有基准。

不建议下一步直接重写 Single Editor。它现在最容易误入 CanvasObject workbench，而这个边界应该留给 8.8+。
