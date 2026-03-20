# Coincides v1.4 — CHANGELOG

> Time Block L1 补全 + 卡片数据模型升级
> 开发中

---

## feat(cards): 为 Theorem / Formula / General 卡片新增 Example 字段（CD-2）

### 变更
- `shared/types/index.ts` — `TheoremContent`、`FormulaContent`、`GeneralContent` 新增可选 `example?: string` 字段
- `client/src/components/CardModal/CardModal.tsx` — Theorem / Formula / General 编辑表单新增 Example 输入框（textarea），编辑回填 + 构建 content 时传递
- `client/src/components/CardFlip/CardTemplateContent.tsx` — `TheoremView`、`FormulaView`、`GeneralView` 新增 Example 渲染区块（KaTeX 支持）
- `server/src/agent/tools/normalizeContent.ts` — theorem / formula / general 三种类型的 normalize 逻辑均透传 `example` 字段；顶部注释同步更新
- `server/src/agent/tools/definitions.ts` — `create_card` 工具描述更新，content 字段说明中 theorem / formula / general 均标注 `example?`

### 备注
- `DefinitionContent` 在 v1.3 已有 `example` 字段，此次补齐其余三种类型
- `TheoremContent` 已有 `conditions` + `proof_sketch`（CD-3 实质已完成），无需额外改动

### 变更文件
- `shared/types/index.ts`
- `client/src/components/CardModal/CardModal.tsx`
- `client/src/components/CardFlip/CardTemplateContent.tsx`
- `server/src/agent/tools/normalizeContent.ts`
- `server/src/agent/tools/definitions.ts`

---

## feat(cards): CardViewModal 详情视图放大（CD-1）

### 变更
- `CardViewModal.module.css` — 弹窗尺寸放大：
  - `max-width` 520px → 680px
  - `padding` 27px → 32px
  - `max-height` 85vh → 88vh
  - `cardWrapper min-height` 300px → 360px
  - 新增 `@media (max-width: 720px)` 响应式回退
- `CardFlip.module.css` — 翻转卡片同步调整：
  - `cardInner min-height` 300px → 340px
  - `contentBody font-size` 15px → 15.5px，行高 1.6 → 1.65
  - `formulaDisplay` padding 19px → 22px，font-size 17px → 18px

### 备注
- 放大后数学公式和新增 Example/Condition 字段有更充足的展示空间
- Electron 桌面环境下响应式风险低，但仍做了小窗口兜底

### 变更文件
- `client/src/components/CardViewModal/CardViewModal.module.css`
- `client/src/components/CardFlip/CardFlip.module.css`

---

## feat(calendar): 周视图 24h 刻度线 + Time Block 时间标签（TB-L1a + TB-L1b）

### 变更
- `Calendar.tsx` — 周视图新增：
  - 左侧 24h 时间刻度栏（timeGutter），显示 0:00∼23:00
  - 每列 timedSection 内部渲染 24 条小时横线网格（hourGridline）
  - 每个 Time Block 新增起止时间标签（tbTime）
- `Calendar.module.css` — 样式新增：
  - `.weekGrid` 网格从 `repeat(7,1fr)` 改为 `48px repeat(7,1fr)`，左侧给刻度栏留位
  - `.timeGutter` / `.timeGutterHeader` / `.timeGutterBody` / `.timeGutterLabel` — 刻度栏布局和样式
  - `.hourGridline` — 小时横线（超淡 border-top，不宣宾夺主）
  - `.tbTime` — Time Block 上的起止时间显示，字号小于标签

### 备注
- 刻度线和 Time Block 使用相同的百分比定位算法（timeStrToPercent），保证对齐
- 现有 Task 事件显示不受影响

### 变更文件
- `client/src/pages/Calendar/Calendar.tsx`
- `client/src/pages/Calendar/Calendar.module.css`
