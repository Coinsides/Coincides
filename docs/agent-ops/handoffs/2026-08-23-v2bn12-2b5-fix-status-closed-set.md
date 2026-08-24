> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(Fable 2026-08-23 裁「b-5-fix 现在就发,纯代码不在冻结范围」) | re: v2bn12-2b-5-fix | date: 2026-08-23

# V2.BN.12.2b-5-fix:status 白名单闭集化 + 两处护栏补齐

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。

## ⛔ 本单两道硬闸(**先读,违反即停**)

- **H-A**:⛔ **不得碰 `docs/agent-ops/` 下任何文件 —— 唯一例外:向本工单文件追加 `## Result`。** 该目录当前有一条授权链争议正待 Henry 裁定,**处于冻结**;尤其 ⛔ **不得碰 `docs/agent-ops/handoffs/README.md` 与 `docs/agent-ops/adjudication-discipline.md`**(即便你认为某条规则该补)。除本工单的 `## Result` 外,你只写代码与测试。
  > 📌 **发单方自报**:H-A 初稿写成「不得碰 `docs/agent-ops/` 任何文件」,而本工单正住在该目录、你又必须写 `## Result` —— **字面自相矛盾**,已在发单前改正。这正是同日立的「绝对量词发单前先对允许面」那条的第三个先例(前两例:设计方的「四条 K-5b 须红」、调度方的「`server/src/` 全目录为空」)。
- **H-B**:⛔ **本单产物不得与任何协议文档同提交**。(提交由调度方做,但你若自行分组也须遵此。)

## 上游

b-5 复核 **FAIL 1B/1H/2M**。**BLOCKER-1 属授权链问题、与代码无关,已冻结上报 Henry,不在本单范围。** 本单只修其余三条。
**⭐ R1(b-5 的灵魂:真人 UI 全程走到 revert)已 PASS 且反刀能红 —— ⛔ 本单不得改动那条守卫。**

---

## HIGH-1:白名单不是闭集,非 string 静默降级为 `proposed`

**复核实测矩阵(真实 Express + OS-temp DB)**:

| 输入 | 现状 | 应然 |
|---|---:|---:|
| `proposed` / `applied` / `reverted` / `dismissed` | 200 | 200 |
| `status=`(空串)/ `bogus` / `APPLIED` / `Applied` | 400 | 400 |
| **`status=applied&status=reverted`**(重复参数) | ⛔ **200** | **400** |
| **`status[]=applied`**(数组形) | ⛔ **200** | **400** |

**根因**:`routes/toolReceipts.ts` 的
```ts
const status = typeof req.query.status === 'string' ? req.query.status : 'proposed';
```
⇒ **任何非 string(Express 对重复参数/`[]` 形给出数组)都落进 `: 'proposed'` 默认支**,绕过白名单。

**复核已排除「只是错误码写错」**:返回体**只含 proposed id**,证明请求**真的按 `proposed` 执行了**。

### 修法(照裁定)

1. **只有 `req.query.status === undefined` 才用默认 `'proposed'`。**
2. **参数已提供但不是单个 string(数组、对象、空串、未知值)⇒ 一律 400。**
3. ⛔ **不得改服务层 SQL**;不得把过滤下沉或上移。

### 必红(X 系)

| # | 施刀 | 必红 |
|---|---|---|
| **X-1** ⭐ | 恢复成 `typeof … === 'string' ? … : 'proposed'` | **重复参数与 `status[]` 两条用例须红**(`200 !== 400`) |
| **X-2** | 令 `isListableReceiptStatus` 恒 `true` | `bogus` 用例须红 |
| **X-3** | 恢复后 | 全绿 |

**⭐ 永久入测的矩阵(⛔ 不得只测一两个)**:`空串` · `bogus` · `APPLIED` · `Applied` · **`status=a&status=b`** · **`status[]=applied`** · 四个合法值。
**每条阴性断言须配阳性对照**(同一探针能看见合法值返回 200),否则「都 400」可能只是路由挂了。

---

## MED-1:跨用户护栏方向不对

**产品当前安全**(复核用 **API↔service** 与 **DB 全行↔B 自身 API** 双来源确认)。但仓内既有 `K-5b real HTTP revert rejects a foreign receipt independently` 是**反方向**(B token 请求 A 的 receipt),且只断 `noteStatus(...) === 'trashed'`。

