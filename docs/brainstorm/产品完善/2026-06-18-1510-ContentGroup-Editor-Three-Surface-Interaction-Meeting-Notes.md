# 2026-06-18 15:10 临时会议记录：ContentGroup Editor 三层页面交互设计

status: temporary meeting notes
date: 2026-06-18 15:10 America/Toronto
scope: ContentGroup 右侧栏、Gallery、单组 Editor 的交互拆分

> 这是一份临时会议记录。后续会被整理进正式的 ContentGroup / Command Surface / Product 文档，或并入 Open Issue。

## 1. 总体结构

ContentGroup 相关界面暂时拆成三层：

```text
Groups Rail
  收集、快速查看、设定 active group

ContentGroup Gallery
  总览、筛选、批量整理、按 depth / topic / role 浏览

Single ContentGroup Editor
  拆 source package、分配 petal、编辑细节、做精加工
```

短规则：

```text
Rail = collect
Gallery = organize
Editor = refine
```

## 2. Groups Rail 入口

右侧只需要一个 `Groups` 图标按钮作为入口。

- 按钮本体不需要长文字。
- hover tooltip 可以写 `Groups`。
- 用户通过这个按钮进入右侧栏，因此右侧栏内部不需要再显示 `Content groups` 标题。

## 3. Groups Rail 顶部操作

顶部保持极简。

保留：

- `+`：新建 ContentGroup。
- `X`：关闭右侧栏。
- 搜索图标：后续可做。
- 筛选图标：后续可做。

不保留：

- `Content groups` 大标题。
- `+ New` 文字按钮。
- 顶部全局 `Add selected` 按钮。

`+` 的 tooltip 使用 `New group` 或 `Add new group`。

## 4. Add selected 的重新定义

`Add selected` 这个能力需要保留，但不应该作为顶部按钮存在。

原因：

- 顶部按钮缺少目标，用户会困惑“加到哪个 group”。
- 它更适合成为正文右键菜单和 group 行上下文动作。

统一后的右键菜单极简文案：

```text
没有 active group：Create group
有 active group：Add to group
```

行为：

```text
Create group
  新建 ContentGroup
  把当前 item 放进去
  新 group 成为 active group

Add to group
  把当前 item 放进当前 active group
```

这个动作不需要隐藏。即使右侧栏没有打开，用户也应该能从当前选区直接 `Create group`。

## 5. Active group

`active group` 是当前接收内容的目标 ContentGroup。

以下操作会设置 active group：

- 新建一个 group。
- 展开一个已有 group。
- 点击某个 group 行。
- 进入某个 group 的轻编辑状态。

右侧栏需要轻量显示当前 active group：

- 左侧细线。
- 轻微背景高亮。
- 小 target 图标。

避免使用大面积颜色。

## 6. Item 统一口径

凡是可以被选中、拖拽、右键加入 ContentGroup 的对象，统一叫 `item`。

当前阶段 item 包括：

- `Text range item`：连续文字选区。
- `Multi-range item`：Ctrl 多段文字选区。
- `Label item`：已有 label / annotation，本质是带名字的 range package。
- `Block item`：整个 block。

未来扩展 item 包括：

- `Table item`：整张表、某一行、某一列、某个 cell range。
- `Image item`：整张图片或图片里的某个区域。

暂不把 `TextUnit` 单独作为 item。它可以视为一种特殊的 `Text range item`。

暂不把 formula / code 单独作为 item：

- 行内 formula / code 属于 text range 内的 inline structure。
- 独立 formula / code 属于 block item。

一句话：

```text
Item 是 ContentGroup 能接收的通用碎片单位。
```

## 7. 添加 item 的两种方式

### 7.1 拖拽添加

用户可以把 item 直接拖到某个 ContentGroup 上。

- 拖到哪个 group，就加入哪个 group。
- 适合 label、selected area、block、未来图片区域和 table 区域。

### 7.2 右键添加

用户选中 item 后，在正文右键菜单里使用：

- `Create group`
- `Add to group`

这条路径适合快速加入很多细碎内容。

典型场景：

- 用户没有提前 label 一堆细碎内容。
- 这些内容彼此之间没有独立 label 价值。
- 它们只有被放入同一个 ContentGroup 后才形成关系。
- 用户可以连续选中内容并右键 `Add to group`，把它们加入当前 active group。

## 8. Groups Rail 列表项

ContentGroup 折叠项默认只显示：

- display name。
- identity 小图标 badge。
- 展开箭头。
- 可选的极轻状态提示。

不默认显示：

