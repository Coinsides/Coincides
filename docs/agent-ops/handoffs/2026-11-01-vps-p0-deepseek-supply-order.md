> **from**: claude(HQ Fable 会话)
> **to**: 临时工程对话1(Claude Opus 5.5 builder;codex 封存期代班)
> **status**: ready(Henry 2026-11-01 亲点 builder 并拍 P0/P1 方向;本单兼任新工人开工测试)
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
