> **From**: fable
> **To**: codex
> **Status**: done(两层制;13.1 单 2 施工完成,工作树交 HQ 验收)
> **日期 (Date)**: 2026-09-07
> **性质**: 施工单(client 引擎,中单)

# 13.1 · 单 2 · 物理映射基线 + 双族 profile

## 〇 · 上游(先读,顺序)

1. 段 plan 含冻结裁定:`docs/agent-ops/handoffs/plans/v13-1-paper-viewport-plan.md`(裁定 2/3/6 是本单法源);
2. K-0 报告:`docs/agent-ops/analysis/2026-09-07-v13-1-k0-recon.md`(§二/§三 现物证据;其「单 2」两行最小改动面清单即本单射程)。

## 一 · 口径(冻结)

1. **print profile 扩员(physicalScale 单一定义点)**:`pageFramePrintScaleService.ts` 的 profile 增加物理字段——pageSize→physicalWidthMm(A4=210,Letter=215.9,Custom=null),`physicalScale = (physicalWidthMm/25.4*96) / 内部宽`;Custom/网页族 physicalScale=1。⛔ 改内部宽高/inset 任何现值;⛔ 触碰存量 frame 几何;
2. **族判定按 templateId**:a4_portrait/letter_portrait=纸族;screen_note=网页族;custom 随 pageSize(A4/Letter→纸族,Custom→网页族)。判定函数放 typographyProfileService 或同层纯函数,单测覆盖四 template × pageSize 组合;
3. **双族默认 profile**:纸族=正文 11pt 族(11pt→物理 px(×96/72)→÷physicalScale 得内部 px,行高/段距同法推导,**由函数经 print profile 计算,⛔ 硬编码换算结果**);网页族=现默认 15px 族升格为 16px 族(K-0 §二:现默认 15px/22px)。DocumentTypographyProfile 结构沿用(px 字段语义=内部 px),⛔ 新造通道;
4. **优先级**:用户 activeProfile(note metadata,hydration/写入通道 `useNoteCanvasDataAdapter.ts:598,935-966` 现物沿用)**永远优先**;模板族默认只在无用户覆盖时补位;混合纸族 note 取首帧族;
5. **有效 profile 一致传递**:屏显(`documentTypographyToCssVars` 唯一 CSS 出口,⛔ 动 `pageFrameTemplateToCssVars`)、估高(`useNoteCanvasLayoutModel` 闭包)、续页(`useRuntimeNaturalWritingController`→`pageStackContentFlowService`)、Preview(`exportPreviewService`)同源;
6. **修现物漏**:`useBlockPlacementInteractions.ts:242` `estimateBlockHeightForText(block,text,width)` 补传当前有效 profile;
7. **零变化面**:canvas 模式行为、测量族函数签名(维持零 zoom 输入)、存量 frame 几何、note metadata 结构(activeProfile 语义不变)。

## 二 · 验证(段纪律:⛔ 马拉松)

1. client typecheck/build(仓库现有脚本,申报命令与输出摘要);
2. 单测:族判定(四组合)+ pt→内部 px 换算(A4/Letter 各一例,数值断言从 physicalScale 推导)+ 用户覆盖优先级;挂既有 client 测试基建,⛔ 新建基建;
3. 一条功能冒烟:同一笔记 a4_portrait→letter_portrait 切换,有效 profile 等比跟随(以估高/换行输出变化为证),canvas 模式对照零变化。

## 三 · 回执与边界

完工在本文件末尾 apply_patch 追加 `## Result`(numstat+验证命令输出摘要+未做清单);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印任何 key;⛔ 动本单射程外文件。现物与口径冲突(如 physicalScale 定义点与现有归一化函数打架)⇒ 停线,在本文件追加 `## 停线` 举证,⛔ 自行改判。

## 停线

