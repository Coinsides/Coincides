> **状态 (Status)**: recorded（builder 已完成；环境红待 HQ 复验）
> **层 (Layer)**: Audit evidence
> **日期 (Updated)**: 2026-09-21
> **权威 (Authoritative)**: 否（施工与验证证据，非产品放行）

# T6 inline_link builder 施工回执

**2026-09-21 · Codex builder：施工完成，交 HQ 复核；server 两项已知 Python 环境阻断仍红，未宣称全绿或验收放行。** 本单先完整阅读工单与 TextFlow-Contract §3，再先增补契约、后施工。遵照 T5 补遗一继续完成验证。header 的 done 仅表示 builder 交付完成，放行仍属 HQ。

### 实现与证据

- 三靶均沿既有 `inline_link` 记录：heading 只存 block/unit 身份，block 只存 block 身份，note 只存本项目 note 身份；章树继续消费 `chapterProjectionService`，无持久章 id。选中正文后，工具条“链接到…”与选区 `/` 菜单使用同一命令、同一双栏选靶面板、同一保存动作。斜杠支持键盘 Enter 和菜单鼠标选择，保留原选中文字；已有八项命令对象逐项 deepEqual，新增仅一项。
- 普通正文与分页切片共用文本链接层，着现役 accent token。heading 走现役章导航，block 走现役块/placement 导航并先展开折叠章，note 走现役文档标签 open + route。note 列表以当前项目和 active 状态请求并过滤，点击前复查。列表失败/过期响应、来源选区在异步中变化均保守拒绝保存或导航。
- 悬空靶呈 ink-muted 惰性文字与点划下划线，不清理记录；B8 空锚在单元旁显示证据保留标记，不重建范围。后续生命周期完全由既有 B8 执行，`inlineLifecycle.ts` 未改；创建和编辑均沿既有完整快照/保存队列，定向覆盖撤销重做。
- 打印明确关闭链接投影，并有 print CSS 兜底：实际 beforeprint portal 三靶/空锚均仅保留普通文字。现役导出预览与 `read_note` flat 投影产品路径零改；分别以三靶/降级记录加入前后 HTML 完全相等、read_note 全响应 deepEqual 证明纯文字与 schema 零扩键。

### 逐件最终行号（相对仓根）

| 文件 | 位置 / 作用 |
| --- | --- |
| `docs/contracts/TextFlow-Contract.md` | 77：仅新增 T6 activation 小节，共 18 行；移除新增节后与 HEAD 原文相同（仅归一 CRLF/LF） |
| `client/src/pages/Notes/noteSlashCommands.ts` | 45：唯一新增共享命令，原八项不改 |
| `client/src/pages/Notes/canvasEngine/inlineLinkService.ts` | 5 三靶载荷；24 记录读取；36 创建，复用既有 grapheme 展宽并存 UTF-16 范围 |
| `client/src/pages/Notes/canvasEngine/InlineLinkContext.tsx` | 1：渲染、选靶、导航共享呈现上下文 |
| `client/src/pages/Notes/canvasEngine/InlineLinkProvider.tsx` | 30 同项目列表与过期响应守卫；57 目标解析；61 三靶导航 |
| `client/src/pages/Notes/canvasEngine/layers/InlineLinkPicker.tsx` | 29 选靶弹窗；42 本笔记章树/内容块；52 本项目笔记 |
| `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx` | 1597 选区验证/创建/快照保存；1720 选区斜杠；2248 工具条接线 |
| `client/src/pages/Notes/canvasEngine/layers/SelectionTypographyToolbarLayer.tsx` | 134：同词选中态入口 |
| `client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.tsx` | 120 章导航；199 块导航；263 Provider 接线 |
| `client/src/pages/Notes/canvasEngine/blocks/InlineLinkTextLayer.tsx` | 8 共享切片渲染；32 点击/键盘激活；44 空锚降级标记 |
| `client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx` | 1793：普通正文投影，1803 编辑层配合 |
| `client/src/pages/Notes/canvasEngine/blocks/PaginatedTextBlockProjection.tsx` | 507：分页切片投影，513 编辑层配合 |
| `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx` | 111/637：打印开关接口与下传 |
| `client/src/pages/Notes/canvasEngine/layers/NoteReadOnlyPageContent.tsx` | 73：打印普通文字开关 |
| `client/src/pages/Notes/NoteDetail.module.css` | 1815 链接/编辑层；1846 ink-muted；1891 print 兜底 |

### 定向断言落点

