> from: claude(fable,代理期直发——调度会话下线,授权:claude-log/2026-08-19.md 条目 1;方案 Henry 2026-08-29 晨当面拍板) | to: codex(builder) | status: ready | re: UX-4b | date: 2026-08-29

# UX-4b:页面归属可见性接线 + 虚线框分色 + 行首按钮删除 + 整理模式合并

## 定位

Henry 实测走查 🅰 头号(档案:`docs/agent-ops/analysis/2026-08-29-ux-walkthrough-findings.md` §4/4-衍生):**canvas mode 创建的 text block,回到 page mode 不显示**——数据在库、投影缺席。病灶已由 Fable 对现物锁定:placement 的 `surface` 按出生模式钉死(canvas 建 = `canvas_workspace`),page mode 不渲染它;而现成几何归属服务 `pageFrameAffiliationService.ts`(`geometry_derived_no_ownership`:中心点判定)只喂导出、未喂可见性。**本单是接线,⛔ 不是新造归属体系。**

## 交付物(四件,同属 client canvas engine 域)

### 1. 几何归属 → page mode 可见性

- page mode 渲染纳入几何归属:`surface === 'canvas_workspace'` 的块,以**中心点**(hitbox 锚点)对 page frame 判定——用现成 `derivePlacementPageFrameAffiliation`,**可见性判定 boundary 用 `outer`**(纸边;中心压在页边距上也算"在纸上"):
  - `inside` / `crossing` ⇒ page mode **可见**,位置按其 canvas_world 坐标如实呈现,**允许溢出**(⛔ 不裁剪、⛔ 不挤位、⛔ 不改写其 layout);
  - `workspace_only` ⇒ page mode 不可见(现状保持)。
- ⛔ 本单不改任何块的持久化 `surface`/坐标数据——可见性是**读时判定**,不是写时改造(与「现状 vs 投影」分离原则一致)。

### 2. 拖拽虚线框二分色(Henry 定案:复用既有蓝色虚线框,⛔ 不新造 UI 元素)

- 拖拽/缩放时的虚线框颜色随**实时归属态**变:页面归属(inside/crossing)= 现有蓝;`workspace_only` = 中性灰(用既有灰系 token,勿造新色值)。
- 两模式(page/canvas)一致。

### 3. 行首三按钮删除(Henry 裁:纯重复)

- 行首的三个 label——拖拽把手 / 新加 text unit / label this row——**不再渲染**(与右侧浮动工具条完全重复)。
- ⚠️ 反例半边:**右侧浮动工具条功能必须俱在**(移动经右侧把手仍可拖、加块与标签仍可用)——⛔ 只删不验等于把功能删没了也全绿。

### 4. 整理模式合并(Henry 定语义)

- 现状是两个独立开关:`layoutMode`(辅助线常显)与 `snapEnabled`(吸附)。**合并为单一「整理模式」开关**:
  - **开**:辅助线常显 + 吸附开 + **松手收编**——松手时若归属为 `crossing`,将 rect **最小平移 clamp 进该页 content rect**(收编入页,跨界态在此模式下不驻留);`inside` / `workspace_only` 不动(⛔ 不把工作区远处的草稿硬拉进页)。
  - **关**:吸附关;辅助线仅手势期间闪现(保留现状行为);松手留原地,允许溢出/重叠。
- 若两开关有持久化字段:兼容读取(旧数据任一为开 ⇒ 整理模式开),如实申报处理方式;⛔ 不做数据迁移。

## 侦察先行(K-0,写进开工回执)

按「产生点逐点列举」与「注册表是形状,选择才是接线」:施工前逐点列举并**附行号**——
1. page mode 的块可见性过滤发生在哪几处(grep 实证,⛔ 不凭印象);
2. `layoutMode` 与 `snapEnabled` 的 UI 开关入口与(若有)持久化位置;
3. 行首三按钮的渲染产生点。
与本单前提不符(如可见性过滤不止一处入口、开关有额外消费者)⇒ **停线写 `needs: claude`,⛔ 不自行扩界**。

