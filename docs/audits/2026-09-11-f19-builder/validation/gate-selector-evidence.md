> **状态 (Status)**: completed / builder 单项证据
> **层 (Layer)**: builder 审计收据，非放行
> **日期 (Updated)**: 2026-09-11
> **权威 (Authoritative)**: 否

# F19 补遗一 A：Export Preview 现役选择器与闸保牙

按工单补遗一 A，只修改 `client/scripts/canvasRuntimeBoundaryCheck.mjs:1261` 的现役选择器集合（3 行替换、1 行注释）。断言名、`assertContainsAll`、fail-closed 行为和其余 158 项检查不变。未添加或修改 CSS，未改使用方。

## 现物对应

| 现役选择器 | CSS 规则 | PageFrame 使用方 | 判定 |
|---|---|---|---|
| `.exportPreviewGroup` | `NoteDetail.module.css:730` | `ExportPreviewLayer.tsx:86` | E1 去盒后 PageFrame 的 `<details>` 使用共享 group class，替换失效 `.exportPreviewPageFrameGroup` |
| `.exportPreviewPageFrameMeta` | `NoteDetail.module.css:779` | `ExportPreviewLayer.tsx:95` | 保留现役旧项，承载 export/excluded/AI hidden/exportable 元信息 |
| `.exportPreviewPageFrameTypography` | `NoteDetail.module.css:796` | `ExportPreviewLayer.tsx:102` | 保留现役旧项，承载字号、行高、段距、行容量 |

三项 token 均包含规则起始 ` {`，使 `.exportPreviewGroups` 或其他同名前缀不能冒充相应 class。本门仍检验 Note detail 样式包含 PageFrame-aware Export Preview 的 group、meta、typography 结构；未降低要求或增加无用 CSS。精确规则头沿用当前 CSS 排版；今后若仅改变规则头空白排版，静态门也可能要求同步 token。

## 单项绿色运行

在仓库根执行一次 `npm.cmd run check:canvas-runtime-boundary`：**159 checks passed，exit 0**。完整输出：[gate-boundary-final.log](gate-boundary-final.log)。总门 `verify:v2-bn8-runtime` 留 HQ 收口，本次未运行。

## 逐项临时删除

使用 Node v22.22.1 子进程直接执行磁盘上同一份完整门脚本。通过 `--import data:` 预载、`fs.readFileSync` shim 与 `syncBuiltinESMExports()`，仅为 `NoteDetail.module.css` 的读取返回内存变体；所有其他读取、完整断言逻辑均未改变。每份变体删除一项选择器及其所有后代/状态规则。选择器边界匹配避免误删 `.exportPreviewGroups`。

| 删除项 | 删除 CSS 规则数 | 直接删除 | 删除后加同名前缀干扰项 |
|---|---:|---|---|
| `.exportPreviewGroup` | 8 | exit 1，精确命中该门 | `.exportPreviewGroupNearName` 仍 exit 1 |
| `.exportPreviewPageFrameMeta` | 2 | exit 1，精确命中该门 | `.exportPreviewPageFrameMetaNearName` 仍 exit 1 |
| `.exportPreviewPageFrameTypography` | 2 | exit 1，精确命中该门 | `.exportPreviewPageFrameTypographyNearName` 仍 exit 1 |

**3/3 直接删除必红，额外 3/3 近名前缀干扰仍红。** 每次唯一错误行均为 `Error: Note detail styles render PageFrame-aware Export Preview groups: Missing: <被删选择器> {`，并精确比较错误行与 exit code，不以任意脚本失败充数。

完整数字、每份变体的 CSS 哈希、实际 stdout/stderr 日志链接见 [gate-selector-mutations.json](gate-selector-mutations.json) 中 `results[].logFile`。初次诊断已得到预期门错误，但收集器严格比较时未剥离 Windows CRLF；修正为 CRLF-aware 分行后，六份正式证据完整通过。这是证据收集器问题，未修改门来消除失败。

## 隔离证明

每份变体执行后逐字节核对磁盘 CSS 和门脚本。CSS 前后 SHA-256 均为 `a6a8f43099b9b7d8bb508b6bad1a8e9c1a87fc1fffc8cf4bfe96741e0e7fcc0e`；修门后的脚本前后均为 `a05193cee82064c929d615ac7c462fb44856d6e5ef31c1a3963a28e21865f43b`。**0 个 CSS/JS 变体写盘或入库**，持久化的只有报告与实际执行日志。

开工已先尝试 CodeGraph；`.codegraph` 存在，但当前 CLI 与工具不可调用，随后按精确文件路径降级核查。未 commit，未操作 `.git`，未修改权限配置。
