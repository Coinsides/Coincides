> **状态 (Status)**: frozen
> **层 (Layer)**: 分析 / 只读侦察
> **日期 (Updated)**: 2026-09-07
> **权威 (Authoritative)**: 否；记录本轮源码与合成实证，修复契约及迁移裁定归 HQ
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —
> **工单**: `docs/agent-ops/handoffs/2026-09-07-v13-1-s4-coordinate-contract-recon-order.md`

# V13.1 单 4：坐标契约 K-0 侦察

## 〇 · 射程与判语

已完整读取本工单及单 3 的第一次 `## 停线`、补遗一和第二次停线 `## Result`。本轮角色为侦察员，不续作单 3，不裁定 A/B，不放行打印或迁移。源码证据来自本工作树（收证时 HEAD `97f29bd`）；单 3 草稿是当前代码的一部分，其历史测试/浏览器收据没有在本轮重跑。规定入口、方向宪章、current-state、active ADR 与相关 active 段 plan 已核读；旧研究和历史 release 不作为现状依据。

**确定的缺口是坐标语义混合，不是“所有保存都会累积漂移”。** world→hydrate 把 x 变为所属帧内容区局部值，却保留 world y 并盖 local 标签；真 local 输入也获得相同表达。真实 SQLite 合成库中，普通布局两轮往返 y 稳定，但首轮把混合表达持久化；受控地再次调用全轴投影才每轮增加 frame 内容原点 y。035 回填不检查任何 y 几何，只据 surface 填 boundary，并丢失旧坐标标签。走查 2 仍为待证关联。

为缩短证据表，以下路径前缀均是仓库根起的完整路径缩写，`文件:起始行–结束行` 指本工作树行号：

- `E/` = `client/src/pages/Notes/canvasEngine/`
- `S/` = `server/src/`
- `H/` = `docs/agent-ops/handoffs/`
- `A/` = `docs/agent-ops/analysis/`

记帧内容原点 `O=(frame.x+inset.left, frame.y+inset.top)`，全局屏显横偏移 `P=pageOffsetX`。正确 frame-local↔world 的平移应分别为 `L+O` / `W-O`；这只是坐标定义，不是本轮替 HQ 选定存储格式。

## 一 · 坐标读写链全图

### 1. 持久化对象和写入者

`canvas_layout` 是客户端 NoteBlock 上的布局对象；本链没有同名数据库表/列。现役实体真相为 `canvas_placements.x/y` 加 `metadata.layout_policy.coordinate_space`，旧兼容真相为 `note_block_placements.display_overrides_json.better_notebook_layout`。两者不能混叫“两张坐标表”。

| 环节 / 写入者 | x 如何处理 | y 如何处理 | 文件:行号证据 |
|---|---|---|---|
| 旧布局读入口 | 优先 canvas_layout；不存在才读 override | 同一优先级，保留值 | `E/placementService.ts:92–107` |
| 默认流式布局 | x=0 | cursorY 从 0 随块高+gap 累加，标 local，无逐帧归零 | `E/placementService.ts:416–434` |
| page 新建 / 草稿 placement 重试 | page、非 workspace、非显式 world 时 +O.x | 同条件 +O.y，显式 world 跳过 | `E/hooks/useRuntimeNaturalWritingController.ts:67–75,243–299` |
| 草稿 recovery receipt | 满足上述条件才投影；显式 frame 找不到则不强配 | +O.y；已 world 不重复投影 | 同文件 `:78–100,302–320` |
| next-page 的 runtime_surface 草稿 | flow 输出 contentRect.x−P；session 再 +P | flow 已输出 contentRect.y；session 原样盖 world，不能再 +O.y | `E/pageStackContentFlowService.ts:62–81`；`E/hooks/useRuntimeNaturalWritingController.ts:120–145,393–424` |
| 普通拖拽/resize/快照/策略保存 | 传当前 layout，无上述全轴 helper | 原样传入；不能据草稿投影概括普通保存 | `E/hooks/useBlockPlacementInteractions.ts:175–191,254–268`；`E/hooks/useLayoutPersistenceController.ts:17–32`；`E/hooks/useNoteCanvasDataAdapter.ts:1791–1821` |
| 正文保存 | 不写 placement | PUT content_json/plain_text，不直接写 y；测高可另生 layout draft | `E/hooks/useNoteCanvasDataAdapter.ts:1515–1518` |
| 客户端布局 payload | Math.round(x) | Math.round(y)；保 coordinate_space/frame_id，surface_authority 不落 payload | `E/placementService.ts:545–572`；`E/canvasObjectRepository.ts:86–105` |
| 服务端块 API→通用 writer | 原样摊入 placement，finite numeric；不加减帧原点 | 同左；boundary 信传入，缺省按 surface | `S/routes/canvasObjects.ts:51–63`；`S/services/canvasObjects.ts:2004–2020,1919–1929,452–505` |
| 真正落库 | INSERT / conflict UPDATE 原值 | 原值；标签住 metadata.layout_policy，无专门坐标列 | `S/services/canvasObjects.ts:551–592`；`S/db/migrations/035_v2_canvas_objects.ts:80–102` |
| Source 独立 writer | frame.x+72 | frame.y+localY，明确保存 canvas_world | `S/services/sourceProjectionMaterializer.ts:150–206,529–551` |
| frame 本体存取 | frame x 原样 | frame y 原样，inset 单独写 extension | `S/services/canvasObjects.ts:1849–1875,1492–1538` |

服务端 `getNoteCanvasPersistence` 通过 active paragraph object / mount / active note_block 读 blockLayouts，`layoutFromPlacement` 只 round x/y/尺寸并恢复标签、frame_id（`S/services/canvasObjects.ts:1686–1719,296–316`）。保存块 placement 后删除遗留 override（同文件 `:2023–2035`），不是持续双写。

### 2. hydration 的两条主路径逐行

入口 `applyCanvasLayoutsToBlocks` 对 raw blockLayouts 调 reconcile，然后直接覆盖 block.canvas_layout（`E/canvasObjectRepository.ts:33–49`）。reload 在 adapter `:568–571` 走此入口；save response 也在 repository `:99–104` 走相同 reconcile。

