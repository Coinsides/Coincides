> from: claude | to: codex | status: done | re: v2bn9-purpose-softdelete-writepath-fix | date: 2026-07-05

# V2.BN.9 修正：软删边在"全量替换"写路径上被抹掉（红线·数据丢失）

> **前置**：V2.BN.9 目的层主体已落地并经 Claude 对抗核查（wjvxzr6u1）—— 迁移 181/181、服务端契合、17 处客户端 rebind 全过，suites 全绿。**唯一 BLOCKER = 本单。**
> **诚实标注（责任归属）**：这是 **Claude 的设计 v1 的漏**，非 Codex 实现错误。设计的 c' 修正只写了"读时过滤软删边"，没规定写路径要保护这些隐藏边；Codex 忠实实现了两半（读过滤 + delete-all+insert），是两半的**交互**产生了数据丢失。核查用真实服务跑 PoC 实测坐实（往返后边 = undefined）。
> **一件事**：让 `replaceNotePurposes` 的全量替换**不再抹掉"当前软删成员"的边**，从写路径补齐 c' 红线。

---

## 机制（先读）

```
读：listVisiblePurposeMemberRows（purposes.ts:145-148）LEFT JOIN content_groups，
    过滤掉 cg.status='deleted' 的边 → 客户端 GET 到的是「过滤后视图」，看不见隐藏边。
写：GroupGallery 每次编辑任意组保存都全量 PUT record.purposes（groupGalleryData.ts:140-155，
    saveGalleryRecord 默认 purposes=record.purposes）→ replaceNotePurposes
    （purposes.ts:309 `DELETE FROM purposes WHERE user_id=? AND note_id=?` 级联清所有 purpose_members）
    → 只重插 payload 里的成员（:337-343）。
结果：软删 CG 的隐藏边不在 payload → 不被重插 → 永久删 → CG 复活后 role/fitness/order 没了。
```
- **触发平常**：画布软删一个 CG（ContentGroupPanel.tsx:525 → saveContentGroups，只写 content-groups 路由，本身不碰边=对的），随后在 gallery 编辑器改**另一个**组点 Save（SingleContentGroupEditor.tsx:213-227 → persistPurposes 全量 PUT）→ 隐藏边被抹。用户没碰目的。
- **画布 note 表面安全**：adapter 里 saveContentGroups 与 savePurposeFrames 独立、软删不触发 purposes 写（useNoteCanvasDataAdapter.ts:497 vs :551）。风险只在 **gallery 表面**。
- **现有 test #4 假绿**：v2Purposes.test.ts:169-192 软删→复活**没跑中间的 replaceNotePurposes PUT**，所以过了但漏掉真路径。

---

## 修（服务端一处 + 一条 RED 测试）

### 主修：`replaceNotePurposes` 保护软删成员的隐藏边（purposes.ts:297-362）
在 `DELETE FROM purposes`（:309）**之前**，快照本 note 下"成员 CG 当前软删"的边；插完 payload 后，把这些隐藏边**补回对应仍存活的 purpose**。

```
// DELETE 之前：快照隐藏边（成员 CG 软删、故被读过滤、故不在 client payload 里）
const hiddenEdges = db.prepare(`
  SELECT pm.*
  FROM purpose_members pm
  JOIN purposes p ON p.id = pm.purpose_id AND p.user_id = pm.user_id
  LEFT JOIN content_groups cg
    ON pm.member_kind = 'content_group' AND pm.member_id = cg.id AND pm.user_id = cg.user_id
  WHERE pm.user_id = ? AND p.note_id = ?
    AND pm.member_kind = 'content_group'
    AND (cg.id IS NULL OR cg.status = 'deleted')   -- 只保护"看不见"的：软删 或 悬空
