# V2.BN.8 Open Issue And Brainstorm Checklist

> 本文记录 Henry 在 V2.BN.8 / V2.BN.8.x 测试过程中发现的问题、直觉、临时想法和待修补点。
>
> 它不是正式 patch note，也不是最终 spec。它的作用是先把问题留住，等测试阶段结束后再统一整理成 patch plan。

## 使用规则

- Henry 测试过程中发现的问题先记在这里，不急着立刻修。
- 每个问题先用 checklist 记录，后续再补复现步骤、判断和修复建议。
- 如果某个问题已经进入正式 patch plan，在本文件中标记为 `moved to patch plan`。
- 如果某个问题被确认不是 bug，而是产品决策或未来版本需求，也保留记录并标注原因。
- 如果同一类问题反复出现，应该回到 `Canvas-Engine-Interaction-Contract.md` 或 `Canvas-Engine-Architecture-Spec.md`，不要只靠零散补丁。

## 当前测试状态

```text
Branch: codex/v2-bn-canvas-engine
Stage: V2.BN.8 engine seed manual smoke
Status: 初步人工测试中
```

已确认：

- [x] DevTools 可以读到 `data-canvas-engine-version` 等 engine seed data attributes。
- [x] Note 页面已经挂在新的 engine seed 上。
- [x] 视觉体验与上一版本相比没有明显退化。

## Runtime Replacement Checkpoint

```text
status: L12 code decommission achieved, acceptance incomplete
date: 2026-06-12
```

当前判断：

- `NoteDetail.tsx` 已经退化为 route shell；
- Note 页面真实 runtime path 已经进入 `canvasEngine/NoteCanvasRuntime.tsx`；
- 后续 patch 不应继续把旧 `NoteDetail.tsx` 当作主要修补对象；
- 新问题优先落到 Canvas Engine 的 layer / hook / service 边界中处理；
- 本清单中较早提到“旧 NoteDetail 仍承担 runtime 主体”的条目保留为历史问题来源，当前已被 L12 decommission audit 覆盖；
- `V2.BN.8.1` 仍未完成，因为 browser smoke、performance seed、Henry manual passed 仍是硬验收。

## L9 Floating Overlay Checkpoint

```text
status: portal seed expanded again, pending Henry visual retest
patch: V2.BN.8.1 Floating Overlay Portal Seed + Insert/Source Overlay Portal Seed + Slash Menu Portal Seed + Block Control Overlay Portal Seed + Formula Help Overlay Portal Seed + Shared Overlay Placement Helper Seed + World Overlay Anchor Seed
```

已完成：

- Note info / More actions / Export preview 进入 `FloatingOverlayLayer` viewport portal；
- Preview panel 不再依赖 `noteChrome` 局部 absolute stacking context；
- `+ Insert` / Advanced Insert 已从 document shell 中拆出，进入 `NoteFloatingPanelLayer`；
- `+ Insert` / Advanced Insert 使用 `FloatingOverlayLayer` 的 free placement，不再作为 canvas content；
- Source jump panel 已进入 `FloatingOverlayLayer` viewport overlay stack；
- Slash menu 已进入 `FloatingOverlayLayer` free placement，并使用 viewport/caret anchor seed；
- Block control bar 已进入 `FloatingOverlayLayer` free placement，并使用 selected block viewport anchor seed；
- Formula help tooltip 已进入 `FloatingOverlayLayer` free placement，并使用 help-button viewport anchor seed；
- Slash menu / Block control bar / Formula help tooltip 已共用第一版 viewport placement helper seed；
- `overlayService` 已有 normalized viewport anchor record、world rect 到 viewport rect 的转换 seed 和 `placeAnchoredOverlay()`；
- Slash menu / Block control bar / Formula help tooltip 三个现有调用点已迁到 normalized anchor record path；
- portal shell 不吞掉页面点击，只有实际面板可交互。

仍未完成：

- 现有 anchor record 仍主要由 DOM rect fallback 生成，尚未全面迁到真正 world/caret anchor；
- full caret/world anchor service、完整 collision / flip / viewport clamp service 尚未完成；
- 需要 Henry 手动复测 Preview 是否覆盖 selected block toolbar，而不是混层。