| 分支步骤 | x / frame | y | 证据 |
|---|---|---|---|
| 前置退出 | x/width 非有限值直接返回；无 coordinate_space 且已有 explicit surface 直接返回 | 均不动 | `E/placementService.ts:205–211` |
| frame 排序 | 请求 frame 存在则优先，否则按传入帧顺序 | 不检查 y 是否属于该帧 | 同文件 `:213–219` |
| world 分类 | 仅 x/width 对每帧 content-left/right 分类，优先首个 inside，其次 crossing | 未参与 frame 选择；相同横向边界的多帧无法靠此消歧 | 同文件 `:221–241`；`shared/types/canvasSurfaceAuthority.ts:7–24` |
| world 无 inside | x 原样，保持 canvas_world；附 world 横边界上下文 | 原样 | `E/placementService.ts:242–252` |
| world 有 inside | x−O.x；标 page_frame_local，authority 的边界改成 [0,contentWidth] | **原样 W.y；没有 −O.y** | 同文件 `:254–267` |
| local / 无标签且无显式 surface 路径 | 选 requested/首帧，以局部横宽分类；x 原样，标 local | 原样 L.y | 同文件 `:270–298` |

因此 world inside 输出是 `(W.x−O.x, W.y, local)`；真 local 输出是 `(L.x,L.y,local)`。本轮合成探针将 `world=(72,1672)` 与 `true local=(0,1672)` 分别 hydrate，得到**完全相等的对象**，不仅是两个字段相同。现有 surface_authority 同样只含横边界，不能补回 y 来源。

后续 normalize 没修此缝：`normalizeBlockLayout` / `normalizeResolvedBlockLayout` 对 world 保留 x/y，其余 x clamp、y=max(0,y)，宽高还有估高/最小值规则（`E/placementService.ts:314–370,373–413`）。未保存 `layoutDrafts` 优先于 stored（`E/hooks/useNoteCanvasLayoutModel.ts:122–142`）。

### 3. 两种 project 并非同一函数语义

| 函数 / 调用 | x | y | 限制 |
|---|---|---|---|
| `buildRuntimeBlockPlacement` | world 原样，其余 x+P | 一律原样 | `E/placementService.ts:447–493`，核心 `:483–484`；调用方只传 primaryPageFrame（`E/hooks/useNoteCanvasLayoutModel.ts:215–226`） |
| `projectPageFrameLocalLayoutToCanvasLayout` | x+O.x | y+O.y | `E/placementService.ts:496–522`；缺 frame/workspace 原样；helper 本身不防显式 world，防重投由调用方负责；P 参数被 void 掉 |
| 横向视口偏移 | page P=0，canvas 用全局常量 | 没有对应的纵向偏移 | `E/viewportService.ts:30–31` |

正常页模式 runtime placement 并没有替局部次帧坐标加 O，所以它不是可靠的 world 输入。不能只把打印端换成第二个 helper：经过混合 hydration 的行会再次下移。

### 4. 消费者登记

| 消费面 | x / y 的消费方式 | 文件:行号证据 |
|---|---|---|
| 屏显 article | left=layout.x+P、top=layout.y，**没有 world 分支**；相对外层纸盒，非全局屏幕绝对坐标 | `E/layers/BlockEditorLayer.tsx:333–344`；`E/layers/NoteWritingSurfaceLayer.tsx:3732–3750,3819` |
| 单纸盒 | primary inset+displayScale；paperHeight=max(frame.height,contentHeight+inset.top) | `E/layers/NoteWritingSurfaceLayer.tsx:3298–3314`；`E/hooks/usePageReadingPresentation.ts:19–30` |
| fragments | runtime placement直接传入，默认offset=0；rect x=layout.x+offset、y=layout.y，与各帧 world contentRect 做二维相交 | `E/engineModel.ts:367–373`；`E/pageStackBlockFragmentService.ts:28–45,55–85`；`E/pageFrameService.ts:80–85` |
| fragments 歧义 | 相交涉及不止一个 stack 时直接 []；同一 stack 内按 pageIndex 排序 | `E/pageStackBlockFragmentService.ts:88–101` |
| 打印草稿 | clip=visibleRect−frame原点，内部block=blockRect−visibleRect，各轴分别相减；以正确world输入为前提 | `E/pagePrintProjectionService.ts:24–42`；`E/layers/NotePrintLayer.tsx:26–66` |
| 屏显续页标 | 多fragment只成为同一article的续页标，不生成逐帧内容DOM | `E/layers/BlockEditorLayer.tsx:183–192,376–382` |
| page 可见性 | formal直接可见；workspace读原x/y做frame affiliation | `E/modePolicyService.ts:71–80,110–127` |
| 2D归属/Preview | 原x/y矩形中心在content区⇒inside；否则相交⇒crossing；首inside优先。Preview使用此分类，不是打印器 | `E/pageFrameAffiliationService.ts:38–65,88–134`；`E/exportPreviewService.ts:164–189` |
| crossing收拢 | 只对crossing做二维clamp；过大块不缩放 | `E/pageFrameAffiliationService.ts:137–160` |
| 碰撞/reflow | 以原y排序，仅看横相交；把后块推到前块bottom+gap；高度delta加给后块，无frame/space分组 | `E/placementService.ts:633–678`；`E/measurementService.ts:123–145` |
| 续页flow/默认入口 | next-page用world content y；stay分支保y盖local；draftBottom与world frame bottom比较；默认y取所有横命中块bottom最大值 | `E/pageStackContentFlowService.ts:62–103,120–151`；`E/pageFrameService.ts:17–50` |
| 随帧搬动 | x+P、y原样转矩形；完全包含判cohort；再给块x/y加frame delta并保存 | `E/layoutAffiliationService.ts:33–39,66–133`；`E/hooks/useRuntimePresentationController.ts:213–231` |
| AI tree / relation ports | bbox复制runtime x/y；端口为x及y+height/2 | `E/canvasAiTreeService.ts:129–137`；`E/placementService.ts:525–540` |
| 035 boundary | **不读x/y**，只据surface：formal⇒inside，workspace⇒outside，默认inside | `S/db/migrations/035_v2_canvas_objects.ts:39–43,443–450` |

屏显与 runtime 在 canvas 模式下甚至可能有不同 x：屏显给显式 world 也加 P，runtime 不加。page 的 P=0 会掩盖此差异。本表登记受影响接口，不宣称本轮已逐一浏览器复现。

### 5. 原始数据在哪一层丢失