2026-09-07 · Codex builder。已按 §〇 顺序完整读取段 plan（含冻结裁定）与 K-0 报告。**施工未完成；产品代码零修改，status 保持 ready，不追加完工 Result。** 停线依据为本单 §三：纸族 11pt 的物理换算及等比跟随，与现役归一化精度存在冲突；冻结口径尚未规定容差或派生默认 profile 的归一化规则。

### 现物与实跑证据

以下 `E/` = `client/src/pages/Notes/canvasEngine/`，行号为本次未修改的工作树源码。

- `E/typographyProfileService.ts:87–89,122–151`：字号、行高、段距、平均字宽均经 `roundOne`，精度固定为 0.1px；另有字号 10–28px 等 clamp。这里不是 physicalScale 的定义点，却会再次改写物理换算结果。
- 后续会重复归一：`E/pageFramePrintScaleService.ts:64`、`E/engineModel.ts:187,376`、`E/typographyProfileService.ts:212`（唯一 CSS 出口）、`E/typographyMeasurementService.ts:34,45,88`。只在生成函数保留小数，无法保持消费端的精确值。
- 只读数值探针实调现有 `createPageFramePrintProfile`、`normalizeDocumentTypographyProfile` 与 `documentTypographyToCssVars`，内部宽度从现有 profile 读取；physicalScale 在探针中按冻结公式推导，**并非声称产品已经实现该字段**。

| 纸型 | 现有内部宽 | 冻结公式 physicalScale | 11pt 应得内部 px | 现有归一化 / CSS px | 映回物理 pt |
|---|---:|---:|---:|---:|---:|
| A4 | 904 | 0.8779875966831581 | 16.70486772486772 | 16.7 | 10.996794648456556 |
| Letter | 904 | 0.9026548672566371 | 16.248366013071895 | 16.2 | 10.967256637168141 |

所需 A4/Letter 内部字号比为 **1.028095238095238**；现役归一化后为 **1.0308641975308641**。这是调用源码得到的量化偏差，不是浏览器复现或人眼比例结论。是否可接受该偏差，必须由 HQ 冻结；builder 不把“数值很小”自行等同于通过。

可重跑配方（仓库根进入 `server` 后执行；从 stdin 运行，无探针文件写入）：

```powershell
@'
import { createPageFramePrintProfile } from '../client/src/pages/Notes/canvasEngine/pageFramePrintScaleService.ts';
import { normalizeDocumentTypographyProfile, documentTypographyToCssVars } from '../client/src/pages/Notes/canvasEngine/typographyProfileService.ts';
const rows = ['A4', 'Letter'].map(pageSize => {
  const width = createPageFramePrintProfile(pageSize).width;
  const physicalWidthMm = pageSize === 'A4' ? 210 : 215.9;
  const physicalScale = (physicalWidthMm / 25.4 * 96) / width;
  const fontSizePx = (11 * 96 / 72) / physicalScale;
  const normalized = normalizeDocumentTypographyProfile({ fontSizePx });
  return { pageSize, width, physicalScale, fontSizePx,
    normalizedFontSizePx: normalized.fontSizePx,
    cssFontSize: documentTypographyToCssVars({ ...normalized, fontSizePx })['--document-font-size'],
    physicalPt: normalized.fontSizePx * physicalScale * 72 / 96 };
});
console.log(JSON.stringify(rows, null, 2));
'@ | node --import tsx --input-type=module
```

本次实际探针退出码 **0**，上述表格为输出摘要；另实调文字估高入口确认仍经现有归一化，不作为 §二功能冒烟申报。

### 需 HQ 裁定后续工

1. 冻结纸族派生度量的精度规则：允许现有 0.1px 量化并指定换算/等比断言容差，或要求保留物理换算精度并明确与用户 profile、canvas 旧归一化规则的边界。全局移除 round/clamp 会改变现有用户覆盖及 canvas 行为；仅按 profileId 豁免则不能可靠区分模板默认与同 ID 的用户 activeProfile，未擅自采用。
2. 接线范围补充建议（非另一个已证实的停线冲突）：`E/hooks/useNoteCanvasRuntimeController.ts:66,82,101,108` 同时持有模式、note metadata、纸框集合、hydrated profile，`:204,287,348` 为估高、续页/resize、屏显/Preview 的共同分发点。建议 HQ 明确将该文件的有效 profile 派生及转递纳入本单射程；K-0 单 2 两行未点名它。现有 adapter 不接收 surfaceMode，不能无条件改其默认值后宣称 canvas 零变化。