## L10 Surface Mode Policy Checkpoint

```text
status: transition policy seed expanded, pending Henry visual retest
patch: V2.BN.8.1 Surface Mode Controller Seed + Surface Mode Transition Policy Seed
```

已完成：

- Page / Canvas label、next label、page offset、workspace visibility、blank draft placement 已进入 `modePolicyService`；
- Page / Canvas 切换时关闭 overlay、清空 snap guide、清除 block selection 的规则已进入 `createSurfaceModeTransitionPolicy()`；
- `useSurfaceModeController()` 现在执行 transition record，不再自行定义这些清理规则。

仍未完成：

- full pan / zoom transition policy 尚未完成；
- viewport scroll ownership policy beyond current shell seed 尚未完成；
- 需要 Henry 手动复测模式切换后是否还会残留 overlay、snap guide 或 selected block。

## L11 Runtime History Checkpoint

```text
status: keyboard intent service seed expanded, pending Henry visual retest
patch: V2.BN.8.1 Runtime History Boundary Seed + Runtime History Keyboard Intent Service Seed
```

已完成：

- move / resize undo-redo 已进入 `usePlacementHistory()`；
- created block / trashed block 已通过 soft-delete / restore 进入 runtime history seed；
- Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z 的按键意图判断已迁入 `historyService.ts`；
- `usePlacementHistory()` 继续负责 stack 与实际 mutation callback。

仍未完成：

- empty draft undo 尚未完成；
- convert block type undo 尚未完成；
- inline formula conversion undo 尚未完成；
- source / relation mutation undo 尚未完成；
- 需要 Henry 手动复测快捷键触发条件，尤其是输入框内部不应抢走用户输入撤回。

## Open Issue Checklist

### L5 Runtime Placement Record Checkpoint

- [x] `CHECKPOINT-L5-PLACEMENT-RECORD` Canvas runtime placement now has a formal builder in `placementService`.
- [x] Runtime placement records include identity fields, frame membership seed, boundary role, z-index seed, snap state, visibility state, and rotation seed.
- [x] Relation endpoint reserve is now generated from runtime placements as a future connector anchor seed.
- [ ] Henry manual visual retest: no visible regression should appear from this checkpoint.
- [ ] Future promotion review: decide when the runtime placement record becomes a stable docs/contracts or database-facing contract.

### 1. Slash command menu anchor 错位

- [ ] `ISSUE-001` 自由创建下方 block 后，输入 `/` 时 slash command menu 没有出现在当前输入窗口附近。

```text
status: patch applied, pending Henry visual retest
patch: V2.BN.8.1 Slash Menu Caret Anchor + Slash Menu Portal Anchor Seed
```

#### Henry 初步观察

在较靠下的新 block 中输入 slash command 时，菜单漂到页面上方/远离当前 block 的区域，视觉上会让用户误以为命令菜单属于上面的内容。

#### 初步判断

这更像是 overlay anchor / coordinate conversion 问题，不是 slash command 本身的问题。

可能原因：

- 旧 `getSlashMenuAnchor` 仍按输入框整体 rect 计算，没有追踪 caret rect；
- 页面 scroll、block absolute placement、PageFrame offset、engine seed data attributes 之间还没有统一；
- 该菜单已经归入 Canvas Engine 的 `FloatingOverlayLayer` free placement；后续剩余风险是 pan/zoom 后的 full world/screen anchor service。

#### 待补信息

- [ ] 记录 page mode / canvas mode 是否都会出现。
- [ ] 记录是在 draft block 还是已有 block 中触发。
- [ ] 记录菜单实际位置和期望位置。
- [ ] 判断是否与浏览器 scroll position 有关。
- [x] 已将 anchor service 改成 textarea/input caret-first 计算。
- [x] 已让 slash command controller 把当前 caret index 传入 overlay anchor。
- [x] 已将 slash menu 迁入 `FloatingOverlayLayer` free placement。
- [ ] Henry 手动复测：下方 block 中输入 `/for` 时菜单应贴近当前输入行。

### 2. Formula block LaTeX input 规则不符合用户直觉

