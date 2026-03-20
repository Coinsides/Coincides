# Coincides v1.3.2 — CHANGELOG

> 补丁版本：8 项 Bug 修复 + 1 项功能增强（客户端防崩 + Agent 行为规范 + Section 支持）
> 发布日期：2026-03-19

---

## docs: 版本拆分（v1.4→v1.8）+ 新增 BACKLOG.md

### 变更
- 新建 `docs/BACKLOG.md` — 42 条待开发需求，按 8 个功能领域分组，已分配版本归属
- 更新 `docs/Coincides-Roadmap.md` — 原 v1.4 拆分为 v1.4~v1.8 五个版本
  - v1.4：Time Block L1 补全 + 卡片数据模型升级（6 条）
  - v1.5：复习体验升级 + 错题本（13 条）
  - v1.6：激励系统 + 洞察面板（10 条）
  - v1.7：Goal DAG + 复习模板（5 条）
  - v1.8：Time Block L2 + Electron + 基础设施（8 条）
- 更新 `docs/README.md` — 产品文档表格新增 BACKLOG.md 条目
- 来源：Session 1 + Session 2 会议记录综合整理

### 变更文件
- `docs/BACKLOG.md`（新增）
- `docs/Coincides-Roadmap.md`
- `docs/README.md`

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

---

## Bug 6 (P1): Proposal Apply 失败——batch_cards 缺少 deck_id 验证

### 问题
Agent 生成的 batch_cards 类型 Proposal，用户点击 Apply 后显示“Failed to apply proposal”。

### 根因
1. **Agent 没有 `create_deck` 工具**——当用户删除了旧的卡片组后，Agent 无法自己创建新 deck，导致 proposal items 中的 `deck_id` 指向已删除的 deck 或完全缺失
2. **`proposals.ts` 的 apply 路由缺少验证**——直接将 `item.deck_id` 传入 INSERT，未检查是否存在或为 undefined，触发 SQLite 外键约束失败 / better-sqlite3 报错
3. **前端错误提示固定**——handleApply 的 catch 块始终显示“Failed to apply proposal”，未展示后端返回的具体原因

### 修复
- `proposals.ts` — batch_cards 分支增加：
  - deck_id 解析链：item.deck_id > data.deck_id（顶层 fallback）
  - 缺少 deck_id 时抛出 400 错误，提示“请先选择 deck”
  - 插入前验证 deck 存在且属于当前用户，不存在时提示“deck 可能已删除”
  - title 字段增加 `|| 'Untitled'` 兆底
- `ProposalList.tsx` — handleApply 的 catch 块改为从 `err.response.data.error` 提取后端错误信息，显示具体原因
- `definitions.ts` + `executor.ts` — 新增 `create_deck` 工具，让 Agent 能自行创建 deck
- `system-prompt.ts` — Card Generation 流程新增第 4 步“准备目标 deck”，要求 Agent 先 list_decks 检查，无合适 deck 则 create_deck，确保 proposal items 中包含有效 deck_id

### 变更文件
- `server/src/routes/proposals.ts`
- `client/src/components/AgentPanel/ProposalList.tsx`
- `server/src/agent/tools/definitions.ts`
- `server/src/agent/tools/executor.ts`
- `server/src/agent/system-prompt.ts`

---

## 其它改进

### Agent 超时时间调整
- `orchestrator.ts` — Agent 单次 tool call 超时从 120s 提升到 300s，避免处理长文档时超时失败

---

## Bug 7 (P0): Agent 400 错误——tool_use/tool_result 消息配对失败

### 问题
Agent 对话中出现 Anthropic API 400 错误：`tool_use ids were found without tool_result blocks immediately after`。导致 Agent 完全无法使用，重发消息也无法恢复。

### 根因
1. **消息历史清理逻辑 (sanitization) 存在边界 Bug**——`getConversationHistory()` 采用单独评估每条消息的方式：tool_use 消息检查原始数组的下一条是否有 tool_results，若有则加入 sanitized；tool_results 消息检查 sanitized 的最后一条是否有 tool_calls。但当两者的 ID 不匹配时，tool_use 已被加入而 tool_results 被丢弃，导致 sanitized 结果中存在孤立的 tool_use
2. **无最终安全检查**——发送给 Anthropic API 前没有再次验证消息格式的正确性

### 修复
- `manager.ts` — 重写 sanitization 逻辑，改为“配对处理”模式：tool_use 和 tool_result 作为一对同时评估，ID 完全匹配则保留两者，部分匹配则裁剪同步，无匹配则两者均丢弃
- `anthropic.ts` — 在消息发送前增加最终安全检查：遍历已转换的 Anthropic 格式消息，确认每个 tool_use block 在下一条 user 消息中都有对应的 tool_result，不匹配的对整体丢弃

### 变更文件
- `server/src/agent/memory/manager.ts`
- `server/src/agent/providers/anthropic.ts`

---

## Bug 8 (P1): Formula 卡片公式显示为原始 LaTeX 文本

### 问题
Formula 类型的卡片，公式区域显示原始 LaTeX 源码（如 `$S = \int_a^b ...$`）而非渲染后的数学公式。

### 根因
Agent 生成的 `formula` 字段内容自带 `$...$` 分隔符，但 `FormulaView` 在渲染时又在外层包裹 `$$...$$`，导致实际传给 KaTeX 的是 `$$$...$$$`，KaTeX 无法解析而 fallback 显示原文。

### 修复
- `CardTemplateContent.tsx` — 新增 `stripLatexDelimiters()` 函数，在包裹 `$$` 之前先剥离内容自带的 `$`/`$$` 分隔符；应用于 formula 字段和 variable key 的渲染
- `normalizeContent.ts` — 同样新增 `stripLatexDelimiters()`，在 formula 字段存入 DB 前就清理分隔符，从源头防止问题

### 变更文件
- `client/src/components/CardFlip/CardTemplateContent.tsx`
- `server/src/agent/tools/normalizeContent.ts`

---

## 功能增强: Agent Section 支持——自动按章节组织卡片

### 问题
Agent 生成复习卡片和知识卡片时，所有卡片平铺放入 deck 中，没有按章节/主题分组。用户看到的是一堆没有组织结构的卡片，难以管理。虽然 Section 功能已经存在（REST API + 前端 UI），但 Agent 完全没有使用它。

### 方案
给 Agent 新增 section 工具 + system prompt 规则，依赖强模型本身的思考能力自动分组，无需结构化表单。

### 变更详情

#### 新增工具
- `list_sections(deck_id)` — 查询 deck 内已有的 section
- `create_section(deck_id, name, order_index?)` — 创建新 section，自动追加到末尾

#### 工具增强
- `create_card` 新增 `section_id` 参数，允许卡片放入指定 section
- `batch_cards` proposal apply 路由支持 `section_id`，批量创建卡片时自动分配 section

#### System Prompt 规则
- Card creation 规则新增「Section organization」：选择 deck 后必须检查并组织 section
- Document-Based Card Generation 新增第 5 步「Organize by sections」：
  - 分析源材料结构，按章节/主题分组
  - 复用已有 section 或创建新的
  - 每张卡片必须有 section_id
  - 无明确结构时创建以文档名命名的单一 section

### 变更文件
- `server/src/agent/tools/definitions.ts` — 新增 list_sections、create_section 工具定义；create_card 新增 section_id 参数
- `server/src/agent/tools/executor.ts` — 新增 list_sections、create_section 执行逻辑；create_card INSERT 支持 section_id
- `server/src/routes/proposals.ts` — batch_cards apply 支持 section_id
- `server/src/agent/system-prompt.ts` — 新增 section 组织规则
