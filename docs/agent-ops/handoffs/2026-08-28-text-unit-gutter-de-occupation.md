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
npm --prefix client run test
npm --prefix client run build
```
两者必须全绿;⛔ 不许跳过、不许 `--no-verify`。

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

**(builder 填)**