- summary。
- role。
- topic。
- members 明细。
- petals 明细。
- 大输入框。
- 大按钮组。

## 9. Identity badge

`identity` 适合放在折叠项 display name 旁边。

它应该使用图标 badge，不使用文字 badge。

示例：

- `draft`：空心圆或铅笔。
- `accepted`：check。
- `rejected`：slash 或 cross。
- `archived`：archive icon。

它表示对象状态，用户扫一眼即可，不应该占用文字空间。

## 10. Role 和 depth

`role` 和 `depth` 应该分开处理。

### Role

`role` 不适合常驻在折叠项里。

原因：

- role 是开放词汇。
- 用户可能输入 `definition`、`theorem`、`week1 key idea`，甚至任意命名。
- 长度不可控，会让右侧栏变脏。

role 更适合出现在：

- 展开 group 后的轻详情。
- Gallery 的筛选 / 分组维度。
- Full Editor 的正式字段。
- hover tooltip。

### Depth

`depth` 比 role 更适合用视觉层级表达。

建议：

- 用行缩进表达 depth。
- depth 越深，group 越缩进。
- 不默认显示 `depth 3` 这种数字 badge。
- 如需显示，可用小层级图标，hover tooltip 再展示具体值。

最终规则：

```text
Identity = icon badge, always visible
Depth = row hierarchy / indentation
Role = hidden until expanded or filtered
```

## 11. Group 行 hover 操作

每个 group 行 hover 时可以出现轻量图标：

- `+`：把当前 item 加到这个 group。
- 打开编辑器图标：进入完整 ContentGroup Editor。
- `...`：更多操作。

这些图标不需要文字，hover tooltip 即可。

## 12. Group 行右键菜单

右键某个 group 行时，菜单属于 group 级操作。

候选项：

- Rename。
- Open editor。
- Add current item。
- Duplicate。
- Change color。
- Change status。
- Move / change parent。
- Archive。
- Delete。

## 13. 正文选区右键菜单

用户选中文字、label、block 等 item 时，正文右键菜单应包含：

- Copy。
- Cut。
- Paste，按状态决定是否可用。
- Label。
- Create group / Add to group。
- Turn into。
- Inline。
- Link。

外部文案用 `Label`，内部仍可使用 annotation 命名。

## 14. Label 与 ContentGroup 的关系

Label 不是 ContentGroup。

Label 是用户在正文里的标记和高光。它可以作为 item 被加入 ContentGroup。

一个 label 可能包含多个 range，所以它不是不可拆的原子。

在完整 ContentGroup Editor 里，label item 可以被拆解：

- range A 分配给一个 petal。
- range B 分配给另一个 petal。
- range C 保留为 source package 的一部分。

## 15. Groups Rail 的边界

Groups Rail 只负责：

- 看有哪些 group。
- 新建 group。
- 接收 item。
- 简单展开预览。
- 设置 active group。
- 跳转到完整 editor。

它不负责：

- 复杂字段编辑。
- petal 精细管理。
- source package 拆分。
- 批量管理。
- 大规模筛选。

这些属于 ContentGroup Gallery 和 Single ContentGroup Editor。

## 16. 后续待展开

- [ ] 继续设计 ContentGroup Gallery 的页面结构。
- [ ] 继续设计 Single ContentGroup Editor 的细节表单和 petal 分配交互。
- [ ] 继续设计 `item` 拖拽与右键菜单如何共存。
- [ ] 继续设计 active group 的视觉提示。
- [ ] 继续设计 role / depth / identity 在 Gallery 和 Editor 里的完整表现。

## 17. ContentGroup Gallery 总体形态补充

本段讨论的是完整 `ContentGroup Gallery`，不是右侧 `Groups Rail`。

### 17.1 核心比喻

ContentGroup Gallery 应该更像 Windows 文件资源管理器，而不是 inspector、复杂表单或弹窗。

用户进入 Gallery 后，看到的是一个可以分层浏览、筛选、整理的知识文件夹系统。

基础心智：

```text
Project folder
  Note folder
    ContentGroup cards
      Single ContentGroup Editor
```

好处：

- 用户天然理解文件夹可以一层层点进去。
- 用户天然理解当前目录、上一级、排序、筛选、选中、批量操作。
- ContentGroup 不再显得像复杂数据结构，而像可以被整理的知识卡片。

### 17.2 Gallery 是平行工作区

Gallery 不是右侧栏扩展出来的大面板。

它应该和 Page / Canvas 平行：

```text
Page
Canvas
ContentGroup Gallery
```

用户可以从当前 note 进入 Gallery，也可以从 Home / Project 进入 Gallery。