服务端/API 并非没有 raw：`canvasPlacements` 返回原数值及 metadata（`S/services/canvasObjects.ts:332–350`），blockLayouts 也带来源标签。但 client `normalizeCanvasPlacement` 手列字段而丢 metadata/coordinate_space（`E/canvasPersistenceNormalizer.ts:124–156,342–343`；类型 `E/types.ts:328–340`）。blockLayouts 的 raw layout 在 normalizer `:329–337` 尚存，随后 repository reconcile 覆盖。

adapter 保存了原始几何数值的 normalized placements，但未存 raw blockLayouts（`E/hooks/useNoteCanvasDataAdapter.ts:591–601`）；传 engine 后，generic 集合又排除 paragraph projections/placements，改由 runtime block placements 重建（`E/hooks/useNoteCanvasLayoutModel.ts:260–261`；`E/engineModel.ts:393–415`）。准确结论是：**打印现行链拿不到可解释当前块的原始来源；API层仍有可保留的入口。**

## 二 · 存量污染判定与只读 SQL 草案

### 1. 数据代际不等于一种 y 语义

| 可辨识代际 / 写入轨迹 | 可证/可推断的 y 语义 | 不可据此推断的事 |
|---|---|---|
| 035 前遗留 override | 数值由旧writer决定；无标签+explicit surface在现役hydrate被保留；默认流累计y可越帧 | 没有可验证writer收据，不能把老page一律当真frame-local、老canvas一律当world |
| 035 回填行 | x/y原样搬运；**漏迁coordinate_space**，并删除原layout；surface保留/缺省formal | 035不是world↔local转换，也不是纵轴校正；boundary不是几何实测 |
| 035后现役canvas/world writer | 明确world时y为world；inside hydrate保留该y但改local标签 | 标签local不保证此后y局部；world本身也可能是此前错误重投的结果 |
| page直接局部路径/默认布局 | y可能是局部值或同一长纸盒累计值 | “page时代”不保证每个frame各自归零 |
| page新建/Source专属writer | full helper / Source writer可输出world y；next-page runtime_surface也保存world y | 新数据不能一律归local代际 |
| world行经过普通布局重存 | y保持world数值，x变local、标签变local；本轮落库实证成立 | 数值稳定不等于坐标契约稳定 |
| 037/038/039/043后 | 037改身份、038去重mount、039修frame作用域；043补extension可改变解释用的inset默认 | 这些迁移没有修复混合y；不能把迁移完成当坐标已洗净 |

证据：035 `:328–340,419–474`；`S/db/migrations/037_v2_canvas_object_block_identity_hardening.ts:73–81`、`038_v2_canvas_note_block_mount_uniqueness.ts:7–19`、`039_v2_page_frame_extension_note_scope.ts:25–62`、`043_v2_page_frame_extension_repair.ts:4–5,92–121,148–179`。043 缺旧依据时可补默认 top=96、left=72；同样 y 的解释随 frame 恢复状态而变。

035 source_json 的 `imported_from='display_overrides_json.better_notebook_layout'` 可正向识别尚存痕迹（035 `:433`），但普通 object upsert 会覆盖 source_json（`S/services/canvasObjects.ts:527–546`）。缺失痕迹不能排除曾迁移；035新行的 created_at 是迁移写入时刻（035 `:369–375`），不是原笔记出生时刻。当前 surface 也是行状态，不是出生模式证明。仅按日期切“前/后”无法无损修正。

### 2. 判定等级

- **已证机制**：合成输入具有可信来源，hydrate或save后违背该来源的坐标定义。
- **可疑候选**：tag=local 且 y>帧高、局部解释出内容区但world解释相交、frame失配、两种解释的归页不同。
- **未知**：无标签、frame不存在/有多placement、inset缺失、历史标记被覆盖。不能用首帧或0填补后冒称判定完成。
- **不能单项定罪**：y>height 可以是合法跨页/溢出或长纸盒累计坐标；污染也可在 y≤height 时发生。不能把候选数量称作污染总数或据此自动减 O.y。

### 3. 只读查询

以下是**坐标候选分布草案**，不是完整13.2迁移census。仅输出聚合数，不读取正文；绑定 `:scope_user_id` 由 HQ 在获准执行环境提供。本轮只在 `:memory:` 合成库验证，未连接用户库。整个语句只有 WITH/SELECT；生产执行应由 HQ 使用只读连接。本草案没有迁移写入语句，也没有开用户库的命令。

对象范围是现役 active paragraph projection + active note_block mount，按placement计数，避免join重复。未知frame/inset显式单列；未擅自补primary frame。跨note frame id必须连 user_id+note_id（039作用域），不能只按frame_id join。对缺扩展的frame，以及残留legacy-only、非paragraph画物，本查询不会作坐标判污，应分别列“未覆盖”。

