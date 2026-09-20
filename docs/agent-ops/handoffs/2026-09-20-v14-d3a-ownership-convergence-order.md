> **状态 (Status)**: done(二轮施工;一轮停线=裁定稿 404 条款×行为零变互咬,补遗一裁 get/find 分家后续派;HQ 收口:client 227 文件 2319/2319+server test:v2 真全绿(IPC 双恢复,Python 系在 HQ 机全过)亲跑定案;双门绿;2026-09-20)
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

## Result

**2026-09-20 · Codex builder · STOPPED_CONFLICT（考古阶段停线，未完成施工，非 PASS）。** 遵照本单“冲突停线举证”与用户同轮指示，将冲突写入本节后停止。原 ready 头保留，未翻 done。

1. **裁定考古出处**：`docs/agent-ops/analysis/2026-09-13-ownership-signature-ruling-draft.md`，头为 **active（Henry 2026-09-13 整表拍照准）**，不能按文件名误判 draft。第 11–13 行规定收 db、返完整 owned 行、位序 `(db, userId, xId)`，且“查无=抛 404 明码”；第 18–19 行规定资源 service 住所与签名契约测试。台账 TD-15/16 原文在 `current-state/tech-debt.md:26–27`。
2. **冲突证据**：`server/src/services/courseMaterials.ts:263–265` 的 `getOwnedSourceMaterial` 查无返回 `undefined`；调用方 `:269–270` / `:406–407` 返回 null，`:345–346` 为 no-op；`server/src/services/materialMapProposals.ts:192–193` 以 Boolean 过滤缺失 ID。最后一条路径由 `server/src/routes/proposals.ts:149–152` 在事务内调用。直接统一抛 404 会将现有 null/no-op/filter 变为异常，并改变提案事务结果，与本单 §一.3、§三.4 的错误/404/行为零变要求冲突。**未自行设计异常适配、可选读取或豁免；需 HQ 明确适用边界。** 另登记 `skinSuites.ts:17–28` 的 hydrated 返回形状与“完整 owned 行”差异，未据此改码。
3. **现数及签名清单**：全仓自有 JS/TS 源 1376 文件；独立 AST 普查交叉核对为 **16 份实现 / 14 文件 / 9 个名称**；调用 **55 处 / 18 文件 = 49 生产 + 6 测试**。前后 **16→16 份、14→14 文件、55→55 调用**，实际收敛 **0 份**、修改调用点 **0**。完整签名对照及逐件行号、调用点清单见 [signatures-and-calls.md](../../audits/2026-09-20-d3a-ownership-builder/signatures-and-calls.md)。扫描排除依赖、生成物、临时及外部研究/工具副本，未把外部副本计为产品实现；射程与原始文件清单均已申报。CodeGraph 优先调用失败（CLI 不可用、无可用 MCP），rg 亦不可用，采用已安装 TypeScript AST，无新依赖。
4. **TD-16 环申报**：目标 import 边静态逐行检查，`services/notes.ts:3` → `routes/notes.js`（两个 ownership helper）与 `routes/notes.ts:26–34` → `services/notes.js` 均仍存在；service 消费点 `:61/:128/:149` 未动。**两模块 ESM 环未拆，不声称全图无环。**
5. **测试数字与验证门**：实际执行测试 **0**。runtime 门盘点为 25 顶层组件，本单口径为 **非 git/secrets 23 组件**；23 组件全部未跑，git 检查与 secrets 两组件留 HQ。client 静态盘点 227 测试文件；server 108 文件（主集 82 + 补集 26，含 `scripts/v13WildernessExecute.test.ts`），文件预算 ≥600s 的要求已记录；全库、agent 族、定向 ownership、跨界闸均因停线未执行。上述是范围盘点，不是测试通过数字。
6. **台账及未做项**：TD-15/16 未更新、未标已清；共享 helper 提取、签名与调用方机械更新、增量签名契约闸、ESM 拆边、全部验证均未做。产品代码与既有测试零改动。没有新功能/依赖/schema/用户库/凭据操作，没有新安全对抗用例，没有真实模型调用。
7. **交付位置**：蒸馏证据 [README.md](../../audits/2026-09-20-d3a-ownership-builder/README.md)；原始日志 `.codex-tmp/d3a-ownership/`，含裁定与冲突逐行原文、普查 JSON/定义/调用原文、独立复核、验证范围盘点及只读工作树记录。**未执行任何 git 写操作或 commit；工作树交 HQ。**


## 补遗一(2026-09-20 · HQ 裁定:404 契约 × 行为零变的分家解)

停线成立,合同缺陷在 HQ(裁定稿 404 条款与本单「行为零变」在 getOwnedSourceMaterial 现物上互咬——第四型变体,派前未对现物验证两义务可并立)。裁定即时生效:

