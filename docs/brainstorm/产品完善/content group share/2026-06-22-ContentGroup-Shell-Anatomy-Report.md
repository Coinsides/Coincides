# 2026-06-22 ContentGroup OpenDesign Shell Anatomy Report

## 一句话结论

OpenDesign 三个壳最有价值的不是具体 HTML 结构，而是它把 ContentGroup System 的三种心智说清楚了：

- Groups Rail 是写作旁边的收集器，动作要轻。
- Group Gallery 是资源管理器，重点是组织、筛选、定位。
- Single ContentGroup Editor 是精修工作台，重点是 member、petal、source 之间的结构整理。

所以后续可以大胆借用它的视觉语言和信息层级，但不能直接照搬所有交互假设。尤其是 Single Editor 原型里接近 Canvas workbench 的部分，需要等 8.8+ CanvasObject / projection 成熟后再完整落地。

## 1. Group Gallery 壳体拆解

### 可稳定借用的结构

Gallery 原型是一个完整的资源管理器：

- 左侧是 folder tree，强调 Workspace / Groups / Project folders / Note / Chapter / child folder 的层级。
- 顶部是 page header，包含搜索、新建 folder、新建 group、返回入口。
- 主区域有 Folder view / Topic view / Role view 三种视图切换。
- 卡片以网格方式展示 group，每张卡片有 role tab、topic dot、source note、status chip、info icon。
- 底部状态条显示当前 folder、可见 group 数量、当前目标位置。

这套结构非常适合作为 Gallery 的主壳，因为 Gallery 的职责本来就是 organize，而不是直接承载写作。

### 壳体让当前产品更清楚的地方

- Folder tree 明确告诉用户：ContentGroup 可以脱离单篇 note 进行组织。
- Role tab 贴在卡片顶部，让 definition / theorem / example / practice 这些身份成为第一眼能扫到的东西。
- Topic dot 与 source note 放在卡片底部，让用户能同时看到“它讲什么”和“它从哪来”。
- Status chip 把 draft / accepted / archived / rejected 变成轻量状态，不需要用户打开详情页才能判断成熟度。
- 视图切换让 folder、topic、role 三种组织方式并列，而不是把所有筛选都藏在搜索里。

### 需要谨慎处理的假设

- Saved graph scopes 在原型里像 folder 一样出现，但当前 8.7 不应该实现 graph scope runtime。
- Cross-project review 作为 folder 示例可以保留为视觉心智，但真实跨项目权限、source、引用语义不能靠壳硬接。
- 原型里的 grouped list / mock filters 是展示逻辑，不应该直接照搬成真实数据逻辑。
- Gallery 卡片里所有字段都要来自 ContentGroup / GroupFolder / Member / Petal 实体，不要重新制造一个 UI-only truth。

## 2. Groups Rail 壳体拆解

### 可稳定借用的结构

Rail 原型是一个右侧轻面板：

- 面板标题是 Groups，并用小点强调这是当前 note 的 group surface。
- 顶部有 folder path bar，显示当前 group folder 位置。
- 工具行包含新建、搜索、筛选或视图控制。
- 有 Folder / Topic / Role / All segmented view。
- New group draft 区域有标题、role、topic、drop selected content here。
- group rows 有 topic color strip、display name、role badge、status badge、chevron。
- 展开后提供 drop zone 和 Open editor。

这套结构说明 Rail 的本质不是管理所有资源，而是让用户在写作时快速把选中内容收进去。

### 壳体让当前产品更清楚的地方

- “Drop selected content here” 比普通按钮更贴合 collect 心智。
- group row 只展示少量身份信息，避免把 Rail 做成一个小 Gallery。
- Open editor 作为 group 展开后的入口，符合“轻收集，重精修跳转”的边界。
- 当前 folder path 在 Rail 顶部出现，可以减少“我现在把 group 建到哪里了”的迷惑。

### 需要谨慎处理的假设

- All view 是否要进入 Rail 需要产品判断。它会提高可找性，但也可能让 Rail 变得像 Gallery。
- Rail 的搜索、筛选、folder picker 不能喧宾夺主。Rail 应该服务写作现场，而不是变成完整资源管理器。
- 原型里选中文本状态很清楚，但真实产品里还要兼容 block selection、draft ranges、annotation selection 等多种来源。

## 3. Single ContentGroup Editor 壳体拆解

### 可稳定借用的结构

Single Editor 原型呈现的是一个精修工作台：

- 顶部 header 包含 Back to Gallery、group title、identity chip、role chip、topic chip、保存状态。
- Summary bar 横跨顶部，像 group 的一句话说明。
- 左侧有 folder tree，表示当前 group 的组织位置。
- 中间是 workbench，放置 member material、formula、source snippet、example、diagram 等材料。
- 材料内部可以显示 petal highlight。
- 右下有 Source / evidence drawer。
- 右侧或浮层有 Petals dock，可以收起、展开、拖入片段。

这说明 Single Editor 的视觉目标不是“表单编辑器”，而是把 ContentGroup 当成一个小型知识包来精修。

### 现在可以借用的部分

- 顶部 header 的身份信息结构可以借用。
- Summary bar 可以借用。
- Petals dock / Petal list 的视觉方向可以借用。
- Source drawer 的入口心智可以借用，但内容必须受当前 SourceAnchor 能力限制。
- member material 的卡片视觉可以借用，但不要假装已经是自由 CanvasObject。

### 需要延后到 8.8+ 的部分

- 自由摆放的 workbench。
- 以 CanvasObject 方式拖动、缩放、连接 member material。
- ContentGroup 被拖到 canvas 上后形成 projection/tile/window。
- source evidence drawer 如果依赖完整 SourceArtifact / SourceAnchor 体系，也应延后。
- relation endpoint / graph view / GraphRAG 相关交互都不属于 8.7。

## 4. 共享视觉语言

三个壳共同表达了一套很清楚的 ContentGroup 语言：

- 深色 workspace：适合长时间整理，减少强烈白底带来的割裂。
- folder icon / tree：表达 group 是资源，不只是 note metadata。
- role badge：表达 group 的知识角色。
- topic dot / topic chip：表达 group 的主题归属。
- status chip：表达 group 的成熟度。
- source note / source mark：表达 member 与 source 的来源关系。
- drop zone：表达 collect/refine 的核心动作。
- info icon：表达 group 可以有详细元信息，但默认不打扰。

这套语言值得整体带进产品。它比单纯换颜色更重要，因为它是在帮用户建立“ContentGroup 是可组织、可复用、可精修的知识包”这个心智。

## 5. Mock-only 和危险假设

这些内容不应该在 8.7 里直接落地：

- Graph scope 当作真实功能。
- Canvas workbench 当作真实 CanvasObject。
- 跨项目复用当作已完成的 source / permission / projection 体系。
- source evidence drawer 展示超出当前 source anchor 能力的内容。
- 把 Petal 显示成 source text 上的 label。
- 把 folder move 误做成 source truth move。
- 通过 UI 壳再造一份 group/member/petal 数据。

## 6. 产品判断

OpenDesign 壳最适合做两件事：

1. 给 8.7 后续视觉打磨提供明确方向。
2. 帮我们分辨“用户为什么会迷惑”。

当前最应该先贴近的是 Gallery，然后是 Rail。Single Editor 可以先借用 header、summary、petal dock、source drawer 这些非 Canvas 部分，但不要在 8.7 里强行重写成完整 workbench。