```sql
WITH
frames AS (
  SELECT p.user_id, p.note_id, e.frame_id,
         COUNT(*) AS frame_matches,
         MIN(p.x) AS fx, MIN(p.y) AS fy,
         MIN(p.width) AS fw, MIN(p.height) AS fh,
         MIN(CASE WHEN json_valid(e.content_inset_json)
             THEN json_extract(e.content_inset_json, '$.left') END) AS il,
         MIN(CASE WHEN json_valid(e.content_inset_json)
             THEN json_extract(e.content_inset_json, '$.right') END) AS ir,
         MIN(CASE WHEN json_valid(e.content_inset_json)
             THEN json_extract(e.content_inset_json, '$.top') END) AS it,
         MIN(CASE WHEN json_valid(e.content_inset_json)
             THEN json_extract(e.content_inset_json, '$.bottom') END) AS ib
  FROM page_frame_extensions e
  JOIN canvas_objects o ON o.id=e.object_id
    AND o.user_id=e.user_id AND o.note_id=e.note_id
    AND o.kind='page_frame' AND o.status='active'
  JOIN canvas_placements p ON p.object_id=o.id
    AND p.user_id=o.user_id AND p.note_id=o.note_id
  WHERE p.user_id=:scope_user_id
  GROUP BY p.user_id,p.note_id,e.frame_id
),
base AS (
  SELECT p.*, o.source_json,
    CASE WHEN json_valid(p.metadata)
      THEN json_extract(p.metadata,'$.layout_policy.coordinate_space') END AS cs,
    CASE WHEN json_valid(o.source_json)
      THEN json_extract(o.source_json,'$.imported_from') END AS imported_from,
    f.frame_matches,f.fx,f.fy,f.fw,f.fh,f.il,f.ir,f.it,f.ib
  FROM canvas_placements p
  JOIN canvas_objects o ON o.id=p.object_id
    AND o.user_id=p.user_id AND o.note_id=p.note_id
    AND o.kind='paragraph_block_projection' AND o.status='active'
  LEFT JOIN frames f ON f.user_id=p.user_id
    AND f.note_id=p.note_id AND f.frame_id=p.frame_id
  WHERE p.user_id=:scope_user_id
    AND EXISTS (
      SELECT 1 FROM content_mounts m JOIN note_blocks b
        ON b.id=m.target_id AND b.user_id=m.user_id AND b.status='active'
      WHERE m.object_id=o.id AND m.user_id=p.user_id AND m.note_id=p.note_id
        AND m.target_kind='note_block'
    )
),
flags AS (
  SELECT *,
    CASE WHEN frame_matches IS NULL THEN 'missing_or_unbound'
      WHEN frame_matches<>1 THEN 'multiple_frame_placements'
      WHEN typeof(il) NOT IN ('integer','real')
        OR typeof(ir) NOT IN ('integer','real')
        OR typeof(it) NOT IN ('integer','real')
        OR typeof(ib) NOT IN ('integer','real') THEN 'inset_unknown'
      WHEN fw-il-ir<=0 OR fh-it-ib<=0 THEN 'invalid_content_rect'
      ELSE 'resolved' END AS frame_state
  FROM base
),
buckets AS (
  SELECT *,
    CASE WHEN frame_state='resolved' THEN y>fh END AS y_gt_outer_height,
    CASE WHEN frame_state='resolved'
      THEN y<0 OR y+height>fh-it-ib END AS local_y_outside_content,
    CASE WHEN frame_state='resolved' THEN
      x<fx+fw-ir AND x+width>fx+il AND y<fy+fh-ib AND y+height>fy+it
      END AS raw_world_intersects,
    CASE WHEN frame_state='resolved' THEN
      x<fw-il-ir AND x+width>0 AND y<fh-it-ib AND y+height>0
      END AS local_intersects,
    CASE WHEN frame_state='resolved' THEN
      y>=(fy+it) AND y<fy+fh-ib
      END AS raw_world_y_start_in_content
  FROM flags
)
SELECT COALESCE(cs,'untagged') AS coordinate_tag, surface, boundary_role,
  CASE WHEN imported_from='display_overrides_json.better_notebook_layout'
    THEN '035_receipt_survives' ELSE 'writer_history_unknown' END AS history_hint,
  frame_state,
  CASE WHEN frame_state='resolved' AND fy+it=0 THEN 'origin_y_zero'
    WHEN frame_state='resolved' THEN 'origin_y_nonzero' ELSE 'unknown' END AS origin_bucket,
  y_gt_outer_height,local_y_outside_content,raw_world_intersects,local_intersects,
  raw_world_y_start_in_content,COUNT(*) AS placement_count,
  MIN(y) AS min_y,MAX(y) AS max_y
FROM buckets
GROUP BY coordinate_tag,surface,boundary_role,history_hint,frame_state,origin_bucket,
  y_gt_outer_height,local_y_outside_content,raw_world_intersects,local_intersects,
  raw_world_y_start_in_content
ORDER BY coordinate_tag,frame_state,origin_bucket;
```

字段 `raw_world_intersects` 直接把落库x/y当world；`local_intersects` 把它们当所属帧内容局部坐标。**两者不同只是候选分歧**；混合x-local/y-world还需第三种解释 `(x+O.x,y)`。本查询的 `raw_world_y_start_in_content` 为纵轴辅助分桶，不证明该解释正确。

正式 census 在单0/单3另行补齐：所有placement/object/mount分母、legacy-only及dual truth数量、未知/损坏JSON、frame多义或缺失、世界/局部/混合三解释、存储boundary与几何重算差异、主帧content重叠比及oversize。50%分母与主帧选择规则由HQ冻结；不要把本表局部溢出指标挪作迁移去处规则。

合成SQL最终实跑分母8：五条往返样本+三条真实035回填，7个聚合桶；local y=314 与 local y=1672 分开，3条035痕迹全部识别。默认缺frame、非零原点、untagged、world/local、035痕迹路径已触发；重复frame、畸形inset/JSON、跨note同frame_id、多stack、合法长块假阳性尚未专项执行。本验证证明查询可执行及这些样本分桶，不是用户库的分布结论。

## 三 · save→load→save 是否累积漂移

### 1. 装置和实际落库

本轮使用现有 Node、TypeScript transpileModule、better-sqlite3，**数据库仅 `new Database(':memory:')`**，没有DB文件、应用init、dotenv、HTTP server或真实API请求。产品模块从白名单本地TS源码转成内存JS；给server模块内存追加私有reader的export，用生产 `getSavedCanvasObject` 从SQLite回读。API边界只注入内存适配，将真实客户端repository的PUT交给真实server `saveBlockCanvasPlacement`。无关asset I/O被置为调用即抛错，未触发。父表使用最小合成schema，Canvas表由真实035创建，FK开启。

每条样本为同一个block/placement先写一次，再执行两次“从SQLite读→生产applyCanvasLayoutsToBlocks hydrate→生产repository save→直接SELECT落库值”。不是把响应回显当落库证据。ordinary样本覆盖repository/service持久化边界；没有挂载React数据adapter、模拟鼠标或实际测高。探针分步扩展后，又从本报告的代码块抽取复跑；全部断言通过、exit 0、约0.5s。

帧：x=0，y=1358，904×1278，inset=(top0,right72,bottom96,left72)；真local块：(0,314,300,80)，manual宽，frame明确。初次全轴project为(72,1672)。

| 样本 | 初写 (x,y,tag) | 往返1落库 | 往返2落库 | 结论 |
|---|---|---|---|---|
| 正常world初写→普通布局保存 | (72,1672,world) | (0,1672,local) | (0,1672,local) | **y稳定；首轮表达污染落库，x/标签变了** |
| 真local初写→普通布局保存 | (0,314,local) | (0,314,local) | (0,314,local) | 数值与标签稳定 |
| world初写→每轮受控再project | (72,1672,world) | (72,3030,world) | (72,4388,world) | 每轮+1358；证helper误接风险，不冒充普通用户保存 |
| frame外workspace world→普通保存 | (1100,1672,world) | (1100,1672,world) | (1100,1672,world) | 未进入inside-local转换，稳定 |
| legacy无标签explicit formal→普通保存 | (0,314,无) | (0,314,无) | (0,314,无) | 命中兼容早退；稳定不代表可解释 |