**⇒ 工单点名的方向(A 请求 B)没有被固化。** 补一条**永久**测试:

- 造 **A / B 两用户**、B 的 course、B 的 **applied receipt** 与 **B 自己的 note**;
- **列表侧**:A 的**四种 status** 列表**均不含** B 的 receipt(阴性)+ **A 自己的那条能列出**(⭐ 阳性对照,证明探针不是恒空);
- **revert 侧**:A 对 B 的 receipt revert ⇒ **403**,且 **B 的 note 逐字段(`SELECT *` 全行)前后相同**,receipt 仍 `applied`。

⛔ **不得删改既有 K-5b**(它验的是另一方向,两条并存)。

**必红**:去掉 `listToolFaceReceipts` 的 `user_id` 条件 ⇒ 列表侧红;放宽 revert 的 ownership 守卫 ⇒ **须在 B 的 notes 全行上红,不只看返回码**。

---

## MED-2:两把刀在客户端 2/2 下存活

复核证明**产品当前为绿**(三种动作后各观察到四次新的 status GET;`receiptsByStatus` 唯一写入点在 `refresh()`),但下列两刀**测试抓不住**:

```
await refresh()  →  if (action !== 'dismiss') await refresh()      ⇒ 2/2 仍 pass
Jump onClick     →  () => undefined                                 ⇒ 2/2 仍 pass
```

**补两条永久断言**:
- **Dismiss 后须断言四态重新取数**(调用数或页面状态),⛔ 不得只断「API mock 收到了 id」;
- **Jump 须在 router location 上断言目标 note**(pathname 含该 note id),⛔ 不得只断按钮存在/可点。

📌 **对照(证明这类断言写得出来)**:Revert 跳过 refresh 的刀**已能红**(`ToolReceipts.test.tsx` 的 `expected spy 8 times, got 4`)。**照它的形状写。**

**必红**:施上述两刀 ⇒ **各自对应的新断言须红**;恢复后全绿。

---

## 边界

**允许**:改 `server/src/routes/toolReceipts.ts`(仅 status 取值与白名单)· `server/src/__tests__/v2TrashNotesTool.test.ts` · `client/src/pages/ToolReceipts/ToolReceipts.test.tsx`(必要时 `ToolReceipts.tsx` 仅为可测性做**不改行为**的最小调整,**须在回执申报**)。

**⛔ 不得**:碰 `docs/agent-ops/`(**H-A**)· 改 `server/src/services/` `db/` `mcp/` `toolFace/` · 改 `queueItem` 已有九字段 · 动 b-5 的 Executed 视图与 Revert 链(**R1 守卫**)· 删改既有 K-5b 与既有 2 条客户端测试的语义 · 做分页/筛选器/批量 revert。

**越界即停,标 `needs: claude`。**

## ⚠️ 基线缺口:不得代偿

TD-14(`scopes` 未强制,**不得声称已强制**)· TD-6(多资源 revert 非原子)· TD-12(EPERM:`test:v2` 首跑 5 个 image fixture 会 EPERM,用 `CANVAS_ASSET_DIR` 指向 OS temp 绕开,⛔ **不得改测试或产品语义代偿**)· TD-16。

## D. 探针 / 锁 / 环境

阴性断言前先过阳性对照;**确认命中不是来自你自己刚写进去的东西**。
⭐ **凡阴性结论(「没有」「零条」「不出现」「都 400」),至少要有第二个独立来源同意** —— 空集同时是「真的没有」和「我没看见」的合法输出。
**锁**:`.codex-tmp/builder.lock.d` 由发单方(opus)持有 —— **不取锁、不写 `owner.json`、不删锁**。
📌 dev 服务在 `:3001`/`:5173` 跑着(调度方所有,**⛔ 不要杀**);需真实 UI 请另起隔离端口并在回执申报,跑完自清(b-5 那轮的处理方式是对的)。
📌 porcelain 对 `useNoteCanvasRuntimeController.ts`、`projections.ts` 有 stat/EOL 假阳性(blob 等于 HEAD);判真改用 blob 哈希或 `--numstat`;`grep -c` 数**行数**不是**出现数**。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → 双 `tsc --noEmit` → `test:unit` → `test:v2` → `test:trash-notes-tool` → `test:mcp-transport` → 五道 tool-face 门。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方**(本单 X 系为前置自查,仍须逐条给输出)+ **M-2 header 不由你翻**。
**⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**

