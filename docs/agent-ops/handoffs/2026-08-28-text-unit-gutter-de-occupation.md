> **状态 (Status)**: ready
> **from**: claude(opus,工程调度会话) · **to**: codex(builder) · **date**: 2026-08-28
> **裁定来源**: Fable(Henry 亲诊「控件永不占字符位」+ 编辑器北极星「Word 的安静」;范围收窄为纯力学见 `ddbc118`)

# 单 A:行首控件迁出排版流(纯力学)

## 0. 范围(⛔ 越界即停)

**只做一件事**:让行首控件簇**不再占据排版流的列宽**,改为悬在文本列左侧的**檐下绝对定位槽**。

⛔ **不做**:不撤任何控件、不改任何控件的行为、不做交互重设计、不动图标、不动 `aria-label`。
📌 完整交互设计(按钮存废 / 格式动作迁工具栏·右键·快捷键·选中态)**整体停车**,触发器 = V13 真实使用攒出的摩擦记录。依据档:`analysis/2026-08-28-editor-interaction-direction.md`。

## 1. ⚠️ 现物核实结果(⛔ 别照旧记录施工,旧记录已订正)

`client/src/pages/Notes/canvasEngine/layers/TextUnitGutterLayer.tsx` 里是 **4 个控件,不是 3 个**:

| # | 元素 | `aria-label` |
|---|---|---|
| 1 | `GripVertical` | ⚠️ **`Select/Deselect text unit row`** —— **是行选择,不是拖拽把手** |
| 2 | `Plus` | `Insert text unit below` |
| 3 | `Tag` | `Label this text unit` |
| 4 | `<select>` | `Text unit writing role`(CSS `width:8px; font-size:0`) |

⚠️ **真正的拖拽在别处**:`blocks/TextBlockProjection.tsx:1295` `aria-label="Drag selected range"`(选区拖进 ContentGroup)—— **不在行首簇,本单不碰**。
⛔ **别去行首簇里找"拖拽把手" —— 找到的会是行选;把行选当拖拽删掉才是真事故。**

## 2. 病灶(已现物确认)

`client/src/pages/Notes/NoteDetail.module.css`:
```css
.textUnitRow { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 4px; ... }
.textUnitGutter { opacity: 0; }          /* :hover / :focus-within 时 opacity:1 */
```
⇒ 控件虽 `opacity:0` 隐身,**首列恒占 58px + gap 4px**,文字左缘被**恒定推右 62px**。

⚠️ **是恒定占位,不是抖动**。**收益 = 「文字左缘左移 62px」;⛔ 验收话术不许写「消除抖动」** —— 恒定占位无抖动可消,**给验收人一个不存在的现象去找,会让验收自己变成假阳性**。

## 3. 改法(允许面)

**允许面(⚠️ 2026-08-28 订正 —— 原文只列了两个生产文件,与 §4「先新建测试文件」自相矛盾;builder 据此停线,处置正确,记功)**:

**生产文件,仅此两处**:
- `client/src/pages/Notes/NoteDetail.module.css`(`.textUnitRow` / `.textUnitGutter` 及必要的新规则)
- `client/src/pages/Notes/canvasEngine/layers/TextUnitGutterLayer.tsx`(**仅**在需要时加 class,⛔ 不改控件数量/行为/label)

**外加,明确允许新建**:
- `client/src/pages/Notes/canvasEngine/textUnitGutterDeOccupation.test.ts`(§4 的两条断言)

⛔ 除上述三个文件外一律不动。

**目标形状**:
1. `.textUnitRow` 列模板变**单列**(去掉那个 58px 固定列);
2. `.textUnitGutter` 改 `position: absolute`,悬在文本列左缘之外(檐下);
3. **保持** `:hover` / `:focus-within` 时 `opacity:1` 的现身行为;
4. ⭐ **硬闸**:`.textUnitRow` 的 `margin-left: calc(var(--text-unit-indent, 0) * 24px)` 缩进必须保住 —— **檐下槽要随缩进走,⛔ 不许飞出到固定位置**。

## 4. ⭐ 必红判据(⚠️ 先补断言,再改码 —— 顺序不可换)

**新建** `client/src/pages/Notes/canvasEngine/textUnitGutterDeOccupation.test.ts`(vitest)。

⚠️ **这条锁的限度,如实写进测试文件顶部注释**:
> jsdom 无真实排版引擎,**量不出像素**。本锁是**结构锁**:锁「行不再有固定首列」+「gutter 为绝对定位」这个**机制**,⛔ 不锁像素位置。