第三行的重新project是探针**故意施加**，用于验证单3提议“打印或其他入口对所有local再投影”的后果。普通布局writer不存在这一步，不能将第三行写成“打开一次就自动写坏一次”。真实草稿/recovery入口虽有投影条件，但本轮没有证明一个已保存的旧block必然重新走草稿入口。

附加原点探针：frame=(200,400)、inset.top=96 时，同local块project=(272,810)，hydrate=(0,810)，明确缺的是 O.y=496；不是仅第二页或仅默认top0才有问题。O.y=0会掩盖纵轴缺陷，单首帧测试不足。

### 2. 035 合成库实跑

在同一内存SQLite补三条legacy override后，调用真实 `035.up(db)`，直接SELECT坐标并用生产reader读标签/role：

| 输入 | 回填x/y | 回填tag | role | legacy override |
|---|---|---|---|---|
| 真local(0,314,local) | 0/314 | 无 | inside | 清除 |
| 混合(0,1672,local) | 0/1672 | 无 | inside | 清除 |
| world(72,1672,world) | 72/1672 | 无 | inside | 清除 |

三者source痕迹均在，坐标标签均不在。这里是**实际SQLite执行证据**；并行侦察另有statement-capture helper佐证，但最终结论不依赖该替身。只能证明迁移代码会这样处理这些输入，不能证明真实旧writer写过每一种样本。

### 3. 稳定性边界

`persistChangedBlockLayouts` 在 `layoutsEqual` 为真时跳过保存；后者只比数值/rotation/策略/width_mode，**不比coordinate_space、frame_id、boundary_role**（`E/hooks/useLayoutPersistenceController.ts:17–23`；`E/placementService.ts:582–591`）。所以简单load未必发出任何布局PUT；普通政策切换、显式快照或实际移动则可能把hydrate后的混合表达存回。

测量reflow、跨块碰撞、frame移动能另外改变y（第一节表），与重复project不是同一机制。本轮单块往返隔离了这些变量，不声称所有用户动作下y稳定。数值守恒、坐标解释守恒、屏显/打印几何守恒必须分别验证。

## 四 · A/B 两候选的影响范围

### A · hydration 契约归一（world→local全轴）

| 要动/要同步审计的文件与函数 | 原因 / 屏显风险 |
|---|---|
| `E/placementService.ts`：reconcile、normalize两函数、buildRuntimeBlockPlacement、project、payload | 先定义frame选择与完整轴转换；现在选inside仅看x。不能单加一行−O.y，然后让所有消费者继续把y当长纸盒/world |
| `E/canvasObjectRepository.ts`；`E/hooks/useNoteCanvasDataAdapter.ts` | load和save-response都hydrate，须一致；普通保存与草稿保存须有单一存储口径 |
| `E/hooks/useNoteCanvasLayoutModel.ts`；`E/engineModel.ts`；`E/layers/BlockEditorLayer.tsx`、`NoteWritingSurfaceLayer.tsx` | runtime需将每块真local转换成正确world；单纸盒top=local会把次页上移，屏显须配套适配 |
| `E/pageStackBlockFragmentService.ts`；`pageStackContentFlowService.ts`；`hooks/useRuntimeNaturalWritingController.ts` | fragments只吃world；flow既有runtime_surface又有local分支，须防重复投影 |
| `E/placementService.ts` collision/reflow；`measurementService.ts`；`hooks/useMeasuredBlockReflowController.ts` | 不同帧的真local y都靠近0，全局碰撞会相互推挤；未保存测高也需坐标一致 |
| `E/layoutAffiliationService.ts`；`hooks/useRuntimePresentationController.ts` | 当前随帧move给块也加delta；运行时layout改为真frame-local后可能重复移动 |
| `E/modePolicyService.ts`、`pageFrameAffiliationService.ts`、`exportPreviewService.ts`、`canvasAiTreeService.ts`、`pagePrintProjectionService.ts` | 可见性、归属、统计、bbox、打印需同一world解释，不能靠默认首帧正确蒙混 |
| `S/services/canvasObjects.ts` normalize/write/read、`sourceProjectionMaterializer.ts`；新修正迁移 | 若保留world落库，server可继续无变换，但边界/标签要验证；若改local落库，独立Source writer也需转换契约。**不回改历史035** |

**迁移工程量级：中大至大，取决于census。** 新增转换代码可能少，但已混合local/无标签行不能可靠反推，需分确定来源、歧义待决和缺frame类，可能要新增修正迁移、备份/回滚/逐行解释收据。此为范围估计，不是工时承诺。

对13.2：若census直接读DB，修client hydration不会自动修复存量或SQL解释；必须把同一坐标解释交给census，分别保留stored role与重算role。已被035盖inside的行可能在“inside不动”筛选中被漏查，应先报告差异，不能自行扩大迁移射程。

### B · 保留原始坐标来源并贯穿当前编辑状态

| 要动/要同步审计的文件与函数 | 原因 / 屏显风险 |
|---|---|
| `E/runtimeLayout.ts` BlockBoxLayout；`E/types.ts` CanvasPlacement，或独立按placement标识的状态 | 需要表达raw来源、解释版本、frame依据和unknown；当前同一local标签不足。字段名/存法由HQ定 |
| `E/canvasPersistenceNormalizer.ts`；`canvasObjectRepository.ts`；`hooks/useNoteCanvasDataAdapter.ts` | 在API raw仍在时保留；同时处理reload和save-response，不能从已reconciled block猜来源 |
| `E/placementService.ts` normalize/payload/layoutsEqual/history | 白名单normalize/payload会丢新字段；equality/history现在漏比坐标身份，新来源变化可能不保存 |
| `E/hooks/useLayoutDraftController.ts`；`useBlockPlacementInteractions.ts`；`useMeasuredBlockReflowController.ts`；`usePlacementHistory.ts` | 拖拽、resize、测高、undo/redo更新layout时须更新解释；仅保存raw快照会与当前编辑脱节 |
| `E/hooks/useDraftBlockController.ts`；`useRuntimeNaturalWritingController.ts`；`draftBlockPersistence.ts` | 草稿canonicalization、retry/recovery、runtime_surface分支都需来源生命周期；不能重载后退回无来源 |
| `E/hooks/useNoteCanvasLayoutModel.ts`；`engineModel.ts`；fragments/print及其他world消费者 | 新解释通道必须覆盖未保存layout；只修打印可能保留其他归属/碰撞差异，须明确适用范围 |
| `S/validators/index.ts:722–738`；`S/services/canvasObjects.ts:452–505,296–316`；独立writer | 若字段需落库，validator放过不等于保存：server normalize仅写固定policy字段；必须write/read配对 |

