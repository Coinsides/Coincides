> **from**: claude(HQ Fable 会话)
> **to**: 临时工程对话1(Claude Opus 5.5 builder;codex 封存期代班)
> **status**: done(builder 实现+HQ 实质验收收口 2026-11-01;新工人开工测试通过——见尾部 HQ 收口节)
> **单号**: VPS-P0 · DeepSeek 供给线接骨单
> **上游**: 台账 §219(VPS 改动清单收讫)/§216(复工建制);清单原文为 10-31 快照,本单为 HQ 11-01 普查后的现物版,**以本单与现物为准**

# VPS-P0 · DeepSeek 供给线接骨单(新工人开工测试)

## 〇 · 背景一句话

部署目标 = 雨云香港三区(Claude/OpenAI 不服务该区),Agent 聊天供给方拍定 DeepSeek。外部事实(10-31 官方核实):`deepseek-chat` 已于 2026-07-24 停用,现役 `deepseek-flash`;新模型**默认开思考模式**,带工具的多轮对话要求回传 `reasoning_content`,否则第二轮 400。这两处不改,应用上岛即废。

## 一 · 修一:DeepSeek 思考模式适配

- **病灶**:OpenAI 兼容适配器 `server/src/agent/providers/openai.ts`(请求体构建约 :73-82)不处理思考模式——既不回传 `reasoning_content`,也没关思考,带工具第二轮必 400。
- **修法(最小,已拍)**:对 **deepseek 供给方**的请求体加 `thinking: { type: "disabled" }`。⛔发给 openai / dashscope 等其他兼容方(未知参数有拒单风险)。
- **机制荐案**:适配器现只认 `apiKey/model/baseUrl`,不知供给方身份。荐 = `ProviderConfig`(types.ts)增供给方标识字段,`providers/index.ts:14` 实例化时传入,适配器按标识门控。若改选 baseUrl / 模型名推断,回执申报理由。
- **测试**:mock fetch 断言——deepseek 配置下请求体含 `thinking:{type:"disabled"}`(阳性),openai 配置下不含(阴性),两向都要。

## 二 · 修二:默认模型名五处换新

- **病灶**:默认/示例模型名 `deepseek-chat` 已停用。
- **现物五处(HQ 11-01 全仓普查;清单原文只列三处,勿照原清单)**:
  1. `server/src/agent/providers/index.ts:37`
  2. `server/src/services/providerCredentials.ts:183`
  3. `server/src/agent/providers/index.test.ts:56`
  4. `server/src/__tests__/providerCredentials.test.ts:146`
  5. `client/src/pages/Settings/Settings.tsx:24`
- 全部改 `deepseek-flash`;收工前重跑同口径全仓 grep(含 .tsx)自证零残留,数字进回执。

## 三 · 验收与测试面

- **服务端定向**:涉改测试文件+同目录邻接,**必须走正门 `node scripts/run-server-test-suite.mjs <文件…>`**(服务端是 node:test 家族,⛔ vitest 跑服务端文件——10-11 单有前车之鉴);
- **client 定向**:Settings 涉改面 vitest 定向;
- **⛔真实模型调用**:真实验收(发一条触发工具的消息)归部署日冒烟,不在本单射程;
- ⛔全库马拉松(段收口归 HQ)。

## 四 · 纪律(照抄现役,射程带定义)

- ⛔一切 git 写操作——**交工作树,commit 归 HQ**;既存未跟踪文件(docs/audits 历史件、根 package-lock.json、.claude/settings.local.json)原样保留;
- ⛔读 `.env` 的 key **值**(文件名/变量名可引用);
- ⛔真实模型调用;⛔用户库接触;
- builder **新造**的**凭据形**合成值(口令/key/token/凭据用途的用户名邮箱)≤20 字符——立法目的=避开 24 字符凭据扫描阈;域数据字符串(标题/书名等产品字段)不在射程,长度边界用例照跑;
- ⛔新设计安全对抗类用例;既有功能回归(含凭据设置 UI 测试,全 mock 合成值)例行整跑明文允许,全库零排除;
- 措辞中性。