**回执须含**:X-1…X-3 与 MED-1/MED-2 各自的先红后绿输出 · **七种 status 输入的完整矩阵实测表**(含阳性对照)· MED-1 的 **B note 全行 before/after** · MED-2 两刀各自的红点断言 · **`docs/agent-ops/` 零触碰的证明**(H-A)· `services/` `db/` `mcp/` `toolFace/` numstat 为空的证明 · 门禁逐条收据 · 触及面 diff vs 申报 · **每条阴性断言的阳性对照**。

## Result

完成于 2026-08-23，基线/当前 HEAD：`b1772f017f398f540092ca998783028f688a565f`。header 未翻；未 commit、未 stage。

### 实现

- **HIGH-1**：`GET /api/tool-receipts` 仅在 `req.query.status === undefined` 时默认到 `proposed`；参数一旦提供，若不是单个 string 或不在四态闭集内，一律 400。`listToolFaceReceipts` 及服务层 SQL 未改。
- **MED-1**：新增工单点名方向 **A 请求 B** 的永久测试；既有反方向 K-5b 原样保留。A 的四态列表各自精确返回 A 自己对应 receipt、均排除 B；B 用自身 token 可列出 B receipt。A revert B 返回 403，B receipt 仍 `applied`，B note 的 `SELECT *` 全行前后 `deepEqual`。
- **MED-2**：在既有 K-7 中加入 router location probe；Jump 后断言 pathname 为 `/notes/note-proposal-one`。Dismiss 后断言总 list 调用从 8 增到 12，并精确断最后四次为 `proposed/applied/reverted/dismissed`。
- 未改 `ToolReceipts.tsx`；未改 b-5 R1 的 Executed view/Revert 测试块；未启动、停止或复用 `:3001`/`:5173`；未操作 `.codex-tmp/builder.lock.d` 或 `owner.json`。

### HIGH-1 七类矩阵与阳性对照

每个响应除 HTTP status 外都核对了 seeded owned receipt 的**精确 id 列表**，不是只看“非空”。“合法值”作为一类、逐个跑完四态；省略参数是额外默认值守卫。

| 输入 | 实测 | 同探针阳性对照 |
|---|---|---|
| `status=proposed` | 200，仅 own proposed | 本行自身：200 + 精确 proposed id |
| `status=applied` | 200，仅 own applied | 本行自身：200 + 精确 applied id |
| `status=reverted` | 200，仅 own reverted | 本行自身：200 + 精确 reverted id |
| `status=dismissed` | 200，仅 own dismissed | 本行自身：200 + 精确 dismissed id |
| `status=` | 400 | 先请求 `status=proposed`：200 + 精确 proposed id |
| `status=bogus` | 400 | 先请求 `status=proposed`：200 + 精确 proposed id |
| `status=APPLIED` | 400 | 先请求 `status=applied`：200 + 精确 applied id |
| `status=Applied` | 400 | 先请求 `status=applied`：200 + 精确 applied id |
| `status=applied&status=reverted`（`status=a&status=b` 形状） | 400 | 先请求 `status=applied`：200 + 精确 applied id |
| `status[]=applied` | 400 | 先请求 `status=applied`：200 + 精确 applied id |
| 完全省略 `status`（额外守卫） | 200，仅 own proposed | 四态显式请求均为 200；本行精确 proposed id |

### 先红后绿 / 刀测

