> **from**: claude(HQ Fable 会话)
> **to**: 临时工程对话1(Claude Opus 5.5 builder)
> **status**: done(builder 实现+HQ 实质验收收口 2026-11-01,Henry 口令 approve;见尾部 HQ 收口节)
> **单号**: VPS-P1 · 百炼向量接线单
> **上游**: 台账 §219/§221;TD-43(documents 停喂走廊,止血例外);P0 单协议沿用(宿主消息派单/回执落本文件/HQ 自取)

# VPS-P1 · 百炼向量接线单

## 〇 · 背景与目标

向量供给方从 Voyage 切百炼**北京**(Henry 拍定:人民币账单+大陆/香港可达;intl=国际站 key 不通用,错配 401)。**目标一句话:在只配了 dashscope key 的服务器上,文档分块+Agent 记忆的嵌入检索走百炼北京,整条跑通。**
⛔通用 OpenAI 兼容向量客户端(Henry 已拍只接百炼);Voyage 代码保留不拆(并存可选,旧机兼容)。
维度白送:vec 表 float[1024] = voyage 1024 = 百炼 v4 1024,**不动表结构**。

## 一 · 修一:embedding 工厂接入 dashscope

- `server/src/embedding/types.ts:8-12`:`EmbeddingConfig.provider` 联合加 `'dashscope'`;
- `server/src/validators/index.ts:201`:`embedding_provider` 枚举加 `'dashscope'`;
- `server/src/embedding/index.ts`:
  - `createProvider` 加 dashscope 分支——**复用现成客户端** `embedding/dashscope.ts`(为 imprint 写的,接口形状与 `EmbeddingProvider` 不同,做薄适配壳:name/dimensions=1024/maxBatchSize=10/`embed(texts, inputType)`);百炼兼容接口的 input_type/instruct 参数不强求,最小接通,取舍进回执;
  - env 兜底段(:32-35 一带)加 dashscope;荐顺位 = settings 指定者绝对优先;无指定时 voyage env 优先保持现状(旧机兼容),再查 dashscope env。改选别的顺位申报理由;
  - `getConfigFromSettings`:provider=dashscope 时默认模型 `text-embedding-v4`(⛔沿用 voyage-4 默认);
- `client/src/pages/Settings/Settings.tsx:28-39` 一带:嵌入提供方列表加 dashscope(展示名「阿里云百炼」,默认模型 text-embedding-v4)。

## 二 · 修二:百炼端点可配置,默认北京

- `server/src/embedding/dashscope.ts:3-4`:端点常量改可配置——荐 = 复用 settings 里 dashscope 供给方的 `base_url`(去 /v1 尾后拼 `/v1/embeddings`),无设置时**默认北京** `https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings`;若接线过深可降级为环境变量覆盖+默认北京,申报即可——**底线:部署日不改代码就能指北京**;
- 聊天侧 dashscope 默认 base 同步北京(**HQ 普查:intl 字面量全仓 5 处,勿照原清单 3 处**):
  1. `server/src/agent/providers/index.ts:40`
  2. `server/src/services/providerCredentials.ts:184`(CONNECTION_DEFAULTS)
  3. `server/src/embedding/dashscope.ts:4`
  4. `server/src/agent/providers/index.test.ts:57`(期望)
  5. `server/src/__tests__/providerCredentials.test.ts:147`(期望)
  北京聊天 base = `https://dashscope.aliyuncs.com/compatible-mode`;收工全仓 grep `dashscope-intl` 自证产品码+测试零残留(docs/audits 历史件不动);
- `dashscope.ts:102` 返回 model 严格相等校验:无 key 无法实测北京返回形状,荐改前缀宽松校验(`startsWith('text-embedding-v4')`),或保留严格但失败信息带诊断字段,二选一申报;
- **model_id 加地域**(Henry 已拍):`dashscope.ts:5-9` 的 `DASHSCOPE_EMBEDDING_MODEL_ID` 纳入地域段(荐从所配端点推导:intl 域名→`intl`,主站→`cn-beijing`,如 `dashscope:cn-beijing:text-embedding-v4:1024`);**侦察义务**:全仓 grep 该 model_id 的消费面(imprintEmbedding/检索/测试),确认改标签后**旧 110 条(旧标签)在检索路径上的行为**(预期=按标签被过滤、不可见,候部署日重嵌)——实际行为写进回执;⛔动 imprint 数据本身。

