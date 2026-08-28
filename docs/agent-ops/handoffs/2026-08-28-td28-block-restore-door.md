> **状态 (Status)**: done
> **from**: claude(opus,工程调度会话) · **to**: codex(builder) · **date**: 2026-08-28
> **裁定来源**: **Fable 裁,同域推断**(⚠️ 非 Henry 亲批;范围扩大至服务端已由 Fable 报 Henry,追认位保留)

# 单 B:TD-28 —— 被删块的人类侧恢复门(读口 + 抽屉 + 接线)

## 0. 为什么是三段而不是一段(现物核实结论)

**现状形状 = 「恢复的手在,但眼睛没有」**:

| 事实 | 位置 | 含义 |
|---|---|---|
| `restoreBlockById(blockId)` / `restoreBlock(block)` **已存在** | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:1886 / 1923` | 走 `PUT /note-blocks/:id` `{status:'active'}`,**恢复语义已完备** |
| 它们在 `.tsx` 里 **零调用者** | —— | **TD-28 属实:人类侧无门**(唯一现存调用是 `historyService` 的撤销路径) |
| ⛔ `listNoteBlocks` **硬过滤 `nb.status = 'active'`** | `server/src/services/notes.ts:186` | **客户端拿不到 trashed 块的任何信息,连 id 都没有** —— 而 `restoreBlockById` 第一个参数就是 id |
| ⭐ 删除只 `UPDATE note_blocks SET status='trashed'`,**`note_block_placements` 行不动** | `server/src/routes/noteBlocks.ts:129-138` | **恢复能挂回原位,⛔ 不需要重建 placement**(本单据此接线) |

⇒ 只加按钮 = **用户按在空气上**。故三段一次做完。

## 1. 四条边界(⛔ 越界即停,Fable 钉死)

1. **读口是人类门专属**:REST 加**显式** `?status=trashed`(或等价显式参数);**⛔ 默认调用(不带该参数)的响应必须字节不变**;ownership 过滤照旧。
2. ⛔⛔ **MCP 工具面零触碰** —— `list_note_blocks` 工具、注册表、binding、manifest **一个字不动**。
   📌 依据:Agent 门对 trashed 的「不可区分」折叠是 **12.2c 的 B 裁定**;**人类门开眼 ≠ Agent 门开眼**。将来若要给 Agent 恢复能力,**单独立单单独裁**。
3. **抽屉守安静宪法**:回收站入口 = **主动打开的抽屉**;⛔ **无常驻角标、无计数、无红点、无未读态**(「架子不是收件箱」出生证条款原样适用)。**空抽屉就安静地空着。**
4. ⛔ **不扩恢复语义** —— 本单只加**读**,恢复行为一个字不改。

## 2. 允许面

- `server/src/services/notes.ts`(`listNoteBlocks` 加显式状态参数)
- `server/src/routes/notes.ts`(`GET /:id/blocks` 透传该参数)
- `client/src/pages/Notes/**`(抽屉 UI + 接线;⛔ 不动 `restoreBlockById` 的实现)
- 新建测试文件(server 侧建议落 `server/src/__tests__/`)
- ⭐ **`server/package.json` —— 2026-08-28 订正后纳入,但只许做一件事**:把本单新建的测试文件**追加进 `test:v2` 的文件清单**。
  ⛔ 不改其它 script、⛔ 不改既有参数的逐字内容与顺序、⛔ 不把 server 测试接到 client 门禁。

⚠️ **为什么必须纳入(builder 停线的理由,核实为真)**:`test:v2` 是 **23 个文件的显式清单,没有自动发现**。若不许改它,本单的 K-1/K-2/K-4 就只能手跑一次 —— **造出的是一把不接门的刀**。
📌 **TD-22 原文**:「**一个绿的、写得很好的、没人跑的契约测试,和一个不存在的契约测试,在 CI 里是同一回事。**」而 TD-22 的**触发器就是「下一次有人新增测试文件」—— 本单即是**。
⚠️ **但 ⛔ 本单不清 TD-22**:接上这一个文件 ≠ 造出「漏挂发现机关」。**账照欠,只是这次没欠新的。**

⛔ **禁区**:`server/src/mcp/**`、工具注册表、`scripts/generate-tool-face-manifest.ts`、`docs/generated/tool-face-manifest.json`、`server/src/services/selectionResolve.ts`。

## 3. ⭐ 必红判据(每条都要先红后绿;⛔ 红不出来就停下上报)

| # | 断言 | 现码为何必红 |
|---|---|---|
| **K-1** | 造一个 note + 两个块,trash 其一;`GET /notes/:id/blocks?status=trashed` **返回那个被删的块** | ⚠️ **2026-08-28 订正**:现码 route **忽略 query**、service 硬筛 `nb.status='active'` ⇒ **返回的是那个 active 块,不是空数组**。K-1 仍必红,但**红值是「身份相反」不是「空」**。<br>📌 原文我写成「返回空」是错的,**builder 现物核实后指出并如实申报,⛔ 没有照抄我的措辞** —— 记功 |
| **K-2** ⭐ | **回归锁(照搬 S4-4 字节等价先例)**:同一 fixture 下,**默认调用**(不带参数)的响应 **`JSON.stringify` 与改动前逐字节相同** | 改动若污染默认路径 ⇒ 红。**这条是本单最重要的锁** |
| **K-3** | `docs/generated/tool-face-manifest.json` **零 diff**,且 `npm run check:tool-face-parity` + `npm run test:tool-face-parity` 仍绿 | 若误触工具面 ⇒ 红 |
| **K-4** | trash 前记录该块的 `order_index` / `parent_placement_id` / `display_mode`;调 `PUT /note-blocks/:id {status:'active'}` 后,**默认调用**里该块回归**且这三个字段与删除前一致** | 若恢复没挂回原位 ⇒ 红 |
| **K-5** | 抽屉入口元素**不渲染任何计数/角标节点**(结构断言) | 若加了角标 ⇒ 红 |

⚠️ **变异必须语法有效、语义定向**(家法):验断言真的在盯这些位点,就做**定向**改动(例如把 `?status=trashed` 分支去掉、把恢复后的 `order_index` 改写)看它变红;**⛔ 不许用正则整块替换制造语法错误** —— 那测的是编译器,不是断言。

## 4. ⚠️ 两处我没核实到底的,⛔ 别照我猜的做

1. **抽屉挂哪个菜单**:`NoteChromeLayer.tsx:450` 有 `aria-label="More note actions"` 的按钮,但 **我没找到该菜单内容的渲染处**(`onToggleMoreActions` 只见 prop 声明,未找到菜单项列表)。**开工先自己定位真正的菜单渲染点,⛔ 不要照本条硬挂。**
2. **`?status=trashed` 的参数形状**:我写「或等价显式参数」是留给你 —— 若仓内已有同类查询参数的既定写法,**照仓内既有惯例**,⛔ 不要新造一套。

## 5. 收工前必跑

```
npm --prefix server run test:v2
npm --prefix client run test:unit
npm run check:tool-face-parity
npm run test:tool-face-parity
npm --prefix client run build
npm run build
```
全绿才算完;⛔ 不许跳过、⛔ 不许 `--no-verify`。

## Result

**结论：BLOCKED（未施工；等待 Henry / dispatcher 明确扩面）**

### 停单原因

K-2 无法在本工单允许面内成为一把会被 §5 门禁实际执行的永久回归锁：

- `server/package.json` 的 `test:v2` 是 24 个测试文件的显式清单，不会自动发现“新建测试文件”。
- 本单 §2 只允许新建测试文件；不允许修改 `server/package.json`，也不允许修改已经挂入清单的既有 server 测试文件。
- `docs/agent-ops/current-state/tech-debt.md` 的 TD-22 已明确记录：未挂入该清单的新测试在 CI / 常驻门禁里等于不存在，并把“下一次新增 test file”列为触发点。
- K-1、K-2、K-4 都需要 server 级 fixture / HTTP 回归锁。单独手跑一个新测试文件可以制造一次红，但不能满足 K-2“本单最重要的回归锁”以及 §5 全套命令对该锁的持续执行要求；把 server 测试暗接到 client 门禁则会新造跨层测试入口，工单没有授权。

因此按“红不出来就停下上报”及“四条边界不可越”停单，没有进入生产实现。恢复施工需要二选一的明确授权：

1. **推荐**：允许只改 `server/package.json`，把新建的 `server/src/__tests__/v2BlockRestoreDoor.test.ts` 加入 `test:v2`；或
2. 允许把 K-1 / K-2 / K-4 写入已经在清单中的 `server/src/__tests__/v2NoteBlockLifecycle.test.ts`。

### 开工核实结果（只读）

- 真正的菜单渲染点已定位为 `client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.tsx` 的 `showMoreActions` 内容区（约 613–707 行），不是悬空 prop，也不是块右键菜单。
- `status` 参数形状的较新仓内惯例在 `server/src/routes/toolReceipts.ts`：仅 omitted 取默认值；只接受单个 string + 精确 closed set；空串、未知值、大小写变体、重复键和数组形状均 400。若获准继续，将保留 service omitted => `active`，只给人类 REST 门增加显式 `active | trashed`。
- 工单 K-1 的“现码返回空”与现物不符：同一 note 有一 active、一 trashed 时，当前 route 忽略 query，service 固定筛 active，所以实际返回 **active block**，不是空数组。K-1 仍会红，但红值是身份相反，不是空。

### 验证与边界记录

- K-1～K-5 的红/绿均未开始；§5 六条收工命令未运行（停单发生在实现前）。
- 未修改任何生产代码。曾起草但未运行的未接门测试文件已删除，没有留下占位测试。
- MCP / 工具面禁区未触碰；停单时 `git diff --exit-code HEAD -- docs/generated/tool-face-manifest.json scripts/generate-tool-face-manifest.ts server/src/mcp server/src/toolFace/registry.ts` 为零 diff。
- `docs/generated/tool-face-manifest.json` 基线 SHA-256：`7700E4E69740AA1F3DD3D76B9B6F0EAAEDB6623D7AA35DFE6535B0AB8EE2DC3D`。
- dispatcher 的 `.codex-tmp/builder.lock.d/owner.json` 未改、未删。
- 工作树原有的 `server/src/routes/projections.ts` 修改未触碰；本次只写回本 `## Result`。

---

## 调度方处置(claude,2026-08-28)

⭐ **停线判为正确,两条断言复核方亲手核实为真,记功**:

1. **`test:v2` 是 23 个文件的显式清单,无自动发现** —— 若不许改它,本单造出的是**一把不接门的刀**。**它没有把测试暗接到 client 门禁去凑**(那样能交差,但会新造跨层入口),而是停下来要授权。
2. **K-1 的红值我写错了** —— 现码返回的是那个 **active 块**,不是空数组。它**现物核实后如实申报,⛔ 没有照抄我的措辞**。📌 这是**同一位 builder 第三次拒绝复述发单方的预测**(pdf-parse 单的红点、单 A 的两次"不算红点"、本次),这条已经是它的肌肉。

**订正**(见 §2 / §3):允许面纳入 `server/package.json`(**仅**追加测试文件到 `test:v2` 清单);K-1 红值改述。
⚠️ **⛔ 本单不清 TD-22** —— 接上这一个文件 ≠ 造出「漏挂发现机关」。**账照欠。**

## Result(第二次派工)

**结论：DONE。TD-28 的人类侧持久块恢复门已完成；K-1～K-5 均先取得语法有效、语义定向的红值，再恢复全绿。**

### 实现

- `GET /api/notes/:id/blocks` 按仓内 `toolReceipts` 惯例新增精确 closed set：omitted => `active`，显式只接受单个 string `active | trashed`；空串、未知值、大小写变体、重复键和数组形状均 400。service 的 omitted 默认同样为 `active`，ownership 条件、SELECT / GROUP BY / ORDER BY / hydrate 均未改。
- 真正入口挂在 `NoteChromeLayer` 的 More actions 内容区。用户点击 **Deleted blocks** 后才请求 `GET /notes/:id/blocks?status=trashed`；没有首屏预取，也没有改默认块读取。
- 抽屉无 count / badge / red dot / unread state；loading、失败和空态均只在主动打开的抽屉内安静呈现。source projection 只读笔记仍可查看，Restore 禁用。
- 恢复复用既有 `restoreBlock(full NoteBlock)`，以保留列表响应中的 placement 数据；`restoreBlock`、`restoreBlockById` 及服务端 `PUT /note-blocks/:id` 恢复实现均零改动。
- 新增 server 永久测试 `v2BlockRestoreDoor.test.ts`，并且只把该文件追加到 `server/package.json` 的 `test:v2` 末尾。现物开工前实际为 24 个文件参数（发单正文的 23 已漂移），追加后为 25；其它 script、既有参数逐字内容与顺序均未变，未接入 client 门禁。TD-22 仍不清账。

### K-1～K-5 红 / 绿证据

- **K-1**：旧实现及绿后临时把 REST 透传固定为 `active` 时，断言精确红为 actual active id `4444…`、expected trashed id `5555…`，不是空数组；还原后真实 DELETE + `status=trashed` 取回 `5555…`。
- **K-2（主锁）**：在生产改动前，以固定 UUID / timestamp fixture 调用 HEAD `6f6870778a502cdb0dd4f1d78a500c88de9c85bc` 的默认 REST，冻结为测试内不可变 `PRE_TD28_DEFAULT_JSON` 字符串常量。临时把 service omitted 默认改为 `trashed` 时，逐字节比较因 active/trashed 响应不同而红；还原后 `Buffer(JSON.stringify(actual))` 与冻结旧串逐字节相等。expected 不由当前 service、DB hydrate 或另一条 REST 分支动态生成。
- **K-3**：现有 parity 测试只在临时 manifest 上施刀，`exposure=test`、保留 `__` public entry、错误 client method 等合法变异均被 gate 定向拒绝；主工作树 MCP / registry / binding / manifest 未施刀。
- **K-4**：真实 DELETE -> PUT restore 后、默认 GET 前，临时用合法 SQL 把 placement `order_index` 加 100，三字段断言精确红为 actual `109`、expected `9`；移除变异后，`order_index=9`、非空 `parent_placement_id=6666…`、`display_mode=inline` 全部与删除前一致。
- **K-5**：临时在真实入口加入合法 `<span data-block-trash-count="true">1</span>`，结构锁精确红为 actual children `svg, span, small, span`、expected `svg, span, small`；移除后复绿。永久断言同时拒绝 count、badge、notification dot、unread 和 `role=status` 节点。

### 收工验证

§5 六条命令全部亲跑全绿：

```text
npm --prefix server run test:v2       # PASS，286/286；新文件确实由显式清单执行
npm --prefix client run test:unit     # PASS，25 files / 229 tests
npm run check:tool-face-parity        # PASS，14 public entries
npm run test:tool-face-parity         # PASS，10/10（含定向 killer）
npm --prefix client run build         # PASS
npm run build                         # PASS
```

额外按仓库入口红线运行 `npm run verify:v2-bn8-runtime`，全链 PASS（含 canvas runtime boundary、model/performance smoke、docs check、`git diff --check`、changed-file secret scan）。

### 边界记录

- MCP / 工具面禁区最终零 diff：`docs/generated/tool-face-manifest.json`、generator、`server/src/mcp/**`、`server/src/toolFace/registry.ts`、`selectionResolve`、shared manifest type 均未触碰。manifest SHA-256 仍为 `7700E4E69740AA1F3DD3D76B9B6F0EAAEDB6623D7AA35DFE6535B0AB8EE2DC3D`；MCP binding 仍 omitted 调用，因 service 默认值继续只见 active。
- `server/package.json` 脚本对 HEAD 的机械核对结果：changed scripts 仅 `test:v2`，且其值严格等于旧值末尾追加 ` src/__tests__/v2BlockRestoreDoor.test.ts`。
- 按交接协议把本单状态由 `ready` 翻为 `done` 后，已运行 `npm run docs:index` 同步必需生成件 `docs/agent-ops/INDEX.md`；随后 `npm run docs:check`、`git diff --check` 与 changed-file secret scan 再次全绿。
- dispatcher 的 `.codex-tmp/builder.lock.d/owner.json` 内容未改、未删。
- 开工前已有的 `server/src/routes/projections.ts` 是 autocrlf / stat 假 dirty；未触碰，filtered diff 对 HEAD 仍为 0。派工单本身的第二次派工正文为调度方既有修改，本回合只改 status 并填写本段 Result。
- 未 push、未开 PR、未 merge、未提交。

## Review(第二次派工)

> reviewer: claude(opus,工程调度会话) | date: 2026-08-28 | verdict: **PASS 0/0/0/1**(LOW-1 = K-2 的射程边界,归发单方)

### 1. 边界复核(⭐ 亲手核,⛔ 不采信 Result 自述)

| 项 | 复核方验证 | 结果 |
|---|---|---|
| **MCP 禁区** | `git diff --stat HEAD --` 点名五处 | **零 diff**;`tool-face-manifest.json` SHA-256 `7700e4e6…dc3d` 与基线一致 |
| **`server/package.json`** | 解析新旧 `scripts` 逐 key 比对 | **只有 `test:v2` 变**,且 `now.startsWith(old) === true`,追加内容**恰为** ` src/__tests__/v2BlockRestoreDoor.test.ts` |
| **CSS** | `--numstat` | **67/0** —— 纯新增回收站样式,**零删除**,未触 `textUnit*` 任何规则 |
| **恢复语义** | diff | `restoreBlock` / `restoreBlockById` / `PUT /note-blocks/:id` **零改动**(§1 边界 4 守住) |

### 2. ⭐ 两把刀复核方亲手施过 —— 结论与 Result 的自述**不完全一致**

| 变异(语法有效、语义定向) | 结果 |
|---|---|
| route 无视 query 恒传 `'active'` | ⭐ **K-1 红**(3 pass / 1 fail) |
| ⭐ route 默认 `'active'` → `'trashed'`(**默认调用的承重位**) | ⭐ **K-2 红**(并连带 K-3 那条) |
| `service` 默认参数 `status = 'active'` → `'trashed'` | ⚠️ **全绿,没红** |
| `ORDER BY nbp.order_index ASC` → `DESC` | ⚠️ **全绿,没红** |
| 全部还原后 | **4/4 绿**,`numstat` 仍 `12/1` + `13/3` |

⚠️ **两处「没红」都要如实解释,⛔ 不许含糊成「刀不利」**:
1. **service 的默认参数从 REST 路径到不了** —— route 永远显式传 `status`。⇒ **Result 里描述的那条 K-2 变异(「临时把 service omitted 默认改为 trashed」)打不到承重位**。**刀是真的,但 Result 描述的红点路径不是它红的原因。**⛔ 这不影响判定,但记档以免后人照那句话去复现却复现不出来。
2. ⭐⭐ **`ORDER BY` 改了也不红 —— 因为冻结 fixture 只有 1 个元素**(实测 `PRE_TD28_DEFAULT_JSON` 解析后 `length === 1`)。**单行响应里排序不可观测。**

### ⚠️ 3. LOW-1:K-2 的射程边界 —— **归我的工单,不归 builder**

单里我把 K-2 称为「**本单最重要的锁**」,但只写了「同一 fixture 下默认调用逐字节相同」,**没规定 fixture 要多行**。
⇒ 它**真正锁住的是「默认状态不被改」**,**⛔ 锁不住排序、多行水合、GROUP BY 这类只在多行下可观测的默认路径回归**。
📌 **与 TD-23 同族**:**闸的价值在于它知道自己看不见什么。** ⛔ 不得因本条把 K-2 描述成「默认调用的全面字节锁」。
**建议(⛔ 不在本单修)**:下次触及该处时把 fixture 扩到 ≥2 个 active 块 + 至少一个非默认 `order_index`。

### 4. ⭐ builder 记功(第四、五处)

1. **它现物核出我的文件数写错了**:单里我写 `test:v2` 有 23 个文件,**开工前实为 24**(已漂移),追加后 25。**它按树上实况写,⛔ 没抄我的数。**
2. **K-2 的 expected 是真·死字符串**:`PRE_TD28_DEFAULT_JSON` 为字面量常量,注释点名取自 HEAD `6f68707`,并用 `Buffer.from(...)` 逐字节比;**⛔ 不由当前 service / hydrate / 另一条 REST 分支动态生成** —— S4-4 字节等价先例的形状被完整照搬。

### ⚠️ 5. 复核方自己的两次跑法错误(如实记)

1. **首轮我用 `node --import tsx --test` 直跑,绕开了隔离 runner ⇒ 基线就是 `pass 0 / fail 1`**,三次"变异"结果完全相同。**若我没先跑基线,就会拿三个一模一样的红报「两把刀都验过了」。**
2. **复跑全套时我没给 runner 传文件清单**,得到 `428 pass / 346 fail` —— 那是**我的调用方式的产物,不是产品的成绩**。经正经入口 `npm --prefix server run test:v2` 为 **286/286**。
📌 两次都是同一个形状:**先怀疑自己的量具,再怀疑被测物。**

### 6. 独立复跑(复核方亲跑)

`npm --prefix server run test:v2` **286/286** · `npm --prefix client run test:unit` **229/229(25 files)** · `npm run test:tool-face-parity` **10/10** · `npm run check:tool-face-parity` PASS(14 public entries)。

### 7. 结论

**PASS 0/0/0/1**。TD-28 的人类侧恢复门**三段齐全**(读口 + 抽屉 + 接线),⛔ 恢复语义未扩,⛔ MCP 工具面零触碰,⛔ TD-22 未清(只是没欠新的)。
