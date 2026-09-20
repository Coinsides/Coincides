> **状态 (Status)**: active（停线证据；未实现、未验收）
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否（实现事实以所列现物为准，裁定留 HQ）

# B5 图片编辑 v1：现物考古与停线记录

> **二轮续施工导航（2026-09-20）**：HQ 已通过工单「补遗一」消解承载点冲突，二轮施工已交工作树，详见 [二轮逐件交付](round2.md)、[验证组件收据](gates-round2.md)、[服务端收据](server-round2.md)。本页以下为一轮停线原始记录，保留其当时结论，不作为二轮未施工的判断。

工单：`docs/agent-ops/handoffs/2026-09-20-v14-b5-image-editing-order.md`。本轮身份为 Codex builder。

**结论：STOPPED，未完成。** 工单 §一.1 指定纸面媒体图块的编辑参数存入 `image_object_extensions` 族，并以该族已有 `fit` 为起点；现役纸面媒体却是 `NoteBlock(block_type='media')`，通过 `metadata.media` 引用资产，与 `kind='image'` CanvasObject 的扩展表读写分离。尚无可直接复用的身份关联、保存与生命周期通道。把两者接通需要补定持久化桥接；本轮不把这项设计默认为普通字段扩展，也不自行改存 metadata 来绕过工单。

## 1. 存储冲突证据

| 现物 | 行号 | 事实 |
|---|---|---|
| `server/src/services/mediaBlocks.ts` | 16、27–32 | 明文注释媒体块将资产身份存 metadata、不用 image extension；实际校验 `metadata.media` 并查 `canvas_assets`。 |
| `server/src/services/noteBlockLifecycle.ts` | 439、448–456、504–526 | 创建媒体块校验资产，写 `note_blocks` 与 `note_block_placements`。 |
| `server/src/__tests__/v13MediaBlocks.test.ts` | 79–95，尤其 90 | 既有媒体创建回归明确断言 `image_object_extensions` 行数为 0。本轮只读取该断言，未执行测试。 |
| `server/src/db/migrations/041_v2_canvas_image_assets.ts` | 32–46 | 扩展表主键 `object_id` 外键指向 `canvas_objects(id)`；`asset_id` 指向原资产。`fit` 默认 `contain`，只接受 `contain/cover`。 |
| `server/src/services/canvasObjects.ts` | 1343–1370、1423–1430 | 块投影 handler 写 content mount；image handler 才写图片扩展。 |
| 同上 | 1019–1023、2026–2027 | image 路径禁止 content mount，要求 asset backing；已有对象禁止更改 kind。不能直接把纸面块投影转成 image。 |
| `server/src/services/noteBlockLifecycle.ts` | 886–891 | 块的可丢弃投影检查把存在 image extension 作为阻断项；直接附挂扩展还会改变现役生命周期语义。 |

现役扩展字段申报：身份/归属键 `object_id,user_id,course_id,note_id,canvas_id,asset_id`；呈现字段 `fit,caption,alt_text,natural_width,natural_height,metadata`；时间戳 `created_at,updated_at`。**本轮新增字段 0；crop/zoom/rotation 未落库。**

工单要求全媒体块通用、既有媒体回归零破，同时声明设计裁量完成、禁止改写门/注册表。仅改既有 image handler 不会作用于纸面媒体；复用块投影写入扩展又需要改变上述持久化与生命周期边界。这里申报的是工单的存储前提与现役对象身份未对齐，**不是声称技术上永远无法桥接**。须由 HQ 明确纸面媒体的参数承载身份与可修改范围后重派；本轮不替 HQ 选择改存 metadata、建立桥接或换对象身份。

## 2. 取景框考古

- `client/src/pages/Courses/noteCover/geometry.ts:10`：`coverViewport` 按消费框比例取 viewport，卡面默认 2:1。
- 同文件 `:15`、`:24`、`:37`：`coverFitSize` 保持原图比例覆盖 viewport，`clampCoverPosition` 限制平移，`coverPositionToCrop` 以原图百分比返回 x/y/width/height。
- 同文件 `:57`：`coverCropForViewport` 已支持框比例变化时保留焦点和 zoom；card/page 共用，不能另建第三套算法。
- `NoteCoverEditor.tsx:100`、`:116`、`:136`：现役浮层以共用几何约束缩放/位置，未交互保存保持原参数，使用已安装的 Cropper。以上代码均未修改。