未来入口可以包括：

- 右侧 `Groups` rail 的打开 Gallery 按钮。
- 左侧导航里的 ContentGroup Gallery。
- 顶部 workspace 切换。
- 快捷键。
- 鼠标侧键或手势式切换。

### 17.3 层级浏览

Gallery 可以从不同 scope 开始：

```text
All Projects
  Project
    Note
      ContentGroup
```

如果从某篇 note 打开 Gallery，默认看到当前 note 下的 ContentGroups。

如果从 Home 打开 Gallery，先选择 project，再进入 note 或 project-wide view。

### 17.4 Project 级视图

Project scope 下，用户可以：

- 看所有 notes。
- 看整个 project 下所有 ContentGroups。
- 进入某个 note 的 ContentGroups。

这类似在资源管理器里打开一个文件夹，然后选择看子文件夹或全部文件。

### 17.5 Note 级视图

进入某个 note 后，默认显示这个 note 下所有 ContentGroups。

初始视图是：

```text
All
```

即全部 ContentGroups 按创建时间、修改时间、最近使用等排序方式排列。

### 17.6 Gallery 顶部视图切换

Gallery 顶部需要一个轻量 control bar：

```text
All | Topic | Role
```

它不是三个完全不同的页面，而是同一个 Gallery 的三种排列方式。

- `All`：默认，把全部 ContentGroups 平铺出来。
- `Topic`：按 topic 分组浏览。
- `Role`：按 role 分组浏览。

### 17.7 Topic / Role 分组视图

切到 `Topic` 或 `Role` 后，左侧可以出现窄分组栏，类似资源管理器侧栏或分类目录。

Topic 例子：

```text
Power Series
Radius of Convergence
Taylor Series
Demand
Price
```

Role 例子：

```text
Definition
Theorem
Example
Practice
Remark
Question
```

右侧显示当前 topic / role 下的 ContentGroup cards。

这允许用户快速做两种查询：

- 只看某个 topic 下的所有内容。
- 只看某个 role 下的所有内容。

### 17.8 ContentGroup Card 结构

Gallery 里的每个 ContentGroup 是一张卡片，不是表单。

卡片应包含：

- `display_name`：主标题。
- 内容预览：一小段 summary 或 member preview。
- `role tab`：像文件夹页签，贴在卡片边缘。
- `topic signal`：颜色、细边线、小角标、路径文字。
- `identity icon`：小图标 badge，比如 accepted check / draft pencil。
- 可选 item count / petal count。

视觉规则：

```text
Role = folder tab
Topic = color / corner mark / path
Identity = icon badge
Depth = folder hierarchy, not visible number
```

### 17.9 Role 和 Topic 的视觉分工

`role` 更像这张卡在知识结构里的功能类型：

```text
Definition
Theorem
Example
Practice
Question
```

因此 role 适合做卡片边缘的 folder tab。

`topic` 更像内容路径或所属主题：

```text
Power Series
Demand and Price
Effect of Income on Consumption
```

topic 往往更长、更具体，不适合做 tab。它更适合用颜色、路径、小角标、细边线表达。

### 17.10 Depth 的处理

Gallery 已经是文件夹式层级结构，所以 `depth` 不需要在卡片上显示成数字。

用户看到自己位于：

```text
Project > Note > ContentGroups
```

就自然知道自己在哪一层。

`depth` 主要保留为内部结构、排序、筛选、关系建模字段。

### 17.11 Note 是否是 ContentGroup

暂时保持 open。

产品上第一版可以先这样理解：

- note 是 scope / folder。
- ContentGroup 是 note 下面的知识卡片。

工程上未来可以把 note 视为高层 ContentGroup-like scope，但不要急着暴露给用户。

### 17.12 Gallery 和右侧栏的关系

右侧 `Groups Rail` 不是 Gallery。

右侧栏负责：

```text
快速收集
快速查看
设置 active group
跳转 Gallery / Editor
```

Gallery 负责：

```text
系统整理
分层浏览
按 topic / role 组织
批量管理 ContentGroups
```

短句：

```text
Groups Rail 是入口和收纳盒。
ContentGroup Gallery 是资源管理器。
Single ContentGroup Editor 是精加工台。
```

## 18. Gallery 反补 Groups Rail

本段从完整 Gallery 的文件资源管理器心智反推右侧 `Groups Rail`。

### 18.1 Rail 是迷你资源管理器

Groups Rail 不应该成为一套和 Gallery 完全不同的 UI。

最新口径：

```text
ContentGroup Gallery 是完整资源管理器。
Groups Rail 是跟随当前页面 scope 的迷你资源管理器。
```

