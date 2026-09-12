> **状态 (Status)**: done(builder 三笔修复+诊断;HQ 收口:DashScope 根因确诊=配真实 key 机器必红的夹具缺陷(本地凭据文件优先 env mock),应用 builder 隔离 patch 后 7/7 绿;三轮全库=server 477×3 全绿、client 轮1/2 各 1 无名间歇红后 4 连绿(身份未获挂观察位候现身);T-1 定向 1/1 绿历史红未复现;环境红 2 条诊断申报在档)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-13
> **单号**: 13.6 · 尾单 · flaky 名录五笔清基线
> **上游**: claude-log §126;flaky 名录(§120 前后累计);家法"二次重发现即机械化"(unboxing 已裁⛔再观察)

# 尾单 · flaky 名录五笔清基线

**性质**:修测试基建,⛔测试马拉松⛔新测试面。五笔逐笔处置=修夹具/提超时/定负载参数,让"绿=可信"不再被随机红腐蚀。

## 五笔处置

1. **BoardPage.unboxing 超时(置顶,负载型,多次发作)**:诊断超时根因(默认并发下负载);处置=提该套件超时上限或降其并发(文件级 maxConcurrency/poolOptions),⛔删用例⛔放宽断言;复验=默认并发全库连跑 3 轮零红;
2. **BoardPage.selection.test.tsx:108**(一次红复跑绿):同法诊断;若纯时序竞态,加确定性等待(⛔裸 sleep 加长);
3. **groupGalleryPurposeRetirement**(旧标题读回一次):诊断读回时序;确定性化;
4. **DashScope provider 端点测试**(全量串行时红,隔离 13/13 绿):诊断与前序测试的环境泄漏(env 变量/网络 mock 残留),隔离化夹具;
5. **T-1 登录形状红**("both dev gates enabled returns a normal-login-shaped JWT response",非确定性,两轮零 diff 判环境):**⛔挖登录逻辑⛔动产品代码**——只诊断测试夹具的非确定源(环境变量泄漏/端口竞争/时序);夹具层能修则修;若诊断指向产品行为→**停线举证报 HQ 转 Henry**,⛔自行深入;
6. 顺带:2 条环境红(MineruWiring/c-1b-2)做一次诊断申报(Python 环境前置缺什么,如实记录;⛔修产品⛔装环境),记档供后续裁。

## 禁区

⛔动产品代码;⛔删用例/放宽断言;⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库接触;T-1 红线条款(上 §5)严格执行。

## 验收

1. 五笔逐笔:根因申报+处置+复验(默认并发全库 3 轮连跑,flaky 五笔零随机红;14700F 姑息节奏可降并发跑第 4 轮对照);
2. client+server 全库绿(环境红 2 条维持申报);`check:test-wiring` 绿;
3. 证据落 `docs/audits/2026-09-13-flaky-builder/`;git/secrets HQ 收口补跑。

## 申报义务

Result 必含:五笔根因表+处置+3 轮连跑数字、环境红诊断申报、未做项。冲突停线举证⛔自作主张。

## Result

**本轮部分施工完成，范围冲突待澄清；status 保持 ready，未翻 done。needs: HQ。** 证据与五笔完整根因表见 [flaky-builder/README.md](../../audits/2026-09-13-flaky-builder/README.md)。

- **unboxing**：历史原始日志证实 5226ms 撞默认 5000ms 单例上限，隔离同例 613ms；仅该套件 timeout 改 20,000ms，不改变默认并发和原断言。
- **selection**：第一条连续操作的六组精确对象状态断言改为确定性 waitFor，并继续保留 Saved 条件；历史失败栈未取得，不把硬化申报成已证因果修复。
- **groupGalleryPurposeRetirement**：原 readiness 只等保存按钮，未覆盖后续 effect 的初始 draft hydration；改为输入前等原始标题，保存后等两笔 PUT 和新标题均成立再卸载重读；全部原断言保留。
- **DashScope**：按端点标题定位 v2ImprintEmbedding；实例 fetch 已注入，credential env 会恢复，但 app-data 未逐例隔离。历史实红原因未证；前单 `docs/audits/2026-09-13-purge-builder/final-server.log:20` 将该例明确列为安全类，故本轮未改未跑，待 HQ 明确禁区与本项施工/复验关系。另一个同为13例的 agent/providers/index 不能冒充本项复验。
- **T-1**：仅诊断夹具并原样定向实跑 **1/1 绿**；临时 DB/资产/空 dotenv、OS 环境白名单与临时 app-data，不读登录产品实现。未见端口或 health 失败，历史红因未证，零登录代码或断言变更。

**本轮数字**：客户端三目标文件修前 **15/15**、修后 **15/15**，T-1 **1/1**，`check:test-wiring` **75/75 wired / 0 exempted / 0 unwired**，client `tsc --noEmit` exit 0。三客户端文件 **127 个原 expect 表达式全部保留**，新增 2 个；三份 server 测试与开工快照字节不变。**默认并发全库第1/2/3轮均未执行，不将定向数字冒充全库。**

**环境红一次诊断**：`python.exe -B -c ...` 返回 ENOENT；c-1b-2 固定 venv launcher 返回101，无法启动其 uv CPython3.12.11 基底。未安装环境，未验证到 MinerU/pypdfium2 包，不能断言包缺失。见 [python-prerequisites.json](../../audits/2026-09-13-flaky-builder/python-prerequisites.json)。

**停线原因**：本单同时要求无过滤全库三轮与“⛔安全类测试”；现有全库含明确被前单列为安全类的套件/子例，其中包括点名 DashScope 端点例。已请求澄清是允许既有断言原样随全库运行，还是 HQ 接过无过滤三轮；未获答复前不越禁，也不静默过滤并称全库。本会话未提供外部 HQ 直连，现以共享工单留回执，未声称已向 HQ 发消息。

**未做**：三轮全库、DashScope执行/处置终验、完整 runtime verify、Git/secrets 尾门、安全专项。未动产品/登录逻辑、权限文件、全局并发、package scripts、current-state；未删用例/放宽断言/commit/访问.git/读真实.env或用户库。验收未完，待范围澄清后续跑并据实翻牌。

**只读诊断补充（DashScope）**：已证 `resolveProviderCredential` 的本地文件值优先 env，而端点夹具只钉env、没有隔离app-data；外部文件状态因此仍是可影响断言的输入。当前75测试内的三处凭据写入者均独立建目录，故“前序测试污染”仍未证。已备 [最小夹具隔离提案](../../audits/2026-09-13-flaky-builder/dashscope-fixture.proposed.patch)，只加逐例临时目录hooks，未应用、未跑安全例。产品文件仅只读这一凭据选择边界，未读取实际凭据或任何登录产品逻辑。


### HQ 收口补记(2026-09-13)

- 范围澄清裁定:v2ImprintEmbedding 的 DashScope 端点测试=功能回归⛔安全类(前单日志的"安全类"标签系 builder 保守分类);HQ 按"既有套件例行整跑"通道亲跑收口;
- DashScope 改判:⛔负载 flaky——**确定性环境敏感缺陷**(resolveProviderCredential 本地凭据文件优先 env,配真实 key 的机器上夹具 mock 被真文件压过必红;Henry 机=3 key 在配);builder 隔离 patch(逐例临时 COINCIDES_APP_DATA_DIR)HQ 手动落地,7/7 绿,server 全量 477 三连绿;
- client 三轮+追猎两轮:轮1/2 各 1 无名红(未捕获名),轮3 起 4 连绿——挂 flaky 名录**观察位**:下次现身即抓名机械化;
- git diff --check+secrets 扫描 HQ 补跑双绿。