- **X-1**：恢复旧取值表达式后，HIGH-1 focused test 红；重复参数与 `status[]` 两项均为 `actual 200 !== expected 400`，且返回的是 proposed 分支数据。恢复修复后绿。
- **X-2**：临时令 `isListableReceiptStatus` 恒 `true` 后，空串、`bogus`、`APPLIED`、`Applied` 均为 `actual 200 !== expected 400`；non-string 两项仍由类型守卫挡住。恢复白名单后绿。
- **X-3**：恢复全部产品代码后，HIGH-1 + MED-1 + 既有反向 K-5b focused run 为 **3/3 pass**；server 整文件为 **23/23 pass**。
- **MED-1 list 刀**：临时移除 SQL 的 `user_id` 条件后红在 `applied: user A own receipt is the positive control`，实际列表多出 B receipt；恢复后绿。
- **MED-1 revert 刀**：仅删除 receipt-level guard 时，403/receipt-still-applied 断言会红，但 note 层仍以 A 身份拒绝 B note，因此全行本身不会红。为按工单验证“B 全行”杀伤点，采用端到端 ownership 放宽刀（去 receipt guard，并临时以 `receipt.user_id` restore）；全行断言红，差异为 `status: trashed → active`、`trashed_at: timestamp → null`、`updated_at` 改变。恢复后 403、receipt `applied`、全行不变。
- **MED-2 Dismiss 刀**：临时改为 Dismiss 不 refresh，K-7 红：`expected spy to be called 12 times, but got 8 times`；恢复后 2/2 pass。
- **MED-2 Jump 刀**：临时把 Jump `onClick` 换成空函数，K-7 红：期望 location `/notes/note-proposal-one`，实际 `/tool-receipts`；恢复后 2/2 pass。

所有 mutation 均已还原；最终 product diff 不含任何上述刀。

### MED-1 B note 全行收据

`SELECT * FROM notes WHERE id = B_NOTE` 的 before/after 对象逐字段相同，共 14 列：

| 列 | before / after |
|---|---|
| `id` | B note id / 相同 |
| `user_id` | B user id / 相同 |
| `course_id` | B course id / 相同 |
| `title` | `User B private note` / 相同 |
| `description` | sentinel description / 相同 |
| `status` | `trashed` / `trashed` |
| `source_kind` | `manual` / `manual` |
| `page_format` | `flow` / `flow` |
| `metadata` | `{"owner":"B","sentinel":17}` / 相同 |
| `operation_batch_id` | `NULL` / `NULL` |
| `created_at` | `2026-08-23 09:00:00` / 相同 |
| `updated_at` | `2026-08-23 09:01:00` / 相同 |
| `trashed_at` | `2026-08-23 09:01:00` / 相同 |
| `note_class` | `user` / `user` |

独立阳性来源：B note 在 revert 前确实存在；B token 经同一 HTTP list route 能精确列出 B 的 applied receipt；service read 同时确认该 receipt 的 `user_id` 为 B。故 A 列表“不含 B”和全行“不变”不是空探针。

### 验证收据

按工单顺序亲跑：

- `npm.cmd run docs:check`：PASS。
- `npm.cmd run verify:v2-bn8-runtime`：PASS（client 21 files / 213 tests；registry 4/4；manifest 10/10；parity 10/10；build、runtime、model-contract、perf、docs/diff/secrets 全过）。
- `npx.cmd tsc --noEmit`（client）：PASS；同命令（server）：PASS。
- `npm.cmd run test:unit`（client）：21 files / **213/213 pass**。
- `npm.cmd run test:v2`（server）：**270/270 pass**。按 TD-12 将 `CANVAS_ASSET_DIR` 指到独立 OS-temp 目录；测试后校验其父目录/前缀并删除，未改测试或产品语义。
- `npm.cmd run test:trash-notes-tool`（server）：**43/43 pass**。
- `npm.cmd run test:mcp-transport`（server）：**24/24 pass**。
- `npm.cmd run test:tool-face-registry`：**4/4 pass**。
- `npm.cmd run test:tool-face-manifest`：**10/10 pass**。
- `npm.cmd run check:tool-face-manifest`：PASS，artifact fresh（2 entries / 2 public）。
- `npm.cmd run test:tool-face-parity`：**10/10 pass**。
- `npm.cmd run check:tool-face-parity`：PASS（2 public entries）。
- focused：`v2TrashNotesTool.test.ts` **23/23 pass**；`ToolReceipts.test.tsx` **2/2 pass**。

### H-A / H-B / 触及面

