> **状态 (Status)**: done(HQ 收口:S3-V1 裁不违例,交付收货)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次四单 3;现物证据=单 0 侦察 §三(order_index 已有 055/重排写入口缺/拖入命中链缺/正名清单四处)
> **单号**: 13.4 单 3 · 笔记准备区二件 + 正名

# 13.4 单 3 · 准备区二件 + 正名(笔记侧)

**使命**:笔记级准备区补齐两件手感(盘内重排/拖入),文案正名 Staging/准备区。**⛔ 动板级装卸区(单 7 已收)。**

## 零 · HQ 已裁(⛔ 复议)

1. **盘内重排=全混合 entries**(block/object/mount 一视同仁):按单 0 侦察建议,新增**只写本 note tray placements 排序的小端点**(note-scoped 原子 order 更新,沿既有归属与只读策略);⛔ 为改 order 全量重写 object extensions;⛔ 复用块 PUT 冒充全盘;
2. **拖入手势**:沿 beginMoveBlock 的 onEnd(event) 判准备区目标——命中后清临时布局/吸附,调用移入动作(明确 blockId+拖前 layout),跳过普通纸面几何保存,复用既有 flush 与撤回;**拖中临时推挤必须还原**(撤回=回拖动前布局);pointercancel 清理补上(侦察点名只有 pointerup);
3. **正名射程=只改可见文案**(英 Staging/中准备区):侦察清单四处——NoteRuntimeDocumentLayer 入口"Tray (n)"、NoteTraySidebar 标题/aria/按钮/空态/手势说明、useTrayController 错误与刷新提示、boardRepository 搬板错误提示;**⛔ 动**代码标识符/surface 值/MIME/data 属性/路由/operation_batch 标识/历史数据 label;
4. Sidebar 重排交互形态从简(行拖拽+插入位指示即可,⛔ 动画军备)。

## 一 · 交付面

- server 小端点+validator(note tray 排序批量原子写)+service;
- NoteTraySidebar:行 draggable 全类型化+drop 重排+插入指示;
- 拖入:onEnd 命中判定+移入动作+撤回接线;
- 正名四处文案。

## 二 · 裁量与停线

- 停线举证不改判;⛔ 动板级 staging/搬迁批次/单 7 代码;
- 重排失败=整批拒绝留原序(⛔ 半成功假排序)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(tray 族+canvasEngine 相关)不破;
- 冒烟五条:①混合 entries(块+画物+mount)盘内拖拽重排,重载同序;②重排请求失败→原序保留有错误提示;③纸面块拖进准备区(手势),落盘为 tray 行,撤回回拖前位置(含推挤还原);④未存内容先 flush 再移入;⑤文案四处已正名,拖回纸/split/搬板旧功能照常。

## 四 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(凭据扫描留 HQ)。

## Result

> **From**: codex(builder)
> **日期**: 2026-09-09
> **结论**: 单 3 代码与下述功能验证已完成，工作树交 HQ 代账，未 commit。存在 S3-V1 验证纪律停线事项，未代 HQ 放行，工单头保持 ready。

### 实现与 numstat

- 新增 `PUT /api/notes/:id/tray/order`，输入/返回 `{ placementIds: string[] }`。完整混合名单核对后在单事务内更新本 note 的 tray `order_index`/时间戳，沿用归属、active note 和 SourceProjection 只读策略；冲突或中途失败整批回滚。没有块 PUT 冒充排序，也没有重写 object extensions、mount 或正文。
- Sidebar 的 block/object/mount 均可行拖拽，显示前/后插入线，提交完整 placement ID 顺序；写入成功后 refresh，失败保持原序并显示错误。既有 MIME/data 属性不变。
- 纸面块沿 `beginMoveBlock.onEnd(event)` 命中本 runtime 的侧栏 ref；先恢复拖前全部布局（含临时推挤）、清理吸附/临时模式，再以明确 blockId 和拖前 layout 走原 flush→移入→history。命中时不走普通纸面几何保存。补齐 pointercancel、对应 pointerId、卸载与 noteId 切换的监听清理。
- 四处可见文案正名为 Staging；代码标识符、surface/MIME/data 值、已有路由和 operation_batch 标识、历史数据 label 不改。`boardRepository.ts` 仅改三句准备区搬板错误文案；板级装卸区、搬迁实现与单 7 代码未改。

numstat 口径：相对开工 HEAD，含本单 5 个新增未暂存文件（按完整行数记新增），不计开工前已有的无关 untracked 文件。没有暂存/commit。