## 三 · 修三:向量请求超时

- `server/src/embedding/voyage.ts:40` 与 `server/src/embedding/dashscope.ts:166` 的 fetch 加超时(荐 `AbortSignal.timeout`,30s 常量命名);超时错误并入各自 network_error 族;
- 测试:mock 挂死/慢 fetch→超时触发且错误可辨(可用极小超时值,⛔真网络)。

## 四 · 修四:止血两行(TD-43 停喂走廊唯一许可触点)

- `server/src/services/documentParser.ts:376-383`:摘要失败⛔写字面量 `"Summary generation failed."`,写 NULL;
- 全仓 grep 该字面量的消费面(展示层/注入层若有判断逻辑,申报);
- ⛔documentParser 其他任何行(停喂裁定,Henry 11-01 亲拍)。

## 五 · Backfill 通路验证(代码面)

- `POST /api/embedding/backfill`(server/src/routes/embedding.ts:87-)在 dashscope 配置下走通——mock 层面:断言工厂产出 dashscope 适配壳、批量≤10 分批正确;⛔动真库⛔真调用;实际清表+重填=部署日运维,不在本单。

## 六 · 验收与测试面

- 服务端定向:涉改+同目录邻接,正门 **cwd=server/ 下 `node ../scripts/run-server-test-suite.mjs <files…>`**(⛔vitest 跑服务端文件);
- client 定向:Settings 涉改面 vitest;
- 至少一处阳性对照(照 P0 样例:故意改坏→目标用例独红→还原复绿,留 TAP);
- ⛔真实模型调用(真实验收归部署日冒烟);⛔全库马拉松(段收口归 HQ)。

## 七 · 纪律(照抄现役,射程带定义)

- ⛔一切 git 写操作——交工作树,commit 归 HQ;既存未跟踪文件原样保留;
- ⛔读 `.env` 的 key 值(文件名/变量名可引用);⛔真实模型调用;⛔用户库接触;
- builder 新造的凭据形合成值(口令/key/token/凭据用途的用户名邮箱)≤20 字符,或沿用仓库自申明约定 `synthetic-key-not-real-*`(秘密闸已认该标记);域数据字符串不在射程;
- ⛔新设计安全对抗类用例;既有功能回归(含凭据设置 UI 测试,全 mock 合成值)例行整跑明文允许,全库零排除;
- ⛔动依赖与锁文件(⚠️ server/package-lock.json 一动就变 Source 转录器指纹);
- 措辞中性。

## 八 · 回执协议

完工后本文件尾部追加 `## Result — <日期> · 临时工程对话1`:执行状态/写点(逐文件)/测试数字(实跑实报)/未做清单/环境申报;证据落 `docs/audits/2026-11-01-vps-p1-builder/`;⛔跨会话消息,回执只落本文件,HQ 自取。

## 九 · 不在射程

通用向量客户端;Voyage 拆除;imprint 数据改动/重嵌(部署日运维);documentParser 止血外任何行;P2 其余(npm start 崩 / zod-to-json-schema 位置)与 P3 全部(Henry 已拍暂缓);文案类(validateConfig 提示词等,除非顺手且零风险,做了申报)。

## Result — 2026-11-01 · 临时工程对话1

**执行状态**:`done`(自报;五个修面全部落工作树,未 commit,候 HQ 验收)

### 写点(逐文件;12 改 + 1 新,`git diff --stat` 139+/33-,不含新文件)

