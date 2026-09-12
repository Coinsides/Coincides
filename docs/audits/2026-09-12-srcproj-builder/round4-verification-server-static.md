# 13.6 补遗三四轮 · server 与静态验证收据

2026-09-12，codex builder 独立验证子任务。本文件只申报本轮亲跑的 server 三族及静态/模型门；client 单测、应用 typecheck/build、浏览器及存量实证由主任务另报。

## 结果

主任务通知最小读匹配修已落定后执行。**server 23/23 PASS，0 fail / 0 skipped；13 个静态/模型阶段全部 exit 0。**

| 阶段 | 本轮结果 |
| --- | --- |
| `v13SourceProjectionRepair.test.ts` | 10/10 PASS |
| `v13SourceReprojection.test.ts` | 8/8 PASS |
| `v13CoordinateContract.test.ts` | 5/5 PASS |
| `check:tool-face-manifest` | PASS，14 条 public；原有递归 schema reference 的默认 any 提示保留于日志 |
| `check:tool-face-parity` | PASS，14 条 public 的静态必要条件；不代表 human reachability 已验 |
| `check:server-shared-runtime-import` | PASS，233 产品文件 / 0 违规 / 7 type-only shared imports |
| `check:canvas-runtime-boundary` | PASS，168 项 |
| `check:group-gallery-shell` | PASS，8 项 |
| `check:groups-rail-shell` | PASS |
| `check:single-editor-shell` | PASS |
| `check:source-experience` | 静态及模型均 PASS |
| `check:v2-bn11-legacy-shutdown` | PASS |
| `check:v2-bn11-relation-freshness` | PASS |
| `smoke:canvas-engine-model-contract` | PASS，60 组 |
| `smoke:canvas-engine-performance` | PASS，5 场景，总计 14.45ms；仅该合成规模 |
| `docs:check` | PASS，索引/模型清单及 glossary K-1 至 K-3 |

运行入口：`node .codex-tmp/srcproj-13-6/verify-round4-server-static.mjs verify`。每一步实际完整命令、工作目录、耗时、退出码及日志路径见 [server-static-results.json](round4-verification/server-static-results.json)；原始日志同目录。没有用历史结果填充本表。

## 隔离与禁区

- 检查了既有 `verify.mjs` 和 `verify-round2.mjs`，复用其 clean-env 策略，另建本轮 harness，不改既有脚本。
- 子进程环境只继承列明的系统/工具路径变量；`DB_PATH=:memory:`。三族 fixture 自身使用内存库及合成 Source/用户/课程，fixture 根目录是新建临时目录。
- `DOTENV_CONFIG_PATH` 指向本轮新建的空文件；`COINCIDES_VALIDATION_ENV_DIR` 指向该空目录；`COINCIDES_APP_DATA_DIR`、Source blobs、canvas assets、uploads 全部落本轮新建隔离 scratch 路径。未读取 `.env` key 值，未接触用户库或现有用户凭据。
- 静态阶段的 `check:tool-face-parity` 与 manifest 一致性检查属于源码/清单检查；未执行 `test:tool-face-registry`、`test:tool-face-parity` 等安全语义测试。
- **未原样运行 `npm run verify:v2-bn8-runtime`**：root package 该聚合包含 `git diff --check`、changed-file secret scan 及禁止的安全语义套件。本单按用户禁令拆分可执行子项；未弱化或修改任何静态门。
- 本子任务零 Git 操作、零 commit；未运行 client 全库/定向单测或应用 typecheck/build。静态模型门现有脚本会把专用 TypeScript harness 编译至 `.codex-tmp`，编译产物不进入 audit。
- `.codegraph/` 存在，已先尝试 `codegraph explore`，但本 shell 不可调用该 CLI；没有可用 CodeGraph MCP。`rg` 同样不可调用，之后使用 PowerShell 有界读取与搜索。

## 写口与 API/schema 边界

列明范围见 [round4-boundary-baseline.json](round4-boundary-baseline.json) 与 [round4-boundary-final.json](round4-boundary-final.json)：

- 39 个非目标文件在本子任务 baseline/final 间 SHA-256 全等，范围包括 materializer、重投影链、server notes/canvas DTO 与路由、两表相关迁移、几何源、墙及 placement 写侧消费者、既有测试及静态门。
- 目标 `canvasObjectRepository.ts` 的 baseline 建立时读修已落入工作树，故其整文件前后相等**不作为修前零变更证据**。
- 独立锁定该目标文件自 `export interface PageFrameBlockLayoutUpdate` 至文件尾的写回区域，SHA-256 前后均为 `8871bd6679dfc4d75893c09ced7ef27b758f4400c46cc1c64ec3f3b44484aba0`。覆盖 collection `layout_updates`/`object_layout_updates`、block placement 及后续写回函数；归一化没有进入这一区域。
- 此为明确点名文件及区域范围，非全库扫描，亦非 Git HEAD diff。

## 最小修独立审查

主任务随后提供真正修改前的文本快照 `.codex-tmp/srcproj-13-6/round4/canvasObjectRepository.before.ts`，已独立读取并与现文件比较，结果附入 `round4-boundary-final.json.genuine_before_comparison`。

- 修改前完整文件 SHA-256：`d2128cfd4fc5281339f6f2a31c36f790e3df65b45fe20758d3dc19060ff12f51`；修后为 `21e3f061a432512d4607cfcb52790329737e3712ce4c256a5f76d32ee7756291`。
- 对原快照只插入私有 read-key helper/注释，再替换 Map 构建及 lookup 的两处 key，所得文本与现文件完全相同（整体比较只归一行尾）。**没有第四处产品变更。**
- 真正修前与修后的写回区直接文本比较相等，SHA-256 亦均为上节的 `8871…aba0`。这补齐了最小修前后、而非本子任务较晚 baseline 的写口零动证据。
- `canvasObjectRepository.test.ts` 的 11 项覆盖：裸/裸、裸/前缀、前缀/裸、前缀/前缀四种命中；三个无关 ID 不误配且同 block 不兜底；同 block 多 placement 分别命中；无 placement 的旧 block-ID fallback 和空 layouts；两个相反形状下 block save URL、保存返回身份、墙 `layout_updates` 及 `object_layout_updates` 均维持原 ID。
- 匹配测试还检查输入 DTO 未变、hydrated block 保留原 placement ID、读时无 PUT。helper 只去首位一次 `canvas-placement:`，不做包含匹配或按 block-ID 兜底。
- **未发现必须修改的问题，满足补遗三最小读修及指定测试覆盖。** 本段为独立代码/边界审查，不是主观放行；没有重复运行主任务已绿的 client 测试。
