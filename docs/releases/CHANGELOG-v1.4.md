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