它们共享同一套语义视觉：

- topic color。
- identity icon。
- 折叠 / 展开逻辑。
- ContentGroup display name。
- 跳转到完整 Editor / Gallery 的路径。

区别：

- Gallery 负责系统整理、浏览、分组、批量管理。
- Rail 负责快速收纳、快速查看、设置 active group。

### 18.2 Topic color 在 Rail 和 Gallery 中同步

如果某个 topic 在 Gallery 中有颜色，那么 Rail 中同 topic 的 ContentGroup 也使用同一颜色。

Rail 中的 topic signal 应该很轻：

- 左侧细色条。
- 小色点。
- 细边线。
- 轻微背景 tint。

避免大面积染色。

### 18.3 Role 在 Rail 中默认隐藏

Gallery 卡片可以使用 role tab，因为卡片空间充足。

Rail 是窄条列表，role 如果做成 tab 会压缩 display name，甚至遮挡上下词条。

因此 Rail 折叠态默认只显示：

```text
topic color signal + identity icon + display name + expand arrow
```

role 不在第一眼展示。

展开某个 group 后，轻详情里可以显示：

```text
Role
Topic
```

### 18.4 Depth 在 Rail 中不显示

Rail 中不显示 depth 数字，也不显示 depth badge。

原因：Rail 的内容由当前 scope 决定。

```text
Home / Projects overview
  Rail = global / all projects scope

Inside one Project
  Rail = current project scope

Inside one Note
  Rail = current note scope
```

用户通过自己所在的位置理解层级，不需要看到 `depth 1 / depth 2 / depth 3`。

### 18.5 Groups 按钮应该全局存在

`Groups` 按钮不应该只在 note 页面出现。

它应该是一个全局右侧入口，并跟随当前 navigation scope。

规则：

```text
Groups Rail follows current navigation scope.
```

示例：

- 在 Projects 总览打开 Groups：显示全局 / project-level group scope。
- 在某个 Project 内打开 Groups：显示 current project scope。
- 在某个 Note 内打开 Groups：显示 current note scope。

这样用户会自然理解：

```text
我在哪一层打开 Groups，就看到哪一层的内容组。
```

### 18.6 Rail 展开态

Rail 中一个 ContentGroup 展开后可以显示轻详情：

```text
Display name
Topic
Role
Identity selector
Items / petals count
Open editor
```

不显示大输入框，不做复杂编辑。

## 19. Groups Rail 词条右键菜单

本段讨论的是右侧 `Groups Rail` 内某个 ContentGroup 词条的右键菜单。

### 19.1 Rename 不进入右键菜单

`Rename` 不应该放进右键菜单。

重命名应该是直接操作：

```text
双击 ContentGroup 词条
  -> 当前折叠小 bar 进入 inline rename
  -> 不弹窗
  -> 不跳页面
```

这更符合文件管理器心智。

### 19.2 保留在右键菜单里的动作

Rail 中某个 ContentGroup 词条右键菜单候选：

- `Open in editor`
- `Duplicate`
- `Change color`
- `Move / parent`
- `Delete`

这些属于 group 级操作。

### 19.3 不放入右键菜单的动作

不放：

- `Rename`
- `Add selected content`
- `Change status`

原因：

- `Rename` 用双击 inline rename。
- `Add selected content` 已经由正文右键 `Create group / Add to group` 和拖拽添加承担。
- `Change status` 应该放进展开态轻详情。

### 19.4 Identity / status 编辑

折叠列表中，identity 只显示图标 badge，不显示文字。

示例：

- draft：空心圆或铅笔。
- accepted：check。
- rejected：slash 或 cross。
- archived：archive icon。

但当用户展开某个 ContentGroup 后，状态选择器需要显示：

```text
icon + short label
```

候选：

```text
Draft
Accepted
Rejected
Archived
```

原则：

```text
看状态只需要图标。
改状态需要文字。
```

### 19.5 Rail 折叠项最终草案

折叠态：

```text
[topic color signal]  Display name    [identity icon]  [expand]
```

展开态：

```text
Display name
Topic
Role
Identity selector
Items / petals count
Open editor
```

右键菜单：

```text
Open in editor
Duplicate
Change color
Move / parent
Delete
```

## 20. 当前卡住点：Gallery 与 Rail 的分组逻辑

status: unresolved design / data-structure question
date: 2026-06-18 15:10 side conversation follow-up

本段记录当前真正卡住的问题，准备带回主线程继续讨论数据结构。

### 20.1 问题不是单纯 UI