### 验证与未做清单

- 本单 `git diff --numstat`：本工单 **55 additions / 0 deletions**，产品代码 **0 / 0**；限定本工单的 `git diff --check` 通过。
- 仅执行限定源码读取与上述只读数值探针；CodeGraph CLI 不可用且无可调用 MCP，`rg` 亦不可用，回退 PowerShell 定向读取；未索引或安装工具。
- 因施工前触发停线，**未执行 client typecheck/build、单测或 §二纸型切换功能冒烟**，不申报任何实现验证通过；未跑完整 runtime 验证门、马拉松或安全类测试。
- 未实施 physicalScale、双族默认、有效 profile 接线或 resize 漏传修复；未改 canvas、测量签名、frame 几何、metadata、CSS、视口或导出。
- 本次写入仅本工单末尾 `## 停线`；未读取 `.env` / 凭证材料，未打印任何 key；未 commit/push/PR/merge。开工已有 `server/src/routes/projections.ts` 修改及三项未跟踪材料均未触碰；工作树留交 HQ。

## 补遗一(2026-09-07,发单方 Fable,针对 ## 停线;停线成立,量化偏差举证有效)

1. **精度规则冻结:量化制**——现役 0.1px 归一化(roundOne)与 10–28px clamp **全局保留,⛔ 豁免⛔ 绕过**;纸族派生默认 profile 的物理换算结果照常经归一化落地(A4→16.7px、Letter→16.2px 即正确产出)。理由:量化误差映回物理 ≤0.5%(10.997/10.967pt vs 11pt),低于感知阈值;且屏显与打印消费同一归一化值,不产生互相分歧;
2. **精度分层**:`physicalScale` 常量本身**全精度保存与使用**(⛔ 舍入)——它还要喂 100% 物理档的整页 transform(连续量,不量化);只有**落地进 profile 的派生度量**才经归一化。一句话:**常量精确,落地量化**;
3. **断言容差冻结**:单测换算断言=派生内部 px 与精确换算差 ≤0.05px(单步舍入界);等比跟随冒烟断言=归一化后映回物理 pt 与 11pt 偏差 ≤0.5%,⛔ 断言 A4:Letter 内部比例的精确值;
4. **射程补充(采纳停线建议 2)**:`useNoteCanvasRuntimeController.ts` 的有效 profile 派生与转递(:66,82,101,108 持有点与 :204,287,348 分发点)**纳入本单射程**;守则:⛔ 无条件改 adapter 默认值;canvas 零变化以对照冒烟为证;
5. 其余口径全部不变(§一 1-7、§二、§三)。按本补遗续作至完工 Result。

## Result

2026-09-07 · Codex builder · **按 §一（经补遗一）施工完成，工作树交 HQ；未 commit，验收与放行仍归 HQ。** 原停线记录与补遗一保留；本次未遇需要新裁定的现物冲突。

### 实现与边界