| 文件 | 改动 |
|---|---|
| `server/src/embedding/types.ts` | `EmbeddingConfig.provider` 联合加 `'dashscope'`;增可选 `baseUrl` |
| `server/src/validators/index.ts` | `embedding_provider` 枚举加 `'dashscope'` |
| `server/src/embedding/index.ts` | 新增 `DashScopeEmbeddingAdapter`(薄壳:name=dashscope / dimensions=1024 / maxBatchSize=10 / `embed(texts, inputType)` 内部按 10 分批调用 imprint 客户端);`createProvider` 加 dashscope 分支(模型非 `text-embedding-v4` 抛错);`getConfigFromSettings` 在 provider=dashscope 时默认 `text-embedding-v4`,并取 `ai_providers.dashscope.base_url` 作端点;env 兜底=voyage 优先(现状)→ 再查 dashscope |
| `server/src/embedding/dashscope.ts` | 端点改为可配置:`resolveDashScopeEmbeddingEndpoint(baseUrl?)` 优先级=显式 base(settings)> `DASHSCOPE_BASE_URL` 环境变量 > 默认北京,去尾 `/`、`/v1` 后拼 `/v1/embeddings`;`DASHSCOPE_EMBEDDING_ENDPOINT` 常量改指北京默认;model_id 纳入地域(`dashScopeEmbeddingModelId(region)`,按端点域名推导,`dashscope-intl.` → `intl`,其余 → `cn-beijing`),`DASHSCOPE_EMBEDDING_MODEL_ID` = `dashscope:cn-beijing:text-embedding-v4:1024`;返回 model 改**前缀宽松**校验(`startsWith('text-embedding-v4')`,且须为 string);fetch 加 `AbortSignal.timeout`(`DASHSCOPE_EMBEDDING_TIMEOUT_MS = 30_000`,可经 `timeoutMs` 选项注入),超时并入 `network_error`,消息可辨(`timed out after Nms`) |
| `server/src/embedding/voyage.ts` | fetch 加 `AbortSignal.timeout`(`VOYAGE_TIMEOUT_MS = 30_000`,构造器第三参可注入);fetch 失败统一抛 `Voyage AI network error: …`,超时消息带 `timed out after Nms` |
| `server/src/agent/providers/index.ts` | :40 dashscope 默认 base → 北京 |
| `server/src/services/providerCredentials.ts` | :184 CONNECTION_DEFAULTS dashscope base → 北京 |
| `server/src/agent/providers/index.test.ts` | :57 期望 → 北京 |
| `server/src/__tests__/providerCredentials.test.ts` | :147 期望 → 北京 |
| `server/src/__tests__/v2ImprintEmbedding.test.ts` | 仅改一条用例**标题**(原「fixed international endpoint」与新事实不符 → 「default Beijing endpoint」);断言未动,仍对 `DASHSCOPE_EMBEDDING_ENDPOINT` 断言 |
| `server/src/services/documentParser.ts` | **恰两行**:`let summary = ''` → `let summary: string \| null = ''`(否则 null 赋值过不了类型);`summary = 'Summary generation failed.'` → `summary = null`。其余行零触 |
| `client/src/pages/Settings/Settings.tsx` | 嵌入提供方列表加 `{ value: 'dashscope', label: '阿里云百炼' }`;模型选项加 `dashscope: [text-embedding-v4]`(既有切换逻辑取首项为默认模型) |
| **新** `server/src/__tests__/vpsP1BailianEmbedding.test.ts` | 7 条用例:端点默认北京/settings/env/地域标签;宽松校验阳性(带日期后缀 v4 过)+阴性(v3 拒);dashscope 超时;voyage 超时;env 兜底顺位;适配壳 23 条 → [10,10,3] 分批 + 空输入零请求;**Backfill 路由**(`:memory:` 库 + 合成行 + fetch 桩):settings=dashscope 下工厂产出适配壳,23 chunks + 3 memories → 请求批量 [10,10,3,3],全部打北京端点,vec 表各落 23/3 行 |

### 测试数字(实跑实报)

- **服务端定向**(cwd=`server/`,`node ../scripts/run-server-test-suite.mjs`):新文件 + `v2ImprintEmbedding` + `v2ImprintRetrieval` + `v2DocumentParserPdf` + `agent/providers/index.test` + `providerCredentials` + `v13AgentMemories` 共 7 文件 → **77 pass / 0 fail / 0 cancelled / flaky-retries 0**,exit 0。证据 `docs/audits/2026-11-01-vps-p1-builder/server-targeted.tap`。
  - 首跑为 **72 pass / 5 cancelled**,exit 1(证据 `server-targeted-run1-unref-timer.tap`),原因见环境申报 1;修测试桩后复跑即上一条。