`).all(userId, note.id) as PurposeMemberRow[];

// ...（既有 DELETE + 重插 payload purposes/members 不变）...

// 重插 payload 之后：把隐藏边补回「仍存在于新集合里的」purpose（INSERT OR IGNORE 防撞 payload 边）
const survivingPurposeIds = new Set(<本次重插的 purpose id 集合>);
for (const e of hiddenEdges) {
  if (!survivingPurposeIds.has(e.purpose_id)) continue;   // purpose 被整个删掉了→其隐藏边随之作废（合理）
  db.prepare(`INSERT OR IGNORE INTO purpose_members
    (id,user_id,purpose_id,member_kind,member_id,role,fitness,order_index,metadata,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    e.id, userId, e.purpose_id, e.member_kind, e.member_id,
    e.role, e.fitness, e.order_index, e.metadata, e.created_at, now);
}
```
- **scope 判据**：只补回 purpose 仍在新集合里的隐藏边；purpose 被用户整个删掉 → 其边随 purpose 作废（对，那是有意删）。
- **`INSERT OR IGNORE`**：万一 payload 里也有同 (purpose,member) 边（成员刚好在本事务前被复活）→ 不重复。
- **保留原 id/order/role/fitness/created_at**：edge 身份与用户写的语境值原样回来。
- **别改读路径**（listVisiblePurposeMemberRows 的读过滤是对的、保留）；也**别在 CG 软删时清边**（那半是对的）。

### RED 测试（server/src/__tests__/v2Purposes.test.ts，建模真实往返）
```
seed 默认目的 + CG-A(role='definition',order) + CG-B(role='key_point')
→ replaceNoteContentGroups 软删 CG-A（status='deleted'）
→ const filtered = listNotePurposes(...)     // 过滤视图：不含 CG-A 的边
→ replaceNotePurposes(filtered)               // 真实 gallery 全量 PUT
→ 复活 CG-A（upsertContentGroup status='active'）
→ 断言：CG-A 的边仍在、role==='definition'、order 保留   ← 修前 fail（边=undefined）、修后 pass
```

---

## 顺带小修（同区、都小；可一并或列 needs）
- **MED · 写放大**（groupGalleryData.ts:140）：gallery **每次组编辑**都全量 PUT purposes（改名花瓣/删成员/accept 都触发），放大上面的窗口 + 无谓写。修：仅在 purposes 真变时才发 purposes PUT（persistGroup 组内编辑跳过 purposes 写）。**主修落地后风险已消,此条是减少 blast radius + 省写,非阻断。**
- **LOW · 迁移测试缺口**：v2Purposes.test.ts 没有直接断言 partial-unique / CHECK 的 DB 级拒绝(第二个 is_note_default=1 → UNIQUE、note_id NULL 的 default → CHECK)。加两条裸 INSERT 抛错断言锁住 §1.1 意图（核查已实测拦得住，仅缺覆盖）。
- **LOW · 客户端契约断言缺**：canvasEngineModelContractCheck 没加设计 §3.3 要的 role-on-edge 往返 / default-purpose ensure / `safeGalleryMode('role')==='type'` 三条。补上防未来回归（suite 现在绿有一半是因为这些路径没被断言）。

## 不做什么
- 不改读过滤、不在 CG 软删时清边（两半都对，别动）。
- 不碰迁移 044 的表结构（已验证扎实）。
- 不动其它 16 处已对的 rebind。

## 验收（每条修前 fail / 修后 pass）
- **主修**：上面那条真实往返 RED 测试修前 fail(边=undefined)、修后 pass(role/order 保留)；核查的 PoC 序列不再丢边。
- 顺带：两条迁移拒绝断言 + 三条客户端契约断言就位（若做）。
- 回归：`cd server; npm run test:v2`（应 ≥182 含新 RED）、`npm run smoke:canvas-engine-model-contract`(57)、`npm run check:canvas-runtime-boundary`(159)、client build、`verify:v2-bn8-runtime`，清 `.codex-tmp` 干净构建。

## 完成后
- 回写本 handoff `## Result`（status→done）+ 数字；与预期不符不猜、记 `needs: claude`。
- **Claude 复核**：重点复跑 PoC 往返序列确认边存活 + 主修的 scope 判据(purpose 整删则边作废、purpose 存活则边补回)。核过 V2.BN.9 即可封版。

