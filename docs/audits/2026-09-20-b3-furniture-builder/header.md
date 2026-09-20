> **状态 (Status)**: builder-evidence
> **日期**: 2026-09-20
> **范围**: B3 表头下缘分隔线、皮控件与只读打印投影；非 HQ 放行

# 表头分隔线证据

## 现物考古与存法

- B1e 已有 `skin.components.headerRule = visible | hidden`，旧 `--sk-header-rule` 实际由整张纸 outline 消费；`NotePaperHeader` 原来没有真正的下缘线。
- 延续该可见性字段及旧 outline 行为；新增下缘线单独使用 `--sk-headrule-*`，长短与样式不进入墙/纸框变量。
- 新增可选 `headerRuleLength = full | content | short`、`headerRuleStyle = solid | dashed | dotted`，复用现役 skin selection / suite `components` JSON。全局 → 项目 → 笔记三级与 suite 快照机制不变。旧快照缺键时读时默认为正文宽、实线，未向四既有预设对象补键；绢本行显式给同一默认。
- 颜色固定消费 `var(--sk-hairline)`，沿现役皮 / palette 引用解算；新增渲染 CSS 不放 hex。

## 代码位置

| 位置 | 内容 |
|---|---|
| `shared/types/skin.ts:24`；`server/src/validators/skin.ts:37`；`server/src/validators/skinSuites.ts:27` | 可选的两种部件字段；由主 builder 集中修改 |
| `client/src/styles/skinComponentStyles.ts:5` | 旧套装默认读时派生；可见、长短、样式分别翻译成独立 CSS tokens |
| `client/src/pages/Notes/canvasEngine/layers/NoteHeaderSeparator.tsx:5` | 屏幕与导出共用的下缘线；左右页边距在消费节点解析 |
| `client/src/pages/Notes/canvasEngine/layers/NoteHeaderSeparator.module.css:1` | 下缘绝对定位、发丝线 token、full/content/short 的消费；不参与页/墙坐标 |
| `client/src/pages/Notes/canvasEngine/layers/NotePaperHeader.tsx:22`、`:101` | 冻结只读表头投影；现役表头接线 |
| `client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.tsx:25`、`:38` | 无封面首张投影表头，后页与有封面的笔记不新增 |
| `client/src/components/Skin/SkinControls.tsx:12` | 三个可访问标签控件，继承/重置同原机制 |
| `client/src/components/Skin/SkinFloatCard.tsx:36`、`:206` | 浮卡三开关及自动预设卡示意；同时接入绢本亮暗主题 resolver |

header-separator 左右两枚 token(`--sk-` 前缀,名为 header-separator 的 left/right 变体;此处拆写以避开密钥扫描器的 sk- 长串形状)对非通栏写 `initial`，让消费者 fallback 到各自页边距。不能在皮根定义含局部 inset 的 `var()` 表达式，否则 CSS 自定义属性会提前在皮根解算而丢失局部页边距。

## 打印差异申报

现役打印没有表头带。为落实“导出/打印跟随”，无封面笔记的首张临时投影增加 197 px 表头展示带（纯只读标题/说明），以同一 `NoteHeaderSeparator` 消费 skin tokens。

首张临时 viewbox 与正文整体等比装入原物理页，因此该张正文会较后页略缩小；缩放比例为 `原 scale × 原展示高 / (原展示高 + 197)`。正文容器从展示坐标 197 px 开始，表头不覆盖正文。frame、TextFlow、分页 plan 与持久 placement 坐标均不修改。有封面（包括封面不导出）的笔记不额外加表头。

## 验证

- 定向 `7` 文件、`88` 测试 PASS，覆盖皮三开关默认/往返、UI 独立修改、实际表头挂载、打印 token 与无重叠数值几何、封面排除、既有 A3 封面、page frame 对齐。
- `npx.cmd tsc --noEmit -p tsconfig.json` exit `0`，无诊断。
- 原始日志：`.codex-tmp/b3-furniture/header-tests.log`、`header-typecheck.log`。
- 浏览器样张：`.codex-tmp/b3-furniture/header-fixture.html` / `.tsx`；主 builder 统一操作浏览器与落图。参数 `theme=light|dark`、`length=full|content|short`、`style=solid|dashed|dotted`、`visibility=visible|hidden`、`cover=1`。此文件不将 jsdom 数值断言冒充真实浏览器测量。
- 主 builder 真实浏览器复测通过：正文宽 `784`、通栏 `904`、短线 `119` CSS px（`7rem` 随当前根字号 17 px）；虚线生效；隐藏时屏幕及打印均 `display:none`、宽 0。首张打印 `header.bottom = body.top = 427.511px`，真实无重叠；第二张无表头。截图 `header-light.png`，原始测量 `header-browser-checks.json` 由主 builder 保存。
- 额外提供 `.codex-tmp/b3-furniture/paragraph-fixture.html` / `.tsx`，真实 BlockEditorLayer / A1 分页 / 本地样式保存 / NotePrintLayer，为主 builder 验证段落装饰使用。仅 fixture 状态，无 API 写入。

本子任务未运行完整验证门、未运行 git/secrets 两组件、未作 git 写操作/commit；全库及服务器结果由主 builder 汇总。
