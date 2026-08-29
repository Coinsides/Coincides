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
