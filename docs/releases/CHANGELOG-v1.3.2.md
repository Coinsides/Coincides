# Coincides v1.3.2 — CHANGELOG

> 补丁版本：5 项 Bug 修复（客户端防崩 + Agent 行为规范）
> 发布日期：2026-03-19

---

## Bug 2 (P0): GEN 卡片白屏崩溃

### 问题
Agent 创建的 General 类型卡片在网格预览中显示空白，点击后整页白屏崩溃。

### 根因
1. `KaTeXRenderer` 在 `text` 为 `undefined` 时调用 `text.split()` 直接崩溃
2. Agent `create_card` 工具未校验 content 字段结构——当 AI 传入 `{ definition: "..." }` 给 General 类型卡片时，`content.body` 为 `undefined`
3. `getContentPreview()` 和 `GeneralView` 均无空值防护

### 修复
- `KaTeXRenderer.tsx` — 增加 `if (!text) return null` 空值守卫
- `CardTemplateContent.tsx` — 所有模板视图（Definition/Theorem/Formula/General）对必填字段增加 `|| ''` 兜底；`GeneralView` 增加 fallback 逻辑，尝试从 `definition`/`statement`/`formula` 字段提取内容；顶层 `CardTemplateContent` 增加 `content` 空值检查
- `types.ts` — `getContentPreview()` 增加 `typeof content !== 'object'` 检查 + fallback 从任意字符串字段提取预览
- `executor.ts` — 新增 `normalizeCardContent()` 函数，在 Agent `create_card` 执行时自动将 content 字段映射到正确的模板结构（例如：General 类型缺少 `body` 时从 `definition`/`statement` 自动映射）

### 变更文件
- `client/src/components/KaTeX/KaTeXRenderer.tsx`
- `client/src/components/CardFlip/CardTemplateContent.tsx`
- `client/src/pages/Decks/components/types.ts`
- `server/src/agent/tools/executor.ts`

---

## Bug 3 (P1): CardFlip 镜像 Bug 回归

### 问题
卡片正面/背面文字出现镜像。v1.3.1 的 92d0712 曾修复过 `.cardFace` 上的相同问题，但回归了。

### 根因×3处
根本原因：`filter`、`backdrop-filter` 属性会创建新的合成层，将 `transform-style: preserve-3d` 层级打平，导致 `backface-visibility: hidden` 完全失效。

1. **`.cardInner` 上的 `filter: drop-shadow(...)`**（主因）— 此元素是 `transform-style: preserve-3d` 的容器，`filter` 直接将其打平，`backface-visibility` 彻底失效
2. **`CardViewModal` 的 `.overlay` 和 `.modal` 上的 `backdrop-filter`** — 祖先容器的 `backdrop-filter` 同样创建合成层，破坏子元素的 3D 渲染
3. **`.formulaDisplay` 上的 `backdrop-filter`** — 卡片背面内部的 `backdrop-filter` 也会干扰

### 修复
- `.cardInner` 移除 `filter: drop-shadow(...)`，改为在 `.cardFace` 上使用 `box-shadow` 实现同样的阴影效果
- `.cardFace` 添加 `-webkit-backface-visibility: hidden`（Safari 兼容）
- `CardViewModal` 的 `.overlay` 和 `.modal` 移除 `backdrop-filter`，改用不透明背景补偿模糊效果
- `.formulaDisplay` 移除 `backdrop-filter`

### 变更文件
- `client/src/components/CardFlip/CardFlip.module.css`
- `client/src/components/CardViewModal/CardViewModal.module.css`

---

## Bug 4 (P2): 部分公式渲染失败

### 问题
孤立的 `$` 符号后跟 LaTeX 内容（如 `$\mathbb{R}^n`）不被渲染，显示为纯文本。

### 根因
`KaTeXRenderer` 的 inline 正则 `$...$` 要求配对的关闭 `$`。当 AI 生成的内容遗漏关闭符号时，LaTeX 直接被跳过。

### 修复
- `KaTeXRenderer.tsx` — 新增 orphaned `$` 检测：当行尾残留 `$` 后跟 LaTeX 特征字符（`\`、`^`、`_`）时，自动将其作为 inline LaTeX 渲染

### 变更文件
- `client/src/components/KaTeX/KaTeXRenderer.tsx`

---

## Bug 1 (P2): Agent 卡片组归属逻辑

### 问题
Agent 创建卡片时未检查已有卡片组，将卡片放到了不相关的 deck 中。

### 修复
- `system-prompt.ts` — 在 Card creation 规则中新增明确指令：创建卡片前 ALWAYS 调用 `list_decks` 查找已有卡片组，按课程/主题匹配；无合适 deck 时告知用户
- `definitions.ts` — `create_card` 工具的 `content` 字段 description 中添加每种 template_type 的必填字段说明

### 变更文件
- `server/src/agent/system-prompt.ts`
- `server/src/agent/tools/definitions.ts`

---

## Bug 5 (P2): Agent 制定计划跳过目标层级

### 问题
用户要求 Agent 制定学习计划时，Agent 直接创建日历事件/任务，跳过了 Goal→Stage 的层级结构。

### 修复
- `system-prompt.ts` — 新增「Planning Protocol — Goal→Stage Hierarchy」段落，明确要求：
  1. 制定计划前 ALWAYS 先建立顶层 Goal
  2. 遵循 Goal → Sub-goals → Tasks 层级，不可跳级
  3. 禁止未建立目标结构就直接排任务

### 变更文件
- `server/src/agent/system-prompt.ts`
