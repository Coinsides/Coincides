> **状态 (Status)**: complete — 去盒及 13 组前后截图完成；client 全库通过
> **日期**: 2026-09-20
> **范围**: B3 §三笔记页 chrome；不承载验收放行

# B3 笔记页去盒证据

## 现物与射程

| 点位 | 现物 | 五处方缺口 / 本次处理边界 |
|---|---|---|
| Note Actions / Layout / Deleted blocks / Export preview / Delete dialog | `NoteChromeLayer.tsx`，共用 `NoteDetail.module.css` | Actions 行、Typography、Layout 分组和导出面已基本去盒；检查 hover、阴影与危险项，保留 handler、焦点与禁用行为 |
| 外观浮卡 | `components/Skin/SkinFloatCard.module.css` | options 分段框、save 行内框；仅改浮卡与其 dialog/menu。`SkinSample` 被 DesignStudio 复用，样本样式不动 |
| 装订面 | `NoteBindingPanel.module.css` | 输入、选择器、按钮各自有边框与底色；保留一层面板皮，行内控件变平 |
| 表格 / 时间线 / 图表编辑浮层 | `TableBlockEditor.module.css`、`ComponentBlockEditor.module.css` | 表格已有横线，输入与操作按钮仍形成层层框；保留内容网格与原行为 |
| 块/批注上下文菜单、命名浮层、Slash、块操作条 | `NoteDetail.module.css` 中相应选择器 | 菜单行 hover 带框，命名输入有内框；只处理外观，不动命令或写入逻辑 |
| Annotation Inspector / Organizer | `NoteDetail.module.css` 中 annotation 前缀 | set/member/stack/child/range/meta 有多层卡片；候选改为行、分组发丝线与间距；颜色点与色样仍表达语义 |
| Navigation / Tray | `NoteNavigationPane.css`、`NoteNavigationHeadings.css`、`NoteDetail.module.css` tray 前缀 | 搜索框、编号按钮、托盘空态的内层框；页面缩略图是内容投影，保留纸页外观 |
| Source jump / Cover metadata / Paper controls | 各现役 layer 与 CSS | 已有单层壳或平坦行；仅在必要时调淡 hover |
| ContentGroupPanel / Item Relation Inspector | 同一面板带 Relation 子域 | 禁区优先，整个面板与所有 relation 选择器排除；不是全应用扫除 |

已检查权威入口、B3 工单、现役挂点与 CSS。CodeGraph 由主线程确认不可用；本线程 `rg` 不在 PATH，限定 Notes / Skin 路径用 PowerShell `Select-String`。没有新依赖、组件注册、行为、数据层或坐标改动。

## 截图对比

主线程取得首批 11 个视图的改前截图之后，才开始产品 CSS 修改。已落 `before-*` / `after-*` 共 13 组成对图：Actions、Layout、Trash、Skin、Binding、Table、Timeline、Chart、Context、Annotation、Tray、Tools、Navigation。后两组改前图通过下述只读 CSS 基线模式补拍。它们是本地 fixture 的真实组件截图，不冒充完整生产笔记旅程。

本线程已逐张打开 Annotation、Binding、Table、Timeline、Context 的关键后图及相应前图：图片非空，嵌套卡片已被行/分组线替换，删除项着色，输入焦点仍可见；没有看到主要控件被裁掉。Tools、Navigation 后图由主线程检查。More 原来已有去盒，本次主要调淡 hover 与浮层阴影。

## 原始证据

- `.codex-tmp/b3-furniture/chrome-inventory.log`：浮层/面板挂点。
- `.codex-tmp/b3-furniture/chrome-before-*.log`：拟改 7 个 CSS 文件的改前全文，UTF-8。
- `.codex-tmp/b3-furniture/chrome-fixture.html` / `chrome-fixture.tsx` / `chrome-vite.mjs`：直接导入现役 React 组件的隔离截图页。只传本地固定数据和本地空回调，不连接后端、不持久化笔记。用 `node .codex-tmp/b3-furniture/chrome-vite.mjs` 启动，入口 `http://127.0.0.1:5189/chrome-fixture.html?view=actions`。
- fixture 的 `view` 为 `actions/layout/trash/skin/binding/table/timeline/chart/context/annotation/tray/tools/navigation`；`theme=light/dark` 控制现役全局主题。截图由主线程通过浏览器拍摄；本线程未控制用户浏览器。
- `.codex-tmp/b3-furniture/chrome-fixture-vite.log`：Vite 转译返回源码。HTML 与 TSX 的 HTTP 状态均为 200；该检查不替代截图或运行时验证。
- `chrome-vite.mjs` 可在 `B3_CHROME_BASELINE=1` 下起 `5190`：只读加载 `chrome-before-*.log` 作为七个 CSS 文件的 Vite 输入，不修改工作树。它用于后来追加的 `tools` / `navigation` 样张改前补拍；是原 CSS 基线加当前组件，不是仓库旧版本快照。正常 `5189` 使用当前 CSS。
- `.codex-tmp/b3-furniture/chrome-css.diff.log`：限定八个去盒文件的只读 git diff（不含 git 写入）。

