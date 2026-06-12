# V2.BN.8 Review

## 负责什么

本文负责 V2.BN.8 / V2.BN.8.x 的工程质量 review：

- 当前实现状态；
- 已完成验证；
- 失败和风险；
- benchmark 结果；
- fallback trigger；
- Henry 必须拍板事项。

## 不负责什么

- 不替代 `Experience-Review.md`；
- 不替代 `CHANGELOG.md`；
- 不替代 acceptance。

## 当前状态

```text
Status: Research / route lock completed; first engine seed implemented
Code implementation: Minimal Canvas Engine model and NoteDetail bridge added
Canvas Engine branch: codex/v2-bn-canvas-engine
Recommended route: Self-owned Minimal Hybrid NoteCanvas Engine
```

## Review Checklist

- [x] Clean branch status recorded；
- [x] Canvas Engine Research R0-R9/Summary completed；
- [x] Engineering Spec updated；
- [x] Architecture Spec updated；
- [x] Interaction Contract updated；
- [x] State/Data Contract updated；
- [x] Spike/Benchmark Plan updated；
- [x] Fallback Strategy updated；
- [x] First Canvas Engine seed implemented；
- [x] Client build completed；
- [ ] Browser smoke completed when needed；
- [ ] Benchmark completed when needed；
- [x] Experience Review updated；
- [x] CHANGELOG updated；
- [ ] Document promotion / merge review completed at release close。

## 验证记录

```text
client build: passed
server build: passed
git diff --check: passed with CRLF conversion warnings only
changed-file secret scan: passed
browser smoke: blocked
  - browser-harness: Chrome remote debugging Allow prompt not accepted
  - bundled Playwright fallback: playwright-core package missing from runtime bundle
benchmark: not run yet
```

本次 browser-harness 连接 Chrome 时被 remote debugging 握手卡住，需要 Henry 在 Chrome 提示中允许远程调试后重试。随后尝试 bundled Playwright fallback，但本地 bundled runtime 中 `playwright` 缺少 `playwright-core`，无法启动。没有把浏览器验证伪装成通过。

## V2.BN.8.1 Runtime Replacement Progress

### L0 - Startup Gate And Baseline

```text
status: completed
branch: codex/v2-bn-canvas-engine
baseline commit before replacement work: 150fd28
client build: passed
server build: passed
```

L0 结论：

- 当前 branch 正确；
- `V2.BN.8` 局部文档区完整；
- `Open-Issue-And-Brainstorm-Checklist.md` 已经能作为 V2.BN.8.1 验收输入；
- `NoteDetail.tsx` 仍然承担旧 runtime 主体职责，包括 layout、measurement、selection、drag/resize、slash anchor、preview/overlay、Page/Canvas mode；
- `canvasEngine/` 仍是 seed，不是真正 runtime root。

### L1 - Local Test Data Reset

```text
status: completed
backup location: .codex-tmp/local-db-backups/20260612-155215
users: 1
courses/projects: 1
notes: 1
note_blocks: 0
documents: 0
source_snapshots: 0
uploads: cleared
```

L1 结论：

- 已停止本地 `3001` dev server 后备份旧 `server/coincides.db*`；
- 已备份并清空本地 `server/uploads` 测试文件；
- 已删除旧 dev database 并通过 `initDb()` 重建 schema；
- 已创建本地 smoke 账户、Project 和 Note；
- 后续 V2.BN.8.1 smoke 应从干净 note 开始，避免旧 `better_notebook_layout` payload 干扰。

### L2 - Runtime Root

```text
status: in progress
client build: passed
```

L2 已完成部分：

- 新增 `client/src/pages/Notes/canvasEngine/NoteCanvasRuntime.tsx`；
- 新增 `client/src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider.tsx`；
- 新增 `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntime.ts`；
- `NoteDetail.tsx` 已退化为薄 route shell：
  - 读取 `noteId` route param；
  - 注入 `NoteCanvasRuntimeProvider`；
  - 渲染 `NoteCanvasRuntime`。

L2 尚未完成部分：

- `NoteCanvasRuntime.tsx` 内部仍保留 note/project API loading、navigation、save title 等页面级数据逻辑；
- 下一步需要继续抽出 data adapter，使 `NoteCanvasRuntime` 更接近纯 runtime root。

## Henry Must Decide

- 是否确认第一版主路线为 self-owned minimal hybrid NoteCanvas Engine；
- PageFrame 外 workspace block 是否第一版就允许真实创建和保存；
- V2.BN.8.1 是否接受先以 engine shell 稳定为第一优先级，视觉细节随后补齐；
- 如果自研 Canvas Engine 失败，是否先回退有限大画布，还是重新评估 BlockSuite / tldraw 局部接入。

## 同步规则

- 每个小版本收口时更新本文。
- Benchmark 或 browser smoke 失败时更新本文。
- 工程风险变成体验风险时同步 `Experience-Review.md`。
- 路线风险触发时同步 `Canvas-Engine-Fallback-Strategy.md`。