**迁移工程量级：中大；若只保留新会话来源，初期回填较轻，但历史歧义仍在。** metadata扩展未必需要新列，却仍需版本/unknown分支、旧读者行为、保存与重载兼容验证。若还要修存量，B同样升为迁移工程。

对屏显：可以设计为保留现行混合屏显数值、另给world解释，但新通道过期或与draft不同步会制造两个互相矛盾的几何结果；若把解释统一接给屏显，风险面接近A。对13.2：当前运行时新增来源不能为历史DB凭空补证据，census仍要支持无来源/多解释，不能因为B有字段就直接按50%迁移。

## 五 · 与走查 2 的关联性及可判定检验

停车场B仍为“疑老笔记数据代际差异，观察期，坐实后修”（`H/plans/parking-lot.md:31`）。原现场是note初开时 **“Double-click to start writing”提示与分隔线错位**（`A/2026-08-29-ux-walkthrough-findings.md:18–23`）；老笔记相关只是线索，新笔记测试量少，要求记录创建时期+复现动作（同文件 `:52–55`）。

**本缝足以解释一类旧布局位置/归页差异，但尚不能解释完或坐实该具体观察。** 提示的定位样式不读取block y：`E/layers/DraftWritingEntryLayer.tsx:88–99` 控制是否挂载，`client/src/pages/Notes/NoteDetail.module.css:1594–1603` 定top=0、left取CSS变量（双击回调仍传递layout）。分隔线的具体DOM身份仍需在复现时记录。不能把“次帧y漂移”替代原症状。

建议HQ冻结以下机械对照，先全合成；真实证物只由Henry按后续授权提供/执行：

| 单变量对照 | 收据 / 可判定特征 |
|---|---|
| 固定正文、宽高、typography、viewport、frame，只换world/local/混合/无标签及035回填轨迹 | 逐阶段记raw→hydrate→normalize/draft→runtime→fragment→DOM盒。坐标病应有O.x/O.y对应的偏差，且O.y=0与非0对照不同 |
| 首帧top0、首帧top96、非零frame.y、次帧、相同x不同y多帧、失效frame_id | 区分原点转换遗漏、仅x选帧错误、未知frame降级；不以y大小猜来源 |
| 同一数据，首次render、RAF、ResizeObserver后、重载后 | 记visible IDs、提示存在性、分隔线身份及rect、paper rect/scale、每次测高与draft变化；分清hydrate立刻偏差和测量后的位移 |
| 固定坐标，仅切默认纸族/web与显式/legacy typography override | `E/pageFrameTypographyService.ts:24–47,62–66`、`typographyProfileService.ts:169–184`是另一真实代际分流；换行/高度改变不应归于坐标变换 |
| 固定坐标与排版，仅切frame extension完整/043恢复默认 | 默认inset或纸型变化可解释相同坐标的不同呈现；保留恢复来源作为混杂项 |
| 单块→双块同帧→双块异帧；禁用测量回调的内存对照 | `E/hooks/useBlockMeasurement.ts:31–54`多时点测高，`measurementService.ts:123–145`与collision会产生非O.y增量；其先后顺序需单独定位 |

判定应按证据分为：坐标契约已复现、测高/排版/提示时序另因、两因叠加、尚未复现；只有真实观察与合成机制具有同一签名且单变量对照成立，才可把停车场项归因。此次未实跑该DOM矩阵、未访问旧笔记，维持待证。

13.2尚未发现本题census实现：计划 `H/plans/v13-2-wilderness-retirement-plan.md:1,12–14,28–38` 仍把SQL/dry-run/真实执行分段，开工闸为单3收货。定向搜索client/src、server/src、scripts的代码文件未发现对应census或备份实现；不把别的imprint实验census当成它。图三 `A/2026-09-07-wilderness-migration-mapping.md:11,17–25,37–39,49` 的surface范围、50%工作值和守恒式是后续对接点，**现役center-inside判定不是50%判据**。

## 六 · 复跑方式、验证与未做

所有执行从仓库根PowerShell用单引号here-string把JS送 `node` stdin。下列是往返探针完整基座，可直接复跑；不落脚本文件，也不加载Vite，因此不存在Vite自动读env路径。源码只作内存transpile，新增export只在模块内存副本。最后一版在此基座末尾 `db.close()` 之前继续执行本文所列035/原点/SQL样本；SQL用第二节全文，经 `db.prepare(sql).all({scope_user_id:'s4-user'})` 执行并断言总数8、035痕迹数3。