- [ ] `ISSUE-002` Formula block 目前对 `$...$`、`$$...$$`、多行 LaTeX 的处理不够直觉。

```text
status: patch applied, pending Henry retest
patch: V2.BN.8.1 Formula Preview Display Body + Formula Input Sanitizer And Help Seed
```

#### Henry 初步观察

用户直接复制 Green theorem 的 LaTeX 输入后，预览没有正确渲染。尤其是多行 `$...$` 会直接显示原文。

#### 已确认的技术原因

当前 `KaTeXRenderer` 对 inline math 的解析规则只支持单行：

```text
$...$
```

而多行 display math 需要：

```text
$$
...
$$
```

但这不符合 formula block 的产品直觉。用户在 formula block 中输入的就应该是 LaTeX body，而不是自己判断何时加 `$` 或 `$$`。

#### 产品判断

需要分两种场景处理，不能混成一个规则。

场景 A：独立封装的 FormulaBlock。

Formula block 应该把 `latex_input` 当作独立公式对象处理：

- 用户输入 LaTeX body；
- 系统默认用 display mode 渲染；
- 用户可以继续使用 `$...$` 或 `$$...$$`，但系统必须给清楚提示；
- 如果用户粘贴了 `$...$` 或 `$$...$$`，系统可以做宽容清洗或兼容，而不是失败。
- 当前 patch 已覆盖 whole-input `$...$`、`$$...$$`、`\(...\)`、`\[...\]` 的读取/粘贴/保存归一化。

FormulaBlock UI 需要一个轻量帮助入口：

- 在 LaTeX input 区域附近放一个 `?` help button；
- hover 后显示悬浮气泡；
- 气泡解释 `$...$`、`$$...$$`、纯 LaTeX body、换行公式、常见环境；
- 气泡必须出现在 block 外层 overlay 上，不应该被 block size 裁切；
- 气泡内容必须完整可读。

场景 B：正文 TextBlock / Paragraph / Definition 中夹杂的小公式。

正文里的数学片段不应该自动拆成 FormulaBlock。第一版应该支持用户主动转换：

```text
用户选中一段字符
  -> 右键 / floating toolbar
  -> Convert to formula
  -> 将选中范围转换成 inline math span 或可编辑公式片段
```

右键菜单仍然需要保留正常文本操作：

- copy；
- paste；
- cut；
- 其他常规编辑项；
- 功能区里提供 `Convert to formula`。

转换后必须允许用户微调：

- 如果系统判断 `$...$` / `$$...$$` / LaTeX body 的方式不符合用户预期，用户可以手动改；
- 转换结果需要保留 raw LaTeX；
- 用户可以再次进入编辑状态修改；
- 必须支持 undo；
- 如果转换效果不如原文，用户可以一键撤回。

#### 待补信息

- [x] 确认 `aligned` 环境在 display mode 下可渲染。
- [ ] 确认 `cases` / `matrix` / `array` 等常见环境是否可渲染。
- [ ] 确认 formula block 是否应该默认居中显示。
- [ ] 确认 formula block 的 LaTeX input 展开/折叠行为。
- [x] 确认保存路径会把完整包裹公式归一为纯 LaTeX body。
- [ ] Henry 手动复测：保存后再次打开是否保留纯 LaTeX body。
- [ ] 确认正文 inline math span 的数据结构归属：TextBlock rich text schema 还是临时 markdown-like parser。
- [ ] 确认 `Convert to formula` 第一版是只支持 `$...$` / `$$...$$`，还是支持普通数学表达的弱识别。
- [ ] 确认右键菜单和 floating toolbar 是否共用同一套 command registry。
- [ ] 确认 undo 是走 text operation history，还是走 block-level operation history。
- [x] 已新增 FormulaBlock `?` help seed。
- [x] 已将 FormulaBlock `?` help tooltip 迁入 `FloatingOverlayLayer` free placement。
- [x] 已新增 FormulaBlock paste sanitizer。

### 3. Definition block field draft 初始化错误

- [ ] `ISSUE-003` 手动创建 DefinitionBlock 后，先输入 `concept name`，再按 Tab 切换到 `description`，description 会自动复制 concept name。