| 文件（除最后一项外，前缀为 `client/src/pages/Notes/canvasEngine/`） | 位置 / 内容 |
| --- | --- |
| `inlineLinkService.test.ts` | 13 三靶创建/Unicode；30 B8 重映射、拆并、锚内降级；45 原八项 deepEqual、共享对象、formula/code disabled |
| `InlineLinkProvider.test.tsx` | 52 三靶点击；65 删除后惰性/证据；84 分页/print，后接空锚与读取恢复 |
| `layers/NoteRuntimeDocumentLayer.test.tsx` | 480 工具条、slash 键盘/鼠标 × 三靶；518 折叠导航；568 异步来源变化拒绝保存 |
| `textFlowDocumentHistory.integration.test.tsx` | 131：创建/锚内编辑/undo/redo 完整快照 |
| `layers/NotePrintLayer.test.tsx` | 149：实际 beforeprint portal 三靶与空锚纯文字 |
| `layers/ExportPreviewLayer.media.test.tsx` | 15：三靶与空锚导出 HTML 零变 |
| `hooks/useSlashCommandController.test.tsx` | 199/206：中文同词与现役 slash host 回归 |
| `layers/pageFrameAlignment.test.tsx` | 404：共享 menu/slash 动作，链接无选区禁用 |
| `server/src/__tests__/v14ReadTools.test.ts` | 199：三靶前后 read_note 全响应 deepEqual |

### 验证账

| 项目 | 实跑结果 |
| --- | --- |
| 最终定向 | 10 文件，**245/245**，零跳过；`targeted-complete.log` |
| 最终 client 全库 | **234 文件，2412/2412**，零排除/跳过；`client-full-final.log`，`client-final-result.json` |
| server 全量 | **111 文件零排除，1119 tests：1117 pass / 2 fail / 0 skipped / 0 cancelled / 0 flaky-retries**；test duration 469649.0184ms，wall 472890ms |
| server 启动器 | 现役 `run-server-test-suite.mjs`，每文件预算 **600000ms**、concurrency=4，显式枚举完整111文件，含 v13WildernessExecute、MinerU、RegionCells |
| 非 git/secrets 门 | 25 组件均执行。首跑23/25；client 与 docs 初红分别经全量复跑/生成索引收口，最终按组件有效结果 **25/25**。`gate-results.json` 保留首跑，`effective-gate-results.json` 标记替代日志 |
| 最终 client build | `tsc -b && vite build` exit 0；沿用既有 chunk size warning，未改阈值 |
| docs | Result 与生成索引落盘后 `npm run docs:check` exit 0（日志 `docs-final.log`） |
| 浏览器 | Chrome + 只含合成数据的独立夹具：实际 TextBlockProjection 链接点击、双栏 Picker 点击、失效目标惰性均观察通过；不是完整用户库 E2E 或系统打印/PDF验收 |

首跑问题未隐去：client 第一轮234文件/2410测试，2396 pass、14 fail；其中3项为旧 C4a 测试仍假定八项/带省略号标签可直接输入/新链接走旧块弹窗，校准为原八项完整保留+第九项选区前置条件；其余11项为全并发下 timeout/等待断言失败，以 `--maxWorkers=2` 全库复跑通过，未放宽任何 timeout、未排除文件。首轮 gate 的 root npm 参数没有真正约束内层 Vitest worker，最终直接从 client 调现役 Vitest。后补 slash 鼠标分支后又完成最终全库。docs 首红仅自动 INDEX 过期，落 Result 后用现役生成器更新。早期定向草稿失败、最终日志均保留，不以最新绿覆盖原始红。

server 两红按 T5 补遗一明确记为**环境阻断，待 HQ 机复验**，不是测试通过/豁免：

1. `v2SourceMineruWiring.test.ts`：`spawnSync python.exe ENOENT`，原始 stdout 行61875；文件失败行61898。
2. `v2SourceRegionCells.test.ts`：本地 MinerU `code 101: Unable to create process`，原始 stdout 行62738/62744。未修产品 OCR、未改 Python/外部权限、未以120s判红。

测试基建单列：私有启动器/日志均在 `.codex-tmp/t6-link/`，使用仓外临时目录、空 dotenv、内存/临时测试库，清除继承凭据变量并传正确 `npm_execpath`；server 临时目录名字仍含复制自 T5 runner 的 `t5` 前缀，但元数据时间、111文件清单、原始日志均为本次 T6 实跑。不触用户库或远程模型，不装新依赖。浏览器夹具无 API/用户数据请求，初次 `/@fs` 地址被客户端阻止，改为独立根目录后完成检查，未绕过浏览器安全提示。

### 出生公约 / 未做项