当前不只是 `ContentGroup Gallery` 大页面怎么分组还没定。

右侧 `Groups Rail` 作为迷你资源管理器时，也还没有完全确定应该如何分组。

真正的问题是：

```text
文件层级、内容分组、topic、role、ContentGroup、depth / parent
这些概念到底怎样映射到同一套数据结构和同一套用户心智里。
```

### 20.2 Henry 的 Notion 示意图

Henry 用 Notion 做了两个示意图。

第一张示意的是整体文件 / 层级树：

```text
AMATH_231
  Chapter1-3_note
    Chapter_1_differential_equation
      Topic_1
      Topic_2
      Topic_3
    Chapter_2_power_series
    Chapter_3_application_of_power_series
  Chapter4-5_note
  Midterm_collection
  Chapter6_note
```

第二张示意的是进入某个 note / chapter 后的局部视图：

```text
AMATH_231 -> Chapter1-3_note -> Chapter_1_differential_equation
  Topic_1
    Content_group_1
    Content_group_2
  Topic_2
  Topic_3
```

Henry 的直觉是：这个方向很接近日常文件夹心智，但逻辑仍然有点怪。

### 20.3 怪在哪里

怪的核心是不同类型的层级混在同一棵树里：

```text
Project
Note
Chapter
Topic
ContentGroup
```

其中：

- `Project / Note` 更像真实文件层级或 scope。
- `Chapter / Topic` 更像内容组织层级。
- `ContentGroup` 是被组织出来的内容包。
- `Role` 是横向功能分类，比如 definition / theorem / example。

如果把它们全部放进一棵树里，用户会误以为它们是同一种节点，只是深度不同。

### 20.4 初步修正方向：文件层级和知识分组分开

更稳的 UI 心智可能是：

```text
顶部 breadcrumb = 当前文件 / scope 路径
主体 tree/list = 当前 scope 下的内容组织层级和 ContentGroups
```

例如，不在树里重复显示：

```text
AMATH_231
  Chapter1-3_note
    Chapter_1_differential_equation
```

而是变成：

```text
Breadcrumb:
AMATH_231 / Chapter1-3_note / Chapter_1_differential_equation

Body:
Topic_1
  Content_group_1
  Content_group_2
Topic_2
Topic_3
```

### 20.5 Rail 的默认分组疑问

右侧 `Groups Rail` 空间很窄，不能像完整 Gallery 那样展开全部。

候选分组方式：

```text
按 depth / parent-child hierarchy
按 topic
按 role
```

当前倾向：

```text
Rail 默认按当前 scope 下的 hierarchy / parent-child 展示。
Topic / Role 是辅助筛选或视图模式，不是默认根结构。
```

原因：

- `depth / parent` 表示纵向位置。
- `topic` 表示内容主题。
- `role` 表示功能类型，是横向分类。

如果 Rail 默认按 role 分组，用户会丢失自己当前处于哪个 chapter / topic / note 范围里的空间感。

### 20.6 真实用户场景

假设用户上传了三个原始文档，并让系统整理成一篇 note。

这个 note 的主旨是整理课本前三个 chapter：

```text
Chapter 1
Chapter 2
Chapter 3
```

用户在 note scope 打开 Groups Rail 时，可能第一眼想看到：

```text
Chapter 1
Chapter 2
Chapter 3
```

展开 `Chapter 1` 后，再看到更细的 topic：

```text
Power Series
Green Theorem
Double Integral
```

展开某个 topic 后，才看到相关 ContentGroups：

```text
Power Series
  Definition of Power Series
  Radius of Convergence Example
  Practice Problem 1
```

这说明 Rail 可能需要支持“当前 scope 下的下一层内容组织”，而不是永远直接平铺 ContentGroups。

### 20.7 当前待主线程讨论的问题

- [ ] `Chapter` 应该是一个 ContentGroup，还是一种 scope / folder-like grouping？
- [ ] `Topic` 应该是 ContentGroup 的字段，还是可以成为层级节点？
- [ ] `ContentGroup.parent_group_id` 是否足够表达 chapter -> topic -> content group 这种树？
- [ ] `depth` 是否只应作为结构派生结果，而不是用户显式操作字段？
- [ ] Rail 是否应该只显示当前 active path，而不是完整树？
- [ ] Gallery 是否应该允许 `All / Topic / Role` 三种视图，但 Rail 默认只用 hierarchy？
- [ ] 是否需要把 `Project / Note` 文件层级与 `ContentGroup` 知识层级在数据结构上明确分开？

### 20.8 暂时结论

当前最稳的暂时结论：

