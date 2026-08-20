> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: ready | re: v2bn12-05 | date: 2026-08-20

# V2.BN.12 工单 05:SlashSession 事务(RC-D)+ 两笔测试债顺手清偿

## 背景

工单 01 判定 RC-D:slash query 先成为正文真值,cancel/failure 无 transaction rollback(症状 3)。修复蓝本=工单 01 ## Result §4.5;现状细节 §3 RC-D(file:line);RED 形状 §5.3。工单 02 已抽出 `slashCommandReducer` pure transition 层(exit policy 在内),03 链已建 focus receipt 三元组——本单是它们的合拢。

## 交付物

### D1 — SlashSession 事务

- 引入 SlashSession:记录 **owner 三元组(blockId,textFlowId,textUnitId)**、trigger range/original slice、caret 位置。
- **success commit**:writing-role/template 分支照旧 remove trigger(现行为保持)。
- **guarded rollback**:Escape/disabled/annotation-action/missing-template 各路径回滚 trigger 文本——**仅当 owner/range 仍匹配**(防删掉用户有意保留的 literal slash),回滚后恢复原 unit focus/caret。
- 事务状态走 pure transition 层(延续"抽逻辑不抽状态基座";`slashCommandReducer` 扩展,hook 原生 setState 委托)。
- 边界:菜单导航(ArrowUp/Down/Enter)工单 01 已验正常,**不重做**;不碰 03 链已定面。

### D2 — 测试

- 工单 01 §5.3 RED 落地:成功 Enter 保持绿;Escape/disabled/missing 断言 guarded rollback + 同 unit/caret 恢复;owner/range 漂移时断言**不回滚**(guard 负控)。
- RED-first:先落测试红证,再接生产转绿,红绿收据都进回执。

### D3 — TD-5 清偿(顺手)

- 恢复收据正控矩阵补 right-crossing 精确行(raw v1/v2,原 `[96,636]` 形),与既有左界行构成**左右对称必备项**;并在测试文件注释里立规则:crossing 测左必测右。

### D4 — TD-3 门接线(顺手,逐脚本裁快慢)

- 六条门外脚本逐一实测耗时后分层:快(<~10s)→并入 `verify:v2-bn8-runtime` 链;慢→并入一条新的并列强制门(repo 根一条命令);`docs:check` 一并接线。回执附每脚本耗时与分层理由。清偿后更新 tech-debt.md 的 TD-3/TD-5 行(带回执链接)。

## 边界

不碰跨 block Backspace(悬置待 Henry)/浏览器 E2E/placement stacking/schema/migration;RED #1 已绿的断言与 03 链保护面不动。

## 验证与回执

全套门(unit 112+新增/server 262/verify 链含新接线/双 tsc/migration 5 项)。## Result 追加进本文件:D1-D4 落实+收据、RED-first 红绿证、每脚本耗时表、顺手修与未做申报。不自评 PASS,不 commit。复核重点预告:rollback guard 的负控(owner 漂移不回滚)、literal slash 保留、门接线后 verify 链总耗时。
