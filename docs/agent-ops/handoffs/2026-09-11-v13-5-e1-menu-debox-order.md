> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · 波次 E1 · 菜单去盒 + 视图收纳
> **上游**: 09-11 设计日会议记录(`docs/brainstorm/产品完善/会议记录/2026-09-11-Note-Page-Design-Day-Meeting-Notes.md`)§一通用处方+§三.4,Henry 尾轮批量拍板(§十);三案打样 Artifact《纸的三种气质》方向 B 的去盒纪律

# E1 · 菜单去盒 + 视图收纳

## 零 · 裁定原文

1. **通用处方(去盒卫生工程)**:容器只许一层皮——浮层自身可有边框/阴影,**内部条目永远是"行"不是"卡"**:⛔逐条目边框/背景卡片/嵌套圆角容器;分组=间距+发丝线;hover=一层极淡底色;危险项(Delete note)=颜色⛔边框;小节题(如 TYPOGRAPHY)=大写小字+字距;Typography 参数收敛为浮层内安静小节(label+数值行),⛔再套一层控件框;
2. **⛔调色**:本单是结构手术不是换肤——现役深色配色维持,气质/palette 换肤归 B1 皮系统;
3. **视图收纳**:底部工具条的 Fit width / Fit page / 100% physical 三钮收进一个「视图」icon 钮(lucide 现成图标自选,tooltip "View options"),点开向上弹小菜单,**菜单内保留完整文字**(用户须读懂自己在干嘛),当前激活项有勾选态;Overview 独立保留原位(重做归 E4,本单⛔动其行为);
4. 缩放组(− 108% +)与其余钮维持。

## 一 · 交付面

- **去盒射程=笔记页全部浮层**:⋯ More 菜单、Info、Layout 面板(PageStack 行族)、块回收站、导出预览、删除确认 dialog——逐一按处方整形;More 菜单里的"Note-level actions"死占位卡**顺手删除**(历史注释可留代码);
- 视图收纳:NoteWritingSurfaceLayer 工具条改组;「视图」菜单开合与其他浮层互斥规则沿现役;
- 功能零变:所有 handler/开关/确认流/readonly 语义原样;仅结构与皮相。

## 二 · 禁区

⛔改任何浮层的功能语义/handler;⛔调色板(色值只删不改——删的是逐条目边框和卡底);⛔动 Overview 行为;⛔动 Write/Pen/Eraser(归 E3);⛔TextFlow 面;⛔安全类测试;⛔碰 .git(工作树交 HQ);⛔改 CLAUDE.md/AGENTS.md/权限配置。

## 三 · 验收

- typecheck+build 绿;D2 定向套件(chrome/layers/hooks 20 文件)保绿,若测试断言被删除的卡片 class,改断言随行申报;
- 冒烟(合成/真浏览器,⛔真库):①各浮层开合与功能全通(Layout 开关/删除确认/回收站/Typography 改值/导出预览);②「视图」菜单三项各自生效且勾选态正确;③视觉断言:任一浮层内**零嵌套边框元素**(可写 DOM 断言:浮层容器内 border 非零的后代计数=0,发丝线分隔除外);④死占位卡不再渲染;
- 证据落 `docs/audits/2026-09-11-e1-builder/`。

## 四 · 申报义务

Result 必含:交付清单+diff 规模;逐浮层整形对照(改前病灶→改后);测试改动申报;冒烟证据;测试数字。冲突停线⛔自作主张。

## Result

2026-09-11 · codex builder · 工程交付完成，工作树交 HQ 复核；未 commit / push / PR / merge。未遇到并行代码冲突。开工已有的文档与 `.claude/settings.local.json` 改动原样保留。

### 交付清单与规模

- `NoteDetail.module.css`：笔记级浮层内部改为行、无卡底/逐条边框/嵌套圆角；分组只用间距与单边发丝线；hover 复用现役 `--bg-hover`，危险操作复用现役 `--error`。现役 palette 与外壳颜色未改。
- `NoteChromeLayer.tsx`：删除 “Note-level actions” 死占位卡，Delete note 使用危险文字/图标色；More、Info、Layout、回收站、删除确认加明确浮层标识供 DOM 审计。删除 dialog 同时修正全局 margin reset 导致的左上角定位，以 `margin:auto` 居中。
- `ExportPreviewLayer.tsx`：计数、开关、分组和条目全部去盒；四个开关成为有文字的行，原 aria-label、pressed 状态、handler 与 details 开合不变。右端 help 气泡改为向左展开，消除行式布局下的横向溢出。
- `NoteFloatingPanelLayer.tsx`：盘点发现另一个活的笔记级 Source snapshot 浮层，按“全部浮层”射程一并去掉摘录内框。Groups 是独立组织工作侧栏；文本编辑/选区浮层属于本单 TextFlow 禁区；Overview 和退役 canvas 路径未扩改。
- `ViewOptionsMenu.tsx/.module.css` + `NoteWritingSurfaceLayer.tsx`：三档收进 lucide Scan 图标钮，tooltip / accessible name 为 `View options`；向上弹出菜单，完整三标签、单一勾选、箭头导航、Escape/外点关闭与焦点返回。原 gear 回调、长页 Fit page 滚顶参数、Overview 及 −/百分比/+、Write/Pen/Eraser 控件保持。
- 互斥接线：沿 `useFloatingOverlayController` 现有单一 `activeOverlay` 加 `viewOptions`，经 `useRuntimeSurfaceStateController` → `useNoteCanvasRuntimeController` → `useNoteCanvasLayerProps` 传入；`interactionController` 仅扩展 panel 联合类型。没有新增平行浮层状态机关。
- 源码 diff（含新文件，不含本回执和审计产物）：**12 个生产文件 +295/−113；3 个测试文件 +152/−1；合计 15 文件 +447/−114**。逐文件明细：[diff-summary.json](../../audits/2026-09-11-e1-builder/diff-summary.json)。