```text
status: patch applied, pending Henry retest
patch: V2.BN.8.1 Definition Field Truth And Active Reflow
```

#### Henry 初步观察

操作流程：

```text
创建 DefinitionBlock
  -> 在 Concept name 输入 `CS:GO`
  -> 按 Tab 进入 Description
  -> Description 中自动出现 `CS:GO`
```

这不符合用户预期。Description 应该从空白开始，除非用户主动输入或粘贴内容。

#### 初步判断

这可能不是 UI 本身的问题，而是 structured field draft / text fallback 的同步问题。

可能原因：

- DefinitionBlock 仍然把 `text` 当作 fallback description；
- `concept_name` 修改时同步了 combined text；
- description 读取时又从 combined text / plain text fallback 中取值；
- draft fields 和 block text draft 之间没有明确区分 field truth。

#### 期望行为

- `concept_name` 和 `description` 是两个独立 field value；
- 新建 DefinitionBlock 时，description 初始为空；
- Tab 只负责切换 focus，不写入任何文本；
- 如果用户从 paragraph 转换为 DefinitionBlock，第一版也不做冒号启发式拆分，全文默认进 description，concept name 留空；
- 已经进入 structured block 后，不应继续用冒号/文本 fallback 自动改写字段。

#### 待补信息

- [ ] 确认该问题只发生在新建 DefinitionBlock，还是 paragraph convert 后也发生。
- [ ] 确认保存后刷新页面是否仍复制。
- [x] 检查 `definitionFieldsFromBlock` / `combinedDefinitionText` / fieldDraft 同步路径。
- [x] 已修复 stored field values 被 `body` / `plain_text` fallback 反推 description 的问题。
- [x] 已修复 blur 保存可能拿到上一帧 fields 的风险。

### 4. Active DefinitionBlock 展开后与下方 block 穿模

- [ ] `ISSUE-004` 下方存在 block 时，选中/展开 DefinitionBlock 会与下方 block overlap。

```text
status: patch applied, pending Henry retest
patch: V2.BN.8.1 Definition Field Truth And Active Reflow
```

#### Henry 初步观察

当 DefinitionBlock 进入 active editing 状态后，内部字段区域变高，但下方 block 没有被稳定推开，导致视觉穿模。

#### 初步判断

这是 measurement / reflow 问题，和之前 formula input 展开穿模属于同一类 bug family。

可能原因：

- active structured block 的实际 DOM 高度变化没有及时写回 layout height；
- `onMeasuredHeight` 被 suppression window 拦掉；
- 旧 `NoteDetail` 中 measurement、selection、layout collision 仍然混在一起；
- floating toolbar / field label / input 的高度未被完整计入 block measured height。

#### 期望行为

- structured block active 后，高度变化必须触发 measurement；
- page mode 下，下方 block 应该被稳定 reflow；
- 不应该靠“点一下空白处随机恢复”；
- canvas/workspace mode 后续可以更自由，但 page mode 不能 overlap。

#### 待补信息

- [x] 确认 DefinitionBlock 和 FormulaBlock 是否共用同一个穿模根因。
- [ ] 确认 layout mode on/off 是否影响复现。
- [ ] 确认 snap on/off 是否影响复现。
- [ ] 确认穿模是否只发生于 active 状态。
- [x] 已修复 active Definition 被 measured reflow suppression 拦住的问题。
- [x] 已给 block measurement 增加下一帧复测，降低 active structured fields 展开后一拍测量不足的风险。

### 5. 新建 draft block 的落点需要区分自然写作和自由排版

- [ ] `ISSUE-005` 双击空白处创建新 block 时，落点应该受 `snap alignment` 状态影响。

#### Henry 初步观察

当前行为：

```text
用户在页面任意位置双击
  -> 新 draft block 出现在用户双击的精确位置
```

这个行为适合自由排版，但不完全符合普通写作心智。

#### 产品判断

需要区分两种场景：

```text
snap alignment on:
  偏自然写作。
  双击空白处创建新 block 时，默认贴到上一 block 下方，并左对齐页面内容起点。

snap alignment off:
  偏自由排版。
  保留当前行为，用户在哪里双击，新 block 就在哪里出现。
```