```text
ContentGroup Gallery:
  完整资源管理器，支持 breadcrumb、scope、All / Topic / Role 视图。

Groups Rail:
  当前 scope 下的迷你资源管理器，默认显示 hierarchy / active path。

Topic:
  内容主题，可用于颜色、筛选、分组，也可能参与层级。

Role:
  功能分类，更适合 tab / badge / filter，不适合作为 Rail 默认根。

Project / Note:
  文件层级或 scope，不应该和所有知识分组节点无脑混进同一棵树。
```

这部分需要回到主线程继续从数据结构角度判断。

## 21. 主线程突破点：GroupFolder 与 ContentGroup 分工

status: breakthrough recorded from main thread follow-up
date: 2026-06-18 15:10 main thread continuation

本段记录第 20 节之后的主线程讨论结论：卡住点的核心不是继续把所有东西都塞进 ContentGroup 树，而是把“组织目录”和“内容包”分开。

### 21.1 Folder 只有一种本体

暂时统一命名为：

```text
GroupFolder
```

不要拆成：

```text
ScopedFolder
CrossScopeFolder
ProjectFolder
NoteFolder
PinnedFolder
LinkedFolder
```

原因：

- Folder 如果分太多类型，后续会被技术债拖住。
- 用户心智里它就是一个整理目录，不需要知道内部有很多种 folder。
- 差异应该来自它的位置、生命周期和操作，而不是来自多个 folder 类型。

### 21.2 Project / Note 不等于 GroupFolder

`Project` 和 `Note` 仍然属于文档世界：

```text
Project = 工作域 / 课程 / 长期容器
Note = 可写作、可编辑、可导出的文档
```

`GroupFolder` 属于知识整理世界：

```text
GroupFolder = 内容组的组织目录
ContentGroup = 可整理、可引用、可拆 Petal 的内容包
```

它们可以强绑定，但不能混成同一个语义对象。

### 21.3 Project / Note 可以有系统 root folder

每个 Project / Note 可以由系统自动创建一个 root GroupFolder：

```text
Project: AMATH_231
  system GroupFolder root: AMATH_231 groups

Note: Chapter1-3_note
  system GroupFolder root: Chapter1-3_note groups
```

这些 root folder 的规则：

- [ ] 由系统创建。
- [ ] 与 Project / Note 生命周期绑定。
- [ ] 用户不能删除。
- [ ] Project / Note 被删除时，root folder 可以跟随清理。
- [ ] 它们只是当前 Project / Note 的知识整理入口，不是 Project / Note 本身。

### 21.4 普通 GroupFolder 可以移动进 root folder

用户可以把一个普通 GroupFolder 移动到某个 Project / Note 的 root folder 下面。

示例：

```text
Loose / workspace-level folder:
  Power Series

Move into:
  Chapter1-3_note groups

Result:
  Chapter1-3_note groups
    Power Series
      ContentGroup: Definition of Power Series
      ContentGroup: Radius Example
```

这表示用户决定把 `Power Series` 这套整理目录归入这篇 note 的组织结构。

关键规则：

```text
Folder 的位置变了。
Folder 内 ContentGroup 的来源不变。
```

也就是说，一个位于 note root folder 下的 ContentGroup，仍然可以引用其他 note、其他 project、label、range、block、未来的图片区域或 table 区域。

### 21.5 Folder 可以跨 scope 收纳内容

GroupFolder 虽然可以挂在某个 Project / Note 下，但它的内容不被限制在该 scope 内。

例如：

```text
GroupFolder: Exam Review
  ContentGroup from AMATH_231
  ContentGroup from Complex Analysis
  ContentGroup from Personal Notes
```

这类 folder 对未来 relation 很重要，因为它可以成为跨 note / 跨 project relation view 的可控边界。

```text
GroupFolder = relation graph scope boundary
ContentGroup = relation node candidate
Relation = ContentGroups 之间的边
```

短规则：

```text
GroupFolder does not own relation truth.
GroupFolder defines a useful viewing and working boundary for relation.
```

### 21.6 ContentGroup 可以引用 ContentGroup，但这不是 folder 层级

必须区分两种关系：

```text
GroupFolder contains ContentGroup
ContentGroup references members
```

如果一个 ContentGroup 引用了另一个 ContentGroup：

```text
ContentGroup: Midterm Review Pack
members:
  ContentGroup: Power Series Definition
  ContentGroup: Radius Theorem
```

这不代表 `Power Series Definition` 住在 `Midterm Review Pack` 下面。

这只是内容引用。

真正的组织位置仍然由 GroupFolder 管理。

