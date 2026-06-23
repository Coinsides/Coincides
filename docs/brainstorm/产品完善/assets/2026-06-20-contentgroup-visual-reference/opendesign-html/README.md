# OpenDesign HTML Shells

这组文件来自本地 OpenDesign 输出，是 ContentGroup 三层界面的视觉和交互壳子参考。

原始来源：

```text
C:\Users\70208\OneDrive\Desktop\Working\Open design\Coincides_Content_group_design
```

归档文件：

- `group-gallery.html`
- `groups-rail.html`
- `single-contentgroup-editor.html`

## 用途

这些 HTML 不是生产代码，也不应该直接作为 React 页面复制进去。

它们的价值是：

- 固定三层界面的视觉方向。
- 固定信息密度、布局层级、按钮露出程度。
- 提供可迁移的交互原型。
- 作为后续 `ContentGroup / GroupFolder / Gallery / Rail / Single Editor` 重构的参考稿。

## 三个壳子的产品定位

### Group Gallery

全屏资源管理器。

应该负责：

- folder tree。
- ContentGroup cards / rows。
- Folder / Topic / Role / All 视图切换。
- 搜索、筛选、排序、批量管理入口。
- 打开某个 ContentGroup 的完整 editor。

不应该负责：

- 常驻 Single Group Editor。
- 深度编辑 members / petals。
- 展示大段正文。

### Groups Rail

当前 note / project 的极简资源抽屉。

应该负责：

- 当前 folder path。
- 快速新建 ContentGroup。
- 快速把 Draft Range / Label / Block 丢进 group。
- 快速打开 Gallery / Single Editor。
- 当前上下文内的 Folder / Topic / Role / All 微缩视图。

不应该负责：

- Petal 管理。
- members 详细预览。
- summary / role / topic 的完整编辑表单。
- source locator 等工程字段展示。

### Single ContentGroup Editor

单个 ContentGroup 的知识加工台。

应该负责：

- members 的 workbench / canvas 化摆放。
- Petal 创建、聚焦、分配和管理。
- summary、topic、role/type、identity。
- source / evidence 辅助查看。
- member 当前内容和来源链的区分。

不应该负责：

- 全局 folder 浏览。
- 多个 group 的批量管理。
- 替代 Gallery。

## 可迁移交互

### `group-gallery.html`

可迁移：

- Folder / Topic / Role 视图切换。
- Topic / Role 分组折叠。
- card 的 role tab、topic signal、identity chip。
- folder tree + card grid 的双区布局。

### `groups-rail.html`

可迁移：

- 顶部 folder path / folder picker。
- 搜索展开。
- 新建 group 的轻量 drop zone。
- 展开已有 group 后只显示 drop zone，不显示完整 preview。
- Folder / Topic / Role / All 的紧凑视图切换。

### `single-contentgroup-editor.html`

可迁移：

- 顶部 compact chips。
- summary 折叠条。
- member pieces 在 workbench 上散落。
- Petal 聚焦 / highlight。
- source drawer。
- Petal 面板作为轻量结构导航，而不是表单地狱。

## 本地化原则

1. 先拆职责，再换视觉。
2. 壳子只提供布局和交互方向，真实状态必须接入 Coincides 的数据模型。
3. 不直接使用 HTML 里的硬编码 mock data。
4. 不把壳子里的原生 DOM script 照搬进 React。
5. 迁移为可组合 React components。
6. 保留 `ContentGroup` 是引用 / 整理映射，不搬走原文的原则。
7. 保留三界面边界：

```text
Rail 是入口。
Gallery 是管理。
Editor 是加工。
```

## 推荐后续版本

建议新增：

```text
V2.BN.8.6.23-ContentGroup-OpenDesign-Shell-Localization
```

这个版本的核心目标：

- 将这三个壳子拆成 React surface 和共享组件。
- 把现有 `ContentGroupPanel` 中混杂的 rail / detail editor 职责拆开。
- 改造 `GroupGallery`，移除常驻 detail editor，转成全屏资源管理器。
- 新建或抽出 `SingleContentGroupEditor`，承接完整知识加工台。
- 把 topic / role / identity 的视觉语义从普通表单字段改成 signal / badge / chip。
