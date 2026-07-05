# 11. CanvasObject Contract Draft v0

status: draft contract input for stage-3 design
date: 2026-06-25 America/Toronto
scope: CanvasObject, CanvasPlacement, content mount, Canvas AI Tree, Agent operation boundary

## 1. Draft v0 的定位

这不是正式数据库 schema，也不是 8.8 代码 plan。

它只是第二阶段调研后的第一版合同草案，用来回答：

```text
CanvasObject 作为 Coincides Canvas 的空间对象，最低应该有哪些边界？
```

正式合同需要在第三阶段融合设计后再落入 `docs/contracts`。

## 2. 核心定义

### 2.1 CanvasObject

`CanvasObject` 是画布上的空间对象身份。

它回答：

- 这是什么空间对象；
- 它属于哪个 object family；
- 它能否被选择、移动、缩放、编辑、连接、导出、AI 读取；
- 它是否挂载内容；
- 它的结构化数据在哪里。

它不直接回答：

- 文本内容真相是什么；
- ContentGroup 的 members / petals 是什么；
- Relation 是否成立；
- source anchor 是否有效。

这些分别属于 TextFlow、ContentGroup、Relation、Source 系统。

### 2.2 CanvasPlacement

`CanvasPlacement` 是对象在某个 note canvas 中的一次出现。

同一个业务对象未来可能出现在多个 note / PageFrame / workspace 中，所以位置不应该总是写在对象本体上。

### 2.3 ContentMount

`ContentMount` 是空间对象挂载内容对象的桥。

它允许：

- shape 挂 paragraph block；
- callout 挂 paragraph block；
- formula card 挂 formula block；
- image object 挂 image asset + caption；
- diagram object 挂 structure data；
- ContentGroup tile 挂 ContentGroup reference。

### 2.4 Canvas AI Tree

`Canvas AI Tree` 是从 CanvasObject、CanvasPlacement、PageFrame、TextFlow、ContentGroup、runtime layout 派生出的 AI-readable snapshot。

它不是业务真相，也不应该直接手写。

### 2.5 CanvasProposal / CanvasCommand

Agent 不直接写 CanvasObject truth。它应该输出 proposal，用户确认后转成 command。

```text
Agent reads Canvas AI Tree
  -> generates CanvasProposal
  -> user confirms / policy allows
  -> CanvasCommand applies
  -> durable truth updates
  -> snapshot regenerates
```

## 3. CanvasObjectDraftV0

```ts
type CanvasObjectFamilyDraftV0 =
  | 'page_frame'
  | 'shape'
  | 'visual_edge'
  | 'freehand'
  | 'image'
  | 'table'
  | 'diagram'
  | 'mind_map'
  | 'math_graph'
  | 'chart'
  | 'content_group_projection'
  | 'asset_viewer'
  | 'region';

type CanvasObjectStatusDraftV0 =
  | 'active'
  | 'hidden'
  | 'archived'
  | 'deleted';

interface CanvasObjectDraftV0 {
  id: string;
  canvas_id: string;
  family: CanvasObjectFamilyDraftV0;
  status: CanvasObjectStatusDraftV0;
  display_name: string | null;
  role: string | null;
  created_by: 'human' | 'ai_proposal' | 'importer' | 'system';
  created_at: string;
  updated_at: string;
  interaction_policy: CanvasObjectInteractionPolicyDraftV0;
  content_mount?: ContentMountDraftV0 | null;
  structure_ref?: StructuredObjectRefDraftV0 | null;
  visual_style_ref?: string | null;
  metadata?: Record<string, unknown>;
}
```

说明：

- `family` 不是知识分类，只是对象族；
- `role` 可以表达 page_frame 的 primary / secondary、shape 的 callout / decoration 等；
- `content_mount` 是与内容真相的桥，不是内容真相；
- `structure_ref` 用于 diagram / chart / math graph 等结构化对象；
- `visual_style_ref` 允许未来把样式从对象本体拆出。

## 4. CanvasPlacementDraftV0