- 颜色仅用现役 `--sk-accent`/`--accent-primary` 与 `--sk-ink-muted`/`--text-muted` token 回落；新增样式零字面 hex、零硬编码字体、零新 `--sk-` token。print 抑制链接覆盖层并还原普通正文颜色，不增脚注或色板。
- semantic_kind 联合体、TextFlow 真相 schema、B8/坐标/grapheme 实现、既有历史实现、server 产品/read_note schema、Relation/判定域、表列、依赖及 agent 操作指令零改。只新增创建与呈现消费层；只读 scope proof 在证据目录。
- `inline_formula`/`inline_code` 仍 disabled；`organized_note`/`note_patch` 提案载荷、新工具、prompt 均未动，**Agent 提案含链接留后续小单**。未做 URL 或跨项目靶。
- 未执行任何 git 写操作；`git diff --check` 与 `check:changed-file-secrets` 两组件照工单留 HQ，未把25组件表述为27全门绿。未作主观验收/放行，未执行系统打印或生成实际 PDF。无新设计安全对抗类测试。

### 契约 diff 全文

```diff
diff --git a/docs/contracts/TextFlow-Contract.md b/docs/contracts/TextFlow-Contract.md
index 0b459329..9637f56f 100644
--- a/docs/contracts/TextFlow-Contract.md
+++ b/docs/contracts/TextFlow-Contract.md
@@ -74,6 +74,24 @@ These rules also apply to selected-range replacement, Enter and paste retention.
 
 The `inline_formula` and `inline_code` commands remain `disabled: true` in `commandSurfaceService.ts`. B8/B9 preserve existing records and do not activate those commands or define formula/code rendering and adoption semantics.
 
+### Amendment — 2026-09-21 · V14 T6 inline_link activation
+
+Authority: [T6 order §一](../agent-ops/handoffs/2026-09-21-v14-t6-inline-link-order.md). This additive amendment activates only the already-present `inline_link` kind for human-created, presentation-level navigation. The existing clauses above remain unchanged. It adds no semantic kind, persisted field, table, chapter identity or Relation endpoint; `inline_formula` and `inline_code` remain disabled, with their commands and rendering semantics unchanged.
+
+An `inline_link` record uses the existing parent unit, selected-text evidence and UTF-16 `anchor_range`. Its `field_values` is one of the following target shapes:
+
+```ts
+{ target_kind: 'heading', block_id: string, unit_id: string }
+{ target_kind: 'block', block_id: string }
+{ target_kind: 'note', note_id: string }
+```
+
+Heading and block targets belong to the current Note; note targets belong to the current Project. A heading target identifies the existing heading unit within its owning block, not a stored chapter: chapters remain derived. URL and cross-project targets are outside this activation. The selected-text toolbar and slash surface share the same Link to action and target picker, consuming the existing chapter projection and project-note list.
+
+Resolved links use the existing accent-token link presentation. Activation routes through the existing heading/chapter, block or document-tab note navigation. A missing target renders inert text with a muted degradation indicator; it does not delete or rewrite the inline record. Unavailable or degraded anchor coordinates do not manufacture a new valid range. Printing and export render only the ordinary text, without link color, active navigation, degradation markers or footnote numbers. The existing flat `read_note` text projection and its schema remain unchanged.
+
+All existing B8 retention, remapping and degradation rules above govern edits without a link-specific lifecycle. In particular an edit inside an anchor leaves its range null and preserves its evidence and payload. Undo/redo use the existing full-flow snapshots and save queue. This amendment changes no coordinate, grapheme, status, identity, history, revision or atomicity clause, and adds no Agent tool, prompt or proposal payload.
+
 ## 4. Coordinates and grapheme boundaries
 
 **Stored coordinates remain UTF-16 code-unit offsets.** Unit-local `start`/`end`, selection offsets, annotation/board ranges and existing anchor records keep their coordinate system. End offsets are exclusive. Grapheme handling changes boundary resolution, not storage units, normalization of source text or persisted historical offsets.
```


## 证据文件

- [工单及 Result](../../agent-ops/handoffs/2026-09-21-v14-t6-inline-link-order.md)
- [契约 diff](contract.diff)、[禁区与原文不变证明](scope-proof.json)
- [server 全111文件清单](server-inventory.json)、[server 实跑元数据](server-result.json)
- [非 git/secrets 25组件清单](gate-manifest.json)、[首跑结果](gate-results.json)、[最终有效结果](effective-gate-results.json)
- [client 全库元数据](client-final-result.json)、[定向与build元数据](final-checks-result.json)、[docs元数据](docs-final-result.json)
- [原始日志 SHA-256 清单](raw-log-manifest.json)、[浏览器观察记录](browser-observations.md)