**两条独立断言**(读 `NoteDetail.module.css` 源文本判定即可,⛔ 不依赖 jsdom 布局):
- **K-1**:`.textUnitRow` 的 `grid-template-columns` **不含固定首列**(即不匹配 `/grid-template-columns:\s*\d+px/`)。
- **K-2**:`.textUnitGutter` 规则块内含 `position: absolute`。

**必红要求**:**在改 CSS 之前**跑这两条,**必须双双为红**(现码是 `58px minmax(0,1fr)` + 无 `position`)。
⛔ **红不出来就停下上报,不许往下改。**

⚠️ **变异必须语法有效、语义定向**(家法):要验断言真的在盯这两处,就把 CSS 改回双列/去掉 absolute 看它变红,**⛔ 不许用正则整块替换制造语法错误** —— 那测的是编译器,不是断言。

## 5. 辅助验收(⛔ 不承重)

改后人眼截图对比(文字左缘左移约 62px,控件悬停仍现身,缩进层级仍正确)。
⚠️ **截图是辅助,⛔ 不是判据** —— 判据是 §4 那两条。

## 6. 收工前必跑

```
npm --prefix client run test:unit
npm --prefix client run build
```
两者必须全绿;⛔ 不许跳过、不许 `--no-verify`。

⚠️ **2026-08-28 订正(第二次派工后)**:原文点名的是 client 的 **`test`** script —— **它在 `client/package.json` 里不存在,只有 `test:unit`**。(⛔ 此处不逐字复写那条坏命令:发单闸按字面扫 `npm ... run ...`,分不清「指令」与「引述」。**改述,不改闸。**)builder 据此第二次停线,**处置正确**(补 alias 要动第四个文件,越过钉死的三文件允许面,它没有自行扩面)。
⇒ 采其**第 2 条**:订正命令为现行全量门 `test:unit`,⛔ **不新增 alias**。

## Result

**状态**: 停线，未进入施工 · **needs**: henry / claude

### 开工核实

- 当前分支：`fable/v2-bn12-exoskeleton`。
- 两个生产允许面 `client/src/pages/Notes/NoteDetail.module.css` 与 `client/src/pages/Notes/canvasEngine/layers/TextUnitGutterLayer.tsx` 均无开工前工作区改动。
- §4 点名的新文件 `client/src/pages/Notes/canvasEngine/textUnitGutterDeOccupation.test.ts` **开工前不存在**。
- 工作区另有与本单无关的既存修改 `server/src/routes/projections.ts`；未触碰。
- `.codex-tmp/builder.lock.d/owner.json` 已存在，内容指向本单（`order: 2026-08-28-text-unit-gutter-de-occupation`，`dispatcher: opus-engineering-session`）；未覆盖、未删除该锁。

### 停线原因：允许面与必红步骤不能同时成立

工单 §3 明写“**允许触碰的文件，仅此两处**”，只列 `NoteDetail.module.css` 与 `TextUnitGutterLayer.tsx`；Henry 本轮又明确重申“允许面只有这两个文件，越界即停”。但 §4 同时要求先**新建** `textUnitGutterDeOccupation.test.ts`、补两条断言并在改码前取得双红。

现物核实表明该测试文件不存在。因此：

- 若新建测试文件，会越过明确允许面；
- 若不新建测试文件，则无法执行 §4 的两条断言与改码前双红；
- 把测试塞进两个生产文件中的任一处既不符合 §4 点名路径，也会污染生产文件，未采用。

按 `handoffs/README.md` 的坏合同处置规则（不选边、不猜发单方意图）以及本单“越界即停”，在任何代码写入前停线。需上游明确把该测试文件加入允许面，或另行指定两条断言在现有允许面内的合法落点，方可继续。

### 红点与验证实况

- K-1：**未运行**；断言文件无合法写入权限，不能制造红点。
- K-2：**未运行**；同上。
- 改码前双红：**未取得**。这不是“断言意外为绿”，而是前置合同冲突使断言无法合法落地。
- 定向变异验证：**未运行**；尚未进入允许施工阶段。
- `npm --prefix client run test`：**未运行**；无交付可验，且前置必红门未通过。
- `npm --prefix client run build`：**未运行**；同上。

### 实际改动

- 生产代码 / CSS / 测试：**零改动**。
- 仅按工单要求回填本 `## Result`，如实记录停线事实。

---

## 复核方处置(claude,2026-08-28)

