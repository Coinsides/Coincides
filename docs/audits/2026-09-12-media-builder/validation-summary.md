> **状态 (Status)**: completed（日志汇总；不代表主观放行）
> **日期 (Updated)**: 2026-09-12
> **工单**: `docs/agent-ops/handoffs/2026-09-12-v13-6-media-block-paste-order.md`
> **执行**: codex builder；台账子任务汇总后，由主线程更新为最终修正与复跑结果

# 13.6 媒体块先遣验证汇总

最终 client 全库 **151 文件 / 1590 测试全部通过**。服务端三组定向与回归共 **37 测试通过**。适用 runtime 子门按最新收据为 **19 项成功**。首次文档门发现新增 media 模板导致 object-inventory 过期；按既有生成脚本刷新 inventory 与工单状态索引后，docs:check 复跑通过。含禁跑部分的 `verify:v2-bn8-runtime` 原复合命令未执行，不申报其完整 PASS。

## 测试与类型/构建

| 检查 | 精确结果 | 证据 |
|---|---|---|
| client 全库 | **151/151 文件，1590/1590 测试，47.54s**；最新退出码 0 | [client-all.log](client-all.log)、[checks.jsonl](checks.jsonl) |
| server 媒体定向 | **11/11**，1593.9712ms | [server-media-tests.log](server-media-tests.log) |
| server item_ref/生命周期回归 | **12/12**，1122.2463ms | [server-regression-tests.log](server-regression-tests.log) |
| server TextFlow 回归 | **14/14**，2295.2025ms | [server-text-regression-tests.log](server-text-regression-tests.log) |
| server 独立 typecheck | 诊断日志为空；单独命令的退出码未写入该日志。server build 的 tsc 已有退出码 0 佐证 | [server-typecheck.log](server-typecheck.log)、[build.log](build.log)、[checks.jsonl](checks.jsonl) |
| registry 允许子集 | **4/4**；信息泄露防线一例按禁区过滤，不计入执行总数；日志的 `skipped=0` 是 runner 过滤行为 | [registry.log](registry.log) |
| tool-face manifest 功能测试 | **10/10**（含嵌套新鲜度测试），3970.6943ms | [test-tool-face-manifest.log](test-tool-face-manifest.log) |
| tool-face parity 功能测试 | **10/10**，6366.0438ms | [test-tool-face-parity.log](test-tool-face-parity.log) |
| client build（含 tsc -b） | 退出码 **0**；Vite built in 4.26s；保留 chunk 大小提示 | [build-client.log](build-client.log) |
| server build（含 tsc） | 退出码 **0**；manifest 新鲜度与复制完成 | [build.log](build.log) |

`checks.jsonl` 保留第一次 client 全库退出码 1（新增 adapter 测试的 pageFrameCollection 夹具字段修正前）及随后两次退出码 0；`client-all.log` 为最终成功运行。最后补上 placement/排序回滚后排空失败写入登记的断言、缺帧错误接入提示，并复跑全库、client build、canvas runtime boundary 与 model contract。最终数字不重复累加各轮结果。类型/构建日志中的递归 JSON schema 提示与 Vite chunk 提示均未导致失败。

完整 client 运行包含：`TextBlockProjection.input` **67**、`textFlowDocumentHistory.integration` **4**、`useTextFlowHistory` 五文件 **58**、adapter **108**；媒体投影 **4**、paste service **6**、media layout **3**、BlockEditor **17**、PageFrameWalls **17**、NotePrint **18**、ExportPreview.media **1**；unboxing **5** 与运输夹具 **7**。这些数字均为全库结果的子集，不另加到 1590。

## 适用 runtime 子门清单

下表每行对应 `checks.jsonl` 的一个最新逻辑检查项，共 19 项；根复合脚本的禁跑部分另列。

| 子项 | 结果与数量 | 日志 |
|---|---|---|
| `test:unit`（最终 client 全库） | PASS，151 文件 / 1590 测试 | [client-all.log](client-all.log) |
| registry 过滤后子集 | PASS，4 测试 | [registry.log](registry.log) |
| `test:tool-face-manifest` | PASS，10 测试 | [test-tool-face-manifest.log](test-tool-face-manifest.log) |
| `check:tool-face-manifest` | PASS，14 条条目 / 14 public | [check-tool-face-manifest.log](check-tool-face-manifest.log) |
| `test:tool-face-parity` | PASS，10 测试 | [test-tool-face-parity.log](test-tool-face-parity.log) |
| `check:tool-face-parity` | PASS，14 public；此静态门明确不证明人类 UI 可达性 | [check-tool-face-parity.log](check-tool-face-parity.log) |
| `check:server-shared-runtime-import` | PASS，234 产品源码文件、0 violations、7 import-type shared imports | [check-server-shared-runtime-import.log](check-server-shared-runtime-import.log) |
| `check:canvas-runtime-boundary` | PASS，**168 checks**；旧 image service、repository、layer、writing surface、CSS 断言均存活 | [check-canvas-runtime-boundary.log](check-canvas-runtime-boundary.log) |
| `check:group-gallery-shell` | PASS，8 checks | [check-group-gallery-shell.log](check-group-gallery-shell.log) |
| `check:groups-rail-shell` | PASS（脚本未申报断言数量） | [check-groups-rail-shell.log](check-groups-rail-shell.log) |
| `check:single-editor-shell` | PASS（脚本未申报断言数量） | [check-single-editor-shell.log](check-single-editor-shell.log) |
| `check:source-experience` | PASS，静态 contract + 编译后的 model contract | [check-source-experience.log](check-source-experience.log) |
| `check:v2-bn11-legacy-shutdown` | PASS | [check-v2-bn11-legacy-shutdown.log](check-v2-bn11-legacy-shutdown.log) |
| `check:v2-bn11-relation-freshness` | PASS | [check-v2-bn11-relation-freshness.log](check-v2-bn11-relation-freshness.log) |
| `smoke:canvas-engine-model-contract` | PASS，**60 groups** | [smoke-canvas-engine-model-contract.log](smoke-canvas-engine-model-contract.log) |
| `build:client` | PASS，退出码 0 | [build-client.log](build-client.log) |
| `build` | PASS，退出码 0 | [build.log](build.log) |
| `smoke:canvas-engine-performance` | PASS，5 scenarios，总 14.28ms | [smoke-canvas-engine-performance.log](smoke-canvas-engine-performance.log) |
| `docs:check` | PASS：docs-index、object-inventory、glossary 均通过 | [docs-check.log](docs-check.log) |