```ts
interface CanvasPlacementDraftV0 {
  id: string;
  canvas_id: string;
  object_id: string;
  parent_object_id: string | null;
  page_frame_id: string | null;
  surface: 'formal_page' | 'canvas_workspace';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rotation: number;
  z_index: number;
  snap_state: 'free' | 'snapped' | 'locked';
  export_role: 'exportable' | 'export_hidden' | 'decorative' | 'reference_only';
  ai_visibility: 'visible' | 'hidden' | 'summary_only';
  layout_state?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

说明：

- `bounds` 应在 canvas world 坐标中稳定表达；
- 如果对象属于 PageFrame，可以通过 `page_frame_id` 和 `surface` 判断；
- PageFrame 内部坐标可由 placement + PageFrame content bounds 派生；
- `layout_state` 用于暂存 fold、collapsed、view transform 等轻量投影状态。

## 5. ContentMountDraftV0

```ts
type ContentMountKindDraftV0 =
  | 'none'
  | 'paragraph_block'
  | 'formula_block'
  | 'code_block'
  | 'table_block'
  | 'image_asset'
  | 'content_group'
  | 'structured_object'
  | 'external_asset';

interface ContentMountDraftV0 {
  kind: ContentMountKindDraftV0;
  ref_id: string | null;
  ref_version?: string | null;
  mount_role: 'primary_content' | 'caption' | 'label' | 'summary' | 'source_preview' | 'decorative';
  edit_policy: 'editable_here' | 'open_original' | 'reference_only' | 'fork_on_edit';
  sync_policy: 'source_truth' | 'projection_cache' | 'snapshot_copy' | 'detached';
  preview_text?: string | null;
  metadata?: Record<string, unknown>;
}
```

关键判断：

- shape 内填文字时，`kind = paragraph_block`；
- paragraph block 加背景时，不一定需要 shape mount，它可以是 styled block projection；
- ContentGroup projection 使用 `kind = content_group`；
- image caption 可以是 `mount_role = caption`；
- `preview_text` 仍只是显示缓存，不是第二真相。

## 6. StructuredObjectRefDraftV0

```ts
interface StructuredObjectRefDraftV0 {
  kind:
    | 'diagram'
    | 'mind_map'
    | 'math_graph'
    | 'chart'
    | 'table'
    | 'three_d_viewer';
  ref_id: string;
  schema_version: string;
  summary: string | null;
  ai_readable: boolean;
  editable: boolean;
}
```

结构化对象的 truth 不应该只藏在 visual style 里。

例如：

- diagram: nodes / edges / labels / layout；
- math graph: formulas / axes / domain / viewport；
- chart: dataset / encoding / transform / marks；
- 3D viewer: asset ref / camera state / lighting / preview。

## 7. CanvasObjectInteractionPolicyDraftV0

```ts
interface CanvasObjectInteractionPolicyDraftV0 {
  selectable: boolean;
  movable: boolean;
  resizable: boolean;
  rotatable: boolean;
  editable: boolean;
  connectable: boolean;
  focusable: boolean;
  lockable: boolean;
  deletable: boolean;
}
```

这个 policy 既服务 UI，也服务 Agent。

例如：

- PageFrame 可移动但可能受模板 / primary 约束；
- visual arrow 可连接，但不一定语义化；
- Raw Ink 可移动 / 删除，但可能不可编辑内部结构；
- ContentGroup projection 可打开原始 group，但不直接编辑 group truth，除非走 fork / reference / duplicate 语义。

## 8. PageFrameDraftV0

PageFrame 可以使用 CanvasObject 的基础协议，但必须有专门扩展。

```ts
interface PageFrameDraftV0 {
  object_id: string;
  page_role: 'primary' | 'secondary' | 'template' | 'scratch';
  page_size: {
    preset: 'a4' | 'letter' | 'custom';
    width: number;
    height: number;
    unit: 'px' | 'pt' | 'mm';
  };
  content_inset: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  ruler: {
    enabled: boolean;
    snap_enabled: boolean;
    left_limit: number;
    right_limit: number;
    tab_stops?: number[];
  };
  header_footer: {
    enabled: boolean;
    header_ref?: string | null;
    footer_ref?: string | null;
    page_number_enabled: boolean;
  };
  template_ref?: string | null;
  background_ref?: string | null;
  export_boundary: 'page_outer' | 'content_bounds';
}
```

说明：

- 标尺不是硬墙，而是吸附参考；
- PageFrame 只剩一个时，应自动成为 primary；
- 自由画布 note 可以没有 primary PageFrame，除非用户指定；
- Page Mode 进入哪个 frame，应由 primary PageFrame 决定。

## 9. CanvasAITreeNodeDraftV0

```ts
interface CanvasAITreeNodeDraftV0 {
  id: string;
  kind: string;
  role: string;
  name: string | null;
  parent_id: string | null;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    coordinate_space: 'canvas_world' | 'page_frame' | 'viewport';
  };
  z_index: number;
  content_ref: string | null;
  plain_text: string | null;
  summary: string | null;
  source_ref: string | null;
  visibility: {
    visible: boolean;
    clipped: boolean;
    occluded: boolean;
    ai_visible: boolean;
    export_visible: boolean;
  };
  interaction: CanvasObjectInteractionPolicyDraftV0;
  children_ids: string[];
  debug?: {
    derived_from: string[];
    warnings: string[];
  };
}
```

派生规则：

- block projection 从 Block / TextFlow / Placement 派生；
- PageFrame 从 PageFrame object / placement / extension 派生；
- ContentGroup projection 从 ContentGroup truth + placement 派生；
- pure shape 从 CanvasObject + placement 派生；
- Raw Ink 可只提供 bounds 和 uninterpreted summary；
- occlusion / reading order 可在 snapshot 生成时计算。

## 10. Agent 操作边界 Draft v0

Agent 可读取：

- Canvas AI Tree；
- TextFlow projection；
- ContentGroup summary / members / petals；
- source / provenance summary；
- selected object context。

Agent 可提出 proposal：

- create_object；
- create_page_frame；
- create_paragraph_blocks；
- create_structured_diagram；
- create_content_group_projection；
- move_objects；
- align_objects；
- summarize_selection_to_page_frame；
- cluster_selection_to_content_group_proposal；
- create_visual_edge；
- create_relation_proposal。

Agent 不应直接执行：

- destructive delete；
- true source rewrite；
- confirmed Relation creation；
- ContentGroup truth mutation without proposal；
- OCR result overwrite；
- PageFrame primary reassignment without rule / confirmation；
- mass materialization without preview。

## 11. 与 ContentGroup / Relation 的边界

普通 Canvas Mode：

```text
visual arrow = visual object
```

ContentGroup Mode / future Relation workflow：

```text
relation proposal arrow = RelationProposal projection
confirmed relation arrow = Relation projection
```

ContentGroup projection：

```text
ContentGroup truth stays in ContentGroup System.
Canvas stores only its usage / placement / projection state.
```

这能避免让画布上的每条线都变成知识关系，也避免 ContentGroup 的一次显示位置污染本体。

## 12. Draft v0 的保守后置项

这些不进入第一版正式实现：

- full handwriting recognition；
- OCR-to-source truth；
- complex 3D annotation；
- diagram runtime with full auto-layout and editing；
- GraphRAG relation runtime；
- automatic semantic interpretation of freehand arrows；
- complete external canvas engine integration；
- full multi-user conflict model。

## 13. 阶段三输入问题

第三阶段需要基于本草案继续回答：

- `CanvasObject` 与 `CanvasPlacement` 是否都需要独立实体？
- `ContentMount` 是否作为正式对象，还是先放在 metadata？
- PageFrame 是否独立成特殊表 / contract？
- `Canvas AI Tree` 是否需要单独 snapshot service？
- 第一版 Agent 是否只读 Canvas AI Tree？
- diagram object 是否进入 8.8，还是只留 contract？
- image / table 是否比 shape 更优先？

## 14. 本草案依赖的阶段二文档

- `2026-06-25-06-CanvasObject-Research-Method-And-Scoring-Rubric.md`
- `2026-06-25-07-Mature-Product-AI-Diagram-Document-Selection-Context-Research.md`
- `2026-06-25-08-Open-Source-Canvas-Diagram-MindMap-Source-Candidate-Screening.md`
- `2026-06-25-09-Accessibility-Tree-UI-Parsing-Canvas-AI-Tree-Research.md`
- `2026-06-25-10-Coincides-Block-CanvasObject-PageFrame-Boundary-Inventory.md`