- 写 Result 前在 OS temp 保存了工单原始字节副本及 `docs/agent-ops/**`（排除本工单）的完整 SHA-256 manifest。写回前复算：`DocsExceptTicketDiffCount = 0`；工单当前 8024 bytes 与快照逐字节完全一致。随后 patch 唯一目标为本 `## Result` 尾部。
- `git diff --numstat b1772f0 -- server/src/services server/src/db server/src/mcp server/src/toolFace`：空；这些目录的 untracked 查询亦为空。服务 SQL 无最终差异。
- 最终产品 diff vs `b1772f0`：仅 `server/src/routes/toolReceipts.ts`、`server/src/__tests__/v2TrashNotesTool.test.ts`、`client/src/pages/ToolReceipts/ToolReceipts.test.tsx`，共 **3 files, 229 insertions, 3 deletions**；均在工单允许范围。`ToolReceipts.tsx` diff 为空。
- porcelain 中 `useNoteCanvasRuntimeController.ts`、`projections.ts` 为工单已声明的 stat/EOL 假阳性；blob 等于 HEAD、numstat 为空。`INDEX.md`、`claude-log/2026-08-23.md` 是开工前已有他人改动，未触碰。
- `git diff --cached --name-only` 为空，HEAD 仍为 `b1772f0`；未提交，故本单产品未与任何协议文档同提交（H-B）。header 保持 `ready`。

### Result 写回后终检

- 用同一份开工 manifest 复算：`docs/agent-ops/**` 排除本工单后 `DocsExceptTicketDiffCount = 0`。
- 严格 UTF-8 解码通过；8024-byte 原工单是写回后文件的精确字节前缀；首次 Result 写回只在末尾新增 7523 bytes，`git diff --no-index --numstat` 为 `88  0`。
- 写回后 `npm.cmd run docs:check` 与 `git diff --check` 均 PASS；HEAD/暂存区状态仍满足 H-B。

## Review

复核日期：2026-08-23。复核角色：Codex reviewer（洁净室增量复核）。复核基线：`4e6bc647a8f449b42db72deda0815d9ebf3d3476`；前一基线：`b1772f017f398f540092ca998783028f688a565f`。

**判定：PASS。BLOCKER 0 / HIGH 0 / MED 0 / LOW 0。** 未发现需要 builder 返工的缺陷；放行权仍在 Fable。

### ⛔ 本轮范围缩小（路线③；显式）

上一轮复核在准备施加“移除 `user_id` 过滤 / 放宽 revert ownership 守卫”一类 mutation 时，被上游内容过滤器判为 cybersecurity risk 后终止（880 秒 / 26 万 token，`## Review` 未写）。本轮依设计方路线③裁定，**没有施加、没有改写描述后重试、也没有以任何替代方式尝试移除或放宽 ownership、鉴权、权限守卫**；工单 MED-1 原列的两条此类“必红”不在本轮范围，Result 中对应旧刀收据也不作为本轮判定证据。

因此，下面 **R2 是结构复核，非亲刀**；只核测试方向、fixture、断言落点、阳性对照与既有反方向用例保留情况。

### R1 — HIGH-1 闭集：PASS

亲跑新 HIGH-1 用例所走的真实 Express fixture；临时只加日志读取动态 seed id，随后逐 blob 恢复测试文件。该次精确 id 为：

- proposed：`bc5fe37a-f507-4cc1-8ed5-aefe3dddf28a`
- applied：`954bdfc8-924e-4e67-bfd3-6a05d1ceb3af`
- reverted：`2d0183b7-ba77-4da0-9f47-2c072420d250`
- dismissed：`29a0abe9-9b72-489c-bd85-9f6fd2eb418e`