## 必红判据(每刀记红点断言原文与行号;施变异先出示落地证明再读红绿)

- **K-1**(灵魂刀,先红后绿):canvas mode 建块、中心点落在页 outer 内 ⇒ page mode 可见。红 = 现状不可见。
- **K-2**(两半各自独立):crossing 块(中心在页内、部分溢出)page mode 可见且**不被裁剪不被挤位**(断言其呈现坐标 == 持久化坐标);对照:workspace_only 块 page mode 不可见。
- **K-3**(两态各一刀):虚线框——页面归属 = 蓝;workspace_only = 灰。⛔ 计数断言不算(「有两种颜色」≠「对的状态配对的颜色」)。
- **K-4**(正反两半):行首三按钮零渲染;右侧工具条移动/加块/标签三功能各自可用性断言。
- **K-5**(两向先红后绿):整理模式开,crossing 块松手 ⇒ rect 完全落入 content rect(最小平移);整理模式关,同样操作 ⇒ rect 逐值不变。两刀必须**各自单独触发**。
- **K-6**(回归):page mode 原生块(formal_page)行为逐字节不变;client `tsc --noEmit` 0;`npm run test:unit` 全绿;`canvasRuntimeBoundaryCheck` 等既有契约检查绿。

## 允许面与禁区

允许面:`client/src/pages/Notes/canvasEngine/**`(services/hooks/blocks/样式)· 该域既有测试与契约检查文件(加断言)· 侦察证明必须时 `client/src/pages/Notes/**` 内相邻文件(逐个在 Result 申报理由)。
禁区:`server/**` · `shared/**` · `client/src/pages/Sources/**` · `sourceFileIntake.ts` / `sourceMaterialization.ts` / `sourceImprints.ts` / `sourceContainerIntake.ts` / `sourceArtifact.ts`(12.9c 在飞面)· `.claude/**` · 其他 handoff/analysis 文档 · 任何 tsconfig/package.json。
越界或前提不符 → 停线 `needs: claude`。

## D 段(探针 / 锁 / 环境)

- 共享树已知 EOL 假脏:`server/src/routes/projections.ts`(porcelain ` M` 但内容等于 HEAD)——判真一律 blob 比对,⛔ 不用 porcelain 承重。
- `.codex-tmp/builder.lock.d` 由派发方持有,owner.json 带 pid;⛔ 不碰其他锁。
- ⛔ PID 8292 的 `codex.exe` 是 Henry 的桌面应用,永不杀。
- 阴性断言前先让同一探针看见已知阳性。

## 验证与回执

**先写开工回执(含 K-0 侦察清单)再施工;预算紧张时先写 Result 再做别的。**门禁:client `npx tsc --noEmit` → `npm run test:unit` → 本单专项 → 既有契约检查。逐门 exit 入表。回执 UTF-8 追加 `## Result`:K-1~K-6 各一段(红点原文+行号)· `git diff --numstat` 对照边界 · 显式范围排除。⛔ 不 commit、不 push、不碰 main、不碰锁。

## 修订(Fable 裁定,二次派工;§4/K-4 涉 Henry 2026-08-29 亲裁)

**针对 K-0 停线问题 1(layoutMode 消费者众)**:整理模式合并 = **`snapEnabled` 并入 `layoutMode`,以 `layoutMode` 为存续开关**。既有 layoutMode 消费者(块聚焦/上下文菜单/image resize/shape/table 可操作态/page frame 移动缩放等)**一律不动**——它们挂的仍是同一开关,零语义变化。具体改动:删除 Layout popover 内独立 Snap alignment 开关 UI(`NoteChromeLayer.tsx:517-543` 一带);`snapEnabled` 的值改为随 layoutMode 派生(开=吸附开);顶栏 Layout 药丸即「整理模式」开关。松手收编行为照 §4 原文。K-5 不变。

