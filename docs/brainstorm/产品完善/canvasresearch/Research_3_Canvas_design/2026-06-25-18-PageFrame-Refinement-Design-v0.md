# 2026-06-25 - PageFrame 精细化设计稿 v0

> 目标：PageFrame 是 Coincides Canvas 中第一个需要被精细化设计的特殊 CanvasObject。它不是普通矩形，而是正式文档面、导出面、页面模板、文本排版边界和用户第一入口。

## 0. PageFrame 的角色

PageFrame 同时承担：

1. 正式写作区域。
2. 导出区域。
3. 文档页面。
4. TextFlow block 的默认承载面。
5. Page Mode 的聚焦对象。
6. AI-readable layout 的 page container。
7. 后续模板 / 页眉页脚 / 页码 / 标尺的宿主。

它是 CanvasObject，但不是普通 CanvasObject。

## 1. Primary PageFrame 规则

### 1.1 有 primary PageFrame

用户从外部打开一篇 note 时：

1. 默认进入 Page Mode。
2. 视野自动聚焦 primary PageFrame。
3. PageFrame 以正式页面比例显示。

### 1.2 没有 primary PageFrame

如果 note 是自由画布笔记：

1. 默认进入 Canvas Mode。
2. 不强行创建 PageFrame。
3. 用户可以后续插入 PageFrame 并设为 primary。

### 1.3 多 PageFrame

当一篇 note 有多个 PageFrame：

1. 只能有一个 primary PageFrame。
2. 用户可以切换 primary。
3. Page Mode 默认聚焦 primary。
4. Canvas Mode 可以看到所有 PageFrame。

### 1.4 删除规则

1. 删除非 primary PageFrame：正常删除或转移其中对象。
2. 删除 primary PageFrame 且还有其他 PageFrame：必须选择或自动指定新的 primary。
3. 只剩一个 PageFrame：它自动成为 primary。
4. 没有 PageFrame：note 回到自由画布模式。

## 2. PageFrame 数据模型

PageFrame 由三层组成：

```text
CanvasObject(kind=page_frame)
CanvasPlacement
PageFrameExtension
```

其中：

1. CanvasObject 表示它是画布对象。
2. CanvasPlacement 表示它在哪里、多大、层级如何。
3. PageFrameExtension 表示它作为页面的特殊能力。

## 3. PageFrameExtension v0

字段建议：

1. `pageSize`：A4 / Letter / Custom。
2. `physicalWidth` / `physicalHeight`：页面尺寸。
3. `displayScalePolicy`：屏幕显示比例策略。
4. `contentInset`：正文区域边距。
5. `rulerEnabled`：是否显示标尺。
6. `snapEnabled`：是否吸附标尺 / margin。
7. `headerEnabled`
8. `footerEnabled`
9. `pageNumberEnabled`
10. `background`
11. `templateId`
12. `exportable`

8.8 只需要其中一部分：

1. pageSize。
2. contentInset。
3. rulerEnabled / snapEnabled 的合同。
4. exportable。
5. primaryFrameId。

## 4. Content Area

PageFrame 有两个矩形：

1. outer rect：页面外边界。
2. content rect：正文可排版区域。

这两个不能混。

用户看到的白纸边界是 outer rect；文字默认进入 content rect。

```text
outer rect
  └── content rect
        └── paragraph blocks
```

## 5. 标尺 / Margin / Snap

用户提到的“标尺”更接近：

1. Ruler。
2. Margin guides。
3. Snap guides。
4. Page content bounds。

在 Coincides 里，它不是硬边界，而是吸附参考线。

### 5.1 开启 snap

当对象靠近 content rect 左右边界：

1. 可以吸附到 left margin。
2. 可以吸附到 right margin。
3. 可以吸附到 center line。
4. 可以吸附到其他对象边缘。

### 5.2 关闭 snap

对象可以自由进入 / 离开 PageFrame，不强制受限。

### 5.3 从外部拖入 PageFrame