- `pageFramePrintScaleService.ts` 为物理映射唯一定义点：`physicalWidthMm` 按 pageSize 取 A4=210、Letter=215.9、Custom=null；`physicalScale` 全精度计算，Custom/screen_note 为 1。原内部宽高、inset 常量不变；读取已有 frame.width 计算映射，不写 frame 几何。
- 同层纯函数 `pageFrameTypographyService.ts` 按 templateId 定族，纸族从 11pt 经物理映射生成内部 px，网页族 16px。行高保持旧族 22/15 的比例、段距保持旧族 0、平均字宽保持旧族 0.48 的比例，各度量先算后统一走原归一化；roundOne/clamp 全部保留。
- runtime controller 单点派生有效 profile：canvas 维持 hydrated profile，note metadata 中用户覆盖永远优先（包括旧格式与复用旧 profileId 的覆盖），无覆盖 page 按首帧补默认。adapter 的 hydration/乐观保存/回滚通道与 metadata 结构未改；派生默认不自动持久化。
- 同一有效值进入布局估高闭包、natural writing→页栈续页、presentation→屏显与 Preview。页面屏显直接取已转递的有效 profile，修正显式空 frame 集合时旧 15px fallback 与估高不一致的缺口；仍只有 `documentTypographyToCssVars` 输出排版 CSS，未改 `pageFrameTemplateToCssVars`。
- resize 已传入当前有效 profile；共享调用链上的 **canvas 用户覆盖也因此开始正确用于 resize 估高**，这是 §一.6 指定修漏的效果。canvas 默认族、坐标分叉与空 frame 屏显 fallback 保持原行为；下面的“零变化”证据限定为纸型切换时的 canvas 默认族对照，不申报 canvas 所有行为逐位不变。

### numstat

以下 `E/` = `client/src/pages/Notes/canvasEngine/`。已跟踪文件来自 `git diff --numstat -- client/src/pages/Notes/canvasEngine`；两个新文件来自 `git diff --no-index --numstat -- NUL <path>`，不操作 index。

| 文件（E/ 下） | additions | deletions |
|---|---:|---:|
| types.ts | 3 | 0 |
| pageFramePrintScaleService.ts | 21 | 1 |
| typographyProfileService.ts | 7 | 0 |
| pageFrameTypographyService.ts（新） | 67 | 0 |
| hooks/useNoteCanvasRuntimeController.ts | 10 | 2 |
| hooks/useBlockPlacementInteractions.ts | 6 | 3 |
| layers/NoteWritingSurfaceLayer.tsx | 3 | 1 |
| pageFrameTypographyService.test.ts（新） | 131 | 0 |
| hooks/useNoteCanvasRuntimeController.test.tsx | 139 | 20 |
| hooks/useBlockPlacementInteractions.test.tsx | 35 | 2 |
| layers/NoteRuntimeDocumentLayer.test.tsx | 39 | 1 |
| **产品代码小计（7 文件）** | **117** | **7** |
| **测试小计（4 文件）** | **344** | **23** |
| **代码与测试合计（11 文件）** | **461** | **30** |

本工单的 status 前翻与本 Result 为 **75 additions / 1 deletion**；本单总计 **12 文件、536 additions / 31 deletions**（含两个未跟踪新文件）。开工已有的其他修改/未跟踪材料不计入本单。限定施工目录及本工单的 `git diff --check` 通过（Git 仅提示 LF/CRLF 转换）。

### 实跑验证

所有命令均在 `client/` 执行。现有 `build` 脚本为 `tsc -b && vite build`、`test:unit` 为 `vitest run`；为遵守本单禁读 .env，执行其现有程序的等价入口并显式禁用 env 文件加载，未改配置、未安装依赖或新造测试基建。

1. Typecheck：`node node_modules/typescript/bin/tsc -b` → **exit 0，无诊断**。
2. Build：`node --input-type=module -e "import { build } from 'vite'; await build({ envFile: false });"` → **exit 0**；Vite 5.4.21，**2183 modules transformed，built in 4.21s**。最终 JS 1477.52 kB（gzip 427.43 kB）；有 taskStore 动态/静态导入并存及 chunk >500 kB 警告，无构建错误。
3. 既有 Vitest 3.2.7 定向测试（以下均 exit 0）：