1. **get/find 分家**:`getOwned*` 一律守裁定稿全款(收 db/返完整 owned 行/位序 (db,userId,xId)/**查无=抛 404 明码**);凡现调用依赖「查无=undefined/no-op/过滤」语义者,**改用显式 `findOwned*`**(同位序、返 `undefined`、⛔抛)——行为零变靠改名保全,⛔改任何调用点的语义与事务结果;
2. courseMaterials 的 getOwnedSourceMaterial 即按此分家:404 版供需要它的调用点(若现无则只建 find 版,get 版候真需求,申报选择);proposals 事务内的过滤路径必须走 find 版;
3. **skinSuites 返回 hydrated 形状者改名出 getOwned 命名空间**(如 loadOwnedSkinSuiteHydrated,申报),getOwned* 契约空间保持纯净;
4. **增量止血覆盖两族**:getOwned*=404 契约 / findOwned*=optional 契约,tech-debt 条注明;
5. 其余条款原字不动。一轮停线 Result 保留为档;续派恢复施工,完工后另起「## Result(二轮)」。


## Result(二轮)

**2026-09-20 · Codex builder · BUILT_VALIDATION_BLOCKED：收敛、TD-16指定环拆及两族增量闸已施工，验证未全绿，非最终PASS。** 一轮Result及补遗一保留；ready头未翻done。阻塞是现有Python/MinerU测试环境不可用，未越过新依赖/仓外写入边界修复。工作树交HQ。

1. **裁定出处与选择**：按active签名裁定稿第11–19行及本单补遗一；get统一收db、返完整owned行、位序(db,userId,xId)、查无原404。sourceMaterial现4消费者均依赖optional语义，因此仅建find版，不造无真实需求的get版；3内部null/no-op及1提案事务内过滤保持。SkinSuite用loadOwnedSkinSuiteHydrated保留原hydrate及错误业务码。
2. **前后与调用清单**：复用一轮16份/14文件/55调用AST清单，二轮全仓普查1381自有JS/TS文件，结果**7 get +1 find=8份/7文件，另1 hydrated，合计9份/8文件**。5 course→1、4 note→1，去重7份；13份原实现已提取/更新，3份原已合格原样。55→55调用（49生产+6既有测试，18文件），23处表达式改动（20生产+3测试），32处表达式保留。[16项签名对照+55调用逐件行号](../../audits/2026-09-20-d3a-ownership-builder/signatures-and-calls-round2.md)。
3. **施工行号**：courseOwnership.ts:19/getOwnedCourse，noteOwnership.ts:22/getOwnedNote，noteBlockOwnership.ts:22/getOwnedBlock；courseMaterials.ts:268/findOwnedSourceMaterial；items.ts:580/getOwnedContentGroup；skinSuites.ts:25/loadOwnedSkinSuiteHydrated。未改的合格读取为items.ts:236、paletteColors.ts:8、purposes.ts:72。均位于server/src/services。类型与合成库83迁移后PRAGMA逐列对照：8族无漏列（17/12/15/29/15/15/7/13）。独立源码复核证明连接、事务、错误语义和响应未变；新增字段没有经spread泄漏响应。
4. **增量止血**：scripts/check-owned-helper-contract.mjs扫描六源根1266文件，包含private实现、拒绝改名别名进入get/find；server/scripts/v14OwnershipContract.test.ts对动态发现的8个现物reader执行合成内存SQLite完整行/普通缺失契约，加4项机械检查，12/12通过。root/server package接线，runtime原25→27顶层组件；本单**非git/secrets 25组件全部通过**。实现形态约束为同步命名function、单条literal SELECT *、原行直返；复杂等价实现须扩测试器，不以人审代替现役闸。
5. **TD-16环检测**：TypeScript AST读取server/src+shared的运行时相对import/export及字面动态加载，排除type-only/测试/声明，再Tarjan SCC：335模块744边→338模块757边；notes route/service的SCC消失，service→route静态边1→0（该声明原携两个helper）。全图仍有既存sourceFileIntake↔sourceImprints SCC，前后不变，不属本单，不声称全图零环。现役跨界闸PASS；新ownership闸禁止helper模块反引routes。[环证据](../../audits/2026-09-20-d3a-ownership-builder/cycle-round2.md)。
6. **测试数字**：client全库227文件/2319项PASS；client/server build PASS；server全库提交109文件=82主集+27完整补集，含v13WildernessExecute及新契约，文件预算600000ms，concurrency4，零排除，首跑1095项记账=1092 pass/3 fail/0 skip/0 cancel/0 todo，自动重试0。agent族同全库全跑，失败清单无agent族，test:agent-knowledge另PASS。[25门逐项及全部补集](../../audits/2026-09-20-d3a-ownership-builder/verification-round2.md)。
7. **三项初失败处置**：①v2NotesLifecycle整段PUT源码锁被唯一授权参数变化触发；逆转该调用后完整60行与旧基线逐字节一致，故仅刷新期望SHA与授权注释，完整锁和全部行为断言保留，复跑**13/13 PASS**；首轮失败原日志未覆盖。②v2SourceMineruWiring.test.ts模块加载时硬调python.exe失败ENOENT，尚无可访问解释器；③v2SourceRegionCells测试固定仓外venv启动code101，且清除替换命令/覆盖解释器env，不能仅PATH/env替代；其uv base目录访问被拒绝，不能断言物理缺失。**后两项未解决，不豁免、不删测试、不以定向绿冒充全量绿。** HQ需恢复可访问Python及固定MinerU环境后复验；builder未安装新依赖、改仓外venv或绕过权限。
8. **台账与交付**：TD-15/16实况已更新（tech-debt.md:26–27），明确指定环已拆、两族止血和两项环境失败；不标已清，HQ收口定清否。docs索引与生成inventory随脚本更新。蒸馏证据[README-round2.md](../../audits/2026-09-20-d3a-ownership-builder/README-round2.md)；raw在.codex-tmp/d3a-ownership，含首次失败、复跑、退出码、完整清单/预算、AST前后、两份独立等价复核、row-shape及Python环境调查。
9. **未做项/边界**：两项Python/MinerU环境恢复和后续全量复验未完成；git diff --check与secrets两组件留HQ；未做主观验收/清债/放行。无功能/依赖/schema变更，无Relation/判断域/Agent机关语义、TextFlow真相或坐标契约变更，无用户库/真实模型/新安全对抗用例。**未执行任何git写操作或commit。**
