> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: 修七调查申报(两本边界账现物勘定,工单 2026-09-10-v13-4-w4-fix7-order.md Result);F13 教训(toast 同文案掩盖异病,修一至修六三轮扑空根源)
> **单号**: 13.5 · A3 · v2 边界账统一(帧账)+ 保存报错明码

# 13.5 A3 · 边界账统一 + toast 明码

## 一 · 边界账统一(修七申报的独立限定单)

**现物(修七已勘,沿用⛔重查)**:`isCanvasWorkspaceBlock`(placementService.ts:321)以 `contentWidth` 当边界;`classifyBlockSurfaceAuthority`(:140)优先既有 `surface_authority.pageBoundary`,无 authority 的 local 行才走 contentWidth(:168);`toStoredLayout` 按当前 resolved frame 内容宽建边界。差异随渲染提示/过期 authority 显现。

**裁定**:

1. v2 契约下,读取侧分类统一走**帧账**——`isCanvasWorkspaceBlock`/`modePolicyService` 消费点传入 contract + frame context,沿既有 `selectPlacementFrame` 解析归属帧,以帧内容宽建边界;contentWidth 只作渲染宽度提示⛔当边界;
2. **缺帧处理**:解析不到帧=维持现行为(按现 contentWidth 路径),⛔猜归属⛔任意首帧;
3. **过期 `surface_authority.pageBoundary`**:v2 下以现行帧账重算为准(与 F13 同法理:现行几何压过陈旧记录),⛔信旧 authority 快照;
4. 施工面=修七申报的最小面(placementService.ts + modePolicyService.ts,hook 已有上下文);v1/退役写闸/F1/持久化/迁移⛔扩面;旧 `useSurfaceModeController` 退役路径⛔重开。

## 二 · 保存报错明码

- "Failed to save block layout" toast 追加明码后缀:契约错=`(page frame unresolved)`、退役面=`(retired surface)`、其余=错误 message 截断;console.error 保持完整栈;
- 只改 toast 文案组装,⛔改错误类型体系⛔新弹窗形态。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟四条:①窄 contentWidth(如 646)+ 帧 904/inset72 + 存量 formal_page 块:修前 `isCanvasWorkspaceBlock` 误判 workspace(断言现状红)→修后按帧账判 inside,page 模式可见性与 surfaceMode 选择随之正确;②过期 authority 快照(pageBoundary 与现行帧不符)→修后以现行帧账重算;③缺帧块行为与修前逐字节一致;④两类保存失败的 toast 明码正确显示(合成触发)。
- F13/修五/修六全回归。

## 四 · Result 格式

`## Result`:numstat + 四冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

**From: codex(builder) · 2026-09-10 · 工程完成，待 HQ 复核/真机验收；不代表放行。**

**实现与范围**：边界生产面仅 `placementService.ts` + `modePolicyService.ts`。`isCanvasWorkspaceBlock` 复用 `PlacementContractContext` 接收 contract/frame context；仅 v2 且既有 `selectPlacementFrame` 成功时，调用共享分类器，local 边界取 `0..frame.width-leftInset-rightInset`，world 边界取现行帧世界内容边界，绕过旧 authority 快照。无解析帧与 v1 完整保留原分类分支。modePolicy 两个消费点传入已有上下文，layout hook 无需改动。toast 仅改 `useNoteCanvasDataAdapter.ts` 的既有 catch：契约错误为 `(page frame unresolved)`，两种退役报文为 `(retired surface)`；其他错误 message 最长 120 字符，超出取前 117 字符加 `...`。`console.error` 原行和 Error 对象保持完整。共享分类器、归属选择器、F1、写闸、持久化规则、迁移与退役 controller 均未改。

**numstat（本单工作区改动，未 stage；新增测试以 `git diff --no-index --numstat -- NUL <file>` 计）**：

| 文件 | + | − |
|---|---:|---:|
| `client/src/pages/Notes/canvasEngine/placementService.ts` | 26 | 3 |
| `client/src/pages/Notes/canvasEngine/modePolicyService.ts` | 2 | 2 |
| `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts` | 9 | 1 |
| `client/src/pages/Notes/canvasEngine/boundaryAccount.test.tsx` | 130 | 0 |
| `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx` | 59 | 1 |
| 本工单（状态前进与 Result） | 39 | 1 |
| `docs/agent-ops/INDEX.md`（自动状态索引同步） | 2 | 1 |

**四冒烟逐条**：