⭐ **停线判为正确,记功**:工单 §3 与 §4 确有硬冲突(允许面只列两个生产文件,却要求新建测试文件),**这是我写单的错误,不是它的**。它**没有自行扩面把测试文件写进去**,而是停下上报 —— **「不许凑刀」这条家法在它身上是活的**。
📌 **零改动、锁未被覆盖、无关的 `server/src/routes/projections.ts` 未被顺手碰** —— 停得干净。

**订正**:§3 允许面已明确纳入 `textUnitGutterDeOccupation.test.ts`。**其余边界一字不改。**

## Result(第二次派工)

**状态**: 停线于收工门；实现与允许面内验证已完成并保留 · **needs**: claude / henry

### 开工与允许面核实

- 当前分支：`fable/v2-bn12-exoskeleton`。
- `NoteDetail.module.css` 与 `TextUnitGutterLayer.tsx` 开工前均无工作区改动；`textUnitGutterDeOccupation.test.ts` 开工前不存在。
- 工作区既存的 `server/src/routes/projections.ts` 未触碰；另一张工单亦未并行施工。
- 本轮实现面只触碰 `NoteDetail.module.css` 与新建测试文件；`TextUnitGutterLayer.tsx` 保持零 diff。本文的 Result 回填是派工明确要求的报告面，不作实现扩面。

### 改码前必红实况

定向命令均为：

```text
npm --prefix client run test:unit -- src/pages/Notes/canvasEngine/textUnitGutterDeOccupation.test.ts
```

1. 首次运行在收集阶段报 `TypeError: The URL must be of scheme file`，`no tests`；原因是 jsdom 下 `import.meta.url` 不是 `file:` URL。**这不算红点**。仅在测试文件内改为从 `process.cwd()` 解析 CSS 路径，生产文件仍为零改动。
2. 路径修正后曾出现 `2 tests | 2 failed`，但输出揭示 K-2 抽到了更早的组合选择器 `.textUnitRow:hover .textUnitGutter`，不是独立 `.textUnitGutter` 规则。**该次 K-2 也不作承重红点**。仅把规则抽取收紧为整行精确 selector，生产文件仍为零改动。
3. 精确 selector 修正后取得合格双红（exit 1，`2 tests | 2 failed`）：
   - K-1 独立失败，收到 `.textUnitRow` 中的 `grid-template-columns: 58px minmax(0, 1fr)`；
   - K-2 独立失败，收到 `.textUnitGutter` 自身规则，确无 `position: absolute`。

至此才进入生产实现；没有拿前两次测试自身的错误冒充必红。

### 实现

- `.textUnitRow` 改为单列 `grid-template-columns: minmax(0, 1fr)`，删除旧固定首列及其 `gap: 4px`。
- `.textUnitGutter` 增加 `position: absolute; top: 0; right: calc(100% + 4px)`，以 `.textUnitRow` 的既有 `position: relative` 为 containing block，悬在文本列左侧并退出排版流。
- `margin-left: calc(var(--text-unit-indent, 0) * 24px)` 原样保留；槽随 row 的缩进移动。
- `:hover` / `:focus-within` 的 `opacity: 1` 规则原样保留。
- `TextUnitGutterLayer.tsx` 零改动，因此四个控件、全部行为、图标与 `aria-label` 均未改变。
- 新测试顶部明确说明 jsdom 无真实排版引擎，本锁只锁结构机制、不锁像素位置。

实现后定向测试 exit 0，`2 tests | 2 passed`。

### 语义定向变异实况

- K-1 变异：只把 row 改为语法有效的 `58px minmax(0, 1fr)`。结果 `1 failed | 1 passed`，仅 K-1 红，K-2 绿。恢复单列后 `2/2` 绿。
- K-2 变异：只把 gutter 改为语法有效的 `position: static`。结果 `1 failed | 1 passed`，仅 K-2 红，K-1 绿。恢复 `absolute` 后最终定向测试 `2/2` 绿。
- 两次均用精确补丁修改单一声明；未用正则整块替换，未制造 CSS 语法错误。

### 收工验证

- `npm --prefix client run test`：**exit 1，未绿**。现行 `client/package.json` 没有 `test` script，npm 原文为 `Missing script: "test"`。
- `npm --prefix client run test:unit`：exit 0，`24` 个测试文件、`226` 条测试全绿（含本单 `2/2`）。
- `npm --prefix client run build`：exit 0，`tsc -b && vite build` 完成（`2181` modules transformed；仅既有非阻断 bundle/dynamic-import warning）。
- `npm run verify:v2-bn8-runtime`：exit 0；unit、契约、smoke、client/server build、docs check、`git diff --check` 与 changed-file secret scan 全部通过。
- 人眼截图未执行；按 §5 它只属辅助且不承重，本单不据此声称像素位置已被自动验证。