**针对 K-0 停线问题 2(右侧无插入入口,Henry 亲裁)**:**右侧浮动工具条(`BlockControlBarLayer`)新增「插入 text unit」按钮**(语义 = 在该块下方插入,与原 gutter Plus 同义;图标沿用 Plus,位置随现有按钮组)。行首 gutter 三按钮(Grip/Insert/Label)照删;**role select(`TextUnitGutterLayer.tsx:83-92`)不在删除范围,保留**。K-4 改为三半,各自独立断言:
- ① gutter 三按钮零渲染(role select 仍在);
- ② 右侧新增 Insert 按钮**功能真实**——点击后该块下方产生新 text unit(⛔ 仅渲染按钮不算;先红后绿:新增前右侧无插入路径);
- ③ 右侧既有 Move/Export/AI/Save/Label/Trash 可用性不回归。

其余交付物与 K 面照原文。允许面不变(`BlockControlBarLayer`/`NoteChromeLayer` 均在 `canvasEngine/**` 内)。

## Result

> builder 开工回执 | 2026-08-29 | `status: needs: claude` | 施工状态: **K-0 停线,生产代码零修改**(已由上方修订段解除,二次派工)

### K-0 侦察清单（逐产生点，`git grep -n` 实证）

1. **page mode 块可见性过滤**
   - 唯一过滤定义在 `client/src/pages/Notes/canvasEngine/modePolicyService.ts:68-77`：先排除 canvas-object backing block，再在 page policy 下以 `!isCanvasWorkspaceBlock(...)` 排除 workspace block；现状仍是持久化 `surface` 判定，不是几何归属。
   - 实际渲染布局的调用点在 `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel.ts:93-96`，其结果进入 `blockLayouts` 与后续渲染。
   - 另有一个**非渲染但真实消费者**在 `client/src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.ts:82-95`：分别求 page/canvas visible blocks，供 TD-7 初始模式过渡桥决定是否自动切 canvas。该桥在 `docs/agent-ops/current-state/tech-debt.md:18,20` 被点名保留/触碰需护栏，本单没有授权改它。
   - `surface` 判别下沉在 `client/src/pages/Notes/canvasEngine/placementService.ts:301-311`；page mode 对已存 workspace layout 另有投影选择分支 `client/src/pages/Notes/canvasEngine/placementService.ts:328-329`。以上均只侦察，未改。

2. **`layoutMode` / `snapEnabled` 的入口、状态与消费者**
   - 状态产生点在 `client/src/pages/Notes/canvasEngine/hooks/useLayoutInteractionController.ts:9-12`：`layoutModeKind` 默认 `off`，`snapEnabled` 默认 `true`；切换函数与派生值在 `:18-54`。两者都是组件内 `useState`，侦察未发现持久化读写字段，因此无旧数据迁移面。
   - UI 入口一：顶栏 Layout 药丸 `client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.tsx:423-435`；UI 入口二：Layout popover 内独立 Snap alignment 开关 `:517-543`。
   - `layoutMode` **并非工单所述仅“辅助线常显”**。除 guide 可见性 `client/src/pages/Notes/canvasEngine/pageFrameGuideService.ts:136-146` 外，它还改变 block 聚焦/上下文菜单 `layers/BlockEditorLayer.tsx:280-312`、TextUnit 上下文菜单 `blocks/TextBlockProjection.tsx:693-695`、image resize handle `layers/ImageObjectLayer.tsx:115,145-152`、shape/table 可操作态 `layers/ShapeObjectLayer.tsx:139` 与 `layers/TableObjectLayer.tsx:150`、page frame 移动/缩放 `layers/NoteWritingSurfaceLayer.tsx:1164-1206`，并有更多同域消费者。
   - `snapEnabled` 参与拖拽 snapping、碰撞与 elastic avoidance：`client/src/pages/Notes/canvasEngine/hooks/useBlockPlacementInteractions.ts:103-119`；同文件 resize 路径及 blank-draft 路径亦消费它（`git grep -n layoutMode snapEnabled -- client/src/pages/Notes/**` 已逐点列出）。因此“把两个开关直接合一”会连带改变对象编辑/page-frame 操作，不是仅合并辅助线与吸附。

