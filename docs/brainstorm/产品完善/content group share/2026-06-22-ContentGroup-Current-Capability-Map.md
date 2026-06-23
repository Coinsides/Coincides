# 2026-06-22 ContentGroup Current Capability Map

## 一句话结论

当前 ContentGroup System 的底层能力已经比界面看上去成熟很多。真正欠缺的不是“有没有 ContentGroup / Folder / Member / Petal”，而是这些能力还没有被三个 surface 用清楚的壳表达出来。

也就是说，后续套壳不是从零做功能，而是把已经存在的 entity-backed truth 暴露得更像一个资源系统。

## 1. 当前实体和数据基础

8.7 已经完成了最关键的基础转向：

- ContentGroup 已经不再只是 note metadata 里的数组项，而是实体化的核心对象。
- GroupFolder 已经承担组织位置，不负责移动 source truth。
- ContentGroupMember 已经作为 group-local content truth 存在。
- ContentGroupFragment / ContentGroupPetal 已经支持 Petal 内部结构。
- stability / sync / source boundary 相关字段已经可以给 UI 提供成熟度信号。

这意味着 Gallery 和 Rail 现在可以更大胆地展示 folder、status、role、topic、petal count、member preview，而不是靠前端临时拼装一个假资源系统。

## 2. Rail 当前能力

当前 Rail 已经具备这些真实能力：

- 在 note 现场读取 ContentGroup 列表。
- 基于当前 note / folder scope 展示 group。
- 从当前选区、annotation、draft range、block selection 生成 candidate member。
- 新建 group 并把当前选中内容放进去。
- 把选中内容 drop 到已有 group。
- 展开 group 查看 member preview。
- 打开 Gallery。
- 打开 Single Editor。
- 移动 group 到当前选中的 folder。
- 删除 / 清理 group 的部分入口已经存在。

当前 Rail 的问题主要是体验表达：

- folder path 不够像一个明确的当前位置。
- group row 的 role、topic、status、source 信号不够清晰。
- drop zone 的存在感和可理解性还不够稳定。
- Rail 里哪些动作是 collect，哪些动作会跳去 refine，还可以更清楚。
- 如果引入 Topic / Role / All view，需要先确认不会把 Rail 变成小 Gallery。

## 3. Gallery 当前能力

当前 Gallery 已经具备这些真实能力：

- 按 folder / topic / role 三种模式浏览。
- 根据 URL 参数保留 note_id、folder_id 等上下文。
- 展示 workspace / project / note / custom folder 的树形组织。
- 新建 folder。
- 重命名 folder。
- 删除空的用户 folder。
- 新建 group 到当前 folder。
- 移动 group placement。
- 搜索 group。
- drop 内容到 group card。
- 打开 Single Editor，并保留 folder 回跳上下文。
- 展示 role、topic、summary、member/petal 信息和 stability 状态。

Gallery 现在已经是最接近 OpenDesign 壳的 surface。

当前 Gallery 的问题主要是视觉与信息密度：

- 卡片还没有完全形成 OpenDesign 的 folder-card 语言。
- role tab、topic strip、status chip 的层级可以更清楚。
- 左侧 folder tree 可以更像资源管理器。
- 顶部工具区可以更接近 OpenDesign 的 search / New folder / New group / Back 布局。
- 空状态、选择状态、当前 folder 目标提示可以更强。

## 4. Single Editor 当前能力

当前 Single Editor 已经具备这些真实能力：

- 从 Gallery / Rail 打开指定 group。
- 编辑 group identity：title、topic、role、summary、status/stability 相关信息。
- 保存 draft / 接受稳定版本。
- 展示 member 列表。
- 接收 drop 内容成为 member。
- 创建 Petal。
- 重命名 Petal。
- 删除 Petal。
- 拖拽调整 Petal 顺序。
- 将 member fragment 分配给 Petal。
- 从 Petal 中移除 fragment / member。
- 展示 source 相关信息的轻量区域。
- 返回 Gallery 并保留 folder 上下文。

当前 Single Editor 的主要问题是“精修心智还没有长出来”：

- 它已经能 refine，但视觉上还偏表单 / 面板。
- Petal 的内部结构还可以更像可操作的知识分区。
- Source drawer 还没有成为稳定的 evidence/来源解释区。
- member material 还没有形成 OpenDesign 那种“材料在工作台上被组织”的感觉。

但这里要非常小心：当前还没有完整 CanvasObject 基础，所以不应该把 Single Editor 重写成真正自由画布。8.7 适合做精修界面的信息层级整理，不适合做完整 workbench。

## 5. 当前系统有但 OpenDesign 壳没有完全表达的能力

OpenDesign 壳漂亮，但它不是完整产品 spec。当前实现里已经有一些壳没有充分展示的能力：

- ContentGroup / GroupFolder / Member / Petal 实体化后的读写边界。
- Member 与 source range 的边界。
- preview_text 只是显示缓存，不是第二 truth。
- Reference / Duplicate / Fork / Materialize / Open original 的语义服务边界。
- hard delete member 时连带清理相关 Petal fragment 的工程原则。
- deterministic root / duplicate root cleanup 的导入清理原则。
- 运行时 contract / model check / build 验证。

这些东西不一定都要在壳上明显展示，但它们决定了壳能不能做得长久。

## 6. 当前缺口分类

### 视觉壳缺口

- Gallery card 结构。
- Gallery folder tree 密度。
- Rail group row 和 drop zone。
- Single Editor header / summary / petal dock。
- status/topic/role 的统一视觉语言。

这些可以较快进入 OpenDesign parity patch。

### 工作流缺口

- Rail 是否需要 All view。
- Gallery 是否默认显示 current folder 还是 workspace all。
- Single Editor 是否需要从 member 直接定位 source。
- Petal dock 应该固定、可折叠，还是跟随选区。
- Reference / Duplicate / Fork / Materialize 要不要进入当前 UI。

这些需要产品判断，不适合只靠 CSS 解决。

### 数据模型或版本边界缺口

- SourceArtifact / SourceAnchor 完整体系。
- ContentGroup projection / CanvasObject usage。
- Graph relation endpoint。
- Graph scope / GraphRAG。
- 真正的自由 Canvas workbench。

这些应该明确留到 8.8+ 或更后面。

## 7. 对后续套壳的启发

最合理的顺序是：

1. 先做 Gallery，因为它数据最稳、壳最接近、收益最高。
2. 再做 Rail，因为它需要保护自然写作，不宜一次塞太多功能。
3. 最后做 Single Editor 的非 Canvas 部分，把 refine 心智做清楚。
4. Single Editor 的真正 workbench 留到 CanvasObject 版本。

这样做不会浪费 OpenDesign 原型，也不会把 8.7 拖成一个伪 Canvas 版本。
