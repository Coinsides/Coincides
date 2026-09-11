> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · 波次 E5 · 封面元数据行 + 标签真相
> **上游**: 09-11 设计日会议记录 §五(封面账单,Henry 拍)+§六(检索分层)+§十(批量拍板);波次 E 唯一新真相单

# E5 · 封面元数据行 + 标签真相

## 零 · 裁定原文

1. **标签=唯一新真相**:note 级标签,扁平⛔层级(检索锚非分类学);带出处(actor:本单只开人面,schema 预留 agent 出处字段——V14 同门批 Agent 动词,本单⛔任何 Agent 面);
2. **来源账(上游)与去向账(下游)=聚合投影,零新记账**:上游=本纸块引用的 source references(按源文档聚合)+引用的其他笔记;下游=本纸的块被哪些板(board ranges/板卡)、哪些内容组(item 出处)引用——全部从既有边现算,⛔任何封面级副本表;
3. **浮窗⛔挤版**(Henry 拍):封面(表头带下方)只放一行元数据:标签 chips 排 + 折叠条(如「来源 3 · 去向 2」),点开浮层看明细;表头带高度有界不变式沿用;
4. **View info 收编**:现 ⋯ 菜单 View info 弹窗的统计(Mode/Blocks/Sources/Status)并进封面浮层,菜单项退役;
5. **节制线**:封面到"一排标签+折叠条"为止,空态安静(无标签无引用时元数据行零可见,hover 表头区才显影"Add tags");
6. 打印/overview/导出:元数据行⛔入投影(与表头现役投影差异同批申报);导出开关归后续⛔本单。

## 一 · 交付面

### 1. 标签真相(server)

- 新迁移:note_tags 表(id/note_id/user_id/label/actor(枚举 user|agent,本单只写 user)/created_at;note_id+label 唯一;级联随 note 删);
- 人类路由最小面:挂在既有 notes 路由族(GET 随 note 水合或子资源/POST 添/DELETE 删),zod 校验(label 长度上限 48,去首尾空白,⛔空);
- ⛔Agent 面/⛔检索接线(归 V14/12.9d)。

### 2. 封面元数据行(client)

- 表头带(NotePaperHeader)下沿一行:标签 chips(可点删,末尾 + 添加,安静态遵循 description 同款 hover 显影)+ 折叠条(上游/下游计数,零引用时不显);
- 左右随墙;表头带高度上限相应微调(申报新上限);
- 存量块坐标零改写不变式沿用(D2 机制)。

### 3. 聚合浮层

- 点折叠条→浮层(锚表头,向下弹,视口内滚,⛔挤版):上游节(源文档列表+引用笔记列表,各带计数)/下游节(板列表/内容组列表)/统计节(收编 View info 的 Mode/Blocks/Sources/Status);
- 列表项可点跳转(现役导航);聚合查询走既有读路由,若无现成聚合端点,在既有 note 读路由族最小扩面一个只读 GET(server 现算,⛔新表);
- ⋯ 菜单 View info 项移除(handler/弹窗退役,测试随行更新申报)。

## 二 · 禁区

⛔Agent 面;⛔检索/embedding 接线;⛔封面级副本记账(聚合必须现算);⛔层级标签;⛔TextFlow 面;⛔安全类测试;⛔碰 .git;⛔改权限配置。收口跑受影响秒级静态门。

## 三 · 验收

- typecheck+build 绿(client+server);定向绿+新增:标签 CRUD 路由用例(唯一约束/校验/级联)、聚合端点用例(上下游计数正确性,合成边)、封面行为用例;
- 冒烟(真浏览器+合成):①加标签→刷新在→删标签→刷新无;②有引用的笔记折叠条计数正确,点开浮层三节齐;③零标签零引用=元数据行安静;④View info 菜单项消失,统计在浮层;⑤打印/overview 无元数据行;
- 证据落 `docs/audits/2026-09-11-e5-builder/`。

## 四 · 申报义务

Result 必含:交付清单+diff、迁移与路由申报、聚合查询设计(下游边的取数来源逐一列)、表头带新上限、冒烟证据、测试数字。冲突停线⛔自作主张。

## Result

**2026-09-11 · Codex builder 已交付，待既有复核/放行流程。** 未发现冲突，未 commit。实现与定向测试共 27 个文件（18 修改、9 新增）；[逐文件 manifest + SHA-256](../../audits/2026-09-11-e5-builder/source-manifest.json)、[完整产品 diff（包含新增文件）](../../audits/2026-09-11-e5-builder/product.diff)、[冒烟与复跑说明](../../audits/2026-09-11-e5-builder/README.md)。

