> **状态 (Status)**: ready(HQ 按代理权翻牌;上游=TD-15 权威签名裁定稿已转正照准(09-12 §十四),本单=纯机械收敛)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-20
> **单号**: V14 债务墙 · D3a ownership 机械收敛(TD-15/TD-16)
> **上游**: `current-state/tech-debt.md` TD-15(getOwned* 同名实现 14 份/13 文件;裁定稿已转正:收 db、返实体行、位序 (db, userId, xId)、增量止血)+TD-16(ESM 环剩余边:services/notes.ts 仍从 routes/notes.js import getOwnedCourse/getOwnedNote)。**裁定已拍,本单照裁定稿机械执行⛔重开设计。**

# D3a · ownership 机械收敛

**性质**:纯机械收敛,**行为零变**。裁定稿=唯一规格来源(builder 先考古裁定稿原文与 TD-15/16 台账条,申报出处)。

## 一 · TD-15 收敛

1. 全仓 `getOwned*` 同名实现普查(builder 复核台账「14 份/13 文件」现数——13.x 后可能又长);
2. 逐份收敛到权威签名:**收 db、返实体行、参数位序 (db, userId, xId)**;能共享者提为共享 helper(落点申报),不能者原地改签名;
3. 调用方随签名机械更新;**⛔任何行为变更**(错误语义/404 语义/事务边界原样);
4. 增量止血:新增 getOwned* 必须按裁定稿写——若现物有静态可查手段(lint/闸)则申报接线,无则在 tech-debt 条注明维持人审。

## 二 · TD-16 ESM 环清零

1. `services/notes.ts` ← `routes/notes.js` 的剩余两条 import 边拆除(getOwnedCourse/getOwnedNote 迁至 service 层或共享 helper,routes 反向消费);
2. 跨界闸(`check:server-shared-runtime-import` 等现役静态门)照跑;环清零申报(申报检测方法)。

## 三 · 验收与禁区

1. 定向:收敛前后行为等价(签名改动全清单+受影响调用点数;既有 ownership 相关测试全绿零改语义);client 全库+server 全量(**全量补集含 v13WildernessExecute,文件预算 ≥600s**);agent 族回归(收敛触及 executor 依赖的 service 时尤其);
2. **tech-debt.md 义务**:TD-15/16 条目按实际完成度更新(⛔自标已清——写实际状态,HQ 收口定清否);
3. 证据落 `docs/audits/2026-09-20-d3a-ownership-builder/`(蒸馏件:签名对照表+调用点清单),原始日志留 `.codex-tmp/d3a-ownership/`;
4. **禁区(全部带射程)**:⛔一切 git 写操作;只读 git 明文允许(含验证门内部);git 检查+secrets 两组件留 HQ,其余按「非 git/secrets N 组件」申报;⛔行为变更⛔新功能⛔新表新列;⛔碰 Relation/判断域/Agent 机关语义(纯签名收敛例外:executor 消费的 service 签名跟改属机械射程);⛔TextFlow 真相 schema;⛔坐标契约;⛔新依赖;⛔真实模型调用;⛔用户库;⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符。Result:签名对照表+收敛份数(前后)+环检测申报+逐件行号+测试数字+台账更新申报+未做项。冲突停线举证。
