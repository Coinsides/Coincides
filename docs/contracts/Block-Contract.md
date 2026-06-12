# Block Contract

**状态**：V2.BN.6 合同

**用途**：这份文档定义 Coincides 在 Better Notebook 阶段如何理解 block。它是产品和数据契约，不是 UI 设计稿、migration 文件，也不是具体实现 checklist。

## 1. 范围

这份文档覆盖：

- `NoteBlock` 作为内容真相；
- `BlockBox` / `CanvasNode` / placement 作为布局真相；
- `TemplateDefinition` 作为模板真相；
- structured fields、field values、field layout；
- 第一版用户可见的默认 block；
- slash / insert menu 和 Template Studio 中的 template 分类入口。

这份文档不覆盖：

- 完整 source chain；
- relation runtime；
- GraphRAG adapter；
- OCR / VLM source reconstruction；
- 完整 Style Studio 或 Appearance Studio。

这些内容应该进入单独的 contract / spec 文档。

## 2. 当前现实快照

当前代码已经有一些有价值的层次，但它们还没有形成干净的 Better Notebook block contract。

当前存储现实：

- `note_blocks` 存 block 身份、`block_type`、标题/正文类内容、`content_json`、`plain_text`、状态、source kind、metadata 和 operation history。
- `note_block_placements` 存 note 中的投放位置、排序、display mode 和 display overrides。
- `template_definitions` 存 runtime template metadata、system type、learning role、field schema、default content、render hints、behavior fields 和 agent summary。

当前 runtime / system 概念：

- system type 包括 `text`、`latex`、`code`、`source_quote`、`task`、`media`、`table`。
- learning role 包括 `note`、`concept`、`definition`、`theorem`、`proof`、`formula`、`example`、`exercise`、`answer`、`warning`、`source`。
- legacy / manual block type 包括 `heading`、`paragraph`、`definition`、`theorem`、`proof`、`formula`、`example`、`exercise`、`answer`、`sidenote`。

Better Notebook 不应该把这些全部暴露成第一版用户写作入口。

## 3. 分层模型

### 原始家族（Primitive Family）

Primitive family 是最粗的一层技术/内容家族。它应该保持很小。

第一版 Better Notebook family：

```text
text
heading
definition
formula
code
source_quote
sticky
```

兼容层或 runtime 里可以继续保留旧 family，但它们不应该自动出现在默认 insert 菜单里。

### 模板变体（Template Variant）

Template variant 是用户实际选择或创建的具体模板。

例子：

```text
text.paragraph
text.heading
definition.basic
formula.math
code.snippet
source.quote
sticky.note
```

template variant 可以变得更细，但不应该因此创造新的 primitive family：

```text
definition.math
definition.chemistry
formula.engineering
formula.math
```

### 结构化字段契约（Structured Field Schema）

structured field schema 由 `TemplateDefinition` 拥有。

例子：

```text
definition.basic:
  concept_name
  description

formula.math:
  latex_input
  explanation
```

普通 note 编辑可以编辑 field value 和 field layout，但不应该直接编辑 field schema。schema 编辑属于 Template Studio。

### 字段值（Field Value）

field value 是某个 `NoteBlock` 里真实填写的内容。

例子：

```text
concept_name = "Green's theorem"
description = "把简单闭曲线上的线积分和其围成区域上的二重积分联系起来的定理。"
latex_input = "\\oint_C P\\,dx + Q\\,dy = \\iint_D (Q_x - P_y)\\,dA"
```

field value 是内容真相。

### Field Values 第一版规则（V2.BN.5）

第一版 structured block 不新增完整字段系统，也不重写 `TemplateDefinition` runtime。规则先落在现有能力上：

```text
TemplateDefinition.field_schema
  定义一个 template 应该有哪些字段。

NoteBlock.content_json.field_values
  存这个具体 NoteBlock 真正填写了哪些字段值。

NoteBlock.plain_text
  从 field values 和 fallback body 生成，用于搜索、摘要、兼容显示和低级导出。

NoteBlock.metadata
  可以存 template key、兼容提示、迁移历史和 UI hints，但不能成为字段内容真相。
```