```text
3	3	client/src/pages/Boards/boardRepository.ts
159	7	client/src/pages/Notes/canvasEngine/hooks/useBlockPlacementInteractions.test.tsx
72	28	client/src/pages/Notes/canvasEngine/hooks/useBlockPlacementInteractions.ts
6	1	client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts
120	3	client/src/pages/Notes/canvasEngine/hooks/useTrayController.test.tsx
28	11	client/src/pages/Notes/canvasEngine/hooks/useTrayController.ts
1	1	client/src/pages/Notes/canvasEngine/hooks/useTrayRelocation.test.tsx
18	5	client/src/pages/Notes/canvasEngine/interactionController.ts
1	1	client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.tsx
230	0	client/src/pages/Notes/canvasEngine/layers/NoteTrayInteraction.integration.test.tsx
144	0	client/src/pages/Notes/canvasEngine/layers/NoteTraySidebar.test.tsx
57	9	client/src/pages/Notes/canvasEngine/layers/NoteTraySidebar.tsx
5	1	client/src/pages/Notes/NoteDetail.module.css
119	0	server/src/__tests__/v13TrayOrder.test.ts
8	0	server/src/routes/notes.ts
60	0	server/src/services/trayOrder.ts
11	0	server/src/validators/trayOrder.ts
73	0	docs/agent-ops/handoffs/2026-09-09-v13-4-s3-tray-polish-order.md
```

实现/测试 17 文件合计 **+1042 / -70**；含本回执 18 文件合计 **+1115 / -70**。

### 五项冒烟逐条

以下 PASS 指自动化合成 DOM / mock HTTP / SQLite `:memory:` 证据，不冒充真人或真实浏览器体感签收。

1. **混合 entries 重排，重载同序：PASS。** `NoteTraySidebar.test.tsx` 用块/画物/mount 行产生完整顺序请求；`useTrayController.test.tsx` 验证独立小端点、refresh 后顺序与重新挂载；`v13TrayOrder.test.ts` 对内存库真实事务排序后重新调用 `getNoteCanvasPersistence`，顺序一致，正文/object/mount/extensions 逐表不变。
2. **重排请求失败保留原序并提示：PASS。** `NoteTrayInteraction.integration.test.tsx` 的生产 sidebar+controller 收到拒绝后，DOM 行序与内存持久序不变且错误可见；后端用名单冲突和第二次写入触发失败验证全事务回滚，无半成功。
3. **纸面手势拖入，tray 落盘，撤回含推挤还原：PASS。** `NoteTrayInteraction.integration.test.tsx` 保留生产交互 hook、准备区 hook、sidebar、placement repository 与碰撞算法；合成 pointer 拖动先实际推高邻块，松手后恢复整份拖前布局，再产生 tray placement 请求并显示新行；调用实际 history undo 回到拖前 x/y，邻块保持原位。`useBlockPlacementInteractions.test.tsx` 补测取消、同批 move/cancel、卸载、换 noteId 后无残留写入及未命中普通保存。
4. **未存内容先 flush 再移入：PASS。** 双 hook 集成夹具将内容 flush 挂在 deferred barrier 上：resolve 前零写，之后观察到 content→placement 的 HTTP 顺序，侧栏显示新正文；控制器测试验证 flush 返回 pending/rejected 时不写 placement、不入 history。内容编辑器适配器在该集成夹具中以合成 flush 实现，未启动真实服务。
5. **四处正名及旧功能：PASS。** 文案逐处核对 `NoteRuntimeDocumentLayer`、`NoteTraySidebar`、`useTrayController`、`boardRepository`；侧栏可访问名称/按钮/说明/空态测试通过。拖回纸及 undo/redo、split 及 undo/redo、搬板及撤回的既有定向回归通过。旧 `useTrayRelocation` 中一处 `Note tray` 断言同步为 `Note staging`，未改搬板逻辑。

### 验证收据

- Client：`npm.cmd run test:unit -- src/pages/Notes/canvasEngine --reporter=dot`，**54 文件 / 508 测试 PASS**；日志 `.codex-tmp/v13-4-s3-canvas-final.log`。其中双 hook 集成 2 条、侧栏 9 条、placement hook 18 条、tray controller 13 条、旧搬板族 8 条。
- Server：`node --import tsx --test src/__tests__/v13TrayOrder.test.ts` **5/5 PASS**；`node --import tsx --test src/__tests__/v13Tray.test.ts` **4/4 PASS**。均明确使用内存库；未启动产品服务或读取用户数据库。
- 类型/构建：`npm.cmd run build:client`（含 `tsc -b`）和 `npm.cmd run build`（含 server `tsc`）均 PASS；另 server `tsc --noEmit` PASS。最终 client 日志 `.codex-tmp/v13-4-s3-build-client-final.log`。Vite 保留大 chunk 和既有静态/动态 import 提示，manifest 生成保留递归 schema 提示。
- 总门拆出的 13 项非安全静态/模型检查 PASS：`check:server-shared-runtime-import`、`check:canvas-runtime-boundary`（159 checks）、`check:group-gallery-shell`、`check:groups-rail-shell`、`check:single-editor-shell`、`check:v2-bn11-legacy-shutdown`、`check:v2-bn11-relation-freshness`、`check:tool-face-manifest`、`check:tool-face-parity`、`check:source-experience`、`smoke:canvas-engine-model-contract`（60 groups）、`smoke:canvas-engine-performance`（5 scenarios）、`docs:check`。日志为 `.codex-tmp/v13-4-s3-<命令冒号改连字符>.log`。`test:tool-face-manifest` 另为 10/10 PASS。
- 初轮 canvas 回归 1 项失败于旧文案查找，修正断言后全量定向回归通过；新增测试另有 `BlockBoxLayout`→record 夹具类型错误，改为对象展开后最终构建通过。`git diff --check` PASS。

