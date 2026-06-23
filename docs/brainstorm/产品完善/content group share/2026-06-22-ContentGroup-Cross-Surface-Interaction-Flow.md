# 2026-06-22 ContentGroup Cross-Surface Interaction Flow

## 一句话结论

ContentGroup System 不应该是三个独立页面，而应该是一条连续的工作流：

```text
自然写作 -> Rail 收集 -> Gallery 组织 -> Single Editor 精修 -> 回到写作或组织
```

三个 surface 要共享同一套 group identity、folder location、member truth、petal structure，但它们不能做同一件事。清晰分工比功能堆叠更重要。

## 1. 系统级心智

当前最稳定的三面分工仍然是：

- Rail = collect
- Gallery = organize
- Single Editor = refine

用户在 note 里写作时，不应该被迫离开正文去管理所有知识资源。Rail 只负责把正在出现的有价值内容收进 ContentGroup。

用户想整理资源时，应该进入 Gallery。Gallery 是 workspace / project / note / folder 层级上的资源管理器。

用户想打磨某个 group 的内部结构时，应该进入 Single Editor。Single Editor 处理 member、petal、summary、source/evidence 等精修问题。

## 2. Rail -> Gallery

### 典型入口

用户在 note 里看到右侧 Groups Rail，然后点击 Gallery / folder path / resource manager 入口。

### 这个跳转代表什么

从“我正在写作并收集材料”切换到“我要管理这些 group 放在哪里、按什么方式查看”。

### 应保留的上下文

- note_id：用户从哪篇 note 进入。
- folder_id：Rail 当前选中的 folder。
- project/workspace scope：Gallery 需要知道当前资源边界。
- query/mode：如果 Rail 将来有搜索或视图模式，可以选择保留，但不是第一优先级。

### 当前已支持的部分

当前 Rail 已经能打开 Gallery，并通过参数保留 note / folder 上下文。这是很好的基础。

### 后续应补的体验

- Gallery 打开后应直接定位到 Rail 当前 folder。
- Gallery 顶部或状态栏应说明“从某篇 note / 某个 folder 进入”。
- 返回 note 时应保持用户原本的写作位置，这部分如果当前路由不能保证，可以先不硬做。

## 3. Rail -> Single Editor

### 典型入口

用户在 Rail 展开一个 group 后，点击 Open editor。

### 这个跳转代表什么

从“把选中的内容收进去”切换到“我要精修这个知识包的内部结构”。

### 应保留的上下文

- note_id：source note。
- group_id：被编辑的 group。
- folder_id：当前组织位置，用于返回。
- member_id：如果用户从某个 member preview 进入，未来可以定位到具体 member。
- selected range / draft payload：如果用户带着选区进入，未来可以直接进入待处理状态。

### 当前已支持的部分

当前 Rail 已经能进入 Single Editor，并且能通过 group_id / note_id 打开对应 group。

### 后续应补的体验

- 从 Rail 进入时，Single Editor header 应显示 source note 或 folder path。
- 如果是从展开 group 的 member preview 进入，未来可以把该 member 高亮。
- 如果用户带着未落地选区进入，应该明确是“添加到这个 group”还是“仅打开编辑器”。

## 4. Gallery -> Single Editor

### 典型入口

用户在 Gallery 里点击某张 group card，或点击 card 上的 editor / info 入口。

### 这个跳转代表什么

从“资源管理”进入“单个知识包精修”。

### 应保留的上下文

- group_id：核心。
- folder_id：用户从哪个 folder / grouping 进入。
- note_id：如果该 group 有 canonical source note，或当前 Gallery scope 来自某篇 note。
- mode：folder / topic / role，用于返回后保持视图。
- query：如果用户通过搜索找到 group，返回后应保留搜索词。

### 当前已支持的部分

当前 Gallery 已经能通过 URL 参数打开 Single Editor，并保留 folder 回跳上下文。

### 后续应补的体验

- 从 Topic view / Role view 进入后，返回 Gallery 不应丢失 view mode。
- 搜索状态值得保留，尤其是大型 group 系统里。
- card 上的点击区域要分清“打开详情 / 选择 / 拖拽 / 移动 folder”。

## 5. Single Editor -> Gallery / Source Note

### 返回 Gallery

用户完成精修后，回到 Gallery 是最自然的组织闭环。

应保留：

- folder_id
- mode
- query
- group_id 的短暂 selection/highlight

这样用户会感觉自己只是打开了一个资源再回来，而不是进入了另一个孤立页面。

### 返回 Source Note

当用户在 Single Editor 里看到某个 member 的来源，打开 original/source note 是合理动作。

但这里要注意：

- 打开 source note 不等于把 member 写回 source。
- member 内容修改不自动修改 source range。
- source range 修改也不自动污染 member。
- 如果以后要提供 apply back / refresh from source，需要清楚区分为单独动作。

## 6. Drag/drop 与引用流

当前 8.7 里最安全的拖放语义是：

- selected content -> Rail group：收集为 member。
- selected content -> Gallery card：收集为 member。
- selected content -> Single Editor：加入当前 group member。
- member fragment -> Petal：建立 group 内部结构。

暂时不应该把下面这些动作混在一起：

- ContentGroup -> note canvas projection。
- ContentGroup -> textflow inline reference。
- ContentGroup -> materialized blocks。
- ContentGroup -> duplicate/fork/open-original 选择器。

这些动作属于 reuse / projection，应该留给 8.8+ 或专门小版本打磨。

## 7. 三壳之间应该共享的状态语言

为了让三个界面看起来属于同一个系统，应统一这些字段：

- display name
- role
- topic
- summary
- status / stability
- source note
- folder path
- member count
- petal count
- last edited / saved state

但各 surface 的展示密度不同：

- Rail 展示最少，只给 collect 所需信息。
- Gallery 展示中等密度，适合扫视和管理。
- Single Editor 展示最多，适合精修。

## 8. 必须等 CanvasObject / projection 的流

这些流看起来很诱人，但不属于当前 ContentGroup shell parity：

- 把 ContentGroup 从 Rail 拖到 note/canvas 上变成 tile。
- tile 展开成 mini Single Editor。
- tile 写入 textflow reference。
- tile materialize 成 blocks。
- cross-project group fork / duplicate / reference 的完整 UI。
- canvas object reuse。

这些应该在 8.8+ 重新设计，因为它们不是壳的问题，而是 projection / usage / source / materialization 的问题。

## 9. 体验原则

后续实现三壳联动时，可以遵守这几条原则：

- Rail 不抢正文注意力。
- Gallery 不编辑 source truth。
- Single Editor 不伪装成完整 Canvas。
- folder move 不改变 source。
- member edit 不自动写回原文。
- Petal 只在 group 内部表达结构。
- 所有跳转都尽量保留 folder / mode / group 上下文。

如果这几条守住，三壳就会像一个系统，而不是三个相似但互相打架的页面。