| 输入 | 实测 | 同探针阳性对照（精确 id 列表） |
|---|---|---|
| `status=proposed` | 200，`[bc5fe37a-f507-4cc1-8ed5-aefe3dddf28a]` | 本行自身 |
| `status=applied` | 200，`[954bdfc8-924e-4e67-bfd3-6a05d1ceb3af]` | 本行自身 |
| `status=reverted` | 200，`[2d0183b7-ba77-4da0-9f47-2c072420d250]` | 本行自身 |
| `status=dismissed` | 200，`[29a0abe9-9b72-489c-bd85-9f6fd2eb418e]` | 本行自身 |
| `status=` | 400 | proposed：200，`[bc5fe37a-f507-4cc1-8ed5-aefe3dddf28a]` |
| `status=bogus` | 400 | proposed：200，`[bc5fe37a-f507-4cc1-8ed5-aefe3dddf28a]` |
| `status=APPLIED` | 400 | applied：200，`[954bdfc8-924e-4e67-bfd3-6a05d1ceb3af]` |
| `status=Applied` | 400 | applied：200，`[954bdfc8-924e-4e67-bfd3-6a05d1ceb3af]` |
| `status=applied&status=reverted` | 400 | applied：200，`[954bdfc8-924e-4e67-bfd3-6a05d1ceb3af]` |
| `status[]=applied` | 400 | applied：200，`[954bdfc8-924e-4e67-bfd3-6a05d1ceb3af]` |
| 完全省略参数 | 200，`[bc5fe37a-f507-4cc1-8ed5-aefe3dddf28a]` | 四态显式请求均 200 且各为上列 singleton |

阴性结果还有第二来源：另一套 fresh temp DB / 真实 Express 探针以 applied `ef18274c-8fea-4615-b135-09ee289d51db`、proposed `ff092423-bd3b-4802-b220-ccc732339d71` 为精确阳性 singleton，独立得到相同拒绝结果。额外形状中，同值重复 2/3 次、合法值加空值、`status[value]`、`status[0]`、嵌套对象、空数组元素、空白/plus/tab、全角/零宽/NBSP、双重编码、NUL、畸形百分号、逗号列表、编码后大写、4 KiB 值及保留对象成员均为产品 400；20 KiB 值由 HTTP 层在路由前返回 431。合法等价编码 `%61pplied`、`appli%65d`、`st%61tus=applied` 均为 200 且只返回 applied 精确 id。未发现闭集接受缺口。

刀测均为目标 `AssertionError`，不是装载/语法错误：

- X-1：恢复旧式 `typeof ... === 'string' ? ... : 'proposed'` 后，重复参数与 `status[]` 两项由期望 400 变为实际 200；其余四个非法字符串仍 400。恢复后 focused 1/1 PASS。
- X-2：令 `isListableReceiptStatus` 恒 `true` 后，空串、`bogus`、`APPLIED`、`Applied` 四项由期望 400 变为实际 200；两项非 string 仍 400。恢复后 focused 1/1 PASS。
- 两次恢复后 `server/src/routes/toolReceipts.ts` blob 均回到 `685b6a50afa38915633d2ee54e6e00fb3fa5fb8c`，隔离树最终 diff/stage 为空。

### R2 — MED-1 结构复核（非亲刀）：PASS

- 新测试确为 **A token 请求 B receipt**；既有 K-5b 是 B token 请求 A receipt，方向不同。
- fixture 确实插入 B 的 course、B 自己的 note，并建立 B 的 applied receipt；A revert 前后均以 `SELECT * FROM notes` 读取 B note，断言是整行 `assert.deepEqual(after, before)`，另断 receipt 仍为 `applied`，不是只看 `noteStatus`。
- 列表探针不是恒空：A 自己四态各有 receipt，逐态严格等于自己的 singleton；B token 还经同一 HTTP list route 精确列出 B 自己的 applied receipt。
- 既有反方向 K-5b 未删改；其代码块在 `b1772f0` 与 `4e6bc64` 的 SHA-256 同为 `1f5cab1900513cd2f99b4509e612cadda4a2f01c086591cea2f1b1e23b63e05b`。整套 trash-notes HTTP 门 43/43 PASS，作为结构阅读之外的独立运行来源。

### R3 — MED-2 两把客户端刀：PASS

- Dismiss 刀 `await refresh()` → `if (action !== 'dismiss') await refresh()`：K-7 目标断言红为 `expected spy to be called 12 times, but got 8 times`；该断言随后还精确核最后四次 GET 为 proposed/applied/reverted/dismissed。恢复后 2/2 PASS。
- Jump 刀将 `onClick` 变为空函数：router location probe 目标断言红，期望 pathname `/notes/note-proposal-one`、实际 `/tool-receipts`。恢复后 2/2 PASS。
- 红刀彼此独立、每刀恢复后再取绿；产品文件最终 blob 与基线相同。