如果当前代码路径还没有统一的 `field_values` 容器，V2.BN.5 实现时可以做一个很薄的 normalizer，把旧的 `body` / `content` / `latex` 映射成下面的形态；但是长期契约应以 `content_json.field_values` 为准。

```json
{
  "field_values": {
    "concept_name": "Green's theorem",
    "description": "Relates a line integral around a simple closed curve to a double integral over the region."
  },
  "body": "Green's theorem relates..."
}
```

关键规则：

- `field_schema` 由 template 控制，普通 note 编辑不直接改字段定义。
- `field_values` 是用户或 proposal 写入的真实字段值。
- `body` 是自由写作 fallback，不应该覆盖 structured fields。
- `plain_text` 是派生文本，可以重建，不是 canonical content。
- `metadata` 只能辅助兼容、调试和迁移，不能存唯一字段真相。
- 缺字段时显示空状态或 fallback，不静默编造字段值。
- 转换 paragraph -> structured block 时，第一版只做保守搬运，不用冒号、美元符号、正则或脚本猜字段意义。

Definition 第一版字段：

```text
required:
  concept_name
  description
```

Formula 第一版字段：

```text
required:
  latex_input

optional:
  formula_name
  explanation

future:
  variables
```

`latex_input` 是内容真相；渲染后的公式只是 display output。LaTeX parse 失败时也必须保留 `latex_input`，并在 editing / inspector 状态显示 warning。

### 字段布局 / 渲染模板（Field Layout / Render Template）

field layout 控制字段如何显示：

- 位置；
- 宽度和高度；
- 字体；
- 边框；
- 是否显示；
- reading / editing / debug 状态下的呈现方式。

field layout 不等于 field schema。用户可以移动视觉上的 `concept_name` 小框，或者改变它的显示样式，但这不会改变该 block 仍然拥有 `concept_name` 字段这件事。

### Field Layout 第一版规则（V2.BN.5）

V2.BN.5 的 field layout 只做固定视觉样板和边界确认，不做成熟字段布局编辑器。

第一版允许：

- Definition 以固定样板显示 `concept_name` 和 `description`；
- Formula 以固定样板显示公式渲染，并在 editing 状态显示 raw LaTeX input；
- block 整体 resize 后，字段区域随 block 宽度自然重排；
- selected / editing / inspector 状态显示不同层级的信息；
- debug / inspector 可以看到字段 key，reading mode 不显示工程字段名。

第一版不做：

- 字段级拖拽；
- 字段级 resize handle；
- 用户在普通 note 里新增 / 删除字段定义；
- 字段 layout 的完整保存、版本化和迁移；
- Style Studio / Appearance Studio。

后续长期模型可以拆成两层：

```text
template_default_layout
  TemplateDefinition 或 Template Studio 定义的默认字段呈现。

block_layout_override
  单个 NoteBlock 的局部视觉覆盖，例如字段框位置、宽度、显示隐藏。
```

这两层在 V2.BN.5 只作为设计方向记录，不要求做成完整数据结构。V2.BN.6 负责正式数据边界，V2.BN.8 负责 Template Studio productization。

### BlockBox / 投放位置（Placement）

BlockBox 或 placement 描述一个 block 出现在 page / canvas surface 的哪里。

例子：

```text
x / y
width / height
surface: formal_page | canvas_workspace
export_role: included | excluded | scratch
ai_visibility: visible | hidden
```

placement 是布局真相。它不能改写 NoteBlock 内容真相。

## 4. 第一版默认用户可见 Block

第一版默认 block set 必须保持窄。

```text
Text / Paragraph
Heading
Definition
Formula
Code
Source Quote
Sticky / Scratch Note
```

理由：