3. **行首三按钮产生点与 K-4 反例半边**
   - 每个 TextUnit 唯一挂载点：`client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx:1063-1071`。
   - 三按钮唯一渲染定义：`client/src/pages/Notes/canvasEngine/layers/TextUnitGutterLayer.tsx:50-82`；分别为 Grip/select row `:51-63`、Insert text unit below `:64-72`、Label this text unit `:73-82`（role select `:83-92` 不在“三按钮”内）。
   - 同一阴性探针先在右侧浮动 `BlockControlBarLayer` 看见已知阳性：Move block `client/src/pages/Notes/canvasEngine/layers/BlockControlBarLayer.tsx:92-100`、Label block `:128-137`，二者 `git grep` exit 均为 `0`；随后在同文件查 `add/insert/new block|text unit|<Plus`，exit=`1`。
   - 全域阳性对照显示 `Insert text unit below` / `<Plus` 只落在待删 gutter 的 `TextUnitGutterLayer.tsx:69,71`（ContentGroup panel 的 Plus 属别的功能）。右侧浮动工具条完整按钮表位于 `BlockControlBarLayer.tsx:91-145`，现物是 Move / Export / AI / Save / Label / Trash，**没有“加块/加 TextUnit”入口**。

### 停线判定与需 Claude 回答

工单 `:41,:56` 明令“额外消费者或现物不符 → `needs: claude`，不得自行扩界”。K-0 同时命中两项：

1. `layoutMode` 有大量超出“辅助线常显”的操作语义消费者；若直接与 `snapEnabled` 合并，整理模式会接管 block focus、对象 resize、page-frame 操作等行为。请明确哪些消费者应随整理模式，哪些应拆成独立 edit/operate seam。
2. K-4 要求“右侧工具条移动/加块/标签三功能各自可用”，但右侧工具条没有加块入口；删除 gutter Plus 后无法按工单原文证明右侧加块功能。请明确验收是否允许 Enter/slash/空白面创建等**非右侧工具条**替代入口，或另开授权在右侧新增按钮（后者已超出“纯重复、只删”前提）。

在 Claude 澄清/重划前不写测试、不施变异、不改生产代码。

### K-1～K-6 红绿状态

- **K-1**：未启动；K-0 停线，未写断言、未施变异、未读红绿。
- **K-2**：未启动；同上。
- **K-3**：未启动；同上。
- **K-4**：未启动；K-0 已证明工单要求的右侧“加块”阳性入口不存在，不能制造一个失真的绿测。
- **K-5**：未启动；`layoutMode` 额外消费者语义待 Claude 划界。
- **K-6**：未启动；生产代码零修改，故未浪费运行 tsc/unit/专项/runtime gate。

### 边界基线与显式排除

- 开工前 `git diff --numstat` 为空；`git status --short` 已看见已知阳性 ` M server/src/routes/projections.ts` 与 `?? .claude/settings.local.json`。
- `server/src/routes/projections.ts` 以 blob 判真：HEAD 与工作树均为 `561902a449b50ce254b650de5a337973a8fbc26d`，确认仅 EOL 假脏；未触碰。
- 显式排除且未触碰：`server/**`、`shared/**`、`client/src/pages/Sources/**`、12.9c 在飞文件、`.claude/**`、其他 handoff/analysis、任何 `tsconfig` / `package.json`、main、全部锁与 PID。
- 本轮唯一授权写入是本工单自身的 UTF-8 `## Result` 回执；无 commit、无 push。

### 回执落地后边界复核

- `git diff --numstat`：`55  0  docs/agent-ops/handoffs/2026-08-29-ux-4b-affiliation-visibility.md`；与开工前空基线相比，唯一 tracked diff 即本回执。
- `git diff --name-only`：仅本工单；`git diff --check` exit=`0`。
- 同一 status 探针仍看见且仅额外看见既有 ` M server/src/routes/projections.ts`、`?? .claude/settings.local.json`；前者复核 blob 仍与 HEAD 同 hash，二者均未触碰。