也就是说，`snap alignment` 不只是拖动时的吸附开关，也可以成为“自然排版辅助”的开关。

#### 期望行为

- 默认 `snap alignment on` 时，普通用户可以连续写作，不需要精确点击；
- 新 block 自动进入正常纵向书写流；
- 它应该顶到上一个 block 的底部；
- 它应该左对齐 formal PageFrame 的内容起点；
- 如果用户关闭 snap alignment，才进入自由落点模式；
- canvas/workspace mode 可以保留更自由的空间行为，但 page mode 应优先自然写作。

#### 待补信息

- [ ] 确认 page mode 和 canvas mode 是否共用同一规则。
- [ ] 确认“上一 block”是视觉位置上的上一 block，还是创建顺序上的上一 block。
- [ ] 确认多列布局时，snap on 是否仍然贴到全局上一 block 下方，还是贴到点击区域所在 column。
- [ ] 确认已有右侧 block 时，左对齐新建是否会破坏用户意图。

### 6. CodeBlock 需要独立视觉语言和行级复制/选择能力

- [ ] `ISSUE-006` CodeBlock 当前看起来太像普通 TextBlock，缺少代码区域的视觉区分和复制辅助。

```text
status: partially fixed
patch: V2.BN.8.1 CodeBlock Projection Seed
```

#### Henry 初步观察

当前 CodeBlock：

- 背景和普通 text block 几乎一致；
- 边框/输入区域没有明显代码语义；
- 长时间阅读时，代码和正文容易混在一起；
- block type badge 显示 `CODE SNIPPET`，略长，可以简化成 `CODE`。

#### 产品判断

CodeBlock 应该拥有和普通 TextBlock 明显不同的视觉语言，参考 Codex / ChatGPT 的代码区域：

- 使用不同背景；
- 使用更清晰的代码边框；
- 使用 monospace code font；
- 行距、padding、光标区域和普通段落区分；
- block type badge 简化为 `CODE`。

#### 行级复制 / 选择想法

可以逐步设计：

```text
第一版:
  在代码区域左侧提供行选择 gutter。
  点击某一行左侧按钮/区域，选中整行。
  拖动左侧 gutter，可以选中多行。

后续:
  每行 hover 时出现复制图标。
  点击复制图标复制当前行。
  多行选中后复制选中代码。
```

这个功能的目标不是把 CodeBlock 做成完整 IDE，而是让用户在笔记里保存和复用命令、代码片段时更舒服。

#### 待补信息

- [x] 确认是否第一版只做视觉区分，不做行级复制。
- [x] 第一版已实现独立 code projection、`CODE` badge、代码背景、monospace 输入区和轻量行号 gutter。
- [ ] 确认是否需要语言标签，例如 `PowerShell` / `Python` / `TypeScript`。
- [ ] 确认是否需要整块复制按钮。
- [ ] 确认行级选择是否会和普通文本选择冲突。
- [ ] 确认 CodeBlock 是否需要语法高亮。

### 7. Canvas mode shell 需要铺满工作区，避免气泡边界和双滚动条

- [x] `ISSUE-007` Canvas mode 当前仍像被装在一个页面气泡/容器里，边界和滚动行为不符合真正 canvas 工作区。

#### Henry 初步观察

Canvas mode 下可以明显看到外层容器边缘：

- 左侧边缘很累赘；
- canvas 没有顶到右侧 navigator/sidebar 的边缘；
- navigator bar 收起后，canvas 也应该自动填满释放出来的空间；
- 当前 canvas 区域像一个嵌入卡片，不像主工作区。

#### 产品判断

Canvas mode 应该更接近 workspace：

```text
Canvas mode:
  顶部保留 top bar
  top bar 以下全部交给 canvas workspace
  不保留外层 page/card/gap 边界
  左侧贴紧 navigator/sidebar
  navigator/sidebar collapse 后自动填满
```

Page mode 可以保留更像纸张的边界；Canvas mode 不应该继续像一张被放在容器里的纸。

#### Top bar 高度优化

