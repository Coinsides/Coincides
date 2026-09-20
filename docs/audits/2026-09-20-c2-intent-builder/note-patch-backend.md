> **状态 (Status)**: evidence
> **日期 (Updated)**: 2026-09-20
> **范围**: C2 note_patch 服务端现物与定向证据；不是 HQ 放行结论

# note_patch 后端蒸馏证据

## 现物考古

- `.codegraph/` 存在；本子代理 `Get-Command codegraph` 无结果，可用工具目录无 CodeGraph，`rg` 亦不在 PATH，故降级 PowerShell 原生只读搜索。
- A3a 的 `create_proposal` 信道将提案持久化为 pending 并记录 `proposal_issued`；旧 `/proposals/:id/apply` 全案执行后标记 applied，不可直接承接部分采纳。
- `atomicTextSave.ts` 在同一 SQLite 事务内检查 `text_save_revision`，经 `noteBlockContent.ts` 条件 UPDATE 再执行 CAS；正文、批注与板文本引用一起保存。
- 撤销栈在客户端 `useTextFlowHistory`。仅调用服务端 text-save 或客户端底层 saveBlock 不会凭空产生撤销记录；前端须先走现役 edit/history 入口。此单未造后端撤销栈。
- 客户端 `textFlowService.readTextFlowContent` 的有效版本是字符串 `TextBlockContentV1`；数字 `1` 在旧 text-save 门测试中可存但不能由当前编辑器解析。新提案只定位现役有效 unit。

## 接口与状态

- `shared/types/notePatch.ts`：Agent 输入 `{note_id,patches:[{block_id,unit_id?,new_text}]}`。1–64 patch，每个 new_text ≤65536 UTF-16 code units；多 unit 块必须显式 unit_id；同块不同 unit 可分别提案与采纳，同一个 unit 不重复。
- `server/src/services/notePatchProposals.ts:45`：创建时解析实际 unit，冻结 old_text、base_revision、全块内容 hash。创建仅写提案与信道事件，不写笔记。
- `server/src/services/notePatchProposals.ts:71`：列表/详情读时派生 stale，零读时落盘；靶块失活、丢失或版本/内容变动均不可采纳。
- `server/src/routes/proposals.ts:126`：`POST /proposals/:id/patches/:patchIndex/discard` 逐条弃；全案 discard 仅丢弃剩余 patch。尚有 pending 则提案仍 pending；全部处理后有采纳则 applied，否则 discarded。
- `server/src/services/atomicTextSave.ts:22`：既有人门可携 `proposal_patch:{proposal_id,patch_index}`。`prepareNotePatchAcceptance` 验证冻结靶、当前 CAS 与新 body 仅等于该 unit 的已预览替换，正文保存及 patch 状态同事务；range 保存晚失败会一起回滚。
- 同提案同块其他未决 unit 在此次成功保存中更新到已知新 revision/hash；其他提案以及人后改不获豁免。
- `replacementContent` 按既有编辑 delta 计算 retained prefix/suffix，并重基/退化 inline 锚；不改变 unit 身份、块结构或 TextFlow schema。服务端使用既有 server grapheme 实现，零 client/shared 运行时导入。
- 全案 `/apply` 对 note_patch 返回 409，要求逐 patch 人门保存；generic PUT 不允许覆盖冻结提案数据。撤销/重做继续 text-save 且不重送 proposal_patch，保留提案已采纳事实。

## 验证

| 验证 | 结果 | 原始日志 |
|---|---:|---|
| 新 `v14NotePatch.test.ts`（初轮） | 7/7 PASS | `.codex-tmp/c2-intent/note-patch-test.log` |
| `v13AtomicTextSave.test.ts` + `v14ProposalUnification.test.ts` | 42/42 PASS | `.codex-tmp/c2-intent/note-patch-regression.log` |
| 最终 `v14NotePatch.test.ts` 9 项 + `v14AttentionContext.test.ts` 5 项 | 14/14 PASS | `.codex-tmp/c2-intent/attention-note-patch-final.log` |
| 最终 server `tsc --project tsconfig.json --noEmit --incremental false` | exit 0，零诊断 | `.codex-tmp/c2-intent/note-patch-final-typecheck.log` |

七项定向断言：发提案零正文写；部分采纳/余项弃/现役门撤销重做；同块两 unit 顺采；外来编辑失效；晚 range 失败全部回滚；inline 身份保留及偏移退化；HTTP diff/逐弃/全弃与人门路径。

首次邻接回归仅旧 A3a 八型枚举断言失败；按工单新增 note_patch 改为九型，保留旧八型成员并增加新 payload schema 分支断言，复跑全过。子代理 `tsc -b` 写 shared/dist 返回 EPERM；root 同命令后成功更新。后续子代理 server 无 emit typecheck 无 note_patch 诊断，唯一报告为并行新增 migration 082 的 TS4082，已交 root 修复。最终全库/门群数字以根代理汇总为准。

### 最终兼容复核与冻结（2026-09-20 09:26 UTC）

跨端一次性只读脚本实际导入客户端 `getTextFlowContent` → `replaceTextUnitText` → `contentForEditedTextFlowBlock` → `plainTextForBlockContent`，将所产 candidate 交给服务端真实 `prepareNotePatchAcceptance`（只读模拟数据查询）。paragraph、heading_2、多 active unit、inline 前缀保留/替换段退化/后缀平移全部匹配。该检查发现非目标 draft/deprecated unit 的正文投影差异：客户端只排除 deleted，服务端原先只保留 active；最终修正服务端正文投影为 `status !== 'deleted'`，目标 unit 可编辑规则不变，并加入两个回归用例，确认兄弟 unit 的身份、状态、正文都保留。

新增 HTTP 五项断言覆盖：选区经真实路由抵达 scripted provider，live/history 答卡锚一致；16000 字符预算与丢失声明；过期页上的普通提问可继续；计划丢弃零执行与 note 放行信道收据；跨轮后放行旧计划的工具配对仍在 provider history。独立复核曾指出后两项中的旧工具配对与过期页错误问题，root 已修复，五项最终全过。测试自身的 AddressInfo 闭包收窄和 SQLite 查询结果类型已补齐；最终 server 无 emit typecheck exit 0。

未执行：git 写、commit、真实模型、用户数据库、新依赖、新安全对抗用例；未改 C1 七动词、TextFlow schema、坐标契约或 Agent 写笔记权限。