### 未做

- 未执行完整 `npm run verify:v2-bn8-runtime`：其末尾包含本单明确禁止的 `check:changed-file-secrets`。脚本未修改；只拆跑允许部分，**不声称总门全绿**。未跑完整 client/server 全库测试、凭据扫描、真实鉴权/渗透测试。
- 未执行真实 HTTP 服务/用户数据库/真实浏览器手势及视觉或主观验收；五条使用上述隔离自动化证据，体感签收留 HQ/Henry。
- 未读 `.env`，未向外发送 key，未接触用户数据库，未启动应用后端或做迁移。Vite/Vitest 设置 `COINCIDES_VALIDATION_ENV_DIR` 到本次创建的空临时目录，避免默认环境文件加载。
- 未 commit/push/PR/merge，未动权限/agent 指令文件，未改板级装卸区/单 7、搬迁批次或历史数据 label。
- CodeGraph 已按开工规则先尝试；本环境命令不存在，工具列表无对应 MCP，故退回定向文件读取/PowerShell 查询；没有新增索引。

### 停线事项

**S3-V1：验证纪律偏差，待 HQ 处置，未改判。** 子代理在执行总门子测试时试图通过 `--test-name-pattern` 排除含安全断言的子例，但过滤实际未生效。主线程已核已有日志：两套测试均 `0 skipped`，下列 **3 个含安全断言的子例确实执行**。这是对本单“禁止安全类测试”的偏差，不能改称未执行或视作豁免；已停止该验证线，不继续运行/调试筛选，不以测试通过代替 HQ 裁定。

- `server/` 下命令：`node --import tsx --test --test-name-pattern='^(?!resolve_selection)' src/toolFace/registry.test.ts`；实际 5/5 执行。预定排除的 `resolve_selection registers the public read tool with the mixed receipt vocabulary` 仍运行，其中包含 missing 不回显身份及拒绝 forbidden outcome 的断言。证据：`.codex-tmp/v13-4-s3-test-tool-face-registry.log`。
- 根目录命令：`node --test --test-name-pattern='^(?!G-5 killer [23])' scripts/check-tool-face-parity.test.mjs`；实际 10/10 执行。预定排除的 `G-5 killer 2: a test entry leaked into the public projection is rejected independently` 与 `G-5 killer 3: a __ public entry is rejected independently` 仍运行。证据：`.codex-tmp/v13-4-s3-test-tool-face-parity.log`。
- 按已审源码与执行记录，以上为合成 Zod/AST/manifest 断言，没有凭据扫描、真实鉴权、产品网络请求、`.env` 加载或数据库访问。该事实限定影响范围，**不撤销纪律偏差**；过滤失效原因未继续调试。主线程已在会话内主动披露，并保留本工单 ready 供 HQ 收口。
- 没有发现要求推翻 §零四条裁定的技术停线事项。

## HQ 收口(2026-09-09):S3-V1 裁定不违例,单 3 收货

- **S3-V1 裁定:不违例。** 依 09-08 口径澄清(记忆在案):红线射程=**设计/新增/派发**安全类测试;**既有常驻回归套件的既有断言例行运行不在射程内**。所涉三子例(tool-face registry `resolve_selection` 公读工具注册断言、parity G-5 killer 2/3)均为仓内既有套件既有断言(单 2 同批已例行运行并收货;13.3 s1 有同类先例裁定)。builder 的保守停线与主动披露符合纪律精神,记录在案;
- **随附提醒(HQ→builder,后续工单适用)**:⛔ 再用 name-pattern 过滤既有套件子例——过滤不可靠且无必要,既有套件按口径整跑即可;禁令只约束新增/设计/派发行为;
- 单 3 交付按 Result 收货,状态翻 done,HQ 代账。