### 交付清单

- 新增 `note_tags` 迁移与 schema；`notes.ts` 挂载人类 metadata 子路由；新增聚合只读 service、CRUD/聚合测试及合成 fixture。
- 新增 `noteMetadataRepository`、`NoteCoverMetadata.tsx/.module.css` 和 23 项组件行为测试；接入 `NotePaperHeader` 与现役层 props。chips 删除、末尾加号、上下游折叠条、下弹浮层、三节统计、错误重试与写入追踪均已接通。
- 退役旧 View info 菜单项、handler、info state、浮窗与样式；同步 Chrome / ViewOptions / Header / RuntimeDocument 测试。Mode / Blocks / Sources / Status 保持原口径。
- Source projection 的 `getProjectionUserWork` 增加 `note_tag_count` 并纳入 `has_user_work`，同步 client response type，避免删除 Source 时漏报标签这种保留工作。没有修改 Source 动词或工具面。

### 迁移与人类路由申报

迁移 `064_v13_note_tags`，仅新建 `note_tags` 和 user/note 索引。字段：id、note_id、user_id、label、actor、created_at；`UNIQUE(note_id,label)` 为去首尾空白后的精确标签唯一（不强制大小写折叠）。DB CHECK 限制 label 1–48、trim；actor enum 仅预留 `user|agent`。note/user 删除均 CASCADE；没有 course_id，所以沿既有 note 级联清理，不新增 course 归属副本或生命周期 registry 项。迁移可重复执行；已在隔离测试数据库执行，未对正常用户数据库手工迁移。

| 路由 | 输入 / 输出 / 行为 |
| --- | --- |
| `GET /api/notes/:id/tags` | `{ tags }`，含 actor/created_at，按 created_at/id 排序 |
| `POST /api/notes/:id/tags` | strict zod `{label}`，trim、1–48、非空；201 `{tag}`，重复409；actor 固定写 `user`，无调用方 actor 或层级字段 |
| `DELETE /api/notes/:id/tags/:tagId` | 删除本 note 标签；成功 message，缺失404 |
| `GET /api/notes/:id/metadata` | 只读现算 `{upstream:{sources,notes,count},downstream:{boards,content_groups,count}}` |

沿用 notes 路由认证与当前用户 note 范围，无新顶层路由、MCP registry 或 manifest 条目。14 个 public tool entries 保持原样；没有 Agent 面。

### 聚合设计与逐列取数

基础 `paper_blocks`：当前 note 的 `note_block_placements` JOIN 当前用户 active `note_blocks`。Item→note 来源边使用 UNION 去重：`items.origin_note_id` 出生回执；`item_anchors.target_kind=block` 经 target_id→active block placements；`content_range` 经 range_json.block_id→placements；`canvas_object/table_region/image_region` 经 range_json.canvas_object_id（或 target_id）→active canvas_objects.note_id。`paper_items` 为这些既有边指向当前纸的 Item。group 只取 active、同用户、成员 kind=item 的集合。

| 返回列 / 显示项 | 既有事实来源及聚合口径 |
| --- | --- |
| `upstream.sources[].document_id` | 本纸块 `note_block_sources.document_id`，或 document_chunk_id→`document_chunks.document_id`→documents |
| `source_record_id` | `note_block_sources.source_record_id`→当前用户 source_records |
| `projection_note_id` | source_record→`source_materializations.projection_note_id`；无投影为 null |
| source `title/course_id` | 优先 Source display_name，回退 documents.filename；course 优先 documents.course_id，回退 source_records.origin_course_id |
| source `block_id/reference_id` | 被聚合 receipt 的代表块/引用 id，供现役 anchor/块回跳，不产生新 anchor |
| source `count` | 同 Source identity 或 legacy document identity 的 receipt 数。同纸已有一条同时带 document/Source 的 receipt 时，只有唯一明确映射才把 legacy receipt 归并；绝不按文件名猜 identity |
| `upstream.notes[].note_id/title/course_id` | 本纸 item_ref 块 content_json.item_id→上述 Item 来源边→其他 active、非 system note；不把本纸自引用列为上游 |
| upstream note `count` | 指向该笔记的 DISTINCT item_ref block 数，多 anchor 不倍增 |
| `downstream.boards[].board_id/title` | 当前用户 boards，以下四类既有 board_members 引用命中即聚合 |
| 板：整纸卡 | `board_members.member_kind=note AND member_id=currentNoteId` |
| 板：文本范围卡 | member_kind=text_range→`board_text_ranges`，必须仍挂在该 board，且 range.note_id=currentNoteId 或 range.block_id 属于 paper_blocks |
| 板：Item 卡 | member_kind=item，member_id 属于 paper_items；出生回执或任一现役 anchor 都可证明来源 |
| 板：内容组卡 | member_kind=content_group，该 active group 至少一个 item 成员属于 paper_items；不能仅因 group.note_id 相同就算引用 |
| board `count` | 每板 DISTINCT board_member.id，混合来源同一卡只算一次；placed=0 的 staged card 仍是板成员，仍计入；无已挂载 member 的孤立 range 不计 |
| `downstream.content_groups[].content_group_id/title/note_id/course_id` | active content_groups→content_group_members(kind=item)→paper_items；note_id 是现役导航位置，可 null |
| group `count` | 该组 DISTINCT 相关 Item 数；一个 Item 多 anchor 或出生+anchor 重叠均不倍增 |
| `upstream.count` | 聚合后的 source 实体数 + referenced note 实体数（折叠条数字，不是 receipt 总数） |
| `downstream.count` | 引用 board 实体数 + content_group 实体数 |
| Statistics `Mode/Blocks/Sources/Status` | 现役 runtime mode、sortedBlocks.length、各块 source_references.length 之和、note.status；Sources 保持 View info 原有 receipt 数口径，与上游文档实体数不同 |

