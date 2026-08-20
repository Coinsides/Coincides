> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: done | re: v2bn12-03 | date: 2026-08-20
> **开工前置**:工单 02.1 复核通过并 checkpoint 后才开工(同一工作树,禁止叠单施工)。

# V2.BN.12 工单 03(原拆 03/04,合取裁定并批):编辑 lifecycle 状态机 + surface authority + 存量迁移

## 背景与合批理由

工单 01 判定 RC-A(ghost lifecycle)与 RC-B(surface 重分类)独立成因;但 Review-2 合取裁定:**RC-A.5 × RC-B.3 构成 legacy dead-end**——错分类 ghost 在 Page 被过滤,而入口 prompt 按 raw count 隐藏,单修任何一侧都只救新 note、不救存量。故 RC-A/RC-B 修复与存量迁移**必须同批落地**,一次 checkpoint。RC 细节与 file:line 见工单 01 ## Result §3,修复方向 §4(其 1/2/3/4 条为本单蓝本)。

## 交付物

### D1 — 共享编辑 lifecycle 状态机(RC-A)

- 状态机:`idle → ephemeral-mounted → focused → dirty → persisted/reconciled`。**gesture 同步挂载本地 ephemeral TextUnit 并取得 focus**(不等任何网络);**首个 meaningful input 才创建 durable block**;空 blur/Escape 直接丢弃 ephemeral,零持久化痕迹。
- ephemeral→durable 的 ID reconciliation 必须处理:focus 保持、selection、annotation 关联、autosave 时序(工单 01 §4 风险清单)。durable 创建失败时 ephemeral 内容不丢(保留在编辑态+可重试),不得静默变 ghost。
- 状态机转换逻辑落在 02.1 后的 pure 转换函数层(被 hook 原生 setState 委托),延续"抽逻辑不抽状态基座"纪律。

### D2 — 统一坐标与 surface authority(RC-B)

- 类型层区分 `PageFrame-local` 与 `Canvas-world` 坐标,转换只在显式边界发生。
- 创建/移动/保存/hydrate **共用同一个 boundary classifier**;禁止把 projected x 再按 local `0..760` 原点重分类(`placementService.ts:305-318` 一线)。explicit surface 与几何分类的裁决规则写成单点函数并配 model contract。
- 真越界(拖过 Page 边界)必须仍能重分类为 `canvas_workspace`——02 的正控测试保持绿。

### D3 — 入口与 focus receipt(RC-A.5)

- 空白页 prompt 依据 `meaningful renderable content + pending editor`,不依据 raw `sortedBlockCount`(`NoteWritingSurfaceLayer.tsx:3718-3722`)。
- interaction/selection state 增加 `(blockId, textFlowId, textUnitId)` 三元组;进入 editing 需 DOM owner focus 确认。本单做到"记录三元组+focus 确认"即可,可见 affordance 留后续。

### D4 — 存量迁移(合取裁定的另一半;授权:Henry 08-19 数据迁移+自由删除,全部 test data)

- 一次性迁移脚本(node,repo 内落盘,可重复执行):
  1. **错分类修复**:对持久化 placement 用 D2 的新 classifier 重算,修正被错判 `canvas_workspace` 的 Page-local 块;
  2. **ghost 清理**:删除可证明的 provisional ghost——`plain_text` 空/缺 **且** 无 source ref、无 annotation、无有意义 history 的 active block 及其 placement;不满足全部条件的一律不动。
- 脚本先输出 **dry-run 清单收据**(逐条:block id、判定依据),再执行,两份输出都进回执。迁移后 reload:症状 2 的存量 note Page 侧恢复可见,入口 prompt 恢复。

### D6 — test:unit 接入常驻验证门(2026-08-20 增补,依据 02.1 二级复盘漏合取发现)

- RED #1 转绿后,`test:unit` 必须接入常驻门(并入 `verify:v2-bn8-runtime` 链或与其并列的强制门,repo 根一条命令可跑)。理由:02 建的 parity/契约测试是防止将来重构再换状态基座的回归护栏,**没有门跑的护栏等于没有护栏**。这是交付物不是验证项——不接线不算完工。

### D5 — 测试转绿与新增

- **RED #1 转绿**(02 埋的 `surfacePersistenceContract.test.ts`)——只许通过 D2 实修转绿,禁止改断言。
- 工单 01 §5 RED #2 落地为 component 测试(02 已装 RTL/jsdom):hold block POST/placement promise,断言 gesture 后本地 textarea 已同步挂载、获焦、接住 sentinel 字符;zero-text blur + 模拟 reload 断言 durable 数不增、入口仍在。
- classifier 单点函数补 model contract(Page-local 内/越界/Canvas-world 三态)。

## 边界(不做)

- SlashSession/RC-D(工单 05);跨 block Backspace(边界违规,悬置待 Henry);真实浏览器 E2E 与 hit-test(后续 browser-harness 单);placement 确定化 stacking(D4 清掉 ghost 后重评);服务端 POST 空文本拒收——**可做可不做**:仅当确认不破坏非文本类 block 创建路径时加,否则申报不改理由;PageFrame 物理拆除(宪章:V12 不拆)。
- schema 不动;迁移只改数据行,不改结构。

## 验证与回执