## 实施点位

| 文件与定位 | 完成项 |
|---|---|
| `client/src/pages/Notes/NoteDetail.module.css:224` | Actions / Layout / 导出 / Delete 的 hover 改为文字 token 的 4% 淡底；Deleted blocks 多行间发丝线 |
| `client/src/pages/Notes/NoteDetail.module.css:2071` | Annotation/Context 菜单项无框，命名输入只留底线与键盘焦点 |
| `client/src/pages/Notes/NoteDetail.module.css:3334` | 单层浮层阴影；Annotation stack/child/set/member/meta/range 拆框；块操作条、选区工具条平坦化；危险项颜色；保留 focus-visible |
| `client/src/pages/Notes/NoteDetail.module.css:3855` | Slash 项变平坦行，活跃项用左侧线表达；Tray 空态用分组线，不再套虚线框 |
| `client/src/pages/Notes/canvasEngine/layers/ContextMenuLayer.tsx:203` | 仅追加样式 class：已有 trash 图标项用危险色；命令与 handler 原样 |
| `client/src/pages/Notes/canvasEngine/layers/NoteBindingPanel.module.css:6` | 输入/选择器/按钮去内框，分组线与焦点保留 |
| `client/src/components/Skin/SkinFloatCard.module.css:36` | options/save 与套装对话框输入去内框，删除套装着色；预设缩略样本不动 |
| `client/src/pages/Notes/canvasEngine/blocks/TableBlockEditor.module.css:31` | 编辑网格输入和动作无框，表头淡底、行线、删除色；caption 焦点保留 |
| `client/src/pages/Notes/canvasEngine/blocks/ComponentBlockEditor.module.css:18` | 时间线/图表输入和动作无框，条目/系列用行线，删除色；保存行为原样 |
| `client/src/pages/Notes/canvasEngine/layers/NoteNavigationPane.css:45`、`NoteNavigationHeadings.css:4` | 搜索底线、平坦 tab/目录行、编号开关用下划线表达状态 |

五处方逐一落地：外壳一层；菜单和列表是行；分组间距/发丝线；hover 统一极淡 token 派生色；删除项用危险 token 而非描边。保留原生复选框、真正的预设/页面缩略样本和键盘焦点环；这些承载状态或内容，不作为装饰卡片拆除。

ContentGroup / Relation 面板、全应用共用样式、Agent、写门、注册表、数据层、坐标契约均未修改。本分工共 7 CSS + 1 JSX 样式 class；没有行为 handler 改动，没有新测试设计。

## 验证

现役去盒定向回归：`NoteChromeLayer`、`NoteBindingPanel`、`SkinFloatCard`、`TableBlockEditor`、`ComponentBlockEditor`、`NoteNavigationHeadings`、`NoteTraySidebar` 七文件，共 75 条。初跑及中途复跑各有一处旧四预设断言失败（数量、末项名称），分别保留在 `chrome-tests.log`、`chrome-tests-final.log`；主线程已将断言接到现役预设清单。

最终定向 `paragraphFurniture` + `NoteChromeLayer`：2 文件 / 28 条全通过，原始日志 `.codex-tmp/b3-furniture/gate-client-targeted-fixes.log`。最终 client 全库（覆盖上述七文件）：215 文件 / 2210 条全通过，Exit 0，原始日志 `.codex-tmp/b3-furniture/gate-05-test-unit-final-workers2.log`。server 全量与非 git/secrets 验证组件由主线程总表申报；本文不宣称完整门通过。

## 段落家具只读复核

按主线程分工追加 adapter / history / 分页 / print 路径检查，未改实现。普通 `paragraph` 与 legacy `text` 均经现役段落判断；样式写入 placement 的 `display_overrides_json`，服务端保存与 hydration 保留该族；history 从当前 placement 取 live block，正文 blur 与样式重放共用现役串行通道。来源引用条仍位于首片，单片引文的出处底部额外避让引用条；跨页出处只绘于末片；print 共用已有 fragments 与 `BlockEditorLayer`。

已打开 `paragraph-multipage.png`、`paragraph-print.png`：示例的两行出处、正文、提示框与后续正文没有可见遮挡。出处计算宽度 `width - 24 - 20` 与 CSS `left: 34px; right: 10px` 一致。每片都保守预留完整 `sourceHeight`，中间片会有相应留白；这属于本次有意采用的保守布局，不能表述为仅末片预留高度。该观察不扩展为任意长度出处或浏览器原生打印成品的保证。此次只读复核未发现可证实的阻断问题。
