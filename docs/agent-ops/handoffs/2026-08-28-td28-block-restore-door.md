> **状态 (Status)**: ready
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
- 新建测试文件

⛔ **禁区**:`server/src/mcp/**`、工具注册表、`scripts/generate-tool-face-manifest.ts`、`docs/generated/tool-face-manifest.json`、`server/src/services/selectionResolve.ts`。

## 3. ⭐ 必红判据(每条都要先红后绿;⛔ 红不出来就停下上报)

| # | 断言 | 现码为何必红 |
|---|---|---|
| **K-1** | 造一个 note + 两个块,trash 其一;`GET /notes/:id/blocks?status=trashed` **返回那个被删的块** | 现码硬过滤 `status='active'` ⇒ **返回空** |
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
npm run test:v2
npm --prefix client run test
npm run check:tool-face-parity
npm run test:tool-face-parity
npm --prefix client run build
npm run build
```
全绿才算完;⛔ 不许跳过、⛔ 不许 `--no-verify`。

## Result

**(builder 填)**