## 五 · 新工人开工测试义务(本单特有)

本单兼任 Claude-session builder 的首单环境验证:施工中遇**任何环境异常**(路径/编码/测试运行器/依赖/权限/与工单假设不符)⛔静默绕过,回执「环境申报」小节逐条记录——异常本身就是本单要采的货。

## 六 · 回执协议

- 完工后在**本文件尾部**追加 `## Result — <日期> · 临时工程对话1`:执行状态(status 翻牌自报)/写点(逐文件)/测试数字(**实跑实报,⛔把未执行写成绿**)/未做清单/环境申报;
- 证据落 `docs/audits/2026-11-01-vps-p0-builder/`;
- ⛔跨会话消息(信使通道不可靠)——回执只落本文件,HQ 自取。

## 七 · 不在射程

P1 百炼接线(另单)/ P2 / P3 / 文案类;产品行为设计变更;依赖与锁文件;一切 Source/imprint 数据。

## Result — 2026-11-01 · 临时工程对话1

**执行状态**:`done`(自报;两处修全部落工作树,未 commit,候 HQ 验收)

### 写点(逐文件)

| 文件 | 改动 |
|---|---|
| `server/src/agent/providers/types.ts` | `ProviderConfig` 增可选 `providerName?: string`(采荐案:供给方标识字段) |
| `server/src/agent/providers/index.ts` | `createProvider` 对 OpenAI 兼容族实例化时传 `{ ...config, providerName }`;:37 默认模型 `deepseek-chat`→`deepseek-flash` |
| `server/src/agent/providers/openai.ts` | 构造器收 `providerName`;请求体在 tools 之后、仅当 `providerName === 'deepseek'` 时加 `thinking: { type: 'disabled' }` |
| `server/src/agent/providers/index.test.ts` | :56 期望模型换新;新增 2 条用例(阳性:deepseek 经 `createProvider` 带/不带工具两次请求均含 `thinking:{type:'disabled'}`;阴性:openai / generic / dashscope 经 `createProvider` + 直接 `new OpenAIProvider` 共 4 次请求均无 `thinking` 键) |
| `server/src/services/providerCredentials.ts` | :183 默认模型换新 |
| `server/src/__tests__/providerCredentials.test.ts` | :146 期望模型换新 |
| `client/src/pages/Settings/Settings.tsx` | :24 默认模型换新 |

门控走显式标识,未用 baseUrl/模型名推断。

### 测试数字(实跑实报)

- **服务端定向**(正门 `node ../scripts/run-server-test-suite.mjs`,cwd=`server/`):`src/agent/providers/index.test.ts` + `src/__tests__/providerCredentials.test.ts` → **56 pass / 0 fail / 0 cancelled / flaky-retries 0**,exit 0。证据 `docs/audits/2026-11-01-vps-p0-builder/server-targeted.tap`。
- **阳性对照**(验证阳性用例确能抓病):临时把门控条件改成不可能值后跑 `index.test.ts` → **50 pass / 1 fail**(失败者正是 `deepseek requests disable thinking mode…`),exit 1;随后已还原,还原后即上一条 56/56 的同一代码。证据 `positive-control-fix-removed.tap`。
- **client 定向**:`npx vitest run src/pages/Settings/` → **3 files / 8 tests pass**,exit 0。证据 `client-settings-vitest.log`。
- **残留 grep**:`git grep -n deepseek-chat -- server client` → **0 处**。工作树全量 grep(.ts/.tsx/.js/.mjs/.json,排除 node_modules)仍有 3 处,全部在 `docs/audits/` 历史件(2 个 09-11 构建产物 bundle、1 个 09-13 测试快照),属历史冻结层,未改。
- **类型检查(附加,非工单要求)**:`server/` `npx tsc --noEmit -p .` → exit 2,**87 条 error TS,涉改 7 文件零命中**;报错分布在 `v13*/v14*` 测试与 `agent/attentionContext.ts`、`agent/claimObservation.ts` 等未触文件。因 ⛔git 写操作无法 stash 取基线,"既存"判断依据=零触及,未做前后对照。证据 `server-tsc.log`。