Henry 观察到滚动后 top bar 会变成一个更紧凑的高度，这个高度反而更适合长期保留。

期望：

- Canvas mode 使用紧凑 top bar；
- Page mode 也可以考虑统一为紧凑 top bar；
- top bar 保留：
  - back to Project；
  - note title；
  - mode / preview / layout / favorite / info / more / collapse 等按钮；
- top bar 不应该占用过多垂直空间。

#### 双滚动条问题

当前 Canvas mode 右侧出现两套 scroll：

```text
外层全局页面 scroll
canvas 内部 workspace scroll
```

Canvas mode 下不应该有全局页面 scroll。只保留 canvas workspace 自己的滚动/移动。

期望：

- Canvas mode 下 body/page shell 不滚动；
- 只允许 canvas workspace 区域滚动；
- 用户在任意 canvas 空白区域滚轮时，都应该移动 canvas workspace，而不是触发全局页面 scroll；
- Page mode 保留普通上下滚动。

#### Insert / Advanced Insert floating action 位置

当前 `+ Insert` / Advanced Insert 按钮位置不理想。

期望：

- 先保留该按钮作为 future advanced insert 入口；
- 在 Canvas mode 下放到右侧垂直居中附近；
- 不要贴在页面内部滚动条附近；
- 不要随着 canvas 内容滚动跑远；
- 它应该属于 viewport/floating UI，而不是 canvas content。

#### 待补信息

- [x] 确认 sidebar 展开/收起时 canvas 是否都能填满剩余区域。当前实现不再使用 `100vw - 320px`，改由 runtime page flex shell 填满主内容区。
- [ ] 确认 Page mode 是否也同步使用紧凑 top bar。当前只在 Canvas mode 固定紧凑 top bar。
- [x] 确认 Canvas mode 下是否需要彻底隐藏 documentShell 的边框/阴影。当前 Canvas mode 去掉 writing surface 边框和阴影，只保留 PageFrame 自身边界。
- [x] 确认 Insert floating action 是右侧居中，还是未来进入 bottom/side toolbar。当前作为 viewport floating action 放在右侧中部；未来可迁入 bottom/side toolbar。
- [ ] 确认 canvas 内部滚轮目前是 scroll，不是 pan；未来是否改为 space-drag / wheel pan。

### 8. Canvas mode 中 PageFrame 高度过度延伸

- [x] `ISSUE-008` Page mode 正常，但切换到 Canvas mode 后，PageFrame 下方出现过大的空白区域。

#### Henry 初步观察

同一篇 note：

- Page mode 下最后一个 block 后的页面边界基本正常；
- 切换到 Canvas mode 后，PageFrame / formal page area 下方保留了一大段空白；
- 这段空白不像是用户创建的内容空间，而像是系统默认留出来的过度高度。

#### 产品判断

Canvas mode 中的主 PageFrame 高度应该接近 Page mode 的正式页面高度：

```text
PageFrame height = max(基础页面高度, 最底部 block bottom + 页面底部留白)
```

不应该因为进入 canvas mode 就强行变成一个很高的 workspace 高度。

如果用户真的想让 PageFrame 继续向下延伸：

- 用户在 PageFrame 内把最底部 block 往下拖；
- PageFrame 随着内容向下自然延伸；
- 这时延伸是有用户行为依据的。

如果用户想把 block 放到 PageFrame 下方的 scratch/workspace：

- 用户应先把 block 水平方向拖出 PageFrame；
- 再绕到 PageFrame 下方；
- 这样可以避免 page content 和 workspace content 混在一起。

#### 待补信息

- [x] 确认当前过度空白来自 `CANVAS_WORKSPACE_HEIGHT` 还是 `pageContentHeight` 计算。当前已拆分：Canvas world 高度只驱动 workspace，PageFrame 边界仍用 `pageContentHeight`。
- [x] 确认 PageFrame height 和 CanvasWorld height 是否被混用。当前 block list 在 Canvas mode 使用 world height，formal PageFrame boundary 使用 page content height。
- [x] 确认 PageFrame 底部留白默认值。当前仍由 `PAGE_FRAME_BOTTOM_PADDING = 96` 驱动。
- [ ] 确认 block 在 PageFrame 内下移时，PageFrame 是否自动延伸。需要 Henry 后续手测拖动场景。

