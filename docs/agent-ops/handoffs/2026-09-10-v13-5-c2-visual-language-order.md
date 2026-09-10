> **状态 (Status)**: done（builder 施工回执；docs 索引/完整总门与凭据扫描留 HQ）
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: 视觉语言批挂账(⛔零敲碎打);Henry 已拍方向:块边框"淡化成灰虚线,让用户大概忘了,想感觉也能找到"+引用小签状态"藏签里样式区分,形式就是我们的语言";角色把手已 B10 销账;板皮三层⛔此单(OpenDesign 线)
> **单号**: 13.5 · C2 · 视觉语言批(块边框淡化 + 小签状态形态)

# 13.5 C2 · 视觉语言批

## 一 · 块边框淡化

- 纸上块的**默认态**边框改为**淡灰虚线**(几乎隐形——"大概忘了,想感觉也能找到");hover/选中/编辑态的既有强调**不变**;
- ⛔改块交互/布局/几何;⛔碰打印与统揽只读投影的呈现规则(打印仍按原配色);
- 具体灰度/虚线密度 builder 出 2-3 档小样截图申报,自选其一落地并注明可一行换档。

## 二 · 引用小签状态形态

- ReferenceTag(货大签小)按**现物状态集**(Live/Drifted/Lost 等,以代码为准申报)给每态**签内样式区分**:⛔外露文字标签——用边线/饱和度/色相微差表达;色 token 从 annotationColorService 家族取,⛔新调色板;
- 原则=克制、形式即语言:正常态零噪音,异常态(Drifted/Lost)可感知但不喊叫;
- 点开看详情的既有行为不变。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟五条:①块默认态=淡灰虚线,hover/选中强调回归不变(样式断言+真机截图);②签各状态样式可辨且无新文字标签(逐状态断言+截图);③打印/统揽投影呈现零变化(回归);④选区/高亮/参考线等既有视觉层不受干扰;⑤全库回归。

## 四 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 小样档位申报 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

> **From**: codex(builder) · **日期**: 2026-09-10（Toronto）
> **基线**: `fable/v2-bn12-exoskeleton`，HEAD `c93a7af9e8002ea5cffeea1a389769adfadd7d86`。未 stage / commit / push，暂存 diff 为空。
> **交付**: C2 实现与五冒烟完成；本回执不代签 HQ / Henry 放行。原有未跟踪文件均保留。

### Numstat

代码与常驻测试合计 **6 文件，+114 / -2**：

| + | - | 文件 |
|---:|---:|---|
| 20 | 0 | `client/src/components/ReferenceTag/ReferenceTag.module.css` |
| 57 | 0 | `client/src/components/ReferenceTag/ReferenceTag.test.tsx` |
| 4 | 2 | `client/src/components/ReferenceTag/ReferenceTag.tsx` |
| 9 | 0 | `client/src/pages/Notes/NoteDetail.module.css` |
| 22 | 0 | `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.test.tsx` |
| 2 | 0 | `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx` |

本单状态头与 Result **+55 / -1**；新增证据位于 `docs/audits/2026-09-10-c2-visual-language/`：`smoke-report.json` **+221 / -0**，另有 5 张 PNG（二进制 numstat 为 `- / -`）。合计 **13 文件，文本 +390 / -3，另 5 个二进制文件**。本地合成夹具、原始计算样式与日志保留于 `.codex-tmp/c2-browser/` 和 `.codex-tmp/c2-*.log`，不进入产品路由。

### 五冒烟