```javascript
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('./client/node_modules/typescript');
const Database = require('./server/node_modules/better-sqlite3');
const root = process.cwd();
const E = 'client/src/pages/Notes/canvasEngine/';
const cache = new Map();
let apiPut;
const noCall = () => { throw new Error('Unused I/O boundary called'); };
function source(relative, expose = '') {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  assert.ok(file.startsWith(root + path.sep));
  assert.ok(/\.tsx?$/.test(file) && !/\.env/.test(file));
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8') + expose, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  function localRequire(spec) {
    if (spec === '@/services/api') return { default: { put: (...args) => apiPut(...args), get: noCall }, __esModule: true };
    if (spec === './canvasAssets.js') return { finalizeCanvasAssetCleanup: noCall, releaseAssetReference: noCall };
    if (!spec.startsWith('.')) throw new Error('Non-local dependency blocked: ' + spec);
    let resolved = path.resolve(path.dirname(file), spec).replace(/\.js$/, '.ts');
    if (!path.extname(resolved)) resolved += '.ts';
    assert.ok(resolved.startsWith(root + path.sep));
    return source(path.relative(root, resolved));
  }
  new Function('require','module','exports',code)(localRequire,module,module.exports);
  return module.exports;
}
const server = source('server/src/services/canvasObjects.ts', '\nexport { getSavedCanvasObject as s4Reload };');
const migration = source('server/src/db/migrations/035_v2_canvas_objects.ts').default;
const placement = source(E+'placementService.ts');
const repo = source(E+'canvasObjectRepository.ts');
const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); CREATE TABLE courses(id TEXT PRIMARY KEY); CREATE TABLE notes(id TEXT PRIMARY KEY,user_id TEXT,course_id TEXT,metadata TEXT,updated_at TEXT); CREATE TABLE note_blocks(id TEXT PRIMARY KEY,user_id TEXT,course_id TEXT,status TEXT); CREATE TABLE note_block_placements(id TEXT PRIMARY KEY,note_id TEXT,block_id TEXT,order_index REAL,display_overrides_json TEXT,updated_at TEXT);");
migration.up(db);
db.exec("INSERT INTO users VALUES('s4-user'); INSERT INTO courses VALUES('s4-course'); INSERT INTO notes VALUES('s4-note','s4-user','s4-course','{}',NULL);");
const frame = {id:'s4-frame-2',role:'primary_page_frame',exportable:true,x:0,y:1358,width:904,height:1278,contentInset:{left:72,right:72,top:0,bottom:96}};
const collection = {pageFrames:[frame], primaryFrameId:frame.id};
const project = (layout) => placement.projectPageFrameLocalLayoutToCanvasLayout({layout,pageFrame:frame,pageOffsetX:0});
const seed = {x:0,y:314,width:300,height:80,width_mode:'manual',coordinate_space:'page_frame_local',frame_id:frame.id,surface:'formal_page'};
apiPut = async (url,input) => {
  const id = url.split('/').at(-1);
  return {data:server.saveBlockCanvasPlacement(db,'s4-user','s4-note',id,input)};
};
function setup(id) {
  db.prepare("INSERT INTO note_blocks VALUES(?, 's4-user','s4-course','active')").run(id);
  db.prepare("INSERT INTO note_block_placements VALUES(?, 's4-note',?,0,'{}',NULL)").run('p-'+id,id);
  return {id,placement_id:'p-'+id,display_overrides_json:{}};
}
function row(block) {
  const r=db.prepare("SELECT x,y,metadata FROM canvas_placements WHERE id=?").get(block.placement_id);
  return {x:r.x,y:r.y,space:JSON.parse(r.metadata).layout_policy.coordinate_space};
}
function reload(block) {
  const record = server.s4Reload(db,'s4-user','s4-note','canvas-object:s4-note:block-placement:'+block.placement_id).blockLayout;
  return repo.applyCanvasLayoutsToBlocks([block],[record],{pageFrameCollection:collection})[0].canvas_layout;
}
async function save(block,layout) {
  await repo.saveBlockCanvasPlacementForNote({noteId:'s4-note',block,layout,pageFrameCollection:collection});
}
(async () => {
  const receipts=[];
  for (const [name,first,reproject] of [
    ['world-create_then_ordinary',project(seed),false],
    ['true-local_then_ordinary',seed,false],
    ['world-create_then_reproject',project(seed),true],
    ['outside-world_then_ordinary',{...seed,x:1100,y:1672,surface:'canvas_workspace',coordinate_space:'canvas_world'},false],
    ['legacy-untagged_then_ordinary',{...seed,coordinate_space:undefined,frame_id:undefined},false]
  ]) {
    const block=setup(name);
    await save(block,first);
    const writes=[row(block)]; const hydrated=[];
    for(let i=0;i<2;i++) {const h=reload(block);hydrated.push({x:h.x,y:h.y,space:h.coordinate_space??null}); await save(block,reproject?project(h):h); writes.push(row(block));}
    receipts.push({name,writes,hydrated});
  }
  assert.deepEqual(receipts[0].writes.map(r=>r.y),[1672,1672,1672]);
  assert.deepEqual(receipts[0].writes.map(r=>r.x),[72,0,0]);
  assert.deepEqual(receipts[0].writes.map(r=>r.space),['canvas_world','page_frame_local','page_frame_local']);
  assert.deepEqual(receipts[1].writes.map(r=>r.y),[314,314,314]);
  assert.deepEqual(receipts[2].writes.map(r=>r.y),[1672,3030,4388]);
  assert.deepEqual(receipts[3].writes.map(r=>r.y),[1672,1672,1672]);
  assert.deepEqual(receipts[3].writes.map(r=>r.space),['canvas_world','canvas_world','canvas_world']);
  assert.deepEqual(receipts[4].writes.map(r=>r.y),[314,314,314]);
  console.log('S4_SQLITE_ROUNDTRIP '+JSON.stringify({db:':memory:',cases:receipts.length,roundsAfterInitial:2,receipts}));
  db.close();
})().catch(e=>{db.close();throw e;});
```

为完整复现最后一版，把以下代码放在上述基座的成功分支 `db.close()` 前（其中SQL常量取第二节原文）：

