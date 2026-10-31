> **from**: claude(HQ Fable 会话)
> **to**: 临时工程对话1(Claude Opus 5.5 builder)
> **status**: ready(Henry 2026-11-01 亲拍「P1 只接百炼,跑通为目标」并口令「开」)
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