1. **块默认态 / 强调：PASS。** 三档各含 paragraph / code / formula，9 个真实 `BlockEditorLayer` 外壳计算样式均为 `1px dashed`，默认档 alpha=0.28；与 HEAD 样式对照，9 块几何不变。普通块 hover、code 焦点态、布局模式 hover 的样式与几何逐项相同；selected、归属彩色虚线、跨页边框与上下伪线保留。常驻块测试 16/16（其中新增 6 条适用范围测试）。截图：[三档浅色](../../audits/2026-09-10-c2-visual-language/samples-light.png)、[普通 hover](../../audits/2026-09-10-c2-visual-language/hover-light.png)、[布局 hover](../../audits/2026-09-10-c2-visual-language/hover-layout-light.png)。
2. **引用小签三态：PASS。** 现物状态集仍为 `active / drifted / lost`（详情 Live / Drifted / Lost）；`retired` 只补详情，不增第四态。六色 × 三态共 18 签逐一验证：Live 薄实线 + 原 annotation background 淡填充，Drifted 虚线中空，Lost 点线中空 + `grayscale(0.65)`。三态保持同形，Drifted 取消旧旋转；按钮仍 28×28、签布局仍 10×16，签内文本均为空。只新增从原 annotation 家族取得的 ink/fill 变量；无来源时 screen 使用 slate，原投影色变量保留。常驻 ReferenceTag 测试 11/11，覆盖六色三态、retired、详情打开/来源回调/Escape/Retry；事件与 health 判定未改。浅/深色截图均已检查：[深色三档与三态](../../audits/2026-09-10-c2-visual-language/samples-dark.png)。
3. **打印 / 统揽投影：PASS（回归范围见未做）。** 原只读 renderer、打印/统揽 CSS 与呈现规则无 diff。块 marker 排除 `contentReadOnly`；小签新 screen 规则排除 `[data-note-readonly-fragment]`，且两处新增规则均限 `@media screen`。浏览器真实 `NoteReadOnlyPageContent` 的 3 类块与 18 个只读小签，对照 HEAD 计算样式/几何差异为 0。client 整跑内 `NotePrintLayer` 15/15、`pageFrameAlignment` 12/12。截图：[只读及特殊态](../../audits/2026-09-10-c2-visual-language/regression-light.png)。
4. **选区 / 高亮 / 参考线：PASS。** 浏览器对原有 text-unit selection、annotation highlight、draft selection、snap / margin / center guide 共 6 类的计算样式、几何、z-index、pointer-events 做前后对照，差异为 0。相应生产 CSS、TextFlow 交互、B4–B10/C1 代码未改；全库回归继续覆盖它们。
5. **全库回归：PASS；总门不冒充通过。** `npm.cmd run test:unit` 两轮均整跑、不筛选：**111 文件 / 1187 测试通过**。client `tsc -b`、`npm.cmd run build`（含 tsc + Vite）、server build 全绿。其余允许的 16 项 runtime 子命令全绿：registry 5/5、manifest 10/10、parity 10/10；manifest/parity 14 public；server import 218 文件零违规；canvas boundary 159 checks、gallery 8 checks；rail/single-editor/source 两层/legacy/freshness 均通过；canvas model 60 groups；performance 5 场景。日志 `.codex-tmp/c2-client-tests-final.log`、`c2-client-typecheck-final.log`、`c2-client-build.log`、`c2-gate-*.log`。未筛任何现有 suite 的测试条目。

浏览器证据：[smoke-report.json](../../audits/2026-09-10-c2-visual-language/smoke-report.json)。夹具以真实生产组件 + 全新合成内容运行在本机 Chrome，API 模块替换为纯内存合成读取，无后端或数据库；Vite/Vitest 使用 `COINCIDES_VALIDATION_ENV_DIR=.codex-tmp/c2-empty-env`。HEAD 对照通过临时关闭两块新增 C2 media 规则获得，原 CSS 正文保留；另验 baseline 的实线默认框、2px 实心 Live、12° Drifted 和实线布局框确实恢复，避免空对照。

### 小样档位申报

| 档 | 外壳边线 | 判读 |
|---|---|---|
| A | `1px dashed`，text-muted 18% + transparent | 最淡，深色面较难寻找 |
| **B（落地）** | **`1px dashed`，text-muted 28% + transparent** | **平时退后，寻找边界时仍可辨** |
| C | `1px dashed`，text-muted 40% + transparent | 更容易感知，框感较强 |

三档保持原 1px 几何，均使用浏览器原生虚线节距，未引入叠层/SVG 或修改块内容内饰。**一行换档**：`NoteDetail.module.css` 中 `--paper-block-border-strength: 28%;` 改为 `18%` 或 `40%`。code 内部原有内容框/底色保留；本单只改变默认外壳边界。

### 未做

- 未读 `.env` 或 key 值，未接触用户库，未启动应用后端；未新增或专项运行安全类测试，未运行凭据扫描。未 stage / commit / push。
- 未改打印/统揽规则、板皮三层、块交互/布局/几何或前序 B4–B10/C1；未代做 Henry 主观验收。
- 未做系统打印对话框/物理纸张输出；打印证据为既有整套回归、真实共用只读 renderer 对照及 screen-only 样式边界。未冒称真实用户数据端到端旅程。
- 未修既有构建警告：client 大 chunk、manifest recursive-schema 回落 `any`；不扩本单范围。

### 停线 / 移交 HQ

- **完整 `verify:v2-bn8-runtime` 未整跑**：其末项 `check:changed-file-secrets` 与本单「凭据扫描留 HQ」直接冲突。已按独立原命令完整执行允许子项；不得据此称完整总门通过。
- **`docs:check` 未绿**：回填前、后均因既有 `docs/agent-ops/INDEX.md` 过期退出 1（`c2-docs-pre-result.log` / `c2-docs-final.log`）；单独运行 inventory check 与 glossary K-1～K-3 均通过，`git diff --check` 通过。文档索引收口由 HQ 处理，未越界批量重写索引。
- 本单未发现新增产品实现停线；档位 B 已按单内授权自选落地，后续复核与放行留 HQ / Henry。
