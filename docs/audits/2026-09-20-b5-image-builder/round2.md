> **状态 (Status)**: active（builder 二轮施工证据，非 HQ 放行）
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否（以源码、原始执行日志及工单裁定为准）

# B5 二轮：图片编辑 v1 交付

依据工单「补遗一」完成施工。唯一新增持久化键为 `NoteBlock.metadata.media.edit_v1`；原资产恒存，缺省/null 零编辑、存量零迁移。没有建立 `image_object_extensions` 桥接。一轮停线报告与工单原 Result 保留；其存储冲突及打印/导出范围由补遗消解。

## 字段与交互

```ts
edit_v1?: {
  crop: { x: number; y: number; w: number; h: number } | null;
  zoom: number | null;
  rotation: 0 | 90 | 180 | 270;
} | null
```

crop 为顺时针旋转后原图包围盒百分比，x/y≥0、w/h>0、每值≤100、x+w/y+h≤100（浮点容差 1e-7）。zoom=null 或 1–3；显式 crop 是唯一渲染窗口，zoom 不再叠乘；crop=null 时 zoom 派生居中缩放，null zoom 为全图。服务端在既有 `assertMediaBlockAsset` 内校验，不修改保存门、资产归属、注册表或 schema。

入口为**选中媒体块的块控制条「编辑图片」**。浮层复用已安装的 react-easy-crop 与现役 `noteCover/geometry.ts` 的裁剪/缩放/位置算法，支持拖移、Zoom、90° 旋转和 Reset；当前窗口比例保持，旋转同时旋转窗口。Esc/Cancel 丢弃草稿，Save 保存，失败保留草稿供重试；只读、占位及未选中块没有入口。浮层拦截笔记撤销/重做快捷键，保留裁剪自身箭头操作，关闭后恢复原笔记快捷键。

Save 通过 `PUT /api/note-blocks/:id {metadata}` 写入，合并保留 metadata/media 其他键。一次编辑进入现役 Note 历史队列的 `reversibleEdit`；undo/redo 只恢复 edit_v1，撤销旧块首次编辑会删除此键，恢复原有缺省。未操作打开/保存不制造迁移或历史条目。

## 逐件源码定位

下表短路径均相对仓库；client 路径前缀为 `client/src/pages/Notes/canvasEngine/`。

| 文件与行号 | 实现/证据 |
|---|---|
| `shared/types/mediaImageEdit.ts:12,24`；`shared/types/index.ts:11` | 字段类型、共享纯校验及导出；不改 TextFlow 类型。 |
| `server/src/services/mediaBlocks.ts:8,32,48` | 既有资产断言内增加局部参数校验；服务端仅 type import 共享模块。 |
| `server/src/__tests__/v13MediaBlocks.test.ts:98,126,323` | 参数边界、四旋转、原资产整行/字节不变、null 重置、HTTP PUT/GET 往返。 |
| `mediaBlockService.ts:6` | 读取合法编辑参数，保留 undefined/null；runtime import 使用脚本编译可解析的相对路径。 |
| `mediaImageEdit.ts:12,22,26` | 复用 cover 算法派生 zoom crop、四分之一转坐标及共用渲染几何。 |
| `blocks/MediaImageEditor.tsx:22,75,114,152,172`；对应 `.module.css:1` | 草稿、焦点、加载/失败、精确往返、保存/取消、键盘隔离与浮层样式。 |
| `blocks/MediaBlockProjection.tsx:40,48`；对应 `.module.css:1` | 所有真实媒体图像消费同参数；SVG 显式 clipPath 裁窗口，再 contain 呈现，防窗口外像素进入留白。旧零编辑沿用 img。 |
| `hooks/useMediaImageHistory.ts:17,28,44` | 复用 Note 串行历史队列、route scope、可重试 undo/redo、参数快照。 |
| `hooks/useNoteCanvasDataAdapter.ts:1799` | 当前块 metadata PUT、保留兄弟键、失败不改当前块、旧键缺省恢复。 |
| `hooks/useNoteCanvasRuntimeController.ts:509,653` | 同现役文本/排版边界串接图片历史与写入面。 |
| `layers/NoteWritingSurfaceLayer.tsx:250,1848` | 保存回调传入媒体块。 |
| `layers/BlockControlBarLayer.tsx:107`；`layers/BlockEditorLayer.tsx:537,678` | 所选块入口、只读/占位门控、成功保存后关闭浮层。 |
| `hooks/useMediaImageHistory.test.tsx:34`；`hooks/useNoteCanvasDataAdapter.test.tsx:391` | 真实撤销栈、旧块缺省/null、重置、失败重试与 metadata 往返。 |
| `layers/BlockEditorLayer.test.tsx:135,150` | 真实控制条打开/取消与只读、占位、未选中零入口。 |
| `mediaImageEdit.test.ts:8`；`blocks/MediaBlockProjection.test.tsx:76` | 四档几何、与 cover 结果一致、显式裁剪窗口。 |
| `blocks/MediaImageEditor.test.tsx:45`；`blocks/MediaImageConsumption.test.tsx:49,76` | 浮层功能、键盘隔离；实际纸面/Overview/缩略同图、beforeprint 占位。 |
| `docs/agent-ops/current-state/app-operating-manual.md:37,38` | §一新增图片操作、字段/API、撤销与消费边界说明。 |
| `docs/agent-ops/INDEX.md:399` | 按现役生成器更新工单索引；同时反映已有 HQ 的 B3 状态，不手改历史正文。 |