1. **窄 contentWidth + 当前帧账：先红后绿。** 内存合成存量 `formal_page/page_frame_local/x=88/w=672`、帧 904/inset72、`contentWidth=646`；归属帧刻意排在一张窄的无关帧之后。修前 `isCanvasWorkspaceBlock=true`，修后 `false`；page 附帧 workspace 判定随之为 false。另用超出帧底但仍属正式流的 local 行验证 page 可见性；真实 `useNoteCanvasResolvedLayoutModel` 两次 normalization 消费均选 `surfaceMode='page'`，最终 `x=88/width=646/formal_page/inside`，证明 contentWidth 仍是渲染提示。以上 3 条修前均红、修后均绿。
2. **过期 authority：PASS。** local 的旧窄快照（646）不再把现行帧内块判 crossing；旧宽快照（900）也不能把现行越界块判 inside。world 行按当前帧世界内容边界重算，覆盖显式 ID 和无 ID 经既有完整几何选择归属两种路径；均忽略旧世界边界（72..832）。四条修前均红、修后均绿，输入序列化字节不变；tray 与默认/显式 v1 回归通过。
3. **缺帧：PASS，修前基线逐字节保持。** 冻结 5 组实际旧输出：local 无 ID、local 死 ID、空帧集合、几何虽落有效帧但带死 ID 的 world 行、缺帧且有旧 authority 的行。对 workspace 判断、page-affiliation 判断和可见 ID 列表的 JSON 字节作固定断言，并逐字节比较输入对象前后；修前与修后均通过。local 缺/死 ID 在夹具中沿旧几何附帧路径仍可见，这是原行为，未改成“不可见”；死 ID 没有回退到其他帧，缺帧旧 authority 优先级仍保留。首次整跑用于校准其中两条旧可见性预期，生产码尚未修改；随后红基线中五条全部绿。
4. **保存报错 toast 明码：PASS，先红后绿。** 经真实 adapter `persistBlockLayout` 内存合成触发缺帧契约错、`canvas_workspace_retired`、`canvas_crossing_retired`，断言前者明码为 `(page frame unresolved)`、后两者为 `(retired surface)`，零 API PUT、失败草稿不清理。一般长 message 截断为 120 字符，既有 F11 短报文完整展示；`console.error` 持有原 Error/完整 stack，`whenIdle()` 仍拒绝同一错误。四条新增与一条既有文案断言修前共 5 红、修后全绿。证据为 jsdom hook 与 addToast 接口合成断言，不冒充 Henry 真机验收。

**回归与全库验证**：

- 修五/修六/F13 全回归：`coordinateContractSession.test.ts` **12/12**，`placementContractService.test.ts` **24/24**，`useBlockPlacementInteractions.test.tsx` **21/21**（含死帧释放、后续收集），`autoWidthFrameSave.test.tsx` **3/3**（x=88 auto、x=0 auto、manual 的真实保存/重载几何等值与零 collection PUT），`placementAutoWidth.test.ts` **12/12**，坐标 DOM 集成 **2/2**，surface authority **16/16**；全部来自全库整跑。
- 修前日志 `.codex-tmp/a3-client-red-baseline.log`：**91 文件，3 失败/88 通过；802 测试，13 失败/789 通过**。目标红为边界 7 + toast 5；另 1 条为既有 `BoardPage.unboxing` 5000ms 超时。修后默认并发整跑 `.codex-tmp/a3-client-final.log`：目标全绿，仅该超时仍红（801/802 通过）。未改 Board 测试、超时或套件配置。
- 最终命令 `npm.cmd --prefix client run test:unit -- --maxWorkers=2`：**91 文件 / 802 测试全部 PASS，零过滤、零跳过**，包括上述 Board 用例。仅限制并发 worker；夹具补齐类型要求的 placement_id 后再次同命令完整重跑仍全绿，最终日志 `.codex-tmp/a3-client-verified.log`（53.00s）。A3 边界测试 **14/14**；adapter 全文件 **57/57**。
- `npm.cmd run build:client`（`tsc -b && vite build`）与 `npm.cmd run build`（server `tsc`、manifest check/copy）退出 0；日志 `.codex-tmp/a3-build-client-final.log` / `a3-build-server.log`。初次前端 typecheck 找到新测试夹具漏填 placement_id，已补齐，未改生产逻辑。构建保留既有 chunk size/dynamic-import 与递归 schema 提示，无构建失败。
- 其余获准组成项逐项运行：模型契约 **60 组**、runtime boundary **159 条**、performance smoke **5 场景**、registry **5/5**、manifest **10/10**、parity tests **10/10**；tool-face parity、server/shared import、Gallery/Rail/Single Editor shell、Source experience、legacy shutdown、Relation freshness 均 PASS。分项日志为 `.codex-tmp/a3-*.log`；docs 检查与 diff whitespace 检查通过。
- Vitest/Vite 使用已有 `COINCIDES_VALIDATION_ENV_DIR` 指向本单新建空目录 `.codex-tmp/a3-empty-env`，未读取项目 env 文件。修七调查结论直接沿用，未重查根因。

**未做**：未 stage/commit/push/PR/merge；未读 `.env`、任何 key 值或用户数据库；未启动真实服务、迁移或写用户数据；未设计/新增/派发安全类测试，既有套件未过滤；未运行凭据扫描，留 HQ。未做 Henry 真机主观验收。未改 agent 指令/权限配置与工作区既有无关文件。

**停线**：按本单禁令，未运行包含 `check:changed-file-secrets` 的 `npm run verify:v2-bn8-runtime` 聚合命令；上述获准组成项已独立执行，**不能宣称总门完整 PASS**。工程停在本单最小面交付，凭据扫描、HQ 复核与真机验收留 HQ；无未解决的本单代码/构建/冒烟失败，不自行扩面或放行。