全套门:`test:v2` 244(必要时按工单 01 §7 的 `CANVAS_ASSET_DIR` 变通并写明)/ `verify:v2-bn8-runtime` / `test:unit` 全绿(RED #1 此后应为绿)/ tsc(自足命令含 cwd)。回执 ## Result 追加进本文件:diff 范围、每交付物落实与收据、迁移 dry-run+实跑清单、顺手修逐条申报、未做事项与理由。不自评 PASS,不 commit。复核官将按角色卡全项亲跑,重点:D1 调度语义纪律、D4 删除清单逐条核对、RED #1 转绿理由核形。

## Result

> executor: Codex(builder) | date: 2026-08-20 | baseline checkpoint: `41e6d1b`（收口时仍为当前 HEAD 的 ancestor）
> disposition: D1–D6 已施工并完成本回执所列验证；未创建 commit，等待 reviewer/Fable 复核与放行。

### 1. Diff 范围

| 领域 | 主要落点 |
|---|---|
| D1/D3 client lifecycle | `draftBlockLifecycleReducer*`、`draftBlockPersistence*`、`routeRequestGeneration*`、`textFocusReceipt*`、`useDraftBlockController*`、`useNoteCanvasDataAdapter.ts`、`useBlockSelectionController*`、runtime/layer props、selection/annotation reconciliation、`DraftBlockEditorLayer*`、`DraftWritingEntryLayer.tsx`、`writingEntryVisibility.ts` |
| D1 server receipt/compensation | `server/src/services/noteBlockLifecycle.ts`、`server/src/__tests__/v2NoteBlockLifecycle.test.ts`、notes route、validator、server test script |
| D2 shared surface authority | `shared/types/canvasSurfaceAuthority.ts`、`placementService.ts`、runtime layout/repository、canvas persistence hydrate/write、source projection materializer、client/server contract tests |
| D4 migration | `server/scripts/v2Bn12LifecycleMigration.ts`、对应 5 项脚本测试、server migrate/test scripts |
| D6/验证门 | 根 `package.json`、performance smoke 的独立 tsconfig/output 路径、TD-2 清偿链接 |

没有改 schema；没有改 RED #1 断言文件。以下命令收据确认原断言相对开工 checkpoint 无 diff：

- cwd: repo root
- cmd: `git diff --exit-code 41e6d1b -- client/src/pages/Notes/canvasEngine/surfacePersistenceContract.test.ts`
- exit: 0
- key output: empty diff。

### 2. D1 — lifecycle 状态机与 durable reconciliation

1. pure transition 层现在显式承载且只承载五态：`idle → ephemeral-mounted → focused → dirty → persisted/reconciled`；`creatingDraft` 与 `placementPending` 是正交的 in-flight 状态，不把 React state 基座抽走。
2. gesture 路径只执行本地 `activate_local`，同步挂载带稳定 TextFlow/TextUnit owner 的 textarea；`useLayoutEffect` 在网络 I/O 前 focus，真实 DOM `onFocus` 收据才推进 `focused`/editing interaction。activation 本身不预写 editing。
3. `trim().length > 0` 才是 meaningful input；包括 slash 开头内容。首个 meaningful input 才触发 client-create POST。空 blur/Escape 从未创建 durable；输入后又清空、且 POST 尚在途时，由同 session key 的 cancel/tombstone 或严格 compensation 收口，不遗留 block/placement。
4. 每个 ephemeral session 生成并复用稳定 `clientCreateKey`。server 在单个 SQLite transaction 内用 user/note/key 的 SHA-256 operation-batch receipt 做 exactly-once create：响应丢失后的重复 POST 返回同一 block/placement；cancel-before-create 写 `reverted` tombstone，晚到 create 返回 409 canceled。
5. POST 已成功而 placement PUT 失败时，durable identity 留在 controller，`placementPending=true`，本地 textarea、内容、焦点与 dirty 状态都保留；重试只补同一 block 的 placement/最新 save，不再 POST，不写 history、不提前 handoff。
6. compensation 不是通用 block delete：只接受该 receipt 所有、仍 active/manual、仍为 initial snapshot 或已可证明空的 block；source、block/TextFlow/TextUnit/canvas annotation、ContentGroup、item/relation/source anchor、composition、template/package/domain/reconciliation/study history、非 disposable canvas side effect 任一存在即 409。成功后保留 `reverted` operation batch 作为审计 tombstone。
7. autosave 用 revision 串行追平最新 text/TextFlow；history 只在 placement 成功、ID reconciliation 后每 session 写一次。durable create/save 失败都保留 local content 供重试。
8. ephemeral→durable reconciliation 覆盖 focus/active/selected block owner、interaction 三元组、selection draft ranges、annotation truth ranges 与 caret selection；durable editor 确认 focus 后才清 ephemeral tree，避免 React key 切换丢 caret。
9. note A→B→A 采用 note+generation 双重门，旧请求不得写新 note local state。切 note 时：空 session 做定向 cancel；meaningful session 先把旧 note/key/latest text/TextFlow/layout 写入 versioned `sessionStorage` recovery receipt，等待旧 pending chain 后以同 key 执行 create/reuse → placement → latest save。任一步失败保留 receipt 并提示，后续 mount 幂等 replay；成功才删除。

定向收据：

- cwd: `client`
- cmd: `npm.cmd run test:unit -- --run src/pages/Notes/canvasEngine/draftBlockLifecycleReducer.test.ts src/pages/Notes/canvasEngine/draftBlockPersistence.test.ts src/pages/Notes/canvasEngine/routeRequestGeneration.test.ts src/pages/Notes/canvasEngine/textFocusReceipt.test.ts src/pages/Notes/canvasEngine/hooks/useDraftBlockController.test.tsx src/pages/Notes/canvasEngine/layers/DraftBlockEditorLayer.test.tsx`
- exit: 0
- key output: 6 files / 23 tests。

- cwd: `server`
- cmd: `node --import tsx --test src/__tests__/v2NoteBlockLifecycle.test.ts`
- exit: 0
- key output: 11/11；覆盖 same-key replay、changed-payload replay、cancel-before-create、late create、空 compensation 与各类 durable reference blocker。

### 3. D2 — 单点 surface authority

1. 新增共享单点函数 `classifyCanvasSurfaceAuthority`；输入明确标记 `page_frame_local` 或 `canvas_world`，输出唯一三元组 `surface / boundaryRole / frameId`。PageFrame-local 使用 `[0, pageLocalWidth]`；Canvas-world 使用 PageFrame content 的 world-space `left/right`。
2. inside → `formal_page/inside/frame`；crossing → `canvas_workspace/crossing/frame`；outside → `canvas_workspace/outside/null`。有权威几何时几何覆盖 stale explicit surface；无 coordinate receipt 的 legacy explicit row 保持原值，交给迁移显式标记。
3. create、move、save、hydrate 与 D4 migration 都调用同一 classifier。hydrate 是显式坐标转换边界：world inside/crossing 才转 Page-local；world outside 保留 world x，不再被 normalize clamp 到 0 后误翻为 inside。left/right outside、drag-back、真越界正控都有 contract。
4. server round-trip 保留 `boundary_role`、逻辑 `frame_id` 与 `layout_policy.coordinate_space`；source materializer 新建 paragraph projection 时也写 `canvas_world` receipt。
5. RED #1 的原断言未改，由 production classifier/write-path 修复转绿；原有真越界正控继续为 `canvas_workspace`。

定向收据：

- cwd: `client`
- cmd: `npm.cmd run test:unit -- --run src/pages/Notes/canvasEngine/surfacePersistenceContract.test.ts src/pages/Notes/canvasEngine/surfaceAuthorityContract.test.ts`
- exit: 0
- key output: 2 files / 15 tests（含 left/right outside hydrate-save 不翻转与 drag-back）。

- cwd: repo root
- cmd: `npm.cmd run smoke:canvas-engine-model-contract`
- exit: 0
- key output: 60 model-contract groups。

- cwd: `server`
- cmd: `node --import tsx --test src/__tests__/v2SourceMaterialization.test.ts src/__tests__/v2CanvasPersistenceCutover.test.ts`（完整 server suite 另见 §7）
- exit: 0
- key output: source materialization 11/11；canvas persistence 48/48。

### 4. D3 — meaningful 入口与 focus receipt

1. empty prompt 不再看 raw sorted block count，而看 `contentReadOnly + meaningful renderable content + pending editor`。meaningful 聚合可见 block 的 content/draft、active annotation、image、table/structured object、带非空 backing text 的 shape；pending 覆盖 ephemeral/creating/placement-pending，以及与真实 focused owner 完整匹配的 durable editor。
2. focus receipt 强制完整 `(blockId, textFlowId, textUnitId)`。draft、普通 TextUnit 与 shape editor 只在真实 DOM focus 后写 selection/interaction；blur、title focus及 editor unmount 按完整三元组释放。旧 blur 收据不能清掉后来获得焦点的新 owner。
3. slash change 只透传/保留已确认 receipt，没有改变 SlashSession rollback/selection 语义。

component RED #2 使用 production `DraftWritingEntryLayer` 与真实 controller/selection hooks，覆盖：

- 标题初始值与焦点不变；
- double-click 后本地 textarea 在 POST/placement promise 未决时已挂载、获焦并带三元组；
- sentinel 输入被本地 editor 接住，create 只触发一次；
- POST 完成、placement 未决时 local editor/value/focus 仍在；
- placement 完成后 durable owner/selection/interaction reconciliation；
- 从未 meaningful 的空 blur/Escape；
- meaningful 后删空且 POST pending 的 cancel/compensation；
- unmount/reload 后 durable count 不增、入口恢复；
- create failure 保留 sentinel，重试成功。

该组测试包含在 D1 的 23 项定向收据与 §7 的 64 项 unit 收据中。

### 5. D4 — 数据迁移脚本、dry-run 与实跑

#### 5.1 脚本安全边界

`server/scripts/v2Bn12LifecycleMigration.ts` 不是启动时自动执行的 numbered migration。默认 readonly + `PRAGMA query_only=ON`；apply 必须提供同一 canonical plan 的 SHA-256；apply 前使用 better-sqlite3 online backup，随后 `BEGIN IMMEDIATE` 内重算 plan、核 hash、按 old tuple 做 CAS，逐步检查 changes；结束前检查 foreign keys、logical orphans、`quick_check` 与 `integrity_check`，任一失败整批 rollback。

ghost 删除判据为 exact canonical immediate-TextUnit fingerprint：active/manual、标题/plain/body/TextUnits 全空、无 inline/meaningful fields、block metadata 与 projection source 为精确 allowlist、唯一 note placement/paragraph projection/mount、无 source/annotation（含 TextFlow/TextUnit）及可枚举 history/logical reference。脚本不会按“空文本”一刀切。

#### 5.2 首轮 dry-run 与 apply

- DB: `D:\Coinsides\v2.x\Coincides\server\coincides.db`
- cwd: `server`
- dry-run cmd: `npm.cmd run migrate:v2-bn12-lifecycle -- --dry-run --db coincides.db --receipt ../.codex-tmp/v2bn12-03-dry-run-receipt.json`
- dry-run exit: 0
- plan: `f7ae61f38962f39adfe05f7d2003f11fc3b64646e33f6e41d342557d5576804b`
- key output: `safe_to_apply=true`；21 deletes / 3 skips / 4 surface updates / 25 scans。
- apply cmd: `npm.cmd run migrate:v2-bn12-lifecycle -- --apply --db coincides.db --expect-plan f7ae61f38962f39adfe05f7d2003f11fc3b64646e33f6e41d342557d5576804b --receipt ../.codex-tmp/v2bn12-03-apply.json`
- apply exit: 0
- key output: 21 note blocks + 21 canvas projection objects deleted；4 placements updated；postflight FK/logical-orphan 为 0，quick/integrity 为 ok。
- pre-apply backup: `.codex-tmp/v2bn12-03-pre-apply-20260820T142508765Z.db`；2,539,520 bytes；SHA-256 `aaf8f888acb3aa2cc40cc6b7c3cdfa5aac5510fb21b3f03e4716ac20c6bc6493`。

#### 5.3 首轮 frame-id 缺陷与定向纠偏

首轮脚本对几何、surface、boundary role 与 `coordinate_space=canvas_world` 的裁决正确，但把 PageFrame canvas object ID 写进了逻辑 `canvas_placements.frame_id`。洁净复核在闭环前发现；没有掩饰为已完成：

1. 当前脚本 plan version 升级，PageFrame 权威 ID 改为 `COALESCE(page_frame_extensions.frame_id, canvas_placements.frame_id)`；canvas object ID 只留 debug receipt。
2. 新 fixture 故意令 object ID ≠ frame ID，覆盖 fresh inside/crossing、首轮错误 tuple 的二次 CAS 修复，以及 untagged legacy formal-local 负控。
3. 用原始 pre-apply backup 跑当前脚本可完整复现正确计划：receipt `.codex-tmp/v2bn12-03-frame-id-correct-preapply.json`，hash `b06f04949e8f30e01cf5a5f8051bb51ec9dee47c8a20fbccfbfa1c68e4ef5e76`，21 deletes / 3 skips / 4 updates / 25 scans。
4. 对 live DB 的纠偏 dry-run receipt 为 `.codex-tmp/v2bn12-03-frame-id-correction-live.json`，hash `170e0f2f74ef134df5d056a832400faabe8b38d1e595a99bf9cb765582c609d1`，0 deletes / 3 skips / 4 frame-only updates / 4 scans。
5. cwd `server` 实跑命令：`npm.cmd run migrate:v2-bn12-lifecycle -- --apply --db coincides.db --expect-plan 170e0f2f74ef134df5d056a832400faabe8b38d1e595a99bf9cb765582c609d1 --receipt ../.codex-tmp/v2bn12-03-frame-id-correction-apply.json`
6. exit: 0；0 block/object deletes，4 frame-only CAS updates；backup `.codex-tmp/v2bn12-03-pre-apply-20260820T145529223Z.db`，2,539,520 bytes，SHA-256 `e74643d086a9a1220d33f8cff6faa32d48116234ca57f1f59056559f9b79c728`。

#### 5.4 ghost 实跑删除清单

共 21 条；每条同时删除经逐项重验的 note block、其唯一 note placement、paragraph projection canvas object（级联对应 canvas placement/mount）。按 note 分组如下：

- note `071d0d1d-0adc-4007-a6a4-b225204af208`（10）：
  `0dd2f086-f97e-49e1-afc7-8910bfdf4536`、`1020159e-3a12-4930-958a-438edd2a5d73`、`56928bac-ca20-4dea-a2fd-6331d211eb90`、`7c4e9db4-f457-4b01-9b3c-4c36017745c7`、`85839d5a-7d53-406c-8bd8-0c3b60514c6e`、`9805e303-937c-454e-aab6-7058d1a0fcf4`、`c4d7597c-12d8-4a8f-912c-bfa13d55891a`、`cc023ed6-055c-47da-bebd-0279306e2861`、`f19342a4-415e-4ce1-a370-e637ddf9ca39`、`fa392dff-f7b2-4a65-9d96-3f3340a31741`。
- note `1d10fe77-495b-4458-b7a4-f3d428c568ff`（4）：
  `0e16d35a-8f59-43a8-981d-8f5772e0c642`、`4b66e000-1f36-484f-8a8e-1836c6d63049`、`91e18b40-7350-43ed-ab9d-134982a417d9`、`a61f1952-3f5f-4576-a1f7-5271dcb4af38`。
- note `9c15185a-fff1-4fe9-8731-9879de2652e8`（1）：
  `b930d411-5e09-4ed1-862e-545bb78aaa93`。
- note `a11e0b17-ecbf-4277-80de-a144a592c561`（6）：
  `0eed1b4f-090d-4cde-9e31-e3e61aaf6394`、`240c6526-ff71-46c3-96e7-1ed0f5e67160`、`530e6a53-cb93-47c9-897f-5eaf79e036ef`、`78693651-2f57-40ac-8b35-2c4fdb47d923`、`8d05533c-a5a1-4deb-b73f-71d667edc9c2`、`be8e3a44-4d44-4a64-9109-22e64aa7542e`。

live readonly residue audit 对上述 21 个 block ID、note placements、canvas object IDs、canvas placements、content mounts 均为 0。原 21 个 `operation_batches` 有意保留为 birth audit receipts；它们已无 note_block 引用，因此“物理 residue 为 0”不等于删除审计批次。

- cwd: `server`
- cmd: PowerShell here-string 读取 initial/correction receipts，以 `better-sqlite3` readonly 打开 live DB 后 pipe 给 `node`
- exit: 0
- key output: `{"ghosts":21,"residueRows":0,"placements":4,"tupleMismatches":0,"foreignKeyViolations":0,"quickCheck":"ok","integrityCheck":"ok"}`

#### 5.5 surface 实跑更新清单

最终权威 tuple 如下；首轮 apply 完成 surface/role/coordinate metadata，纠偏 apply 只把 object-id frame 改成逻辑 `primary-page-frame`：

| placement | block / note | x,width（Canvas-world） | old → final |
|---|---|---:|---|
| `1b837553-425e-489a-8589-b64f74d7b39a` | `8b36abfa-303a-48b6-abc2-2a08f7323c04` / `9c15185a-fff1-4fe9-8731-9879de2652e8` | 72,760 | `canvas_workspace/outside/null → formal_page/inside/primary-page-frame` |
| `38f9942b-a308-4d22-9ca4-068e94147661` | `14023533-5bb5-4482-8808-4ff9f320caa3` / `648ed612-94d3-4033-8f3f-a6de726e04b0` | 72,760 | `canvas_workspace/outside/null → formal_page/inside/primary-page-frame` |
| `c02b2457-8c9a-4f9b-bcf2-6724055312e6` | `70058a2a-12ba-47be-80eb-a0ae86c895f4` / `1d10fe77-495b-4458-b7a4-f3d428c568ff` | 414,760 | `canvas_workspace/outside/null → canvas_workspace/crossing/primary-page-frame` |
| `f6cefd29-c59e-4915-b773-0687908b817d` | `0017f298-fe70-44aa-8fab-e6e12e836938` / `1d10fe77-495b-4458-b7a4-f3d428c568ff` | 14,760 | `canvas_workspace/outside/null → canvas_workspace/crossing/primary-page-frame` |

四条 metadata 最终都保留 canonical `layout_policy.coordinate_space=canvas_world`；直接 readonly audit 的 actual tuple 与 correction receipt 的 next tuple 4/4 一致。

#### 5.6 保守 skip 与最终 postflight

三条没有满足“可证明 ghost”的数据均保留：

- `70058a2a-12ba-47be-80eb-a0ae86c895f4`：`updated_at > created_at`，数据库没有完整 edit-history 表，故为 `unprovable_content_history`；只修正其 crossing surface，不删除。
- `1e202cfa-9b98-404b-94f2-ade02c521836`：shape-backed/noncanonical projection + `unprovable_content_history`。
- `e5275778-c56e-4a63-878a-10c77fd66c35`：shape-backed/noncanonical projection + `unprovable_content_history`。

最终只读收据：

- cwd: `server`
- cmd: `npm.cmd run migrate:v2-bn12-lifecycle -- --dry-run --db coincides.db --receipt ../.codex-tmp/v2bn12-03-final-post-dry-run.json`
- exit: 0
- plan: `d61bd7ac8ce79bcbd6a605e07a4394ec8f1c7d0f793b0a7d207e79167ed1b5b4`
- key output: `safe_to_apply=true`；0 deletes / 3 conservative skips / 0 updates / 4 scans；FK violations 0；全部 logical-orphan checks 0；quick/integrity 为 ok。

### 6. D5/D6 — tests 与常驻门

1. RED #1 只通过 D2 production 修复转绿，原 test assertion 未动。
2. RED #2 已落为 RTL/jsdom component test，覆盖本地同步 mount/focus、held POST/placement、sentinel、durable handoff、blank blur/Escape/reload 与 pending-create compensation。
3. classifier 三态、Page-local/Canvas-world、legacy fallback、true crossing/outside、left/right outside 与 drag-back 均进入 unit/model contracts。
4. 根 `verify:v2-bn8-runtime` 的第一段现在是 `npm run test:unit && ...`；repo 根一条命令会常驻跑 parity/contract tests。TD-2 已在技术债登记中标 `已清` 并链接本回执。

### 7. 全套验证收据

| cwd | command | exit | 关键输出 |
|---|---|---:|---|
| repo root（施工前） | `npm.cmd run test:unit` | 1 | RED #1：1 failed / 26 passed；Page 内 placement 期望 `formal_page/Page`，实际 `canvas_workspace/[]`；真越界正控当时已绿 |
| repo root | `npm.cmd run test:unit` | 0 | 12 files / 64 tests |
| `client` | `.\\node_modules\\.bin\\tsc.cmd -p tsconfig.json --noEmit` | 0 | no diagnostics |
| `server` | `npm.cmd run test:v2-bn12-migration` | 0 | 5/5 |
| `server` | `node --import tsx --test src/__tests__/v2NoteBlockLifecycle.test.ts` | 0 | 11/11 |
| `server` | 设置 `CANVAS_ASSET_DIR=D:\\Coinsides\\v2.x\\Coincides\\.codex-tmp\\canvas-assets-test-v2bn12-03-final` 后 `npm.cmd run test:v2` | 0 | 256/256（原 244 + D2 receipt 1 + lifecycle 11） |
| repo root | `npm.cmd run verify:v2-bn8-runtime` | 0 | unit 64；runtime boundary 159；relation freshness；model contract 60；client build 2,181 modules；server build；performance 5 scenarios / 11.94 ms；diff check；56 changed files secret scan |
| repo root | `git diff --check` | 0 | 仅工作树 LF→CRLF warning，无 whitespace error |
| repo root | `npm.cmd run check:changed-file-secrets` | 0 | changed-file secret scan clean |

全量门曾先后暴露并促成两项顺手修：

1. performance smoke 首次编译共享 classifier 时因 tsconfig `rootDir` 仍锁在 client 而报 TS6059；将该独立 tsconfig 的 rootDir 扩到 repo、补 `@shared/*` 与正确 output path。
2. 上述失败的 tsc 曾在 `shared/types` 留下 CommonJS `.js`，导致下一轮 Vite 优先解析错误产物；已删除该生成文件并加 `noEmitOnError`。最终 source tree 无 `.js/.map/.tsbuildinfo` 污染。

### 8. 顺手修申报

1. unit 全跑发现 meaningful helper 在 content body 为空时漏算 legacy `plain_text`；改为 TextFlow/content text 为空时回退 `plain_text`，避免有意义存量内容错误显示 empty prompt。
2. clean review 发现 Canvas-world 左侧 outside hydrate 会转 local 负 x，再被 normalize clamp 为 0、下次 save 误翻 inside；改为 outside 始终保留 world receipt，并加左右两侧回归。
3. source projection materializer 原来新建 world-space paragraph projection 却未写 coordinate receipt；补 `layout_policy.coordinate_space=canvas_world` 与 service contract。
4. performance tsconfig/output/no-emit 修复见 §7；只为让新共享 classifier 在既有常驻门中自足编译。
5. D4 首轮 frame-id 错型及第二次备份/CAS apply 已在 §5.3 完整披露；当前脚本与 live DB 都已收敛到逻辑 `primary-page-frame`。

### 9. 未做事项与理由

- 未改 SlashSession/RC-D 的 rollback、selection 或命令生命周期；只保留已确认 focus receipt。
- 未做跨 block Backspace。
- 未做真实浏览器 E2E/hit-test；RED #2 按本单要求停在 RTL/jsdom production component harness。
- 未做 placement stacking 确定化。
- 未物理拆除 PageFrame。
- 未改 schema；D4 仅操作数据行。
- 未加通用“server POST 空文本拒收”。现有 route 还服务非文本/template block；本单用 client-first meaningful gate + receipt-bound compensation 封闭文字入口，不扩大到可能破坏其他创建路径的全局策略。
- 三条 D4 skip 保持原样；尤其 `70058...` 因缺 durable edit-history 证据，宁可保留也不推断删除。
- birth `operation_batches` 保留作审计收据，没有纳入 destructive scope。
- 未创建 commit；复核与主观放行仍由 reviewer/Fable 执行。

## Review

> reviewer: Codex(reviewer) | date: 2026-08-20 | baseline checkpoint: `41e6d1b` | reviewed worktree HEAD: `80ec18f`
>
> **判定：FAIL。** Findings：`0 BLOCKER / 2 HIGH / 3 MED / 1 LOW`。官方门全绿，但 reviewer 的状态转移与破坏性负例稳定复现 5 项技术缺陷；本单不可据此 checkpoint。**放行权仍在 Fable**。

### 1. Findings（按严重度）

#### HIGH-1 — same-key replay 把最新 revision 误记为已保存 `[技术缺陷][数据丢失][D1]`

服务端的 exactly-once 语义本身成立：同一 `clientCreateKey` 即使 retry payload 改变，也返回首次已落库的 block（`server/src/services/noteBlockLifecycle.ts:251-278`，既有 server contract 亦明确断言旧 payload 胜出）。缺口在 client 合取：

1. 首次 POST 文本 `a` 已在 server commit，但 response 丢失；adapter 捕获失败并返回 `null`。
2. 用户继续把 local draft 改成 `ab`，以同 key retry。
3. server 正确 replay 首次 durable block `a`；response 中虽有 `client_create_receipt.reused=true`，`useNoteCanvasDataAdapter.ts:834-885` hydrate block 后未透传/消费它。
4. `useDraftBlockController.ts:398-450` 用本次 `revisionCreated` 无条件设置 `durableSavedRevisionRef`；因它已等于当前 `ab` revision，latest-save loop 不发 PUT。
5. UI 可完成 reconciliation，但 reload 后 durable truth 仍是 `a`。

隔离 reviewer test 以真实 hook 复现：same key 两次调用，第二次返回旧 block，期望 `saveBlock(..., 'ab')`，实际 `Number of calls: 0`。这是响应不确定性下的用户正文丢失，故为 HIGH。

建议：让 `DraftBlockCreateResult` 透传 `reused`/权威 create snapshot；replay 时不得把当前 revision 直接标 saved，应强制 latest PUT，或先比较 durable response 与当前 draft/TextFlow。补“server 已 commit + response rejected + 继续编辑 + same-key retry”跨层回归。

#### HIGH-2 — compensation 可删除已改 metadata 的 block，并级联删除另一 note 的 placement `[技术缺陷][破坏性误删][D1]`

`discardClientNoteBlockCreate` 的 409 安全门没有闭合：

- `isProvenEmptyBlock`（`noteBlockLifecycle.ts:399-420`）只看 title/plain/content，未把 `block_type`/`metadata` 纳入 empty fingerprint。独立 fixture：create 后把正文清空、把 metadata 改为 `{"user_semantic":"keep"}`，再 discard；期望 409 + block 保留，实际 `rejected=false, blockRows=0`。
- schema 只约束 `UNIQUE(note_id, block_id)`，同一 block 可以合法拥有另一 note placement。独立 fixture 给 receipt block 增加第二 note placement，再从原 note discard；当前代码只验证 receipt placement，随后删除 `note_blocks`，FK 级联把第二 placement 一并删掉。期望 409 + 两行保留，实际 `rejected=false, blockRows=0, otherPlacementRows=0`。

Result §2.6 声称“任一 durable reference 存在即 409”因而过宽。建议要求 receipt placement 是该 block 的全库唯一 placement；引用扫描须按 block/TextFlow/TextUnit/object 身份跨 note 闭合；proven-empty fingerprint 纳入 block type、metadata 与必要 placement snapshot。补 changed metadata/type、second-note placement、second-note annotation/mount 三组回归。

#### MED-1 — live 左侧 crossing 经 hydrate→normalize→save 翻成 Page inside `[技术缺陷][D2×D4][状态转移后]`

D4 live placement `f6cefd29-c59e-4915-b773-0687908b817d` 当前只读 tuple 正确：Page content boundary `[72,832]`，`x=14,width=760,canvas_world,canvas_workspace/crossing,primary-page-frame`。但 production chain 为：

```text
hydrate   -> x=-58, page_frame_local, canvas_workspace/crossing
normalize -> x=0,   page_frame_local, canvas_workspace/crossing
save      -> x=0,   page_frame_local, formal_page/inside
```

原因是 `reconcileHydratedBlockLayoutSurfaceAuthority` 把 world `crossing` 与 `inside` 一起转 local（`placementService.ts:221-267`），而 `normalizeBlockLayout` 把负 x clamp 到 0（`:314-368`）；`buildLayoutPayload` 再按损坏后的 geometry 分类（`:540-567`）。现有测试覆盖 left/right outside 与右侧 crossing，却没有左侧 crossing 的完整 hydrate→normalize→save 链。

隔离 reviewer test 使用这条 live tuple，期望 save 后仍 `crossing`，实际明确得到 `formal_page/inside`。建议 crossing 与 outside 一样保留 Canvas-world receipt，只有 inside 转 Page-local；补左右 crossing 全链回归。D4 tuple 当前静态已收敛，但首次普通 layout save 会反转，因此不能称状态转移后收敛。

#### MED-2 — sessionStorage 先写 raw Page-local receipt，reload 窗口可绕过投影 `[技术缺陷][D1×D2][恢复路径]`

切 note 时，`useDraftBlockController.ts:257-290` 先把 `draftLayout/defaultDraftLayout` 原样写入 sessionStorage，随后等待 pending persist，再调用 finalizer。Page 的 Canvas-world 投影与覆盖 storage 只在较后的 wrapper `useRuntimeNaturalWritingController.ts:108-120` 发生；浏览器 reload 后的 mount replay 则直接走 adapter base finalizer（`useNoteCanvasDataAdapter.ts:929-986`），不会再经过该 wrapper。

隔离 probe 在 pending POST 未决时 reset：storage 中实际为 `{x:0,...}`，没有 `surface/coordinate_space/frame_id`；期望的 canonical receipt 是 `{x:72,surface:'formal_page',coordinate_space:'canvas_world',frame_id:'primary-page-frame'}`。pending 较长时 reload 即可把 raw local receipt 交给 durable placement path，尤其多 PageFrame 时会丢 owner frame。

建议首次写 storage 前就做 canonical projection，或让 receipt 显式携 coordinate/frame authority 并由 mount replay 自足正规化；补 Page mode pending POST→切 note→abrupt reload 回归。

#### MED-3 — 4 个 ghost 迁移 note 中 1 个 Page dead-end 仍存在 `[技术缺陷][D3×D4][RC-A.5×RC-B.3]`

live readonly + production model 的合取结果：note `071d0d1d-0adc-4007-a6a4-b225204af208` 删除 10 个可证 ghost 后，active blocks 为 0，但仍有一个合法 table object：

```text
canvas-object:071d...:table-21137d8f-7f4a-452b-8f1b-258dc7f059d9
table / structured / formal_page / inside / primary-page-frame / x=35 / width=420 / 3x3
```

`NoteWritingSurfaceLayer.tsx:3570-3623` 的 `TableObjectLayer` 仅在 `surfaceMode === 'canvas'` 渲染，所以 Page 实际看不见它；但 `writingEntryVisibility.ts:53` 对任意 `structuredObjects.length > 0` 都返回 meaningful，`DraftWritingEntryLayer.tsx:88-100` 因而隐藏入口。隔离 production-model probe 实际为 `{meaningful:true,prompt:false}`；Page 同时无可见内容和入口，正是 legacy dead-end。

建议让 meaningful 判据消费“当前 surface 实际可渲染对象”，或让 Page 真正渲染 `formal_page/inside` structured object；补上述 live-shaped Page fixture。D4 删除本身仍安全，本 finding 是 D3×D4 的状态后合取，不得用“迁移已执行”掩盖。

#### LOW-1 — sessionStorage 自动回放策略缺原始授权落点 `[授权追踪缺口][非 MED-4]`

五态、meaningful-first、失败保留可重试、ID/focus/selection/annotation/autosave reconciliation 都有工单 03 D1 与工单 01 §4 依据；stable key、receipt compensation、note+generation 是为这些要求服务的并发/幂等机制，没有引入跨 block Backspace 一类新内容变换。实际 diff 也未实施跨 block Backspace，Slash commit/rollback/selection 语义未改。

但“离开 note 后把旧 draft 写 sessionStorage，并在后续 mount 自动回放”是可见恢复策略，原始工单没有逐名裁定。它不按 MED-4 记边界违规，但建议由 Fable 明文补记策略，不能把 builder Result 的自述反当事前授权。

### 2. 九项重点复核结论

| 项 | 结论 | reviewer 收据 |
|---|---|---|
| ① RED #1 核形 + 5-3 | **原断言未动、production 修绿与 kill power 成立；覆盖仍不完整** | `git diff --exit-code 41e6d1b -- .../surfacePersistenceContract.test.ts` = 0。隔离 worktree 原码 15/15；把 classifier 右界临时复刻为 world x 按 local width 判断后 11/15，原 RED #1、world-inside/hydrate/drag-back 共 4 条转红，真 outside 正控仍绿。主树关键行未动。缺口见 MED-1。 |
| ② D4 live migration | **当前态取证 VERIFIED；跨状态不收敛** | reviewer 未执行任何 apply。21/21 delete、3 skip、4 tuple、frame-id 纠偏、14 JSON、双备份与 final postflight 均闭合；但 `f6ce...` 首次 save 翻类（MED-1），且 `071d...` Page dead-end 未解（MED-3）。 |
| ③ schema 机械对照 | **VERIFIED** | baseline/current `schema.sql` blob 均 `bd1d50ec007af142f08cd9b1f4bc2e599f979335`；`git diff --exit-code 41e6d1b -- server/src/db/schema.sql server/src/db/migrations server/src/db/migrate.ts` = 0。 |
| ④ operation_batches | **VERIFIED：复用既有表** | 5-4 顺序：`server/src/index.ts:125` 挂 `/api/notes` → lifecycle service 仅 SELECT/INSERT/UPDATE（`:135/:319/:746/:828`）→ `git grep --untracked` 裸名全扫 87 lines / 50 files。表在 baseline migration 015 与 schema 已存在，无 DDL。 |
| ⑤ D1 新语义 | **FAIL（2 HIGH + 1 MED），无 MED-4 型走私** | stable key/retry、note+generation 与 owner reconciliation 方向成立；same-key client 合取、compensation predicate、recovery receipt 分别见 HIGH-1/HIGH-2/MED-2。授权追踪见 LOW-1。 |
| ⑥ D3 focus + Slash | **focus 三元组/Slash 零语义变化 VERIFIED；meaningful gate FAIL** | 普通/draft/shape editor 由真实 DOM focus 写 `(blockId,textFlowId,textUnitId)`，release 做 exact equality。Slash production diff 只新增 confirmed receipt 透传；无 commit/trigger/rollback/selection hunk。meaningful 判据的 structured-object surface 缺口见 MED-3。 |
| ⑦ 五条顺手修 | **5/5 已申报；其中第 2 条只修 outside、未覆盖 crossing** | `plain_text` fallback 是行为变化，但属 D3 legacy meaningful 兼容且有测试；outside world receipt、source materializer coordinate receipt、performance tsconfig/noEmitOnError、frame-id correction 均有本单依据与测试。第 2 条没有解决 MED-1，不能扩写成“所有 left boundary 稳定”。 |
| ⑧ D6 / TD-2 | **VERIFIED** | 根 `verify:v2-bn8-runtime` 字面首段是 `npm run test:unit && ...`，整链亲跑绿；`tech-debt.md` 的 TD-2 标已清并链接本 Result。TD-2 只指常驻门接线，故本单 FAIL 不反向否定该项清偿。 |
| ⑨ 5-2 跨条扫描 | **FAIL** | D1 server exactly-once × client revision（HIGH-1）；D1 compensation × 多 placement（HIGH-2）；D1 recovery × D2 coordinate boundary（MED-2）；D2 hydrate × normalize × D4 live tuple（MED-1）；D3 meaningful × D4 ghost cleanup × Page render policy（MED-3）。 |

### 3. D4 readonly forensic 明细

#### 3.1 21 条 delete：逐条全判据通过

以首份 pre-apply backup 独立查询，不信 plan 自述。Result §5.4 列出的 21 个 ID 每条均通过：active/manual paragraph；title/plain/body/TextUnits exact-empty；canonical immediate TextUnit 与 paragraph-template metadata；`created_at == updated_at`；唯一 canonical note placement、paragraph projection、canvas placement、mount；唯一 canonical birth receipt；source、block/TextFlow/TextUnit annotation、ContentGroup、Item/relation/source anchor、composition、template/package/domain/reconciliation/study history等 14 类逻辑引用均 0；对 119 张 sqlite 表做 exact/substring 扫描无额外引用。结果为 `count=21, allPass=true, failed=[]`。live 对这 21 个 block/placement/object/canvas placement/mount 的物理 residue 为 0；21 条 birth `operation_batches` 作为 audit receipt 有意保留。

#### 3.2 三条 skip：理由成立

- `70058a2a-12ba-47be-80eb-a0ae86c895f4`：`updated_at > created_at`，无完整 durable edit history，故 `unprovable_content_history`；只修 crossing tuple，不删。最终 coordinate receipt 又使当前 plan 多一个 conservative noncanonical-placement 理由，不影响保留结论。
- `1e202cfa-9b98-404b-94f2-ade02c521836`：非 immediate TextUnit、shape-backed/noncanonical projection/source/metadata，且 history 不可证。
- `e5275778-c56e-4a63-878a-10c77fd66c35`：同样有 non-immediate、shape-backed/noncanonical 与 history 不可证。

#### 3.3 四条 tuple 与首轮 frame-id 纠偏

| placement | live readonly authoritative tuple |
|---|---|
| `1b837553-425e-489a-8589-b64f74d7b39a` | `x=72,width=760,canvas_world,formal_page/inside/primary-page-frame` |
| `38f9942b-a308-4d22-9ca4-068e94147661` | `x=72,width=760,canvas_world,formal_page/inside/primary-page-frame` |
| `c02b2457-8c9a-4f9b-bcf2-6724055312e6` | `x=414,width=760,canvas_world,canvas_workspace/crossing/primary-page-frame` |
| `f6cefd29-c59e-4915-b773-0687908b817d` | `x=14,width=760,canvas_world,canvas_workspace/crossing/primary-page-frame` |

四条均满足：original backup = current v2 plan old；第二份 backup = v1 apply next = correction old；v1 错写的 PageFrame canvas-object ID 已由 correction 改为 logical `primary-page-frame`；live = correction next。当前脚本对 original backup 复现 corrected plan hash `b06f04949e8f30e01cf5a5f8051bb51ec9dee47c8a20fbccfbfa1c68e4ef5e76`（21/3/4/25），对 live 复现 final hash `d61bd7ac8ce79bcbd6a605e07a4394ec8f1c7d0f793b0a7d207e79167ed1b5b4`（0/3/0/4）。**这里证明的是 DB 当前态；MED-1 证明其中一条不能经 client round-trip 保持。**

#### 3.4 收据、备份、完整性

- `.codex-tmp` 中 `v2bn12-03*.json` 共 14 份；逐份 canonical plan hash 可重算。
- backup 1：2,539,520 bytes，SHA-256 `aaf8f888acb3aa2cc40cc6b7c3cdfa5aac5510fb21b3f03e4716ac20c6bc6493`。
- backup 2：2,539,520 bytes，SHA-256 `e74643d086a9a1220d33f8cff6faa32d48116234ca57f1f59056559f9b79c728`。
- 两 backup 与 live 的 canonical `sqlite_master` 均 345 rows / hash `5f29fbdc...f9025`，`db_migrations` 均 47 rows、max 047。
- 两次 applied receipt 的 execution count、FK、logical orphan、quick/integrity 均闭合；final live direct check：FK 0、11 类 logical orphan 0、`quick_check=ok`、`integrity_check=ok`。

### 4. RC-A.5 × RC-B.3：四个迁移 note 的 Page/入口终态

| note | live readonly + production model | 结论 |
|---|---|---|
| `071d0d1d-0adc-4007-a6a4-b225204af208` | active block 0；active 3×3 table 1，tuple `formal_page/inside`，但 table layer 仅 Canvas；helper `meaningful=true`，Page prompt=false | **dead-end 仍在（MED-3）** |
| `1d10fe77-495b-4458-b7a4-f3d428c568ff` | active blocks 2：empty skip `70058...` 与 1791-char `0017...` 均 crossing/workspace，Page-visible blocks 0；无 image/structured/meaningful shape；prompt=true | 当前 dead-end 已解除；`f6ce...` round-trip 仍有 MED-1 |
| `9c15185a-fff1-4fe9-8731-9879de2652e8` | 69-char block `8b36...` 为 formal/inside，Page 可见；prompt=false | 正确：有内容故不需入口 |
| `a11e0b17-ecbf-4277-80de-a144a592c561` | active block 0；除 PageFrame 无 meaningful object；prompt=true | 正确：空 Page 有入口 |

因此不是 4/4，而是 **3/4**；“存量 legacy dead-end 真正解除”不能验收。

### 5. 官方门与负向 probe 收据

#### 5.1 官方门（reviewer 亲跑）

| cwd | command | exit | 结果 |
|---|---|---:|---|
| repo root | `npm.cmd run test:unit` | 0 | 12 files / 64 tests |
| server | 设置 `CANVAS_ASSET_DIR=D:\Coinsides\v2.x\Coincides\.codex-tmp\canvas-assets-review-v2bn12-03` 后 `npm.cmd run test:v2` | 0 | 256/256 |
| repo root | `npm.cmd run verify:v2-bn8-runtime` | 0 | unit 64；runtime boundary 159；relation freshness；model contract 60；client/server build；performance 5 scenarios / 11.81 ms；diff/secrets clean |
| client | `.\node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit` | 0 | no diagnostics |
| server | `npm.cmd run test:v2-bn12-migration` | 0 | 5/5 |
| server | `node --import tsx --test src/__tests__/v2NoteBlockLifecycle.test.ts` | 0 | 11/11 |
| client | targeted surface contracts | 0 | 2 files / 15 tests |

#### 5.2 reviewer 负向收据（均在隔离 linked worktree）

| probe | 预期安全 oracle | 当前实际 |
|---|---|---|
| response-loss same-key | replay 后 PUT latest `ab` | fail；`saveBlock` calls = 0 |
| compensation metadata | 409，blockRows=1 | fail；`rejected=false, blockRows=0` |
| compensation second placement | 409，blockRows=1, otherPlacementRows=1 | fail；三者为 `false/0/0` |
| recovery receipt | storage 先有 Canvas-world/frame receipt | fail；`x=0` 且无 surface/coordinate/frame |
| live left crossing | save 后仍 world crossing | fail；normalize `x=0`，save `formal_page/inside` |
| live table Page entry | Page 不渲染 table 时 prompt=true | fail；`meaningful=true,prompt=false` |

### 6. 顺手修、范围与 5-1 收据完备声明

1. **五条顺手修逐条核过。** `plain_text` fallback 确是行为变化，不是纯重构；它已在 Result §8.1 申报，且属于 D3 的 legacy meaningful-content 修复，有定向 test，未记走私。其余四条也都有 D2/D4/D6 依据。未发现另一个跨 block Backspace 式的未申报编辑语义。
2. **未执行 migration apply。** D4 只用 receipts、两份 backup 与 live DB 的 readonly/query-only 查询、fixture tests 和当前脚本的内存 plan。没有调用任何 `--apply`，没有写 receipt。
3. **readonly SQLite 过程披露。** `better-sqlite3 {readonly:true}` + `PRAGMA query_only=ON` 在 WAL 模式仍触碰/生成了 backup 的 `.db-shm`，第二份 backup 另有 0-byte `-wal`；两份主 `.db` 与 live 主 DB hash 均未变化。reviewer 没有删除/恢复 sidecar，避免继续改动证据目录。这是 reviewer 过程副作用，不是 builder finding。
4. **5-3 隔离。** 主 repo `.git/worktrees` 为只读，直接 `git worktree add` 被拒；故先在 `.codex-tmp` 建本地 clone，再由该 clone 建真正 linked detached worktree。mutation 与负向 tests 只存在于隔离 worktree；共享 production 源未改。测试复用既有 `node_modules` Junction，未跑 `npm ci`；两组 worktree/clone/Junction 已按校验后的绝对路径清理。
5. **5-4 存在性纪律。** 未用截断输出证明不存在；operation-batch 活性按 route mount→service read/write→裸名全扫闭合。CodeGraph CLI 在本环境不可调用后才回退到逐文件/完整搜索，并对 fresh untracked 源直接读取。
6. **显式范围排除。** 未做工单明确排除的真实浏览器 E2E/hit-test、placement stacking、SlashSession/RC-D、跨 block Backspace、PageFrame 物理拆除；未把这些宣称为已验证。Page dead-end 结论限定为 readonly live tuple + production model + JSX render gate，不冒充浏览器 DOM 录屏。
7. **未扩大 destructive scope。** 没有尝试清理 D4 未选中的 inactive/unprovable 行或 audit batches；仅核对已执行的 21 delete、3 skip 与 4 update。
8. **工作树归因。** checkpoint→HEAD 之间另有已提交的 docs/governance 批次；reviewer 未把它们算作 builder 走私。本 reviewer 对共享树唯一写入是本 `## Review`，未改 production、schema、DB、测试断言或 package lock，未 commit/push/merge。

### 7. 最终判定

本单 **FAIL**。D4 的 destructive execution 与当前 DB receipt 可以认定安全、可重算，但 D1 有响应丢失下的数据丢失与 compensation 破坏性误删，D2/D4 crossing 不具 round-trip 稳定性，D1/D2 recovery receipt 有 crash window，且 RC-A.5×RC-B.3 的存量 Page dead-end 只有 3/4 真正解除。修复后须保留本 Review 六条负向 oracle，重新跑全套门与 D4 readonly post-state（仍不得无新授权再次 apply）。最终放行与 checkpoint 仍由 Fable 决定。