```powershell
node --input-type=module -e "import { startVitest } from 'vitest/node'; await startVitest('test', ['src/pages/Notes/canvasEngine/pageFrameTypographyService.test.ts', 'src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.test.tsx'], { run: true }, { envFile: false });"
node --input-type=module -e "import { startVitest } from 'vitest/node'; await startVitest('test', ['src/pages/Notes/canvasEngine/hooks/useBlockPlacementInteractions.test.tsx'], { run: true }, { envFile: false });"
node --input-type=module -e "import { startVitest } from 'vitest/node'; await startVitest('test', ['src/pages/Notes/canvasEngine/pageFrameTypographyService.test.ts'], { run: true }, { envFile: false });"
node --input-type=module -e "import { startVitest } from 'vitest/node'; await startVitest('test', ['src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx'], { run: true }, { envFile: false });"
```

- 第一批 **2 files / 22 tests passed**（纯函数 18 + runtime root 4，含一条功能冒烟）；resize **1 file / 8 tests passed**。复核修正 screen_note+A4 的 physicalWidthMm 应为 210（仅 scale 为 1）后，纯函数 **18/18 重跑通过**。
- 新增空 frame DOM 回归先因 jsdom 无 ResizeObserver 在 canvas 分支失败；仅在本测试内补 stub 并按测试清理后，显示层 **1 file / 3 tests passed**。没有用跳过或弱化断言消除失败。
- **最终不同用例合计 4 files / 33 tests passed**。覆盖四 template × 三 pageSize 共 12 组合、A4/Letter 精确 scale 与 ≤0.05px 量化界、已有宽度不变、网页族、用户覆盖优先级、首帧选择、真实 pointer resize 与无 frame 时实际 DOM CSS。

### 一条功能冒烟的证据与射程

同一 root controller 挂载实例、同一 noteId 与 frameId，以 rerender 切 `a4_portrait→letter_portrait`；94 字符、内部布局宽 760，实跑 `useNoteCanvasResolvedLayoutModel` 的估高闭包。未断言 A4:Letter 内部比例精确相等。

| 模式/纸型 | 字号 px | 行高 px | 平均字宽 px | 每行容量 | 行数 | 估高 px | 映回物理 pt |
|---|---:|---:|---:|---:|---:|---:|---:|
| page / A4 | 16.7 | 24.5 | 8 | 92 | 2 | 65 | 10.996794648456556 |
| page / Letter | 16.2 | 23.8 | 7.8 | 95 | 1 | 42 | 10.967256637168141 |
| canvas / A4 | 15 | 22 | 7.2 | 103 | 1 | 42 | 不适用 |
| canvas / Letter | 15 | 22 | 7.2 | 103 | 1 | 42 | 不适用 |

纸族映回与 11pt 偏差均 **≤0.5%**；换纸不改内部布局宽，canvas 两次 profile/测量/布局相同，输入 frame 几何逐值保留。root 三个分发点接收同一 profile 实例；CSS 与 Preview 以所收值实调、断言一致。operations/presentation 在该 root 冒烟中为接收端 mock；续页传递另经源码链核对，resize 与空 frame DOM 分别有上述真实交互/显示单测。**这是一条 hook/runtime 功能冒烟，不是完整浏览器端到端旅程，也不是最终打印保真验收。**

### 未做清单

- 未做单 1 的阅读档位/整页 transform/输入坐标适配，未做单 3 的打印或 PDF 输出及光栅对比；未做人眼比例验收。
- 按本单 §二 与段 plan 的定向验证纪律，**未跑完整 `npm run verify:v2-bn8-runtime`**（该聚合门包含全套测试、性能/文档与安全扫描），未跑马拉松、安全类测试或其他版本收口门；不以本回执申报这些门通过。
- 未改现有测量函数签名或引入 zoom 输入；未改 frame 几何/preset 宽高/inset、note metadata 结构、adapter 默认值、模板 CSS helper、server、agent 指令/权限配置。
- 未读取 .env 或凭证材料，未打印任何密钥，未 commit/push/PR/merge。开工已有 `server/src/routes/projections.ts` 修改及三项未跟踪材料均未触碰。产物留在工作树，供 HQ 实质验收与代账。