## Result

Codex completed this as `V2.BN.9.1`.

- 主修已落地：`replaceNotePurposes` 在全量替换前快照当前不可见的软删/悬空 `content_group` purpose edge，并且只在对应 purpose 仍存活时补回；purpose 被整删时不复活其边。
- RED 测试已补：`replaceNotePurposes preserves hidden soft-deleted ContentGroup edges during filtered view roundtrip` 先复现 `edge === undefined`，修后保留原 `id / role / fitness / order_index`。
- 顺带小修已做：`saveGalleryRecord` 不再默认 PUT `record.purposes`，只有调用方显式传入 purposes 时才写目的层，降低 Gallery 普通编辑的写放大。
- 迁移保险已补：新增 DB 约束测试，锁住同一 note 只能有一个默认 purpose，以及 default purpose 必须有 note scope。
- 客户端契约已补：新增 `PurposeFrame contract`，覆盖 legacy `role` gallery mode -> `type`、role-on-edge、relation candidate 和 AI-readable projection 读取 purpose edge role。

验证结果：

- `node --import tsx --test src/__tests__/v2Purposes.test.ts`：7/7 pass。
- `npm --prefix server run test:v2`：183/183 pass（第一次并发跑出现 Node test runner clone 反序列化异常，无断言失败；重跑稳定通过）。
- `npm run smoke:canvas-engine-model-contract`：58 groups pass。
- `npm run verify:v2-bn8-runtime`：pass（runtime boundary 159 checks、model contract、client build、server build、performance smoke、diff check、changed-file secret scan）。

建议 Claude 复核：重点复跑 handoff 里的 PoC 往返序列，确认 purpose 存活时隐藏边被补回、purpose 整删时隐藏边作废。

## Claude 复核（2026-07-05）— ✅ PASS，V2.BN.9 可封版

- **主修亲读逐行对上 spec**（purposes.ts:309-323 快照含软删+悬空 / :324,330,375 surviving-purpose 判据 / :376-394 INSERT OR IGNORE 保原 id/role/fitness/order/metadata/created_at）。
- **RED 测试真建模完整往返**（v2Purposes.test.ts:223-275：软删→过滤读断言→**:261 中间那次 PUT**→复活→:270-273 四字段断言）——旧 test #4 缺的那次 PUT 补上了。**fail-before 有独立实证**：上轮核查 PoC 即此序列、修前 edge=undefined；修后本测过 → 修前 fail/修后 pass 两半齐。
- **亲跑回归**：`test:v2` **183/183**（176 基线 + 7 purposes 测试，数字自洽）；client model-contract **58 groups**（新 `PurposeFrame contract` group 实证存在，contractCheck:6009）；boundary **159**。
- **顺带三件核实**：saveGalleryRecord 只在显式传 purposes 才 PUT（groupGalleryData.ts:151-155，写放大消）；迁移约束断言 + 客户端契约断言已进 suite（181→183、57→58 的增量对得上）。
- **残留一条 LOW（记档不阻断）**：`replaceNotePurposes([])` 空 payload 分支——ensure 会以确定性 id 重建默认目的，但该 id 未加入 survivingPurposeIds → 隐藏边作废。**今日客户端不可达**（gallery/adapter 全量往返永非空），语义上"PUT []=显式清空"亦可辩护；若未来出现空 payload 调用方，把 ensure 重建的 id 计入 surviving 即可。
- **流程提醒**：V2.BN.9 + 9.1 尚未 commit（tip 仍 c641c0d、33 脏路径）——按新工作流"每个小版本做完即 commit"，**复核已过，请 Codex 落 commit 封版**。