### R4 / R5 — 未打破既有守卫且范围干净：PASS

- `ToolReceipts.tsx` 在两基线的 blob 均为 `e1f0a123c040b821393a23d462aece53a82d7bfb`，diff 为空；Executed 视图到真人 UI Revert 链、对应 API 调用均仍在。
- `queueItem` 九字段块在两基线的 SHA-256 均为 `139c7678166a3958be7269db4d18b642409d843902880b90a78fe3bc912672d3`；既有第二条客户端 K-4/K-5 测试块哈希亦相同，K-7 原 Apply/Dismiss 语义保留。
- `git diff --numstat b1772f0..4e6bc64 -- server/src/services server/src/db server/src/mcp server/src/toolFace` 为空；独立的两端 tree-object SHA 也逐目录相同：services `09f26ac8faeae8986322dbbce389f1a3a8a4c941`、db `9d89bb0ab7e9f8eb7ba00e2f482686423e01c8a6`、mcp `b251313d372b46144c1bda7af6a50cc104dfcfaf`、toolFace `63e60c31c1b52a56b044a96212883a5cd42cb7ea`。

### R6 — 门禁：PASS

按 docs-first 顺序亲跑：

- `npm.cmd run docs:check`：PASS（字节保真 `4e6bc64` clone）。
- `npm.cmd run verify:v2-bn8-runtime`：PASS；含 client 21 files / 213 tests、registry 4/4、manifest 10/10、parity 10/10、runtime/model/perf、双 build、docs/diff/secrets 全过。
- `npx.cmd tsc --noEmit`：client PASS；server PASS（均为精确基线 clone）。
- `npm.cmd run test:unit`：21 files / 213/213 PASS。
- `npm.cmd run test:v2`：270/270 PASS；按 TD-12 使用独立 OS-temp `CANVAS_ASSET_DIR`，结束前确认根与内部均无 ReparsePoint 后删除。
- `npm.cmd run test:trash-notes-tool`：43/43 PASS。
- `npm.cmd run test:mcp-transport`：24/24 PASS。
- 五道 tool-face：registry 4/4 PASS；manifest 10/10 PASS；manifest check PASS（2 entries / 2 public）；parity 10/10 PASS；parity check PASS（2 public）。

环境说明：OS-temp clone 直接启动 Vitest 时，esbuild 在任何测试执行前被环境拒绝读取 `vitest.config.ts`（`Access is denied`），该基础设施启动错误未计作产品红/绿。完整命名 `verify:v2-bn8-runtime` 与独立 `test:unit` 改在主工作树运行；运行前以两种来源确认被测内容等于 `4e6bc64`：相关路径 `git diff --numstat` 为空，且 client tree `5c24616e8e06566a66fb4341759758322afb9a3f`、server tree `d1117dcc93d39c4a99a03c24f1f3c1771a6fda5f` 与基线逐 tree-object 相同，root/client/server package 文件也逐 blob 相同。精确 clone 的 docs、双 tsc 与所有 server 门另行通过。

### 卫生

- 全部 mutation 均在 OS-temp 隔离 clone 中完成并恢复；隔离 clone 最终 tracked/staged diff 均为空。
- 清理前枚举 junction 为 ReparsePoint、解析目标并确认目标精确匹配 OS-temp clone；目标内部 ReparsePoint 为 0。随后用 `[IO.Directory]::Delete(path, $false)` 非递归解链，再仅对已验证位于 OS temp、内部无 ReparsePoint 的两个 clone 做递归删除。reviewer vitest config、junction、两个 clone 与 TD-12 asset 目录均已不存在；共享 root/client/server `node_modules` 均仍在。
- 未取锁、未写/删 `owner.json`，未停止或复用调度方 `:3001` / `:5173` 服务。
- 写 Review 前，`docs/agent-ops/**` 排除本工单的 135 文件 manifest SHA-256 为 `43b44b84f28a1ffd57c7dbbdf3d99323e3735420ed9ff851bd94d5e044b767e0`；本次唯一获准写入目标为本 `## Review`。
- 写回后严格 UTF-8 解码通过，`## Review` 恰为 1 段；排除本工单后的 135 文件 manifest 复算仍为同一 SHA-256，故冻结目录内没有第二个写入目标。