对象从 workspace 拖入 PageFrame 时：

1. 接近 margin 时吸附。
2. 放下后更新 `surface=formal_page`。
3. 更新 `frameId`。
4. 更新 `boundaryRole=inside/crossing`。

### 5.4 从 PageFrame 拖出

对象从 PageFrame 拖出时：

1. 如果完全离开，变成 workspace object。
2. 如果跨边界，变成 crossing。
3. 导出时 crossing 需要策略。

## 6. 页眉 / 页脚 / 页码

这些不是普通 CanvasObject 的首要形态，而是 PageFrame 的特殊小组件。

建议作为 PageFrameExtension 内部组件：

```text
PageFrameExtension
  -> header slot
  -> footer slot
  -> page number slot
```

它们可以在后续成熟后挂载 paragraph block，但不应该一开始就散落成普通 object，否则 PageFrame 的导出和模板会变复杂。

## 7. PageFrame Template

模板不是 8.8 必做，但应预留。

模板可能包含：

1. page size。
2. margins。
3. header/footer。
4. background。
5. default typography。
6. export style。
7. page number style。

模板属于 PageFrame 的配置层，不属于 TextFlow 内容。

## 8. Typography 与 Word 类比例

PageFrame 内的文字比例应接近正式文档体验。

原则：

1. 不能像白板 sticky note 那样随意放大文字。
2. paragraph block 在 PageFrame 内应有稳定默认字号、行距、正文宽度。
3. zoom 改变视图，不改变文档字号。
4. PageFrame display scale 与 content font size 分离。

## 9. Page Mode / Canvas Mode

### 9.1 Page Mode

1. 聚焦 primary PageFrame。
2. 交互像正式文档。
3. workspace 噪音尽量隐藏或弱化。
4. 适合写作、阅读、导出前检查。

### 9.2 Canvas Mode

1. 展示所有 PageFrame 和 workspace。
2. 允许对象跨 PageFrame 移动。
3. 适合结构整理、草稿、空间组织。

## 10. PageFrame 与 AI

PageFrame 在 Canvas AI Tree 中应该是 container node。

它需要提供：

1. bbox。
2. content bbox。
3. page size。
4. primary state。
5. exportable state。
6. contained objects。
7. reading order hint。
8. header/footer/page number 状态。

AI 读取 PageFrame 时，应该能理解：

1. 这是正式文档区域。
2. 哪些对象属于它。
3. 哪些对象只是旁边草稿。
4. 哪些对象跨界。

## 11. PageFrame 与导出

8.8 不做完整导出，但数据上必须预留：

1. exportable。
2. page size。
3. content area。
4. object inclusion。
5. crossing object policy。
6. page order。

后续导出时：

1. PageFrame outer rect 是导出裁切边界。
2. content rect 决定正文排版。
3. PageFrame 外 workspace 不默认导出。

## 12. PageFrame 8.8 成熟线

8.8 应完成：

1. PageFrame 是正式 CanvasObject。
2. primary PageFrame 可设定。
3. Page Mode 默认聚焦 primary。
4. Canvas Mode 可看到并移动 PageFrame。
5. PageFrame 有 outer rect 和 content rect。
6. paragraph block 可在 content rect 内创建。
7. snap / ruler 合同存在，UI 可以简化。
8. AI snapshot 能读 PageFrame。

8.9 再完成：

1. 多 PageFrame 插入 / 删除 / 复制。
2. 可视化标尺。
3. margin guides。
4. header/footer/page number。
5. template。
6. export preview。

## 13. PageFrame 结论

PageFrame 是 Canvas Engine 中最像“产品”的部分。它把自由画布拉回正式写作，让 Coincides 既不是普通白板，也不是普通文档。

8.8 的 PageFrame 不需要完整，但必须立住：

1. 它是正式页面。
2. 它承载 TextFlow。
3. 它决定 Page Mode。
4. 它给 AI 提供页面级 layout container。
5. 它未来能扩展成导出和模板系统。