### 21.7 Move / Copy 保留，Pin / Link 暂时不要

保留的 folder 操作：

```text
Move folder here
Copy folder here
```

暂时不要：

```text
Pin folder here
Link folder here
Shortcut folder here
```

原因：

- Pin / Link 的语义不够清楚。
- 它会引入“同一个 folder 出现在多个位置”的问题。
- 后续删除、重命名、来源追踪、同步和 UI 解释都会变复杂。
- 当前阶段 Move / Copy 已经足够像资源管理器，也足够支持整理工作。

短规则：

```text
Move = 改变组织位置
Copy = 复制一份组织结构
Members = 保持来源真相
```

### 21.8 当前总定义

最终临时定义：

```text
Project / Note gives document scope.
GroupFolder gives organization.
ContentGroup gives content package.
Members give source references.
Petals give internal structure.
Relation connects ContentGroups.
```

更短的产品规则：

```text
Folder organizes.
ContentGroup contains.
Member references source.
Petal refines.
Relation connects.
```

### 21.9 对第 20 节问题的更新回答

- [x] `Chapter` / `Topic` 第一版不必强行变成 ContentGroup。
- [x] 它们更适合先由 GroupFolder 表达组织结构。
- [x] `Project / Note` 是 document scope，不是 GroupFolder，但可以拥有系统 root GroupFolder。
- [x] `ContentGroup.parent_group_id` 不应该承担 chapter -> topic -> content group 的全部树状组织职责，这部分应转交给 GroupFolder。
- [x] `depth` 不应成为用户必须显式操作的核心字段，它更像从 folder / organization 层级派生出的结构信息。
- [x] Rail 和 Gallery 可以共享同一套 GroupFolder / ContentGroup 组织模型。
- [x] Folder 和 Relation 是相辅相成关系：Folder 不是 relation truth，但可以成为 relation view 的边界。

## 22. 成型点：GroupFolder 让底层架构稳定

status: architecture direction formed
date: 2026-06-18 main thread continuation

本段记录主线程进一步收束后的结论：`GroupFolder` 不是一个小 UI 补丁，而是 ContentGroup Editor 体系里缺失的一根底层支柱。它负责摆放、组织路径、AI 阅读路径、depth 派生和 relation 视图边界。

### 22.1 GroupFolder 补上的支柱

在当前 Better Notebook / ContentGroup 体系中，几个核心支柱可以这样理解：

```text
TextFlow
  承载原文和自然写作。

Label / Annotation
  承载用户高光和轻量标记。

ContentGroup
  承载内容包和知识对象候选。

GroupFolder
  承载摆放、目录、分区、浏览边界和 relation 视图边界。

Relation
  连接 ContentGroups。
```

短规则：

```text
Folder organizes position.
ContentGroup contains content.
Relation connects content groups.
```

没有 GroupFolder 时，ContentGroup 被迫同时承担“内容包”和“目录节点”，因此 chapter、topic、depth、scope、relation boundary 都会混在一起。GroupFolder 出现后，ContentGroup 可以重新变轻。

### 22.2 Chapter / Topic 分区交给 GroupFolder

如果用户从 textbook 原始文档中整理出一篇包含 Chapter 1 到 Chapter 3 的 note，那么这篇 note 里的三章结构更适合由 GroupFolder 表达，而不是由 ContentGroup 嵌套表达。

示例：

```text
Note root GroupFolder: Chapter1-3_note groups
  Chapter 1
    Definitions
      ContentGroup: Definition of Power Series
      ContentGroup: Radius of Convergence Definition
    Examples
      ContentGroup: Radius Example 1
    Practice
      ContentGroup: Practice Problem 1

  Chapter 2
    ...

  Chapter 3
    ...
```

判断规则：

```text
如果一个对象主要回答“东西放在哪里”，它应该是 GroupFolder。
如果一个对象主要回答“由哪些内容组成”，它应该是 ContentGroup。
```

因此：

- [x] Chapter / Topic / Definitions / Examples / Practice 这类组织区域，默认更适合 GroupFolder。
- [x] Definition / Theorem / Example / Practice Problem 这类具体内容包，默认更适合 ContentGroup。
- [x] Chapter 级别的概述、总结、地图，也可以是 ContentGroup，但它应被放在对应的 folder path 下，而不是自己声明一个特殊 scope。

### 22.3 Depth 被 GroupFolder path 吸收

旧思路中曾经有：

```text
depth 0 = project
depth 1 = note
depth 2+ = content level
```

新结论：

```text
Depth is not a primary ContentGroup field.
Depth is derived from GroupFolder path.
GroupFolder path replaces ContentGroup depth.
```