文档首次失败记录保留于 `checks.jsonl`；最终日志对应刷新生成文件后的成功运行。没有改写 current-state 权威事实或 agent 操作指令。

## 禁跑例外与运行边界

按本单 Henry 的直接禁令，未执行 `git diff --check`、`check:changed-file-secrets`，未直接运行串联它们的 `verify:v2-bn8-runtime`。registry 使用：

```text
node --import tsx --test "--test-skip-pattern=^resolve_selection registers" src/toolFace/registry.test.ts
```

过滤的是 `resolve_selection registers the public read tool with the mixed receipt vocabulary`，其中包含“不回显可区分存在性的 identity”信息泄露防线断言。该例没有运行，代码与断言未删改。manifest/parity 执行的是 schema、声明一致性与临时 artifact 新鲜度功能测试；没有另开安全类套件。

主线程验证 runner 以环境变量白名单启动，`COINCIDES_VALIDATION_ENV_DIR` 指向 `.tmp/media-builder/empty-env`，`DOTENV_CONFIG_PATH` 指向该目录内不存在的文件，`NODE_ENV=test`。本次汇总未读取 `.env` key 值、用户库或 `.git`。

## 夹具与冲突边界

全夹具普查刷新后保持 **544 源文件、151 测试文件、25 Board 测试文件、170 条目**；固定资产 Blob 登记、严格 unboxing 台账、Board 与其他登记式夹具的逐项处理见 [fixture-ledger.md](fixture-ledger.md) 和 [fixture-inventory.json](fixture-inventory.json)。

本次对开工前 `baseline.json.gz` 再次做字节级比对，**16/16 文件完全一致**，每个条目同时记录前后字节数和 SHA-256，见 [source-projection-boundary.json](source-projection-boundary.json)。包括：

- `sourceProjectionMaterializer.ts`、`sourceMaterialization.ts`、Concurrency/Errors、两端 sourceProjectionPolicy、sourceReprojection；
- 前单 source projection/reprojection 三份服务端测试、既有 069 migration 和源投影前端面；
- 休眠 generic image 的 `imageObjectService.ts` 与 `ImageObjectLayer.tsx`。

这证明本单没有覆盖先落的源投影实现，也未复活/改写旧 generic image 引擎文件。静态 gate 脚本未收进最初 baseline，故不虚构其字节不变证明；本单保留其现有断言运行通过证据。

## 真浏览器结构证据索引

以下为主线程隔离冒烟证据，完整边界见 [browser-smoke.md](browser-smoke.md)：

- [smoke-pasted-geometry.json](smoke-pasted-geometry.json)：图像 natural size 1000×180，纸上 block 760×137，文本块之后可见 blob 图片。
- [smoke-drag-geometry.json](smoke-drag-geometry.json)：媒体 y 从 42 移到 186。
- [smoke-wall-clamp.json](smoke-wall-clamp.json)、[smoke-wall-undo.json](smoke-wall-undo.json)：墙内收后宽约 619.788，撤销恢复 760，y/height 保持。
- [smoke-real-beforeprint.json](smoke-real-beforeprint.json)：真实 `beforeprint` 后 print root 存在，媒体占位带 `clipboard.png` alt，fragment rect 为 760×137。
- [smoke-pasted.jpg](smoke-pasted.jpg)、[smoke-dragged.jpg](smoke-dragged.jpg)、[smoke-wall-clamp.jpg](smoke-wall-clamp.jpg)、[smoke-export-placeholder.jpg](smoke-export-placeholder.jpg)：对应截图。
- [smoke-deletion-before.json](smoke-deletion-before.json)、[smoke-deletion-after.json](smoke-deletion-after.json)、[smoke-deleted.jpg](smoke-deleted.jpg)：浏览器删块后最后 asset 行与 blob 文件消失，GET 从200变404。

三份启动日志已归入正确审计目录：`smoke-client.log`、`smoke-server.log`、`smoke-seed.log`。日志记录客户端5286、服务端3116与合成种子；功能结论以结构 JSON、截图和测试日志为准。本单服务已停止，误命名日志目录在复制哈希校验后清除，见 [smoke-cleanup.txt](smoke-cleanup.txt)。
