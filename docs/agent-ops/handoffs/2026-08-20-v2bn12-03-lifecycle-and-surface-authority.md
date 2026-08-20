> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: ready | re: v2bn12-03 | date: 2026-08-20
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