- **阳性对照**:把适配壳批量上限 10 改成 100 → 新文件 **4 pass / 3 fail**(env 兜底断言 maxBatchSize、分批 [10,10,3]、Backfill [10,10,3,3] 三条独红),exit 1;还原后同文件 **7 pass / 0 fail**,exit 0。证据 `positive-control-batch-cap-broken.tap` / `positive-control-restored.tap`。
- **client 定向**:`npx vitest run src/pages/Settings/` → **3 files / 8 tests pass**,exit 0。证据 `client-settings-vitest.log`。(既有用例未覆盖新下拉项;本单未加 UI 用例。)
- **残留 grep**:`git grep -n dashscope-intl -- server client scripts` → 2 处:`embedding/dashscope.ts:33` 是**地域识别逻辑**(判 intl 域名),不是默认值;`scripts/cite-imprint-pages.mjs:41` 见未做清单。新测试文件(未跟踪,git grep 不计)含 3 处 intl 字面量,均为地域推导用例的有意输入。HQ 点名五处全部清零。
- **类型检查(附加)**:`server/` `npx tsc --noEmit -p .` → exit 2,**87 条**,与 P0 基线同数;涉改文件与新测试文件**零命中**。证据 `server-tsc.log`。
- 依赖/锁文件:`git status` 无任何 package*.json / lock 变动。

### 旧 110 条行为侦察(代码面,未接触真库)

- 消费面:`services/imprintEmbedding.ts`(写入/查重/KNN)、`services/imprintRetrieval.ts`(检索入口,`provider.modelId` 透传)、`scripts/query-imprint-fragments.mjs`(运维查询脚本,无参构造客户端)、`v2ImprintEmbedding.test.ts`(用 fixture model_id,不依赖真标签)。
- 检索:`searchImprintFragmentVectors` 在 vec0 内以 `model_id = ?` 过滤(migration 052 把 `model_id` 设为 `PARTITION KEY`),再 JOIN receipt 同 model_id。新标签 `dashscope:cn-beijing:…` ≠ 旧标签 `dashscope:text-embedding-v4:1024` → **旧行在检索路径上不可见**,也不会混进 KNN 近邻(既有用例 `K-1 model partition filters inside KNN` 覆盖该隔离)。
- 嵌入/backfill:`embedImprintFragments` 以新标签查 `hasImprintFragmentVector` → 旧行视为未嵌 → **全部 accepted 片段会以新标签重嵌**;`UNIQUE (fragment_id, model_id)` 允许新旧并存,不会冲突也不会覆盖旧行。**旧行留作孤儿**(占 vec 表,不参与检索),清理归部署日运维。
- 「110」这个数字来自 HQ,本会话未连库核对。

### 取舍申报

- **input_type / instruct 未转发**:适配壳收下 `inputType` 但不传;imprint 客户端请求体保持原样(model/input/dimensions/encoding_format)。最小接通;query/document 不对称编码若需要,另单。
- **端点接线深度**:用户路径(工厂)读 settings 的 dashscope `base_url`;**无用户上下文的 imprint 路径**(`imprintEmbedding` / `imprintRetrieval` / 运维脚本)读不到 settings,走 `DASHSCOPE_BASE_URL` 环境变量 → 默认北京。底线达成:部署日不改代码就指北京;要指 intl 时,imprint 路径需设环境变量。
- **地域推导**:只认 `dashscope-intl.` 前缀为 intl,其余(含自建代理域名)一律 `cn-beijing`。代理若转发到 intl,标签会标错。
- **宽松校验**选前缀方案;严格方案未保留。
- **settings 模型名与提供方错配**(例如 provider=dashscope 却存了 `voyage-4`)时工厂抛错 → `getEmbeddingProvider` 既有 catch 吞掉后走 env 兜底。客户端切换提供方时会重置模型,正常操作不会进入这个状态。
- **env 兜底顺位**按荐案:voyage 优先(旧机行为不变),再 dashscope。