## 3. 媒体消费链路

| 面 | 现役路径与行号 | 现状 |
|---|---|---|
| 纸面 | `BlockEditorLayer.tsx:595` → `MediaBlockProjection.tsx:8,17,39`；`mediaBlockService.ts:3–11` | 只传 NoteBlock，读 `metadata.media.asset_id` 加载原资产；解析字段仅 asset_id/naturalWidth/naturalHeight/alt。 |
| 打印 | `NotePrintLayer.tsx:70,81–83` → `NoteReadOnlyPageContent.tsx:61,70` | `mediaPlaceholder={print}`，打印媒体为占位；beforeprint 冻结见 `NotePrintLayer.tsx:117–125`。 |
| 导出预览 | `ExportPreviewLayer.tsx:36–45` | 直接使用 `MediaBlockPlaceholder`。 |
| Overview / 缩略 | `NoteOverviewLayer.tsx:98` → `NotePageThumbnail.tsx:41` → `NoteReadOnlyPageContent` | 非打印分支最终回到同一 MediaBlockProjection。 |

以上短文件名均位于 `client/src/pages/Notes/canvasEngine/` 下的 `layers/` 或 `blocks/`；完整路径见原始日志。各面没有从 imageObjects 向媒体 NoteBlock 传递编辑参数的现役接点。打印/导出占位是要随 B5 改进的旧行为，**不单独把这一待实现需求列成第二个停线冲突**。本轮仅追踪现役导出预览及打印链路，未宣称已普查所有潜在外部导出器。

## 4. 验证状态与未做项

`package.json:44` 静态拆分为 25 个顶层组件，扣除 HQ 收口的 `git diff --check`、`check:changed-file-secrets`，口径为 **非 git/secrets 的 23 组件**。完整命令清单保存在原始日志 `gate-plan-not-run.txt`。

- 23 组件：**0/23 执行**；完整门未运行、未声称通过。
- client 全库：0 次运行（门中 `npm run test:unit`）；server 全量：0 次运行（另需 `npm --prefix server run test:v2`）。
- B5 定向测试、新增测试、安全对抗测试：均 0；没有伪造测试通过数字。
- UI 编辑入口、crop/zoom/rotation、撤销/重做、同源投影均未实现。
- `current-state/app-operating-manual.md` 未修改：功能尚未交付，不能提前写成现役能力；说明书义务保留至重派完成。
- 原资产、业务源码、schema、依赖、行内媒体、page_frame_local、Relation/Agent 域与操作配置均未修改；未进行 git 写操作或 commit。

## 5. 原始证据与范围

原始目录：`.codex-tmp/b5-image/`。

- `persistence-archaeology.txt`：持久化子任务捕获的带行号源码。
- `source-evidence.txt`、`source-sha256.txt`：停线前所涉 20 个源码范围及整文件 SHA-256；这是只读重采样，不是测试日志。
- `gate-plan-not-run.txt`：从当前 package.json 机械拆分的 23 组件清单，逐项未运行。
- `capture-evidence.ps1`、`capture-evidence.cjs`：采样脚本。PowerShell 文件执行被本机 execution policy 拒绝，改用 Node 读取同一范围清单采样，未修改执行策略。
- `environment-notes.txt`：工具与采样执行限制；`worktree-status.txt`：留档后的只读 git 状态。

仓库存在 `.codegraph/`；已先尝试 CodeGraph CLI，但命令不在 PATH，可用工具列表也无 CodeGraph。`rg` 同样不在 PATH，随后使用限于仓内指定源码目录的 PowerShell 搜索/读取。未索引仓库、未读取凭据值。开工已有未跟踪文件未改动；本轮交付仅此蒸馏件、工单追加回执及指定原始目录。