### 9. Canvas mode 必须保留 PageFrame 边界和页面留白

- [x] `ISSUE-009` 从 Page mode 切到 Canvas mode 后，外层 PageFrame 边界/页面留白感消失。

#### Henry 初步观察

Page mode 下可以看到：

- block 蓝色边框；
- 外层 page 边界；
- block 与 page 边缘之间有一段空白。

切到 Canvas mode 后：

- page 外层边界消失或不明显；
- block 看起来贴近 canvas 边缘；
- 原本 A4 页面中的左右留白感丢失。

#### 产品判断

即使进入 Canvas mode，用户仍然是在一个 NoteCanvas 中查看主 PageFrame。

所以应该保留：

- PageFrame 边界；
- PageFrame 背景；
- PageFrame 内边距/margin；
- block 与 PageFrame 边缘之间的默认书写留白。

Canvas mode 不是删除 PageFrame，而是把 PageFrame 放进更大的 workspace。

#### 待补信息

- [x] 确认 Page mode 和 Canvas mode 是否使用同一套 PageFrame visual token。当前 Canvas mode 的 formal PageFrame 继续使用 `var(--border-default)` / `var(--bg-primary)`。
- [x] 确认 PageFrame 边框在深色主题下的可见性。Browser smoke 中 formal PageFrame boundary 可见且横向完整进入视野。
- [ ] 确认 PageFrame 内边距是否进入 layout truth。
- [ ] 确认 block x/y 是相对 PageFrame content area，还是相对 PageFrame outer boundary。

### 10. PageFrame 需要类似 Word ruler 的左右边界/内容宽度调节

- [ ] `ISSUE-010` PageFrame 需要一个用于调整内容左右边界的标尺 / ruler 控件。

```text
status: contract seed applied, pending Henry visual retest
patch: V2.BN.8.1 PageFrame Content Inset Seed
```

#### Henry 初步观察

当前左右留白不太符合普通用户对文档页面的心智。Word 的页面标尺是一个很好的参考：

- 用户可以调左侧内容起点；
- 用户可以调右侧内容边界；
- 页面内容宽度变化后，已有 block 应自然跟随。

#### 产品判断

PageFrame 应该区分：

```text
PageFrame outer bounds
Content area bounds
Left content inset
Right content inset
```

block 默认应该位于 content area 内，而不是直接贴 PageFrame 外边界。

如果用户调整 ruler：

- 左侧内容起点改变；
- 右侧内容边界改变；
- 所有“跟随页面内容宽度”的 block 自动更新宽度；
- 已经被用户手动调整成自由宽度/自由位置的 block 是否跟随，需要后续定义。

#### 初步交互

可以参考 Word：

```text
顶部 ruler
  left marker = content left inset
  right marker = content right inset
```

第一版不一定要完整实现 ruler，但需要先把 PageFrame content inset 这个数据概念写清楚。

#### 待补信息

- [ ] 确认默认 PageFrame 左右留白比例参考 Word 还是自定义。
- [ ] 确认 ruler 是否只在 Page mode 显示，还是 Canvas mode 选中 PageFrame 时也显示。
- [ ] 确认已有 block 自动扩展的条件。
- [ ] 确认自由排版 block 是否脱离 ruler 管理。
- [x] 确认 content inset 是否属于 PageFrame layout truth。当前已进入 `PageFrameModel.contentInset` runtime seed。
- [x] 第一版 Canvas mode PageFrame boundary 已使用 outer frame；block 仍按 content area origin 布局，避免现有坐标大迁移。
- [ ] Henry 手动复测：Canvas mode 下 PageFrame 外框是否能表现出左右书写留白，而不是 block 贴边。

## Brainstorm

### Formula block 的更合理契约

第一版可以这样定：

```text
latex_input = pure LaTeX body
preview = katex displayMode render
storage = 尽量不保存外层 $ / $$，但允许兼容用户粘贴
paste sanitizer = 可以自动识别首尾 $...$ 或 $$...$$
```