### 止血触点消费面(修四 grep)

- 字面量 `"Summary generation failed."` 全仓只在 documentParser 一处(已删)。改 NULL 后的下游:
  - `agent/memory/manager.ts:173` 已有 `summary IS NOT NULL` → 失败文档**不再注入系统提示词**(以前字面量会被注入);
  - `client/.../DocumentManager.tsx:181` `!doc.summary` 时展开会拉一次详情,`:302` 显示 `No summary available.` —— 行为合理,无需改;
  - `agent/tools/executor.ts:729` 类型已是 `string | null`。
- 既有失败行:库里已经写下的字面量不会被本改动清掉(⛔用户库接触)。

### 未做清单

- `scripts/cite-imprint-pages.mjs:41` **第 6 处 intl 字面量**(聊天 completions 端点,硬编码),不在 HQ 五处清单内,也不在产品码/测试面。若部署机上要跑该运维脚本,需另拍。
- 真实调用 / 北京返回形状实测 / 清表重填(部署日)。
- 全库测试马拉松(归 HQ 段收口)。
- Settings 新下拉项的 UI 用例。
- 可选:顺手文案(validateConfig 提示词等)未碰。

### 环境申报

1. **`AbortSignal.timeout` 的计时器不持有事件循环**(unref'd):测试里桩 fetch 只挂一个永不 settle 的 promise 时,事件循环先空,node:test 判 `Promise resolution is still pending but the event loop has already resolved` 并连坐取消同文件后续 4 条(首跑 5 cancelled)。生产无影响(HTTP server 本身维持事件循环);测试桩加了一个持有循环的 5s 守卫计时器(abort 时清除)。若将来有**无服务器的 CLI 脚本**(如 `scripts/query-imprint-fragments.mjs`)撞上挂死对端,进程可能在超时触发前静默退出而非报超时 —— 记录候 HQ 判断是否值得另单。
2. **Bash 工具 heredoc**:一次内联 `python - <<'EOF'` 编辑脚本因引号解析失败(`unexpected EOF while looking for matching '`),**未写入任何文件**(脚本先全量校验再写);改为把脚本落 scratchpad 再执行。
3. 新造合成值均 ≤20 字符(`syn-bailian` / `syn-voyage`);邮箱用 `.invalid` 域。
4. 既存未跟踪文件原样保留;未读 `.env`;无 git 写操作;未动依赖/锁文件。

## HQ 收口 — 2026-11-01 · Fable

- **实质验收**:diff 逐段与回执吻合(12 改+1 新测试文件,210+/33-);止血恰两行(第二行为类型随动,合理);HQ 亲手复跑 7 文件定向 **77/77 pass,0 flaky** + client Settings **8/8**;阳性对照(批量上限改坏→3 条独红→还原复绿)照单全收;
- **取舍六条全部核准**:input_type 不转发(最小接通,另单候需)/端点接线深度(用户路径走 settings,imprint 无用户上下文路径走 DASHSCOPE_BASE_URL env,底线达成)/地域推导只认 intl 前缀(代理域名标 cn-beijing,已知取舍)/宽松校验弃严格/模型错配走既有兜底/env 顺位按荐案;
- **旧 110 条侦察核准**:model_id 是 vec0 PARTITION KEY,新旧标签天然隔离,旧行成孤儿不进检索不冲突——与部署日「清表重嵌」的运维安排闭环;
- **两条残留入 TD-44**:①`scripts/cite-imprint-pages.mjs:41` 第 6 处 intl 字面量(运维脚本,岛上跑会拿北京 key 撞 intl 聊天端点→401);②无服务器 CLI 撞挂死对端时,超时计时器不持事件循环可能静默退出——两者同触发器:部署日首次在岛上跑 imprint 运维脚本前顺手修;
- **判词**:第二单与首单同水准,回执的「取舍申报」节(六条自报含理由)值得立为样板;新工人协议运转顺畅。