所有查询按 GET 时现算；无副本表或持久聚合缓存，测试用 DB total_changes 验证读取零写。页面初次水合、块集变化、开浮层、window focus、板变更事件会刷新；标签写后再读，补齐首屏慢 GET 尚未到达的存量标签。写入进入现役 pending-write registry，失败可重试，导航使用现役 Router Link / navigate 并保留离开拦截。

源文档点击优先现有 source anchor，接着 retained Source projection，最后走现有 authenticated file open；legacy 缺 anchor 时定位代表块并给出真实提示。内容组 note_id 存在时进入现役 editor；null 时明确显示 Open project，回项目入口。

### 表头带与投影申报

新上限 **244px**（原208 + 单行28 + 顶部间距8），初始测量回退 **156px**（原120+36）。满高构成为 padding48 + title80 + 间距8 + description72 + 间距8 + metadata28。chips 横向溢出处理；折叠条窄宽可省略；浮层采用 non-modal popover 顶层、向下锚定、视口内滚动，不参加表头布局。

左右 padding 仍来自现役纸墙，D2 的表头显示偏移机制延续；没有更新 block/canvas placement 坐标。无标签无引用时行内容 opacity=0，hover/focus 表头才显影 Add tags；只读纸同位置为安静的 Note metadata 入口，保留统计且不提供标签写按钮。

overview 沿用原表头隐藏方式，并主动关闭浮层。打印沿用专用 NotePrintLayer，整个封面表头（title/description/metadata）均不进入打印根；另加元数据行/浮层 print CSS 排除。现役 export preview 的差异保持不变：编辑器仍可显示原表头 chrome，导出内容投影不接收元数据组件；未新增导出开关。打印证据为真浏览器触发现役 beforeprint + 合成应用生产打印 CSS；系统打印预览自动化未完成，不把它宣称为原生打印对话框验收。

### 冒烟、测试与边界

证据全部落在 [docs/audits/2026-09-11-e5-builder/](../../audits/2026-09-11-e5-builder/README.md)：标签加→刷新在→删→刷新无、4/3 折叠条与三节、安静态、More 无 View info、overview/打印排除、源/板/组导航、只读统计、390px 浮层、244px 极限高度、存量 placements 全字段前后相等。显式非零 x/y、负 y、左右墙调整及投影排除另有定向集成测试。

最终 **Client 82/82 + Server 25/25 = 107/107**，新增 **30**（封面23、服务端7）；typecheck+build 两端绿。5 组受影响秒级静态门绿：canvas boundary **167** checks、groups rail、source experience contract+model、tool-face parity **14** public entries（仅必要条件）、server shared import **222** product files / **0** violations；只读 `git diff --check` 通过。完整命令与日志在 evidence README，测试非重复计数。

按本单未跑全量 verify 或安全类测试；没有 retrieval/embedding、层级标签、Agent 面、TextFlow 面改动；没有改权限或写 Git 元数据。现役 schema-recursion、Vite chunk/import、Router future flag 警告已保留记录，命令均 exit 0。本回执是 builder 交付，不代行 HQ 放行。