逐行采样及整文件 SHA-256：`.codex-tmp/b5-image/round2-source-evidence.txt`、`round2-source-anchors.txt`、`round2-source-sha256.txt`。消费链采样：`round2-consumption-source.txt`、`round2-consumption-sha256.txt`。

## 消费面与边界

- 纸面：`BlockEditorLayer.tsx:602` → `MediaBlockProjection.tsx:40`。
- Overview：`NoteOverviewLayer.tsx:98` → `NotePageThumbnail.tsx:41` → `NoteReadOnlyPageContent.tsx:61` → 同一媒体投影；页面导航 `NoteNavigationPages.tsx:80` 同样复用缩略。
- 打印：`NotePrintLayer.tsx:70,88` → `NoteReadOnlyPageContent.tsx:70` 明传 `mediaPlaceholder={print}`，维持原占位；实际 beforeprint 测试未请求原资产。
- 导出预览：`ExportPreviewLayer.tsx:39` 仍直接使用 `MediaBlockPlaceholder`。本轮未将占位面实装成图像。
- 保持现有块布局、坐标及媒体测量行为；不提供自由变更裁剪比例。没有行内媒体、贴纸、新块型/真相表/迁移/依赖；未改 `image_object_extensions`、Relation/Agent 机关、写门/注册表、TextFlow schema 或 page_frame_local 九条契约。

## 验证与未收口项

- 非 git/secrets 的 **23 组件最终均 PASS**，包含 client/server 构建、model/performance smoke、回执和最终索引生成后的 docs 检查。累计 36 次组件执行中 31 PASS、5 FAIL，失败历史保留；分次复核，不冒充完整门通过。详见 [门收据](gates-round2.md)。
- 客户端最终全库：**219 文件 / 2248 项通过**，`npm --prefix client run test:unit -- --maxWorkers=4`，默认超时、零排除。前两轮默认并发的失败保留，不能把它们记成通过。
- 定向记录：保存/历史/入口相关 3 文件 **144/144**；图像几何/投影/初版浮层 3 文件 **28/28**；最终键盘/消费链 2 文件 **12/12**。这些集合存在重叠，不相加作独立测试总数。全部最终源文件再由上述全库覆盖。
- 服务端定向 **13/13**。server 全量完整执行，初轮 **779 项、774 pass、5 fail、0 skip**；现役 runner 的三个 IPC 文件自动重试全部恢复，最终仍 **FAIL**，保留两项 Python/MinerU 环境红。具体路径、失败命令及不可局部修复的解释器条件见 [服务端收据](server-round2.md)。未改环境、安装解释器或排除用例。
- 真实 Chrome 组件 smoke：四象限图验证纯旋转、缩放拖移、90°/180°/270°窗口、保存/重开精确一致、Reset+Esc 不写、Reset+Save null、留白不泄露窗口外图像；无 console error/warn。局部 fixture 使用真实组件及 Cropper、替换资产 HTTP adapter、保存到 React state；**不是已登录应用与 DB 的浏览器端到端验收**。原始 `browser-observations.json` 与 fixture/server 脚本保存在 `.codex-tmp/b5-image/`；验证页和服务已关闭。
- 施工发现的三个问题已修复：bare Node 不能解析 runtime alias、SVG viewBox 留白未显式裁剪、Cropper cover 模式在 quarter-turn 下预览过度放大；另补齐 modal 键盘隔离。未借失败修改禁区或放宽测试。
- **完整 `verify:v2-bn8-runtime` 未宣称通过**。git diff 检查与 secrets 扫描两组件留 HQ；server 两项环境红及主观体验验收/放行仍待 HQ。工作树原样交付，未 add/commit/push/reset、未修改 `.git` 或操作配置。

原始执行日志均在 `.codex-tmp/b5-image/`；一轮原始记录未覆盖。二轮回执追加在原工单 `## Result(二轮)`。