### 与工单不符之处及停线原因

§6 与本轮指示都要求精确命令 `npm --prefix client run test` 全绿，但现物只定义了 `test:unit`，没有 `test`。补一个 alias 必须修改第四个文件 `client/package.json`，越过本轮钉死的三文件允许面，故没有自行扩面。

需要上游二选一后才能把本单翻为 `done`：

1. 明确把 `client/package.json` 纳入允许面并授权补 `test` script；或
2. 订正收工命令为现行全量门 `npm --prefix client run test:unit`。

在此之前不把替代命令的全绿冒充工单精确命令全绿，handoff 顶部状态保持 `ready`。

## Review(第二次派工)

> reviewer: claude(opus,工程调度会话) | date: 2026-08-28 | verdict: **PASS**(停线理由核实为真,已按 builder 给的第 2 条订正)

### 1. ⭐ 两把刀复核方亲手施过(⛔ 不采信 Result 里的自述)

| 变异(语法有效、语义定向) | 结果 |
|---|---|
| `.textUnitRow` 单列 → 恢复 `58px minmax(0,1fr)` | ⭐ **只有 K-1 红,K-2 绿** |
| `.textUnitGutter` `absolute` → `static` | ⭐ **只有 K-2 红,K-1 绿** |
| 两次还原后 | **2/2 绿**,`numstat` 仍 `4/2`(内容未被复核动过) |

⇒ **两条断言互相独立,各自盯住自己的位点** —— 不是「一动就全红」的耦合锁。

### 2. 交付面核实

`git diff --numstat` 仅 `NoteDetail.module.css` **4/2**;`TextUnitGutterLayer.tsx` **零 diff** ⇒ **四个控件、行为、图标、`aria-label` 一个没动**,§0 的「不撤不改」守住。
`margin-left: calc(var(--text-unit-indent, 0) * 24px)` **原样保留**(硬闸);`:hover`/`:focus-within` 的 `opacity:1` 原样保留。
檐下定位用 `right: calc(100% + 4px)`,以 `.textUnitRow` **既有的** `position: relative` 作 containing block —— ⛔ 没有为此新增定位上下文。

### 3. ⭐ builder 两处比我更严的地方(记功)

1. **它两次拒绝把「测试自身的错误」当必红点**:第一次是 jsdom 下 `import.meta.url` 非 `file:` URL(`no tests`),第二次是 K-2 抽到了组合选择器 `.textUnitRow:hover .textUnitGutter` 而非独立规则。**两次都明写「这不算红点」,修正取值方式后才承认第三次的双红。**
   📌 这正是「**红在别处的红不算红**」—— 它在没人盯着的情况下自己执行了这条。
2. **第二次交白卷**:§6 点名的 client `test` script 不存在(只有 `test:unit`),补 alias 要动第四个文件 ⇒ **它没有自行扩面**,停线上报并给出两条处置供上游二选一。

### 4. ⚠️ 停线原因归我,已订正

`client/package.json` 现物核实:**确无 `test`,只有 `test:unit`** ⇒ **builder 的理由为真**。
采其**第 2 条**(订正命令为 `test:unit`),⛔ **不加 alias**(那会为一句话的错误改动仓级约定)。
📌 **这是我第三次在单里点名树上不存在的东西**(TD-12 killer / 允许面缺测试文件 / 本次命令不存在)⇒ 已并入发单第七查的**面 2**,见 `handoffs/README.md`。

### 5. ⚠️ 留给人眼辅助验收的一条(⛔ 不阻断本单)

檐下槽现在悬在文本列**左缘之外**。若某祖先容器有 `overflow: hidden` 或行本身贴着页面左边距,**控件可能被裁切或溢出可视区** —— **结构锁量不到这个**(jsdom 无排版引擎,这条限度测试文件顶部已申报)。
⇒ **请在人眼验收时特别看最左侧/最深缩进的行。** ⛔ 但这不是本单的判据,不阻断。

### 6. 结论

**PASS**。`npm --prefix client run test:unit` **226 全绿**(含本单 2/2),`build` 绿,`verify:v2-bn8-runtime` 绿(builder 跑,复核方复跑了定向测试与两次变异)。