这样以后 AI/OCR 生成 formula block 时也更干净：

```text
OCR / VLM -> latex_input -> display render
```

不需要 AI 猜测用户到底想要 inline math 还是 display math。

### 正文数学片段的长期契约

正文中的公式更像 rich text inline object，而不是完整 NoteBlock。

理想结构：

```text
TextBlock
  text segment
  inline_math_span(raw_latex, display = false)
  text segment
  inline_math_span(raw_latex, display = false)
```

display math 也可以临时存在正文流里，但如果用户希望它成为独立知识对象，再主动转换为 FormulaBlock。

### Agent 未来可调用的小能力

这个能力未来可以变成内部 tool / skill：

```text
Math Formula Conversion Tool
```

它服务于两种入口：

- UI 手动入口：用户选中字符后右键转换；
- Agent 入口：用户要求 agent 把某个 TextBlock 中的公式区域转换为视觉友好的公式。

Agent 调用时必须 proposal-first：

```text
检测到 7 处疑似公式
  -> 展示候选
  -> 用户确认
  -> 执行转换
```

不要让 Agent 静默批量改写用户正文。

### Slash command menu 的长期归属

Slash menu 不应该长期由 `NoteDetail.tsx` 自己算位置。更合理的未来结构是：

```text
Canvas Engine
  -> FloatingOverlayLayer
    -> SlashCommandMenu(anchor = world rect / caret rect)
```

也就是说，slash menu、block control bar、preview popover、source picker、relation picker 都应该慢慢归到同一个 overlay 层。

## 待测试输入样本

### Green theorem display body

```latex
\oint_{\partial D} P\,dx + Q\,dy
=
\iint_D \left(
\frac{\partial Q}{\partial x}
-
\frac{\partial P}{\partial y}
\right)\,dA
```

### Green theorem aligned body

```latex
\begin{aligned}
\oint_{\partial D} P\,dx + Q\,dy
&=
\iint_D \left(
\frac{\partial Q}{\partial x}
-
\frac{\partial P}{\partial y}
\right)\,dA,\\
D &\subset \mathbb{R}^2,\quad
\partial D \text{ positively oriented.}
\end{aligned}
```

## Patch Plan Draft

暂时不执行，等 Henry 测试差不多后统一整理。

- [x] Patch A: 修复 slash command menu anchor。
- [ ] Patch B: 重写 Formula block preview input contract。
- [x] Patch C: 增加 formula paste sanitizer。
- [x] Patch D: 增加 FormulaBlock help tooltip，并迁入 viewport overlay seed。
- [ ] Patch E: 设计正文选区 `Convert to formula` 右键菜单入口。
- [ ] Patch F: 修复 DefinitionBlock field draft 初始化和 Tab focus 行为。
- [ ] Patch G: 修复 active structured block measurement / reflow 穿模。
- [ ] Patch H: 调整 snap alignment on/off 对新建 draft block 落点的影响。
- [ ] Patch I: CodeBlock badge 改为 `CODE`，并建立独立代码视觉样式。
- [ ] Patch J: 设计 CodeBlock 行级选择 / 复制 gutter。
- [x] Patch K: Canvas mode shell 铺满工作区，去掉外层气泡边界和全局 scroll。
- [x] Patch L: 统一紧凑 top bar 高度。
- [x] Patch M: 调整 `+ Insert` floating action 到右侧中部 viewport 层。
- [x] Patch N: 修 PageFrame height 在 Canvas mode 里过度延伸的问题。
- [x] Patch O: Canvas mode 保留 PageFrame 边界、背景和内容留白。
- [x] Patch P: 定义 PageFrame content inset / ruler 控件的第一版契约。
- [ ] Patch Q: 将 slash menu / formula preview / inline math conversion / structured block measurement / draft block placement / code block visual language / canvas shell layout / PageFrame ruler 经验同步到 `Canvas-Engine-Interaction-Contract.md`。
  - [x] 已同步 FormulaBlock input sanitizer / help seed / inline formula boundary。
  - [x] 已同步 FloatingOverlayLayer portal seed / preview-info-more actions stacking boundary。