```javascript

  const mixedHydrated = placement.reconcileHydratedBlockLayoutSurfaceAuthority(project(seed),[frame]);
  const trueLocalSameY = placement.reconcileHydratedBlockLayoutSurfaceAuthority({...seed,y:1672},[frame]);
  assert.deepEqual(mixedHydrated,trueLocalSameY);
  const shiftedFrame={...frame,x:200,y:400,contentInset:{...frame.contentInset,top:96}};
  const shiftedWorld=placement.projectPageFrameLocalLayoutToCanvasLayout({layout:seed,pageFrame:shiftedFrame,pageOffsetX:0});
  const shiftedHydrated=placement.reconcileHydratedBlockLayoutSurfaceAuthority(shiftedWorld,[shiftedFrame]);
  assert.equal(shiftedWorld.x,272); assert.equal(shiftedWorld.y,810);
  assert.equal(shiftedHydrated.x,0); assert.equal(shiftedHydrated.y,810);
  console.log('S4_AMBIGUITY '+JSON.stringify({sameHydratedObject:true,nonzeroInset:{world:[shiftedWorld.x,shiftedWorld.y],hydrated:[shiftedHydrated.x,shiftedHydrated.y]}}));
  const legacy=[];
  for (const [name,layout] of [
    ['035-local',seed],
    ['035-mixed',{...seed,y:1672}],
    ['035-world',project(seed)]
  ]) {
    const block=setup(name);
    db.prepare('UPDATE note_block_placements SET display_overrides_json=? WHERE id=?').run(JSON.stringify({better_notebook_layout:layout}),block.placement_id);
    legacy.push(block);
  }
  migration.up(db);
  const migrated = legacy.map(block=>{
    const r=row(block);
    const old=db.prepare('SELECT display_overrides_json FROM note_block_placements WHERE id=?').get(block.placement_id);
    const record=server.s4Reload(db,'s4-user','s4-note','canvas-object:s4-note:block-placement:'+block.placement_id).blockLayout;
    assert.equal(r.space,undefined);
    assert.equal(old.display_overrides_json,'{}');
    assert.equal(record.layout.boundary_role,'inside');
    return {name:block.id,...r,space:r.space??null,role:record.layout.boundary_role,legacyCleared:true};
  });
  assert.deepEqual(migrated.map(r=>[r.x,r.y]),[[0,314],[0,1672],[72,1672]]);
  console.log('S4_035_SQLITE '+JSON.stringify(migrated));
  db.prepare("INSERT INTO canvas_objects(id,user_id,course_id,note_id,canvas_id,kind) VALUES('s4-frame-object','s4-user','s4-course','s4-note','s4-note','page_frame')").run();
  db.prepare("INSERT INTO canvas_placements(id,user_id,course_id,note_id,object_id,canvas_id,x,y,width,height,frame_id) VALUES('s4-frame-placement','s4-user','s4-course','s4-note','s4-frame-object','s4-note',0,1358,904,1278,'s4-frame-2')").run();
  db.prepare("INSERT INTO page_frame_extensions(frame_id,user_id,course_id,note_id,object_id,canvas_id,content_inset_json) VALUES('s4-frame-2','s4-user','s4-course','s4-note','s4-frame-object','s4-note',?)").run(JSON.stringify(frame.contentInset));
  const reportText = fs.readFileSync(path.join(root,
    'docs/agent-ops/analysis/2026-09-07-v13-1-s4-coordinate-contract-recon.md'), 'utf8');
  const sql = reportText.split('```sql\n')[1].split('\n```')[0];
  const buckets = db.prepare(sql).all({scope_user_id:'s4-user'});
  assert.equal(buckets.reduce((n,b)=>n+b.placement_count,0),8);
  assert.equal(buckets.filter(b=>b.history_hint==='035_receipt_survives').reduce((n,b)=>n+b.placement_count,0),3);
  console.log('S4_SQL_DRAFT_SYNTHETIC '+JSON.stringify({total:8,buckets}));
  // 仅在合成库验证：窄块的world横轴不相交，不能掩盖独立的world纵轴候选。
  db.prepare('UPDATE canvas_placements SET width=50 WHERE id=?').run('p-world-create_then_ordinary');
  const narrow = db.prepare(sql).all({scope_user_id:'s4-user'})
    .find(b=>b.coordinate_tag==='page_frame_local' && b.min_y===1672);
  assert.equal(narrow.raw_world_intersects,0);
  assert.equal(narrow.raw_world_y_start_in_content,1);
  console.log('S4_SQL_NARROW_AXIS horizontal_intersection=0, world_y_candidate=1');

```

最终输出摘要：

```text
S4_SQLITE_ROUNDTRIP cases=5, roundsAfterInitial=2; 全部断言通过
S4_AMBIGUITY sameHydratedObject=true; nonzeroInset world=[272,810], hydrated=[0,810]
S4_035_SQLITE 3 rows: x/y preserved, space=null, role=inside, legacyCleared=true
S4_SQL_DRAFT_SYNTHETIC total=8, 035_receipt_survives=3, grouped_rows=7
S4_SQL_NARROW_AXIS horizontal_intersection=0, world_y_candidate=1
exit=0
```

未做：产品/常驻测试/配置修改；用户库查询与存量污染计数；真实迁移或回滚；13.2完整census实现；A/B修复；单3续作；typecheck/build、完整 `npm run verify:v2-bn8-runtime`、安全类/马拉松、浏览器打印/PDF或人工验收；依赖安装、.env读取、key输出、commit/push/PR/merge。探针PASS只表示机制被实证，不替代完整验证门，也不放行13.1或单3。段plan没有“本报告已过runtime门”的含义。

CodeGraph目录存在，已优先尝试CLI，当前不可用且未发现可调用MCP；rg也不可用，回退限域PowerShell/source读取，未重索引。本轮仅新增本报告、在S4工单追加Result；工单原Status和历史正文不回改。开工已有server修改及其他未跟踪材料不计入本单。

## 七 · 修复建议对照表

本表只陈列裁定所需证据，不选边。

| 维度 | A：全轴归一 | B：保留坐标来源 |
|---|---|---|
| 必须先冻结 | runtime局部/世界与存储格式、frame选择、legacy未知分支 | 来源字段/版本/unknown、当前编辑如何更新来源、哪些消费者使用新解释 |
| 最小有效交付 | hydrate + runtime/屏显 + 普通保存/草稿 + flow/reflow/frame move共同闭合 | raw入口 + normalize + draft/history/recovery + save/reload + world消费者共同贯通 |
| 主要屏显风险 | 次页回到local小y、跨帧全局碰撞、frame move重复delta | 原始快照过期，当前编辑与打印/census各用不同几何；统一屏显后风险接近A |
| 历史数据 | 可能需新增修正迁移；混合local/untagged不能盲减O.y | 新字段不能补回丢失史；历史行仍需unknown/多解释，修数据仍要迁移 |
| 13.2影响 | 修client不等于修DB/census；需区分stored boundary与几何重算 | 新运行时来源不等于存量有来源；需把解释依据带入census |
| 工程量级 | 中大至大，取决于存量可识别比例 | 中大；只保新数据较轻，历史纠错另计且可能同A |
| 共同验收证据 | 真local/world/混合/legacy、非零原点、多帧、普通保存与草稿重试分别两轮落库；screen/runtime/fragments几何一致 | 同左，另加未保存拖拽/测高/undo/recovery与重载来源连续性 |
| 当前可交HQ的结论 | 已证明full-axis缺口及下游耦合，尚未设计冻结/实施 | 已定位raw保留入口与每个丢字段处，尚未设计冻结/实施 |