### 未做清单

- 真实模型调用 / 部署日冒烟(不在射程)。
- `providerCredentials.ts` 的 test-connection 路径:它自行发请求、不经 `OpenAIProvider`,因此**不带** `thinking` 字段。该路径单轮无工具,不触发 reasoning_content 回传 400,按最小修法未动;若 HQ 要求连接测试与聊天请求形状一致,需另拍。
- 全库测试马拉松(归 HQ 段收口)。
- docs 层(.md)中可能出现的 `deepseek-chat` 字样未普查(工单射程为代码五处)。

### 环境申报

1. **角色与家规冲突(记录,未据此停线)**:根 `CLAUDE.md §2` 写 Claude「不抢 Codex 的长周期多文件实现」,记忆中另有「动代码永远 Codex」口径;本单由 HQ 跨会话消息派发,称 Henry 11-01 亲点本会话为 codex 封存期 builder。本会话未见 Henry 直接作答,授权链仅凭工单状态头与 HQ 转述;改动面为 7 文件小修、不涉权限/指令文件,故照单施工,供 HQ/Henry 复核。
2. **派单通道**:工单正文 ⛔跨会话消息,但开工令本身经跨会话消息送达——回执按工单只落本文件,未回发消息。
3. **测试运行器 cwd**:正门脚本需在 `server/` 下以 `node ../scripts/run-server-test-suite.mjs` 调用(对齐 `server/package.json` 既有脚本),工单写法 `node scripts/run-server-test-suite.mjs` 是 repo 根视角,路径口径不一。
4. **claude-log 断档**:`CLAUDE.md §5` 要求每段工作追加 `claude-log/<今日>.md`,但该目录最新为 `2026-09-09.md`,近期台账已迁往别处(commit 信息里的 ledger §219)。本会话未新建 11-01 日志,以免与 HQ 台账分叉;如需补记请 HQ 指示位置。
5. **既有 tsc 红**:见上「类型检查」,87 条与本单无关的类型错误,运行时测试不受影响(tsx 不做类型检查)。
6. 既存未跟踪文件原样保留;未读 `.env`;未做任何 git 写操作。

## HQ 收口 — 2026-11-01 · Fable

- **实质验收**:diff 逐行与回执吻合(7 产品/测试文件,75 插入 6 删除);门控采荐案(ProviderConfig.providerName 显式标识,未用推断);HQ 亲手复跑——服务端定向正门 **56/56 pass,0 fail,0 flaky**;client Settings 定向 **8/8 pass**;`git grep deepseek-chat -- server client` 零残留。builder 自带的阳性对照(把门控改成不可能值→正确用例独红 50/1→还原复绿)是教科书做法,照单全收。
- **环境申报五条处置**:①授权链疑点——成立且该问:授权 = Henry 本会话 11-01 两次直接作答(「你指挥临时工程对话1」+「按你说的来」),CLAUDE.md §2「动代码归 Codex」在 codex 订阅封存期由 Henry 亲令改派(台账 §216/§220 在案),授权链完整,builder 存疑不停线的处置正确;②派单经跨会话消息、回执只落文件——正是设计如此(宿主级通道可靠,agent 信使不可靠);③正门脚本 cwd 口径(server/ 下 `node ../scripts/…`)——采纳,后续工单照此写;④claude-log「断档」——误会:台账是滚动单文件 `claude-log/2026-09-09.md`(§219/§220 都在其中),builder 不必另建,维护归 HQ;⑤既有 tsc 红 87 条——零触及论证成立(本单只增可选字段,不可能外溢类型错),入 TD-42 备查。
- **留疤待查(非本单缺陷)**:providerCredentials 的 test-connection 自行发请求不经 OpenAIProvider,不带 thinking 字段——单轮无工具不触发 400,暂无害;P1 接线若动该文件顺手对齐。
- **新工人开工测试判词**:回执五件套齐全、测试实跑实报、申报有骨头(敢质疑授权链)——**合格,转正**。后续单沿用本单协议(宿主消息派单/回执落工单文件/HQ 自取)。