示例：

```text
Project root GroupFolder: AMATH_231 groups
  Note root GroupFolder: Chapter1-3_note groups
    Chapter 1
      Topic: Power Series
        ContentGroup: Definition of Power Series
```

`Definition of Power Series` 的层级不是靠自己声明 `depth = 4` 得来的，而是从它所在的 path 派生：

```text
AMATH_231 groups / Chapter1-3_note groups / Chapter 1 / Power Series
```

这意味着 ContentGroup 不再需要自己承担：

```text
我是 project 级？
我是 note 级？
我是 chapter 级？
我是 topic 级？
```

这些层级语义交给 GroupFolder path。

### 22.4 AI 阅读路径

Folder 不只是给人类看的摆放目录，它也给 AI 一个稳定阅读路径。

AI 阅读一篇 note 或一个 project 时，不应直接平铺读取所有 ContentGroups，而应顺着 folder path 读取：

```text
Project / Note scope
  -> GroupFolder tree
    -> local folder context
      -> ContentGroups
        -> members / petals
          -> source ranges / labels / blocks
```

短规则：

```text
Document scope tells AI where it is.
GroupFolder path tells AI what context it is in.
ContentGroup tells AI what object to read.
Members tell AI where the evidence comes from.
Petals tell AI how the object is structured.
Relations tell AI where to go next.
```

这也解释了为什么 GroupFolder 不是纯视觉功能。它会直接影响 AI 的阅读顺序、局部上下文判断和后续 relation 建模。

### 22.5 Independent / workspace-level folders

ContentGroup 不一定必须依附某个 Note。用户也可以创建不属于特定 Project / Note 的独立 GroupFolder，用来做跨 scope 整理。

示例：

```text
Workspace-level GroupFolder: Exam Review
  ContentGroup from AMATH_231
  ContentGroup from Complex Analysis
  ContentGroup from Personal Notes
```

这个 folder 的位置可能是：

```text
Workspace groups / Exam Review
```

它不破坏原始 Project / Note 结构，但允许用户建立跨 note / 跨 project 的知识整理边界。

### 22.6 GroupFolder 对 Relation 的帮助

GroupFolder 不是 relation truth，但它能成为 relation graph 的边界。

示例场景：

用户说：

```text
我想看到所有关于 power series 的内容，包括定义、应用、例子、相关知识点的图示图。
```

AI 可以跨 project / note / folder 搜索相关 ContentGroups，临时创建：

```text
Temporary GroupFolder: Power Series Map
  ContentGroup from math project
  ContentGroup from engineering project
  ContentGroup from CS project
  ContentGroup from personal notes
```

然后在这个 folder boundary 内打开 relation view。

如果用户满意：

```text
Save temporary folder
  temporary GroupFolder -> normal GroupFolder
  relation view settings -> saved view
```

如果用户不满意：

```text
Discard temporary folder
  delete temporary folder
  original ContentGroups untouched
```

短规则：

```text
AI does not need to mutate the user's folder tree immediately.
AI first creates a temporary GroupFolder projection.
User decides whether it becomes a real folder.
```

### 22.7 Temporary / generated GroupFolder

为了支持 AI 生成的临时图示图和临时整理结果，GroupFolder 可以拥有状态和来源，而不是拆成另一种 folder 类型。

可能字段：

```text
GroupFolder
  origin: user | ai | system
  status: temporary | saved | archived
```

含义：

- `system`: Project / Note root folder。
- `user`: 用户手动创建的正式 folder。
- `ai`: AI 根据用户任务生成的 folder。
- `temporary`: 临时 projection，用户未确认。
- `saved`: 已进入正式组织结构。
- `archived`: 被收起或归档。

依旧保持：

```text
Folder 只有一种本体。
差异来自 origin / status / placement / lifecycle。
```

### 22.8 当前最终收束

当前最稳定的底层定义：

```text
Project / Note
  gives document scope

GroupFolder
  gives organization, path, browsing, depth derivation, and relation boundary

ContentGroup
  gives content package

Members
  give source references

Petals
  give internal structure

Relation
  connects ContentGroups
```

极简版：

```text
Folder organizes.
Folder path derives depth.
Folder boundary limits relation view.
ContentGroup stays focused on content.
Relation connects ContentGroups.
```

本轮结论：GroupFolder 是 ContentGroup Editor 稳定成型的关键支柱。完成 GroupFolder 后，ContentGroup 不再需要承担目录、层级、摆放和 relation 边界的全部职责，底层模型会明显更稳。