- `Text / Paragraph` 是自由写作底座。
- `Heading` 支持文档导航和视觉结构。
- `Definition` 是第一种 structured text knowledge block。
- `Formula` 是第一种 structured LaTeX block。
- `Code` 是实用的技术 block。
- `Source Quote` 支持重 provenance 的写作。
- `Sticky / Scratch Note` 支持正式导出区域之外的备注、草稿和推导。

## 5. 非默认 / 非用户可见

下面这些不作为第一版默认写作入口：

```text
Theorem
Proof
Example
Exercise
Answer
Table
Image / Diagram
```

它们可以在 field schema、media contract、table contract 和 Template Studio Productization 稳定后，成为用户自建或系统提供的 template variant。

下面两个边界更严格：

```text
Concept
Callout
```

- `Concept` 不是用户可见的默认 block。Concept 属于 metadata / search / AI / local graph 层，不属于普通写作菜单。
- `Callout` 不是 Better Notebook 需要的默认 block。如果旧 runtime 数据里已有 callout / warning template，可以保持可读兼容，但不要把它提升成默认产品入口。

### 关于 `concept.basic`

`concept.basic` 是旧模板 registry 里的一个 template key，不是我们现在要给用户暴露的默认 block 类型。

它目前的意义更接近：

- 兼容旧 seed / runtime template；
- 给旧 proposal、composition、domain package 提供可解析的概念类模板；
- 作为未来 concept-lite / search / AI context 的过渡线索。

它不应该被理解为：

- 用户写作时必须选择的 block；
- Definition 的替代品；
- 完整 Concept 系统；
- 当前 Better Notebook 默认 insert menu 的入口。

Better Notebook 第一阶段如果用户要写“某个概念的定义”，应该优先使用 `Definition`，而不是 `concept.basic`。

## 6. Template 分类入口

Better Notebook 第一版只保留三个分类入口：

```text
Default
Math
User Defined
```

规则：

- 不预置 Physics、Chemistry、Biology、History、Engineering、Research 或类似分类。
- `Default` 放常用第一版 block。
- `Math` 存在是因为第一批真实测试和个人使用场景是数学材料。
- `User Defined` 放用户自己创建的分类或 template variant。
- 同一个 template variant 可以出现在多个 category。
- category membership 控制发现、slash menu 分组、insert menu 分组和 Template Studio 组织方式。
- category membership 不能成为 canonical block identity。
- category membership 不能改变 primitive family、learning role、source provenance 或 relation semantics。

### Category Membership 第一版规则（V2.BN.5）

Category Membership 是“在哪里被发现”的规则，不是“它到底是什么”的规则。

```text
TemplateDefinition
  仍然是 template 身份与字段契约来源。

CategoryMembership
  只决定这个 template variant 出现在 slash / insert / Template Studio 的哪个分组里。
```

第一版只承认三个入口：

```text
Default
Math
User Defined
```

含义：

- `Default`：所有用户都应该马上能用的最小 block set。
- `Math`：数学测试和 LaTeX-first 使用场景的入口；可以复用 Default 里的 Formula / Definition，也可以以后加入 math-specific variant。
- `User Defined`：用户自己创建、复制或导入的 template variant。

存储边界：

- V2.BN.5 可以先用 template metadata、render hints 或前端分组配置表达 category，前提是它不成为 canonical identity。
- V2.BN.6 再审计是否需要正式数据契约。
- V2.BN.8 再把 category 管理产品化到 Template Studio。

禁止事项：

- 不用 category 推断学科 truth；
- 不用 category 替代 concept / domain / source / relation；
- 不做无限层级分类树；
- 不因为一个 template 在多个 category 中出现而复制多个 template truth。

## 7. Structured Block 最小契约

### Text / Paragraph

用途：

- 自由写作；
- 普通段落；
- 低摩擦记笔记。

最小字段：

```text
body
```

行为：

- 除 `body` 外没有强制 structured schema；
- 用户选择时，可以转换成 structured block；
- 应该始终是最安全的 fallback block。

