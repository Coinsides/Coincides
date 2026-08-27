> from: claude(fable,上将军代发——工程调度会话下线,授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: ready | re: v2bn12-2c-4 | date: 2026-08-26

# V2.BN.12.2c-4:`resolve_selection` 只认活着的块(J3 缺陷修复)

## 定位

c-3 旅程实走抓到一个 🅰 正确性缺陷(journey-sheet §5,🅰-1):**用户从 UI 把块「Move to trash」之后,`resolve_selection` 仍返回 `found`**。根因已定位并经 Fable 亲验:

- `server/src/services/selectionResolve.ts:71-74` 的 `SELECT ... FROM note_blocks WHERE id = ? AND user_id = ?` **无 status 条件**
- 而「什么算存在」的既有权威是 `server/src/routes/projections.ts:63`:`nb.status = 'active'`
- ⇒ **resolve 与权威不同源**——正是计划 §3.1 A/D 点名要防的形状

**爆炸半径已核**:`resolveTextRange` 全仓仅一个调用者(同文件 `:95` 的 `resolveSelection`),零外部消费者。

## 交付物(一处 SQL + 两条测试,就这些)

1. **SQL 同源**:`selectionResolve.ts` 那条 SELECT 的 WHERE 加 `AND status = 'active'`,与 `projections.ts:63` **逐字同源**。
   - ⛔ **不得写成 `status != 'deleted'`** —— 现码的字面量是 `'trashed'`,写 `!= 'deleted'` 修不好这条缺陷(这是 Fable 点名的坑,c-0 裁定 A 的措辞在此处不适用)。
   - ⛔ SQL 其余部分一字不改;⛔ 不改函数签名、不改返回形状、不改 `missingRange()`。
2. **两条常驻测试**(加进既有 server 测试面,文件位置随既有 `resolve_selection` 专项):
   - **T-1**:owned 块 `status='trashed'` ⇒ `resolve_selection` 该 range 返回 `outcome: 'missing'`
   - **T-2**:owned 块 `status='active'` 且文本未变 ⇒ 仍 `found`;文本改过 ⇒ 仍 `text_drifted`(**回归锁**)

## 硬闸

- ⛔ **不碰 UI、不碰浏览器、不碰登录、不读任何凭证/token、不做跨用户测试** —— 本单纯服务端,J4(跨用户)已在 c-3 实走取证,不重做。
- ⛔ 不动 `missingRange()` 的折叠语义:trashed 与「不存在」**必须仍不可区分**(计划 §3.1 B 硬约束,不得细分出 `trashed` 类返回值——那会泄露存在性)。
- ⛔ 不碰 `projections.ts`、`items.ts`、`textFlowUnits.ts`、`textFlowIdentity.ts`、`shared/`、注册表、binding、transport、manifest、任何 tsconfig/package.json。
- ⛔ 测试**自建 fixture**(测试库内造块并置 status),**不得依赖开发库里的任何现存数据**。
- 越界或发现本单描述与现码不符 → 停手写 `needs: claude`。

## 必红判据(builder 前置自查;每刀记红在哪条断言)

- **K-1**(灵魂刀):T-1 先红后绿 —— 去掉 `AND status = 'active'` ⇒ T-1 **必须红**,且红在 `outcome` 断言上(`found` ≠ `missing`),⛔ 不接受红在别处;恢复后绿。
- **K-2**(回归锁):T-2 在改动前后**均绿** —— 证明本次修复没有把活块误伤成 missing。
- **K-3**(折叠不破):对一个**不存在的 blockId** 调用,返回值与 T-1 的 trashed 情形**逐字节相同**(`JSON.stringify` 比对)⇒ 不可区分性未被破坏。
- 既有 `test:v2` / `test:mcp-transport` / 契约测试全部复跑仍绿。

## 边界(触及面申报)

允许:`server/src/services/selectionResolve.ts`(**仅那一条 WHERE**)· 既有 resolve_selection 专项测试文件(加两条)· 必要时 `server/package.json` 测试脚本(**若已有专项则零改动**)。其余全部禁区。

## D 段(探针 / 锁 / 环境)

- 📌 共享树已知 EOL 假阳性(porcelain `.M` 但内容等于 HEAD)**四个**:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` · `selectionReceiptProjection.ts`;另 `.claude/launch.json` 是他人改动。**判真一律用 blob 比对,⛔ 不用 porcelain。**
- `.codex-tmp/builder.lock.d` 若存在,非你所有,只读确认。
- ⛔ PID 8292 的 `codex.exe` 是 Henry 的桌面应用,**永不杀**。
- 阴性断言前先让同一探针看见已知阳性;`.run()` 实参侧:任何 SQL 改动须核列数==占位符==实参数(本单不加占位符,只加常量条件——**这一点自己确认一遍**)。

## 本单按 P0–P3 档略过的东西(成对写)

- 略过:trashed→active 往返、并发改 status、批量 range 中混合 active/trashed 的组合矩阵 · 本来会挡:「状态过渡期的解析行为」· 记 `current-state/deferred-tests.md` 一行。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `test:mcp-transport` → 契约专项 → 本单新增专项。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`(**不需确认**):K-1/K-2/K-3 各一段(K-1 须贴先红后绿的红点断言原文与行号)· `git diff --numstat` 对照边界 · 显式范围排除。header 保持 `ready`;⛔ 不 commit、不 push、不碰 main、不碰锁。

⏱ 预估 20–30 分钟。这是 12.2c 的最后一件。

## Result

> builder outcome:实现与代码门完成。`needs: claude` 仅剩共享文档索引门:`docs:check` 报 `docs/agent-ops/INDEX.md` 过期；修它会触及本单禁区及共享树上的他人文档，故未越界洗绿。header 按工单保持 `ready`。

### 实现

- `server/src/services/selectionResolve.ts`:只把既有 WHERE 改为 `WHERE id = ? AND user_id = ? AND status = 'active'`。`SELECT content_json`、表名、其余控制流、函数签名、返回形状与 `missingRange()` 均未改。
- SQL 绑定自查:列数仍 1；占位符仍 2；`.get(range.blockId, userId)` 实参仍 2。新增的是常量条件，无新增绑定。
- `server/src/__tests__/v2McpTransport.test.ts`:在既有 `resolve_selection` 专项测试群中恰加 T-1、T-2 两条；fixture 全由临时测试库自建，不读开发库。
- `docs/agent-ops/current-state/deferred-tests.md`:按降档要求追加一行，记录略过的 trashed→active 往返、并发 status 与 mixed-batch 矩阵及其会挡的状态过渡行为。
- `server/package.json` 已有 `test:mcp-transport` 指向该专项文件，故零改动。

### K-1（先红后绿）

先只落测试、保持旧 SQL 无 `AND status = 'active'`，运行:

`node --import tsx --test --test-name-pattern='c-4' src/__tests__/v2McpTransport.test.ts`

exit `1`，且唯一失败正中承重 outcome 断言。红点原文与行号:

```text
server/src/__tests__/v2McpTransport.test.ts:1471:12
trashed owned block must resolve as missing
'found' !== 'missing'
```

同一轮 T-2 为 `ok`。恢复/加入精确常量过滤后，同命令 exit `0`、2/2；正式本单专项再次为 2/2。

### K-2（活块回归锁）

T-2 在 SQL 改动前后均绿:同一 owned block 初始 `status='active'` 且 excerpt 未变时精确返回带身份的 `found`；fixture 保持 block 为 active、只改 `content_json/plain_text` 后，复用原 receipt 精确返回带同一身份的 `text_drifted`。完整 `test:mcp-transport` 最终 37/37。

### K-3（折叠不破）

T-1 先用同一 fixture 证明 active owned block 可 `found`，再把该块置为 `trashed` 并由独立 SELECT 证实；修复后返回 `{results:[{outcome:'missing'}]}`。随后由独立 SELECT 证明比较用 blockId 不存在，并对两份完整返回执行 `JSON.stringify` 严格相等断言；专项 2/2，trashed 与不存在仍逐字节不可区分。

### 验证（docs-first，逐门 exit）

| 顺序 | 命令 / cwd | exit | 结果 |
|---|---|---:|---|
| 1 | repo · `npm.cmd run docs:check` | 1 | 非 CRLF 红；明确报 `docs/agent-ops/INDEX.md` 过期。共享树已有/新增未索引 handoff 与 analysis 文档；本单禁止碰其余 docs，故留 `needs: claude`。`core.autocrlf` 保持 `true`。 |
| 2 | client · `npx.cmd tsc --noEmit` | 0 | 通过 |
| 3 | server · `npx.cmd tsc --noEmit` | 0 | 通过 |
| 4 | repo · `npm.cmd run test:unit` | 0 | 22 files，222/222 |
| 5 | server · 独立 OS-temp `CANVAS_ASSET_DIR` 下 `npm.cmd run test:v2` | 0 | 274/274；目录末态 0 entries / 0 reparse，核对位于 OS temp 后非递归删除空目录 |
| 6 | server · `npm.cmd run test:mcp-transport` | 0 | 37/37（原 35 + 本单 2） |
| 7 | server · `node --import tsx --test src/__tests__/textFlowIdentityContract.test.ts` | 0 | 契约专项 4/4 |
| 8 | server · `node --import tsx --test --test-name-pattern='c-4 T-' src/__tests__/v2McpTransport.test.ts` | 0 | 本单新增专项 2/2 |
| 补充 | repo · `git diff --check` | 0 | 仅既有 LF→CRLF warning，无 whitespace error |

### `git diff --numstat` 与边界

本单 tracked 范围:

```text
1    0    docs/agent-ops/current-state/deferred-tests.md
100  0    server/src/__tests__/v2McpTransport.test.ts
1    1    server/src/services/selectionResolve.ts
```

全 tracked numstat 另有 `6 0 .claude/launch.json`，为开工前已存在的他人真实改动，本单未碰。工单文件自身是 untracked，故其本次 UTF-8 `## Result` 不出现在 tracked numstat。

四个点名 EOL 文件均以 `git hash-object --filters --path` 对 HEAD blob 复核为相等:`useNoteCanvasRuntimeController.ts`=`3efe5f…`、`SelectionToolbarLayer.tsx`=`29de89…`、`routes/projections.ts`=`561902…`、`selectionReceiptProjection.ts`=`5f8c27…`；未用 porcelain 承重。

显式范围排除:未碰 UI、浏览器、登录、凭证/token、跨用户测试、`projections.ts`、`items.ts`、`textFlowUnits.ts`、`textFlowIdentity.ts`、`shared/`、注册表、binding、transport、manifest、任何 tsconfig/package.json；未碰 `.claude/**` 与其他 handoff/analysis 文档；未取/删/覆盖 `.codex-tmp/builder.lock.d`，未操作任何 Codex 进程；未 commit、未 push、未碰 main。最终分支仍为 `fable/v2-bn12-exoskeleton`。