### 逐浮层整形对照

| 浮层 | 改前病灶 → 改后 | DOM 嵌套边框（静止 / hover） |
|---|---|---|
| More / Typography | action 卡 + 死占位卡 + 排版套框/参数框 → 无框行、死卡移除、排版小节及 label/数值行，危险项用色 | **0 / 0** |
| Info | 四格数据卡 → label/数值纵向行 | **0 / 0** |
| Layout / PageStack | stack 卡、page 卡、primary 卡底及小按钮框 → 分组发丝线、缩进行、无框动作 | **0 / 0** |
| Deleted blocks | 块卡 + Restore 按钮框 → 块身份行 + 无框恢复动作，原空态/只读/恢复中状态保留 | **0 / 0** |
| Export preview | 计数卡、开关盒、告警卡、details 卡、badge 框及条目卡 → 计数/开关行、无框告警与明细、发丝线分组；全部 details 展开审计 | **0 / 0** |
| Delete confirmation | 内部按钮框 → 无框 Cancel / 危险色 Move to Trash，单一外壳居中 | **0 / 0** |
| View options | 底栏三个常驻文字钮 → 一个 icon 入口，菜单内三个文字行 + 单勾选 | **0 / 0** |
| Source snapshot | 摘录再套框 → 同一浮层内标题与正文 | **0 / 0** |

### 测试改动申报

- `NoteChromeLayer.test.tsx`：在既有 D2 菜单测试增加死卡标题与说明不渲染断言；将既有删除 smoke 中“占位说明位于 disabled 卡”的断言改为“不再渲染”。其余删除确认、取消、失败重试与 readonly 断言保留。
- `pageFrameAlignment.test.tsx`：helper 补接 `onCloseOverlay`，新增 **1 项**完整 writing layer 视图菜单接线/长页滚顶/Overview 原回调/工具与缩放保留验证；未删原断言。
- 新增 `ViewOptionsMenu.test.tsx` **5 项**：三档既有状态控制器与勾选、键盘、外点/焦点关闭、Overview 禁用、五个既有浮层双向互斥。
- D2 首轮 **261 pass / 1 fail**，唯一失败是已删死卡的旧存在断言，记录保留于 [targeted-initial.json](../../audits/2026-09-11-e1-builder/validation/targeted-initial.json)。按工单许可同步断言后，最终 **20 文件 / 262 pass / 0 fail / 0 skip**；独立 View suite **1 文件 / 5 pass / 0 fail / 0 skip**。合计 **21 文件 / 267 通过**，相对 D2 基线新增 6 项。
- Client `tsc --noEmit`、最终 Vite production build、`git diff --check` 均 exit **0**。构建保留现有大 chunk / taskStore 混合导入警告。按本单 §二/§三执行定向验证，未运行安全类测试或含此类套件的全仓 `verify:v2-bn8-runtime` 总入口；不据此宣称全仓总门通过。

### 冒烟证据与边界

- [证据目录与复跑说明](../../audits/2026-09-11-e1-builder/README.md)、[机器报告](../../audits/2026-09-11-e1-builder/smoke-report.json)、[验证命令/输出](../../audits/2026-09-11-e1-builder/validation/)、`verify.mjs`、`smoke.mjs` 与隔离 fixture 均已交付。
- Chrome 152 实际渲染真实组件与现役 CSS；使用合成数据与回调状态，**不启动业务后端、不访问真库**。**55 项断言通过 / 0 失败 / 8 类浮层 / 16 次静止与 hover 检查 / 55 个 hover 目标**。
- DOM 断言逐一遍历浮层所有后代并读取 computed border 四边宽度，**嵌套边框 0**；仅豁免“唯一一个水平边、宽度 ≤1px”的分组线，8 类静止样本共 **11 条**。附加断言：嵌套阴影、圆角盒、静止卡底均为 **0**；导出面板无横向溢出；删除框居中；死占位卡不渲染。
- 行为覆盖：More 原动作、Info 开合、Layout 模式与 PageStack 行动作 ID、回收站恢复至空态、Typography 四参数/Reset、导出四开关与分组、删除确认/取消/提交、View 三档生效及单勾选/互斥/Escape、Source 关闭、readonly 与 modal 删除限制。截图 `01-more.png` 至 `12-readonly.png` 按场景留存，builder 已逐类看图复核。
- 证据限于组件交互、实际 CSS 与客户端状态/回调链；**不把合成回调当作数据库持久化或用户主观验收**。HQ 保留复核与放行。
