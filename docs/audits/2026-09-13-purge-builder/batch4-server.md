> **状态 (Status)**: complete（本收据仅涵盖批四 server fixture 子任务）
> **日期 (Updated)**: 2026-09-12（本机 America/Toronto；目录日期沿工单）
> **上游**: [清除工单及补遗二](../../agent-ops/handoffs/2026-09-13-v13-6-deadcode-purge-order.md)、图纸特项②

# 批四 server fixture 迁移收据

仅修改 `server/src/__tests__/v2CanvasPersistenceCutover.test.ts`，49 个用例全部保留。改前 **49 条，24 PASS / 25 FAIL / 0 SKIP**；改后 **49 PASS / 0 FAIL / 0 SKIP**，exit 0。现有 [改前 TAP](server-persistence-before.log) 与本次 [改后 TAP](server-persistence-after.log) 已逐用例对齐（历史读测试更名映射单列）；[结构化对账](server-fixture-comparison.json)。

## 交付与边界

- 4 个工厂 `makeImageCanvasObjectPayload` / `makeTableCanvasObjectPayload` / `blockBackedShapePayload` / `pureShapePayload` 的 surface 迁为 `formal_page`；前两者 boundary 从 outside 迁为 inside。
- 图纸说“四个工厂即可清红”不完全覆盖现物：另有 **16 处独立 payload** 使用同一死语境。本次按补遗二通例同迁 Page，活身份、几何、级联、projection、mount、annotation、soft pointer 断言逐字留。
- 仅 **2 条活 surface 回读期待**随夹具从 `canvas_workspace` 换为 `formal_page`：原 1525 行（probe round-trip）和原 1593 行（shape round-trip）。仍为严格 equal，无放宽，坐标数值不变。
- 历史收据用例原 654–683 行改为先建立对象与 placement，再以测试 DB 直接构造退役前 surface/boundary 行，**7 条旧读断言逐字保留**（包括 crossing、canvas_world、frame_id）。追加 workspace 与 crossing 分别返回精确 400 错误的断言，以及拒写后整个 persistence 深等于拒写前。写门代码未修改。
- **5 个资产生命周期测试完整字节相等**；图片 truth/refcount/blob unlink/跨 Course 与同 Course 级联锁全部保留并转绿。历史 `Block identity hardening migration` 用例也完整字节相等，原 canvas_workspace/outside SQL 行保留且通过。SHA-256 与字节数在结构化对账中。

原行号迁移清单（以 root 本轮源码快照为准）：

| 类别 | 原行号 |
|---|---|
| surface 夹具：canvas_workspace → formal_page | 202, 237, 423, 444, 629, 1515, 1582, 1623, 1651, 1665, 1681, 1724, 1798, 1813, 1864, 1938, 2018, 2072, 2239, 2341 |
| boundary 夹具：outside → inside | 203, 238 |
| Page 等价 surface 回读期待 | 1525, 1593 |

## 验证与 numstat

执行 `node .codex-tmp/purge-server-verification.mjs server-persistence-after src/__tests__/v2CanvasPersistenceCutover.test.ts`。先审 runner 与 `v13-no-env.cjs`：子进程只继承 OS 环境白名单、dotenv 文件读取阻断、数据库 `:memory:`、资产置于本单隔离 scratch。定向 1 文件，未启动 server 全库。无 Git 调用、无 .git 访问、无 .env key 值读取、无用户库接触、无安全类测试修改或运行。

源码逐行 LCS（统一行尾，非 Git diff）：**+52/-36**，2743 → 2759 行，净增 16 行。新增来自历史读/拒写双语义锁，未增加测试用例数量。总单 numstat 由 root 汇总，主工单未修改。

## 25 条红转绿逐项

| 改前编号 | 用例 | 结果 |
|---|---|---|
| 3 | Block CanvasObject identity stays per placement when the same block is reused across notes | FAIL → PASS |
| 4 | Block placement round-trips the coordinate and Page boundary receipt（改名为 Historical Block placement…） | FAIL → PASS |
| 5 | Image CanvasObject saves as asset-backed media without becoming text content truth | FAIL → PASS |
| 6 | Image asset lifecycle keeps shared duplicate blobs until the final reference is deleted | FAIL → PASS |
| 7 | Course delete releases exclusive image assets before cascade removes extensions | FAIL → PASS |
| 8 | Course delete keeps cross-course shared image assets until the final course reference is deleted | FAIL → PASS |
| 9 | Course delete releases same-course shared image assets only after all course references are removed | FAIL → PASS |
| 10 | Table CanvasObject saves structured rows columns and cells without becoming TextFlow content truth | FAIL → PASS |
| 11 | Table CanvasObject validator rejects malformed structured object payloads | FAIL → PASS |
| 21 | Generic CanvasObject pipeline round-trips and hard-deletes a test-only probe kind | FAIL → PASS |
| 22 | Shape CanvasObject round-trips through generic persistence without content mounts | FAIL → PASS |
| 23 | Shape CanvasObject delete cascades placement rows | FAIL → PASS |
| 24 | Visual Connector CanvasObject round-trips with visual-only endpoints | FAIL → PASS |
| 25 | Visual Connector accepts point endpoints but rejects semantic or content-backed payloads | FAIL → PASS |
| 26 | Deleting a Visual Connector endpoint object hard-deletes the connector | FAIL → PASS |
| 27 | Block-backed Shape CanvasObject round-trips with an owned note_block mount | FAIL → PASS |
| 28 | Projection snapshot excludes canvas object backing blocks | FAIL → PASS |
| 29 | Canvas persistence keeps block-backed shape geometry when backing block is trashed | FAIL → PASS |
| 30 | Paragraph block projection still disappears when its backing block is trashed | FAIL → PASS |
| 31 | Live shape backing block cannot be independently trashed but demoted shape releases it | FAIL → PASS |
| 32 | Demoting block-backed shape clears its content mount and note block placement without hard-deleting the block | FAIL → PASS |
| 33 | Restoring an orphaned canvas-object backing block strips backing metadata and recreates an ordinary note placement | FAIL → PASS |
| 35 | Deleting a block-backed Shape CanvasObject removes its owned backing block from active note content | FAIL → PASS |
| 39 | Generic CanvasObject delete clears ContentGroupMember soft pointers | FAIL → PASS |
| 42 | Generic CanvasObject save refuses PageFrame kind-flip by existing object id | FAIL → PASS |

三端 typecheck/build、全库测试、静态门和真浏览器冒烟由 root 统一执行，不在本子任务申报为已完成。