### Heading

用途：

- 文档结构；
- 导航；
- 视觉分组。

最小字段：

```text
body
level
```

行为：

- 它本身不是知识对象；
- 之后可以成为导航 anchor。

### Definition

用途：

- 描述某个命名概念、术语、符号、对象或 concept-like thing 的含义。

最小字段：

```text
concept_name
description
```

行为：

- reading mode 应显示干净的 definition 呈现；
- editing mode 允许用户编辑 name 和 description；
- local graph / AI / export 应优先把 `concept_name` 当作紧凑 label，把 `description` 当作可读解释；
- 从 paragraph 转换时，第一版只把全文搬进 `description`，`concept_name` 留空，不猜冒号含义。

### Formula

用途：

- 表示 LaTeX-first 的数学或符号内容。

最小字段：

```text
latex_input
```

后续可选字段：

```text
formula_name
explanation
variables
```

行为：

- reading mode 显示渲染后的公式；
- editing mode 暴露 raw LaTeX input 和 preview；
- raw input 不参与 rich-text formatting；
- parse 失败时显示 warning，但不能丢失 raw input。

### Code

用途：

- 表示代码片段。

最小字段：

```text
code
language
```

行为：

- reading mode 保留格式和换行；
- editing mode 要让代码编辑可预测；
- code block 不应被当作普通 paragraph 文本。

### Source Quote

用途：

- 保存带 provenance 的引用文本或 source-like text。

最小字段：

```text
quote
source_reference_ids
```

行为：

- Source Quote 是 provenance-oriented；
- 它应与 SourceReference 协作，而不是替代 SourceReference。

### Sticky / Scratch Note

用途：

- 支持 side note、临时推理、用户备注和不导出的 workspace 内容。

最小字段：

```text
body
```

行为：

- 它仍然是 NoteBlock；
- export 和 AI 行为由 placement / policy 字段控制，例如 `export_role` 和 `ai_visibility`；
- 第一版不要把 sticky note 和 scratch note 拆成两个互不相关的 block family。

## 8. Slash / Insert 行为

slash 和 insert menu 应优先展示默认 block set。

默认菜单分组：

```text
Default:
  Text
  Heading
  Definition
  Formula
  Code
  Source Quote
  Sticky / Scratch Note

Math:
  Formula
  Definition
  future math-specific user/system variants

User Defined:
  user-created template variants
```

slash command 应支持两种相关行为：

- 空 block + `/formula`：创建 Formula block。
- 非空 paragraph + `/formula`：把当前 paragraph 全文搬入 `latex_input`，由用户自行整理公式内容。

`/definition` 同理。

## 9. 兼容规则

- 旧 NoteBlock 必须继续可读。
- 旧 runtime template 可以继续被 resolver 解析。
- 兼容 template 不应该自动变成默认写作入口。
- 未知用户模板应安全渲染，并出现在 user-defined 或 advanced/fallback 路径里。
- `legacy_block_type` 是兼容 metadata，不是未来产品精确性的来源。

## 10. 需要避免的风险

- 不要为每个领域变体创建新的 primitive family。
- 不要把内部 concept metadata 暴露成普通用户 block。
- 不要让 category 变成无限嵌套的 type tree。
- 不要让普通 note 编辑直接修改 template schema。
- 不要让 field layout 编辑改写 field schema。
- 不要混淆 SourceReference、ObjectRelation、InternalLink 和 block type。
- 不要让全部 runtime template 淹没 slash menu。

## 11. 阶段归属

```text
V2.BN.5
  默认 block visual language 和第一版用户可见 block surface。

V2.BN.6
  field schema、field value、field layout、placement、source/link/relation 边界的数据契约。

V2.BN.8
  Template Studio productization、category membership、用户自建 template variant。
```

任何后续版本只要改变 block identity、structured field schema、category membership 或 block lifecycle，都必须同步更新这份 contract。
